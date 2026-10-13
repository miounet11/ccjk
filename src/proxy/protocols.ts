import type {
  CanonicalMessage,
  CanonicalRequest,
  CanonicalResponse,
  CanonicalTool,
  CanonicalToolCall,
  CanonicalUsage,
  UpstreamProtocol,
} from './types'

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function textOf(value: unknown): string {
  if (typeof value === 'string')
    return value
  if (!Array.isArray(value))
    return ''
  return value.map((block) => {
    if (typeof block === 'string')
      return block
    if (!isRecord(block))
      return ''
    if (typeof block.text === 'string' && block.type !== 'thinking')
      return block.text
    return ''
  }).filter(Boolean).join('')
}

function reasoningText(value: unknown): string {
  if (!Array.isArray(value))
    return ''
  return value.map((block) => {
    if (!isRecord(block))
      return ''
    if (block.type === 'thinking' && typeof block.thinking === 'string')
      return block.thinking
    if (block.type === 'redacted_thinking' && typeof block.data === 'string')
      return block.data
    return ''
  }).filter(Boolean).join('')
}

function systemText(system: unknown): string {
  if (typeof system === 'string')
    return system
  return textOf(system)
}

function asTools(value: unknown): CanonicalTool[] | undefined {
  if (!Array.isArray(value))
    return undefined
  const tools: CanonicalTool[] = []
  for (const item of value) {
    if (!isRecord(item))
      continue
    if (typeof item.name === 'string') {
      tools.push({
        name: item.name,
        description: typeof item.description === 'string' ? item.description : undefined,
        parameters: isRecord(item.input_schema) ? item.input_schema : {},
      })
      continue
    }
    const fn = isRecord(item.function) ? item.function : undefined
    if (fn && typeof fn.name === 'string') {
      tools.push({
        name: fn.name,
        description: typeof fn.description === 'string' ? fn.description : undefined,
        parameters: isRecord(fn.parameters) ? fn.parameters : {},
      })
    }
  }
  return tools.length > 0 ? tools : undefined
}

/**
 * 没有对应工具调用的回执改成用户文本。
 * 严格的 Chat 上游会拒收孤立的 role=tool，xAI 会拒收没有 call_id 的回执。
 */
export function normalizeOrphanToolResults(messages: CanonicalMessage[]): CanonicalMessage[] {
  const known = new Set<string>()
  const out: CanonicalMessage[] = []
  for (const message of messages) {
    if (message.role === 'assistant') {
      for (const call of message.toolCalls ?? []) {
        if (call.id)
          known.add(call.id)
      }
      out.push(message)
      continue
    }
    if (message.role === 'tool' && (!message.toolCallId || !known.has(message.toolCallId))) {
      out.push({
        role: 'user',
        text: `[tool-result without call] ${message.text ?? ''}`,
        images: message.images,
      })
      continue
    }
    out.push(message)
  }
  return out
}

export function fromAnthropic(body: Json): CanonicalRequest {
  const messages: CanonicalMessage[] = []
  const system = systemText(body.system)
  if (system)
    messages.push({ role: 'system', text: system })

  const rawMessages = Array.isArray(body.messages) ? body.messages : []
  for (const raw of rawMessages) {
    if (!isRecord(raw))
      continue
    const role = raw.role === 'assistant' ? 'assistant' : 'user'
    if (typeof raw.content === 'string') {
      messages.push({ role, text: raw.content })
      continue
    }
    const blocks = Array.isArray(raw.content) ? raw.content : []
    let text = ''
    let reasoning = ''
    const toolCalls: CanonicalToolCall[] = []
    const images: string[] = []
    const toolResults: CanonicalMessage[] = []
    for (const block of blocks) {
      if (!isRecord(block))
        continue
      if (block.type === 'thinking' || block.type === 'redacted_thinking') {
        if (typeof block.thinking === 'string')
          reasoning += block.thinking
        if (typeof block.data === 'string')
          reasoning += block.data
        continue
      }
      if (block.type === 'text' && typeof block.text === 'string')
        text += block.text
      if (block.type === 'image' && isRecord(block.source) && typeof block.source.data === 'string') {
        const media = typeof block.source.media_type === 'string' ? block.source.media_type : 'image/png'
        images.push(`data:${media};base64,${block.source.data}`)
      }
      if (block.type === 'tool_use' && typeof block.name === 'string') {
        toolCalls.push({
          id: typeof block.id === 'string' ? block.id : '',
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        })
      }
      if (block.type === 'tool_result') {
        toolResults.push({
          role: 'tool',
          toolCallId: typeof block.tool_use_id === 'string' ? block.tool_use_id : undefined,
          text: textOf(block.content),
        })
      }
    }
    if (text || reasoning || toolCalls.length > 0 || images.length > 0) {
      messages.push({
        role,
        text,
        reasoning: reasoning || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        images: images.length > 0 ? images : undefined,
      })
    }
    messages.push(...toolResults)
  }

  return {
    model: typeof body.model === 'string' ? body.model : '',
    messages: normalizeOrphanToolResults(messages),
    tools: asTools(body.tools),
    maxTokens: typeof body.max_tokens === 'number' ? body.max_tokens : undefined,
    stream: body.stream === true,
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
  }
}

