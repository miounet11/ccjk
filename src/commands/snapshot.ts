import ansis from 'ansis';
import { listConfigSnapshots, readConfigSnapshot } from '../config/snapshot-manager';

export interface SnapshotCommandOptions {
  json?: boolean;
}

export async function snapshotCommand(action: string = 'list', id?: string, options: SnapshotCommandOptions = {}): Promise<void> {
  if (action === 'show') {
    if (!id) {
      console.error(ansis.red('Snapshot id is required.'));
      return;
    }

    const snapshot = readConfigSnapshot(id);
    if (!snapshot) {
      console.error(ansis.red(`Snapshot not found: ${id}`));
      return;
    }

    if (options.json) {
      console.log(JSON.stringify(snapshot.manifest, null, 2));
      return;
    }

    console.log(ansis.bold.cyan('Snapshot'));
    console.log(`ID: ${snapshot.manifest.id}`);
    console.log(`Created: ${snapshot.manifest.createdAt}`);
    console.log(`Plan: ${snapshot.manifest.title}`);
    console.log(`Risk: ${snapshot.manifest.risk}`);
    console.log(`Files: ${snapshot.manifest.files.length}`);
    for (const file of snapshot.manifest.files) {
      console.log(`  - ${file.sourcePath}`);
      console.log(ansis.dim(`    ${file.operation}; ${file.reason}`));
    }
    return;
  }

  const snapshots = listConfigSnapshots();
  if (options.json) {
    console.log(JSON.stringify(snapshots, null, 2));
    return;
  }

  if (snapshots.length === 0) {
    console.log(ansis.yellow('No snapshots found.'));
    return;
  }

  console.log(ansis.bold.cyan('Snapshots'));
  for (const snapshot of snapshots) {
    console.log(`${ansis.green(snapshot.id)}  ${snapshot.createdAt}`);
    console.log(ansis.dim(`  ${snapshot.title} (${snapshot.files.length} file${snapshot.files.length === 1 ? '' : 's'})`));
  }
}
