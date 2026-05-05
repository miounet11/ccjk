#!/usr/bin/env node
/**
 * Replace pnpm catalog: references in root package.json with concrete versions.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageJsonPath = resolve('./package.json');
const workspacePath = resolve('./pnpm-workspace.yaml');

function parseScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function parseCatalogs(workspaceContent) {
  const defaultCatalog = new Map();
  const namedCatalogs = new Map();
  let section = null;
  let currentCatalog = null;

  for (const line of workspaceContent.split('\n')) {
    if (/^catalog:\s*$/.test(line)) {
      section = 'catalog';
      currentCatalog = null;
      continue;
    }

    if (/^catalogs:\s*$/.test(line)) {
      section = 'catalogs';
      currentCatalog = null;
      continue;
    }

    if (/^[^\s].*:/.test(line)) {
      section = null;
      currentCatalog = null;
      continue;
    }

    if (section === 'catalog') {
      const match = line.match(/^\s{2}([^:]+):\s*(.+)$/);
      if (match) {
        defaultCatalog.set(parseScalar(match[1]), parseScalar(match[2]));
      }
      continue;
    }

    if (section === 'catalogs') {
      const catalogMatch = line.match(/^\s{2}([^:]+):\s*$/);
      if (catalogMatch) {
        currentCatalog = parseScalar(catalogMatch[1]);
        namedCatalogs.set(currentCatalog, new Map());
        continue;
      }

      const packageMatch = line.match(/^\s{4}([^:]+):\s*(.+)$/);
      if (currentCatalog && packageMatch) {
        namedCatalogs.get(currentCatalog).set(parseScalar(packageMatch[1]), parseScalar(packageMatch[2]));
      }
    }
  }

  return { defaultCatalog, namedCatalogs };
}

function resolveCatalogVersion(packageName, catalogSpec, catalogs) {
  const catalogName = catalogSpec.slice('catalog:'.length);
  if (!catalogName) {
    return catalogs.defaultCatalog.get(packageName);
  }

  return catalogs.namedCatalogs.get(catalogName)?.get(packageName);
}

function fixDependencyBlock(block, blockName, catalogs) {
  let fixedCount = 0;
  const missing = [];

  if (!block) {
    return { fixedCount, missing };
  }

  for (const [name, version] of Object.entries(block)) {
    if (typeof version !== 'string' || !version.startsWith('catalog:')) {
      continue;
    }

    const resolved = resolveCatalogVersion(name, version, catalogs);
    if (!resolved) {
      missing.push(`${blockName}.${name} (${version})`);
      continue;
    }

    block[name] = resolved;
    fixedCount += 1;
    console.log(`Fixed ${blockName}: ${name} -> ${resolved}`);
  }

  return { fixedCount, missing };
}

async function fixPackageJson() {
  const [packageContent, workspaceContent] = await Promise.all([
    readFile(packageJsonPath, 'utf-8'),
    readFile(workspacePath, 'utf-8'),
  ]);

  const pkg = JSON.parse(packageContent);
  const catalogs = parseCatalogs(workspaceContent);
  const dependencyResult = fixDependencyBlock(pkg.dependencies, 'dependencies', catalogs);
  const devDependencyResult = fixDependencyBlock(pkg.devDependencies, 'devDependencies', catalogs);
  const missing = [...dependencyResult.missing, ...devDependencyResult.missing];

  if (missing.length > 0) {
    console.error('\nMissing catalog versions:');
    for (const item of missing) {
      console.error(`- ${item}`);
    }
    process.exit(1);
  }

  const fixedCount = dependencyResult.fixedCount + devDependencyResult.fixedCount;
  await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);

  const newContent = await readFile(packageJsonPath, 'utf-8');
  const remainingMatches = newContent.match(/catalog:/g);
  if (remainingMatches) {
    console.error(`\npackage.json still has ${remainingMatches.length} catalog: references.`);
    process.exit(1);
  }

  console.log(`\nFixed ${fixedCount} catalog references in package.json.`);
}

fixPackageJson().catch((error) => {
  console.error(error);
  process.exit(1);
});