export function fromOpenAIChat(body: Json): CanonicalRequest {
  const messages: CanonicalMessage[] = []
  const rawMessages = Array.isArray(body.messages) ? body.messages : []
  for (const raw of rawMessages) {
    if (!isRecord(raw) || typeof raw.role !== 'string')
      continue
    const role = raw.role === 'system' || raw.role === 'assistant' || raw.role === 'tool'
      ? raw.role
      : 'user'
    const toolCalls: CanonicalToolCall[] = []
    if (Array.isArray(raw.tool_calls)) {
      for (const call of raw.tool_calls) {
        if (!isRecord(call) || !isRecord(call.function))
          continue
        toolCalls.push({
          id: typeof call.id === 'string' ? call.id : '',
          name: typeof call.function.name === 'string' ? call.function.name : '',
          arguments: typeof call.function.arguments === 'string' ? call.function.arguments : '{}',
        })
      }
    }
    const images: string[] = []
    let text = ''
    const reasoning = typeof raw.reasoning_content === 'string'
      ? raw.reasoning_content
      : typeof raw.reasoning === 'string'
        ? raw.reasoning
        : ''
    if (typeof raw.content === 'string')
      text = raw.content
    else if (Array.isArray(raw.content)) {
      for (const part of raw.content) {
        if (!isRecord(part))
          continue
        if (part.type === 'text' && typeof part.text === 'string')
          text += part.text
        if (part.type === 'image_url' && isRecord(part.image_url) && typeof part.image_url.url === 'string')
          images.push(part.image_url.url)
      }
    }
    messages.push({
      role,
      text,
      reasoning: reasoning || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolCallId: typeof raw.tool_call_id === 'string' ? raw.tool_call_id : undefined,
      images: images.length > 0 ? images : undefined,
    })
  }
  return {
    model: typeof body.model === 'string' ? body.model : '',
    messages: normalizeOrphanToolResults(messages),
    tools: asTools(body.tools),
    maxTokens: typeof body.max_tokens === 'number' ? body.max_tokens : undefined,
    stream: body.stream === true,
    temperature: typeof body.temperature === 'number' ? body.temperature : undefined,
  }
}

export function fromOpenAIResponses(body: Json): CanonicalRequest {
  const messages: CanonicalMessage[] = []
  const instructions = typeof body.instructions === 'string' ? body.instructions : ''
  if (instructions)
    messages.push({ role: 'system', text: instructions })
  const input = body.input
  if (typeof input === 'string')
    messages.push({ role: 'user', text: input })
  else if (Array.isArray(input)) {
    for (const item of input) {
      if (!isRecord(item))
        continue
      if (item.type === 'function_call_output' || item.type === 'tool_search_output') {
        messages.push({
          role: 'tool',
          toolCallId: typeof item.call_id === 'string' ? item.call_id : undefined,
          text: textOf(item.output),
        })
        continue
      }
      if (item.type === 'function_call') {
        messages.push({
          role: 'assistant',
          toolCalls: [{
            id: typeof item.call_id === 'string' ? item.call_id : '',
            name: typeof item.name === 'string' ? item.name : '',
            arguments: typeof item.arguments === 'string' ? item.arguments : '{}',
          }],
        })
        continue
      }
      const role = item.role === 'assistant' || item.role === 'system' ? item.role : 'user'
      messages.push({ role, text: textOf(item.content ?? item.text) })
    }
  }
  return {
    model: typeof body.model === 'string' ? body.model : '',
    messages: normalizeOrphanToolResults(messages),
    tools: asTools(body.tools),
    maxTokens: typeof body.max_output_tokens === 'number' ? body.max_output_tokens : undefined,
    stream: body.stream === true,
  }
}

