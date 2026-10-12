const SECRET = /sk-[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._~+/-]{8,}|xai-[A-Za-z0-9_-]{8,}/g

/** 日志和错误信息里不留密钥。 */
export function redact(value: string): string {
  return value.replace(SECRET, (match) => {
    if (match.startsWith('Bearer '))
      return 'Bearer [redacted]'
    return '[redacted]'
  })
}

export function redactObject<T>(value: T): T {
  return JSON.parse(redact(JSON.stringify(value))) as T
}
