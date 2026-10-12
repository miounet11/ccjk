import type { AccountKind, AccountPublic } from './types'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { ACCOUNT_TOS_WARNING } from './types'

interface SecretFile {
  iv: string
  tag: string
  data: string
}

interface SecretBag {
  providers: Record<string, string>
  accounts: Record<string, string>
}

function emptyBag(): SecretBag {
  return { providers: {}, accounts: {} }
}

function keyPath(dir: string): string {
  return join(dir, 'proxy-key')
}

function secretPath(dir: string): string {
  return join(dir, 'proxy-secrets.json')
}

function accountPath(dir: string): string {
  return join(dir, 'proxy-accounts.json')
}

function ensureDir(dir: string) {
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })
}

function loadKey(dir: string): Buffer {
  ensureDir(dir)
  const path = keyPath(dir)
  if (!existsSync(path)) {
    const key = randomBytes(32)
    writeFileSync(path, key.toString('hex'), { mode: 0o600 })
    try {
      chmodSync(path, 0o600)
    }
    catch {
      // Windows 上权限位可能无效，文件仍只在本机目录。
    }
    return key
  }
  return Buffer.from(readFileSync(path, 'utf-8').trim(), 'hex')
}

function seal(dir: string, bag: SecretBag): void {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', loadKey(dir), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(bag), 'utf8'), cipher.final()])
  const payload: SecretFile = {
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: data.toString('hex'),
  }
  writeFileSync(secretPath(dir), JSON.stringify(payload), { mode: 0o600 })
}

function openBag(dir: string): SecretBag {
  const path = secretPath(dir)
  if (!existsSync(path))
    return emptyBag()
  const payload = JSON.parse(readFileSync(path, 'utf-8')) as SecretFile
  const decipher = createDecipheriv('aes-256-gcm', loadKey(dir), Buffer.from(payload.iv, 'hex'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'hex'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'hex')),
    decipher.final(),
  ]).toString('utf8')
  const bag = JSON.parse(plain) as SecretBag
  return { providers: bag.providers ?? {}, accounts: bag.accounts ?? {} }
}

export function setProviderSecret(dir: string, providerId: string, apiKey: string): void {
  const bag = openBag(dir)
  bag.providers[providerId] = apiKey
  seal(dir, bag)
}

export function getProviderSecret(dir: string, providerId: string): string | undefined {
  return openBag(dir).providers[providerId]
}

export function deleteProviderSecret(dir: string, providerId: string): void {
  const bag = openBag(dir)
  delete bag.providers[providerId]
  seal(dir, bag)
}

export function listAccounts(dir: string): AccountPublic[] {
  if (!existsSync(accountPath(dir)))
    return []
  const rows = JSON.parse(readFileSync(accountPath(dir), 'utf-8')) as AccountPublic[]
  return rows.map(row => ({
    id: row.id,
    kind: row.kind,
    label: row.label,
    createdAt: row.createdAt,
    quotaUrl: row.quotaUrl,
  }))
}

export function saveAccount(
  dir: string,
  input: { id: string, kind: AccountKind, label: string, token: string, quotaUrl?: string },
): AccountPublic {
  ensureDir(dir)
  const accounts = listAccounts(dir).filter(row => row.id !== input.id)
  const row: AccountPublic = {
    id: input.id,
    kind: input.kind,
    label: input.label,
    createdAt: new Date().toISOString(),
    quotaUrl: input.quotaUrl,
  }
  accounts.push(row)
  writeFileSync(accountPath(dir), JSON.stringify(accounts, null, 2), { mode: 0o600 })
  const bag = openBag(dir)
  bag.accounts[input.id] = input.token
  seal(dir, bag)
  return row
}

export function deleteAccount(dir: string, id: string): void {
  const accounts = listAccounts(dir).filter(row => row.id !== id)
  writeFileSync(accountPath(dir), JSON.stringify(accounts, null, 2), { mode: 0o600 })
  const bag = openBag(dir)
  delete bag.accounts[id]
  seal(dir, bag)
}

export function getAccountToken(dir: string, id: string): string | undefined {
  return openBag(dir).accounts[id]
}

export function accountWarning(): string {
  return ACCOUNT_TOS_WARNING
}

export interface QuotaResult {
  available: boolean
  reason?: string
  body?: unknown
}

/** 只请求用户自己填的额度地址，不代查官方订阅页面。 */
export async function readQuota(
  account: AccountPublic,
  token: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<QuotaResult> {
  if (!account.quotaUrl)
    return { available: false, reason: '未配置额度地址' }
  if (!token)
    return { available: false, reason: '没有凭证' }
  const response = await fetchImpl(account.quotaUrl, {
    headers: {
      authorization: `Bearer ${token}`,
      'user-agent': 'ccjk-proxy',
    },
  })
  const text = await response.text()
  if (!response.ok)
    return { available: false, reason: `额度接口返回 ${response.status}` }
  try {
    return { available: true, body: JSON.parse(text) }
  }
  catch {
    return { available: true, body: text.slice(0, 500) }
  }
}