export function fromGemini(body: Json): CanonicalRequest {
  const messages: CanonicalMessage[] = []
  if (isRecord(body.systemInstruction)) {
    const text = textOf(body.systemInstruction.parts)
    if (text)
      messages.push({ role: 'system', text })
  }
  const contents = Array.isArray(body.contents) ? body.contents : []
  for (const raw of contents) {
    if (!isRecord(raw))
      continue
    const parts = Array.isArray(raw.parts) ? raw.parts : []
    let text = ''
    let reasoning = ''
    for (const part of parts) {
      if (!isRecord(part) || typeof part.text !== 'string')
        continue
      if (part.thought === true)
        reasoning += part.text
      else
        text += part.text
    }
    messages.push({
      role: raw.role === 'model' ? 'assistant' : 'user',
      text,
      reasoning: reasoning || undefined,
    })
  }
  const generation = isRecord(body.generationConfig) ? body.generationConfig : {}
  return {
    model: typeof body.model === 'string' ? body.model : '',
    messages,
    maxTokens: typeof generation.maxOutputTokens === 'number' ? generation.maxOutputTokens : undefined,
    stream: body.stream === true,
  }
}

export function parseInbound(protocol: UpstreamProtocol, body: Json): CanonicalRequest {
  if (protocol === 'anthropic-messages')
    return fromAnthropic(body)
  if (protocol === 'openai-responses' || protocol === 'xai')
    return fromOpenAIResponses(body)
  if (protocol === 'gemini')
    return fromGemini(body)
  return fromOpenAIChat(body)
}

function chatContent(message: CanonicalMessage): string | Array<Json> {
  if (!message.images?.length)
    return message.text ?? ''
  const parts: Json[] = []
  if (message.text)
    parts.push({ type: 'text', text: message.text })
  for (const url of message.images)
    parts.push({ type: 'image_url', image_url: { url } })
  return parts
}

export function toOpenAIChat(request: CanonicalRequest): Json {
  const messages = request.messages.map((message) => {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: message.toolCallId,
        content: message.text ?? '',
      }
    }
    const row: Json = { role: message.role, content: chatContent(message) }
    if (message.reasoning)
      row.reasoning_content = message.reasoning
    if (message.toolCalls?.length) {
      row.tool_calls = message.toolCalls.map(call => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      }))
    }
    return row
  })
  const body: Json = { model: request.model, messages }
  if (request.maxTokens !== undefined)
    body.max_tokens = request.maxTokens
  if (request.temperature !== undefined)
    body.temperature = request.temperature
  if (request.stream)
    body.stream = true
  if (request.tools?.length) {
    body.tools = request.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description ?? '',
        parameters: tool.parameters,
      },
    }))
  }
  return body
}

export function toOpenAIResponses(request: CanonicalRequest): Json {
  const system = request.messages.find(message => message.role === 'system')?.text
  const input = request.messages.filter(message => message.role !== 'system').map((message) => {
    if (message.role === 'tool') {
      return { type: 'function_call_output', call_id: message.toolCallId, output: message.text ?? '' }
    }
    if (message.toolCalls?.length) {
      return message.toolCalls.map(call => ({
        type: 'function_call',
        call_id: call.id,
        name: call.name,
        arguments: call.arguments,
      }))
    }
    return { role: message.role === 'assistant' ? 'assistant' : 'user', content: message.text ?? '' }
  }).flat()
  const body: Json = { model: request.model, input }
  if (system)
    body.instructions = system
  if (request.maxTokens !== undefined)
    body.max_output_tokens = request.maxTokens
  if (request.stream)
    body.stream = true
  return body
}

