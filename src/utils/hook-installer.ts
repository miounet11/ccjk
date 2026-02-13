import { readFile } from 'node:fs/promises';
import { resolve } from 'pathe';
import { readJsonConfig, writeJsonConfig } from './json-config.js';

interface HookTemplate {
  id: string;
  event: string;
  pattern?: string;
  command: string;
  timeout?: number;
  description?: string;
}

interface SettingsHookEntry {
  type: 'command';
  command: string;
  timeout?: number;
}

interface SettingsHooks {
  [event: string]: SettingsHookEntry[];
}

/**
 * Install recommended hooks into ~/.claude/settings.json.
 * Merges with existing hooks — never overwrites what the user already has.
 * Returns the number of hooks actually added.
 */
export async function installRecommendedHooks(hookIds: string[]): Promise<number> {
  if (!hookIds.length) return 0;

  // Load hook templates
  const templatesPath = resolve(
    import.meta.dirname ?? new URL('.', import.meta.url).pathname,
    '../data/hook-templates.json',
  );
  const raw = await readFile(templatesPath, 'utf-8');
  const allTemplates: HookTemplate[] = JSON.parse(raw);

  // Filter to only the requested IDs
  const selected = allTemplates.filter((t) => hookIds.includes(t.id));
  if (!selected.length) return 0;

  // Read current settings
  const settings = readJsonConfig<{ hooks?: SettingsHooks }>('settings') ?? {};
  const hooks: SettingsHooks = settings.hooks ?? {};

  let added = 0;

  for (const tpl of selected) {
    const event = tpl.event;
    const existing = hooks[event] ?? [];

    // Skip if a hook with the same command already exists for this event
    const alreadyExists = existing.some((h) => h.command === tpl.command);
    if (alreadyExists) continue;

    const entry: SettingsHookEntry = {
      type: 'command',
      command: tpl.command,
    };
    if (tpl.timeout) {
      entry.timeout = tpl.timeout;
    }

    hooks[event] = [...existing, entry];
    added++;
  }

  if (added > 0) {
    (settings as any).hooks = hooks;
    writeJsonConfig('settings', settings);
  }

  return added;
}
