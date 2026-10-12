import { homedir } from 'node:os';
import { resolve } from 'node:path';

export function expandHome(p: string): string {
  if (p === '~' || p.startsWith('~/')) {
    return resolve(homedir(), p.slice(2));
  }
  return p;
}