export function toAnthropicRequest(request: CanonicalRequest): Json {
  const system = request.messages.find(message => message.role === 'system')?.text
  const messages: Json[] = []
  for (const message of request.messages) {
    if (message.role === 'system')
      continue
    if (message.role === 'tool') {
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: message.toolCallId ?? '', content: message.text ?? '' }],
      })
      continue
    }
    const content: Json[] = []
    if (message.reasoning)
      content.push({ type: 'thinking', thinking: message.reasoning })
    if (message.text)
      content.push({ type: 'text', text: message.text })
    for (const url of message.images ?? []) {
      const matched = /^data:([^;]+);base64,(.+)$/.exec(url)
      if (matched) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: matched[1], data: matched[2] },
        })
      }
    }
    for (const call of message.toolCalls ?? []) {
      let input: unknown = {}
      try {
        input = JSON.parse(call.arguments || '{}')
      }
      catch {
        input = { raw: call.arguments }
      }
      content.push({ type: 'tool_use', id: call.id, name: call.name, input })
    }
    messages.push({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: content.length > 0 ? content : '',
    })
  }
  const body: Json = {
    model: request.model,
    max_tokens: request.maxTokens ?? 1024,
    messages,
  }
  if (system)
    body.system = system
  if (request.stream)
    body.stream = true
  if (request.tools?.length) {
    body.tools = request.tools.map(tool => ({
      name: tool.name,
      description: tool.description ?? '',
      input_schema: tool.parameters,
    }))
  }
  return body
}

export function toGemini(request: CanonicalRequest): Json {
  const system = request.messages.find(message => message.role === 'system')?.text
  const contents = request.messages.filter(message => message.role !== 'system').map((message) => {
    const parts: Json[] = []
    if (message.reasoning)
      parts.push({ text: message.reasoning, thought: true })
    parts.push({ text: message.text ?? '' })
    return {
      role: message.role === 'assistant' ? 'model' : 'user',
      parts,
    }
  })
  const body: Json = { contents, model: request.model }
  if (system)
    body.systemInstruction = { parts: [{ text: system }] }
  if (request.maxTokens !== undefined)
    body.generationConfig = { maxOutputTokens: request.maxTokens }
  return body
}

export function encodeUpstream(protocol: UpstreamProtocol, request: CanonicalRequest): Json {
  const normalized: CanonicalRequest = {
    ...request,
    messages: normalizeOrphanToolResults(request.messages),
  }
  if (protocol === 'anthropic-messages')
    return toAnthropicRequest(normalized)
  if (protocol === 'openai-responses' || protocol === 'xai')
    return toOpenAIResponses(normalized)
  if (protocol === 'gemini')
    return toGemini(normalized)
  return toOpenAIChat(normalized)
}

function usageFrom(raw: unknown): CanonicalUsage | undefined {
  if (!isRecord(raw))
    return undefined
  const input = numberField(raw, 'input_tokens', 'prompt_tokens')
  const output = numberField(raw, 'output_tokens', 'completion_tokens')
  const cacheRead = firstNonZero(raw, ['cache_read_input_tokens', 'prompt_cache_hit_tokens'])
  const cacheWrite = numberField(raw, 'cache_creation_input_tokens', 'cache_write_input_tokens')
  if (input === undefined && output === undefined && cacheRead === undefined && cacheWrite === undefined)
    return undefined
  return { inputTokens: input, outputTokens: output, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite }
}

function numberField(raw: Json, ...keys: string[]): number | undefined {
  for (const key of keys) {
    if (typeof raw[key] === 'number')
      return raw[key] as number
  }
  return undefined
}

/** 显式写成 0 的缓存字段不当成命中，继续看下一个字段。 */
function firstNonZero(raw: Json, keys: string[]): number | undefined {
  for (const key of keys) {
    if (typeof raw[key] === 'number' && raw[key] !== 0)
      return raw[key] as number
  }
  const present = keys.some(key => typeof raw[key] === 'number')
  return present ? 0 : undefined
}

export function responseFromAnthropic(body: Json): CanonicalResponse {
  const reasoning = reasoningText(body.content)
  return {
    text: textOf(body.content),
    reasoning: reasoning || undefined,
    toolCalls: Array.isArray(body.content)
      ? body.content.filter(isRecord).filter(block => block.type === 'tool_use').map(block => ({
          id: typeof block.id === 'string' ? block.id : '',
          name: typeof block.name === 'string' ? block.name : '',
          arguments: JSON.stringify(block.input ?? {}),
        }))
      : [],
    usage: usageFrom(body.usage),
    finishReason: typeof body.stop_reason === 'string' ? body.stop_reason : undefined,
  }
}

