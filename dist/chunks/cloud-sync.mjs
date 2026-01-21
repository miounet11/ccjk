import 'node:fs';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'pathe';

function getCloudSyncConfigPath() {
  return join(homedir(), ".claude", "superpowers-cloud-sync.json");
}
async function writeCloudSyncConfig(config) {
  try {
    const configPath = getCloudSyncConfigPath();
    await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write cloud sync config:", error);
    throw error;
  }
}
async function configureCloudSync(provider, credentials, options) {
  const config = {
    provider,
    credentials,
    autoSync: options?.autoSync || false,
    syncInterval: options?.syncInterval || 36e5
    // 1 hour default
  };
  await writeCloudSyncConfig(config);
}

export { configureCloudSync, writeCloudSyncConfig };
