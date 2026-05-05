import ansis from 'ansis';
import { restoreConfigSnapshot } from '../config/snapshot-manager';

export interface RollbackOptions {
  json?: boolean;
}

export async function rollbackCommand(id: string | undefined, options: RollbackOptions = {}): Promise<void> {
  if (!id) {
    console.error(ansis.red('Snapshot id is required.'));
    console.log(ansis.gray('Run: npx ccjk snapshot'));
    return;
  }

  try {
    const result = restoreConfigSnapshot(id);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(ansis.green(`Rollback complete: ${id}`));
    console.log(ansis.gray(`Restored files: ${result.restored.length}`));
    if (result.skipped.length > 0) {
      console.log(ansis.yellow(`Skipped files: ${result.skipped.length}`));
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(ansis.red(message));
  }
}