export function responseFromOpenAIChat(body: Json): CanonicalResponse {
  const choice = Array.isArray(body.choices) && isRecord(body.choices[0]) ? body.choices[0] : {}
  const message = isRecord(choice.message) ? choice.message : {}
  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls.filter(isRecord).map((call) => {
        const fn = isRecord(call.function) ? call.function : {}
        return {
          id: typeof call.id === 'string' ? call.id : '',
          name: typeof fn.name === 'string' ? fn.name : '',
          arguments: typeof fn.arguments === 'string' ? fn.arguments : '{}',
        }
      })
    : []
  const reasoning = typeof message.reasoning_content === 'string' ? message.reasoning_content : ''
  return {
    text: textOf(message.content),
    reasoning: reasoning || undefined,
    toolCalls,
    usage: usageFrom(body.usage),
    finishReason: typeof choice.finish_reason === 'string' ? choice.finish_reason : undefined,
  }
}

export function responseFromOpenAIResponses(body: Json): CanonicalResponse {
  let text = typeof body.output_text === 'string' ? body.output_text : ''
  const toolCalls: CanonicalToolCall[] = []
  if (Array.isArray(body.output)) {
    for (const item of body.output) {
      if (!isRecord(item))
        continue
      if (item.type === 'function_call') {
        toolCalls.push({
          id: typeof item.call_id === 'string' ? item.call_id : '',
          name: typeof item.name === 'string' ? item.name : '',
          arguments: typeof item.arguments === 'string' ? item.arguments : '{}',
        })
      }
      if (!text)
        text += textOf(item.content ?? item.text)
    }
  }
  return { text, toolCalls, usage: usageFrom(body.usage) }
}

export function responseFromGemini(body: Json): CanonicalResponse {
  const candidate = Array.isArray(body.candidates) && isRecord(body.candidates[0]) ? body.candidates[0] : {}
  const content = isRecord(candidate.content) ? candidate.content : {}
  return { text: textOf(content.parts), toolCalls: [], usage: usageFrom(body.usageMetadata) }
}

export function parseUpstreamResponse(protocol: UpstreamProtocol, body: Json): CanonicalResponse {
  if (protocol === 'anthropic-messages')
    return responseFromAnthropic(body)
  if (protocol === 'gemini')
    return responseFromGemini(body)
  if (protocol === 'openai-responses' || protocol === 'xai')
    return responseFromOpenAIResponses(body)
  return responseFromOpenAIChat(body)
}

export function toAnthropicResponse(model: string, response: CanonicalResponse): Json {
  const content: Json[] = []
  if (response.reasoning)
    content.push({ type: 'thinking', thinking: response.reasoning })
  if (response.text)
    content.push({ type: 'text', text: response.text })
  for (const call of response.toolCalls) {
    let input: unknown = {}
    try {
      input = JSON.parse(call.arguments || '{}')
    }
    catch {
      input = {}
    }
    content.push({ type: 'tool_use', id: call.id || 'tool', name: call.name, input })
  }
  return {
    id: 'msg_ccjk',
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: response.toolCalls.length > 0 ? 'tool_use' : 'end_turn',
    usage: {
      input_tokens: response.usage?.inputTokens ?? 0,
      output_tokens: response.usage?.outputTokens ?? 0,
    },
  }
}

export function toOpenAIChatResponse(model: string, response: CanonicalResponse): Json {
  const message: Json = { role: 'assistant', content: response.text }
  if (response.reasoning)
    message.reasoning_content = response.reasoning
  if (response.toolCalls.length > 0) {
    message.tool_calls = response.toolCalls.map(call => ({
      id: call.id,
      type: 'function',
      function: { name: call.name, arguments: call.arguments },
    }))
  }
  return {
    id: 'chatcmpl_ccjk',
    object: 'chat.completion',
    model,
    choices: [{ index: 0, message, finish_reason: response.toolCalls.length > 0 ? 'tool_calls' : 'stop' }],
    usage: {
      prompt_tokens: response.usage?.inputTokens ?? 0,
      completion_tokens: response.usage?.outputTokens ?? 0,
    },
  }
}

export function encodeClientResponse(protocol: UpstreamProtocol, model: string, response: CanonicalResponse): Json {
  if (protocol === 'anthropic-messages')
    return toAnthropicResponse(model, response)
  if (protocol === 'gemini') {
    return { candidates: [{ content: { role: 'model', parts: [{ text: response.text }] } }] }
  }
  if (protocol === 'openai-responses' || protocol === 'xai') {
    return {
      id: 'resp_ccjk',
      output_text: response.text,
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: response.text }] }],
    }
  }
  return toOpenAIChatResponse(model, response)
}

interface StreamState {
  started: boolean
  textOpen: boolean
  textIndex: number
  thinkingOpen: boolean
  hadThinking: boolean
  toolOpen: boolean
  toolIndex: number
}

