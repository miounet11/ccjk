import { pathExists } from 'fs-extra';
import trash from 'trash';

async function moveToTrash(paths) {
  const pathArray = Array.isArray(paths) ? paths : [paths];
  const results = [];
  for (const path of pathArray) {
    try {
      const exists = await pathExists(path);
      if (!exists) {
        results.push({
          success: false,
          path,
          error: "Path does not exist"
        });
        continue;
      }
      await trash(path);
      results.push({
        success: true,
        path
      });
    } catch (error) {
      results.push({
        success: false,
        path,
        error: error.message || "Unknown error occurred"
      });
    }
  }
  return results;
}

export { moveToTrash as m };