function anthropicEvent(event: string, data: Json): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * 把 OpenAI Chat 的 SSE 收成 Anthropic SSE。
 * 上游省略 finish_reason 时，仍会先关上还开着的内容块，避免客户端丢掉最后一段。
 */
export function openAiChatSseToAnthropicSse(sse: string, model: string): string {
  const state: StreamState = {
    started: false,
    textOpen: false,
    textIndex: 0,
    thinkingOpen: false,
    hadThinking: false,
    toolOpen: false,
    toolIndex: -1,
  }
  let out = ''
  const ensureStart = () => {
    if (state.started)
      return
    state.started = true
    out += anthropicEvent('message_start', {
      type: 'message_start',
      message: {
        id: 'msg_ccjk',
        type: 'message',
        role: 'assistant',
        model,
        content: [],
        stop_reason: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    })
  }
  const closeThinking = () => {
    if (!state.thinkingOpen)
      return
    out += anthropicEvent('content_block_stop', { type: 'content_block_stop', index: 0 })
    state.thinkingOpen = false
  }
  const closeText = () => {
    if (!state.textOpen)
      return
    out += anthropicEvent('content_block_stop', { type: 'content_block_stop', index: state.textIndex })
    state.textOpen = false
  }
  const closeTool = () => {
    if (!state.toolOpen)
      return
    out += anthropicEvent('content_block_stop', { type: 'content_block_stop', index: state.toolIndex })
    state.toolOpen = false
  }
  for (const line of sse.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:'))
      continue
    const data = trimmed.slice(5).trim()
    if (data === '[DONE]')
      break
    let json: Json
    try {
      json = JSON.parse(data) as Json
    }
    catch {
      continue
    }
    const choice = Array.isArray(json.choices) && isRecord(json.choices[0]) ? json.choices[0] : {}
    const delta = isRecord(choice.delta) ? choice.delta : {}
    const reasoning = typeof delta.reasoning_content === 'string'
      ? delta.reasoning_content
      : typeof delta.reasoning === 'string'
        ? delta.reasoning
        : ''
    if (reasoning) {
      ensureStart()
      closeTool()
      if (!state.thinkingOpen) {
        closeText()
        state.thinkingOpen = true
        state.hadThinking = true
        out += anthropicEvent('content_block_start', {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'thinking', thinking: '' },
        })
      }
      out += anthropicEvent('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: reasoning },
      })
    }
    if (typeof delta.content === 'string' && delta.content) {
      ensureStart()
      closeThinking()
      closeTool()
      if (!state.textOpen) {
        state.textOpen = true
        state.textIndex = state.hadThinking ? 1 : 0
        out += anthropicEvent('content_block_start', {
          type: 'content_block_start',
          index: state.textIndex,
          content_block: { type: 'text', text: '' },
        })
      }
      out += anthropicEvent('content_block_delta', {
        type: 'content_block_delta',
        index: state.textIndex,
        delta: { type: 'text_delta', text: delta.content },
      })
    }
    if (Array.isArray(delta.tool_calls)) {
      ensureStart()
      closeThinking()
      closeText()
      for (const call of delta.tool_calls) {
        if (!isRecord(call) || !isRecord(call.function))
          continue
        const base = typeof call.index === 'number' ? call.index : state.toolIndex
        const index = base + (state.hadThinking ? 2 : 1)
        if (!state.toolOpen || index !== state.toolIndex) {
          closeTool()
          state.toolOpen = true
          state.toolIndex = index
          out += anthropicEvent('content_block_start', {
            type: 'content_block_start',
            index,
            content_block: {
              type: 'tool_use',
              id: typeof call.id === 'string' ? call.id : `tool_${index}`,
              name: typeof call.function.name === 'string' ? call.function.name : '',
              input: {},
            },
          })
        }
        if (typeof call.function.arguments === 'string' && call.function.arguments) {
          out += anthropicEvent('content_block_delta', {
            type: 'content_block_delta',
            index,
            delta: { type: 'input_json_delta', partial_json: call.function.arguments },
          })
        }
      }
    }
  }
  ensureStart()
  closeThinking()
  closeText()
  closeTool()
  out += anthropicEvent('message_delta', {
    type: 'message_delta',
    delta: { stop_reason: 'end_turn' },
    usage: { output_tokens: 0 },
  })
  out += anthropicEvent('message_stop', { type: 'message_stop' })
  return out
}
