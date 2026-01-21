import Module from 'node:module';
import { existsSync, readdirSync, statSync, promises } from 'node:fs';
import { join, resolve, normalize, dirname, extname, relative, isAbsolute } from 'pathe';
import { colors } from 'consola/utils';
import consola$1, { consola } from 'consola';
import { defu } from 'defu';
import { createHooks } from 'hookable';
import prettyBytes from 'pretty-bytes';
import { glob } from 'tinyglobby';
import fsp, { mkdir, writeFile } from 'node:fs/promises';
import { createJiti } from 'jiti';
import { watch, rollup } from 'rollup';
import dts from 'rollup-plugin-dts';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import alias from '@rollup/plugin-alias';
import replace from '@rollup/plugin-replace';
import { resolveAlias } from 'pathe/utils';
import { findStaticImports, parseNodeModulePath, pathToFileURL, fileURLToPath, resolvePath, resolveModuleExportNames } from 'mlly';
import { transform } from 'esbuild';
import { createFilter } from '@rollup/pluginutils';
import rollupJSONPlugin from '@rollup/plugin-json';
import MagicString from 'magic-string';
import { FixDtsDefaultCjsExportsPlugin } from 'fix-dts-default-cjs-exports/rollup';
import { resolveSchema, generateTypes, generateMarkdown } from 'untyped';
import untypedPlugin from 'untyped/babel-plugin';
import { pascalCase } from 'scule';
import { mkdist } from 'mkdist';

function defineBuildConfig(config) {
  return (Array.isArray(config) ? config : [config]).filter(Boolean);
}
function definePreset(preset) {
  return preset;
}

const autoPreset = definePreset(() => {
  return {
    hooks: {
      "build:prepare"(ctx) {
        if (!ctx.pkg || ctx.options.entries.length > 0) {
          return;
        }
        const sourceFiles = listRecursively(join(ctx.options.rootDir, "src"));
        const res = inferEntries(ctx.pkg, sourceFiles, ctx.options.rootDir);
        for (const message of res.warnings) {
          warn(ctx, message);
        }
        ctx.options.entries.push(...res.entries);
        if (res.cjs) {
          ctx.options.rollup.emitCJS = true;
        }
        if (ctx.options.declaration === void 0) {
          ctx.options.declaration = res.dts ? "compatible" : false;
        }
        consola.info(
          "Automatically detected entries:",
          colors.cyan(
            ctx.options.entries.map(
              (e) => colors.bold(
                e.input.replace(ctx.options.rootDir + "/", "").replace(/\/$/, "/*")
              )
            ).join(", ")
          ),
          colors.gray(
            ["esm", res.cjs && "cjs", res.dts && "dts"].filter(Boolean).map((tag) => `[${tag}]`).join(" ")
          )
        );
      }
    }
  };
});
function inferEntries(pkg, sourceFiles, rootDir) {
  const warnings = [];
  sourceFiles.sort((a, b) => a.split("/").length - b.split("/").length);
  const outputs = extractExportFilenames(pkg.exports);
  if (pkg.bin) {
    const binaries = typeof pkg.bin === "string" ? [pkg.bin] : Object.values(pkg.bin);
    for (const file of binaries) {
      outputs.push({ file });
    }
  }
  if (pkg.main) {
    outputs.push({ file: pkg.main });
  }
  if (pkg.module) {
    outputs.push({ type: "esm", file: pkg.module });
  }
  if (pkg.types || pkg.typings) {
    outputs.push({ file: pkg.types || pkg.typings });
  }
  const isESMPkg = pkg.type === "module";
  for (const output of outputs.filter((o) => !o.type)) {
    const isJS = output.file.endsWith(".js");
    if (isESMPkg && isJS || output.file.endsWith(".mjs")) {
      output.type = "esm";
    } else if (!isESMPkg && isJS || output.file.endsWith(".cjs")) {
      output.type = "cjs";
    }
  }
  let cjs = false;
  let dts = false;
  const entries = [];
  for (const output of outputs) {
    const outputSlug = output.file.replace(
      /(\*[^/\\]*|\.d\.(m|c)?ts|\.\w+)$/,
      ""
    );
    const isDir = outputSlug.endsWith("/");
    if (isDir && ["./", "/"].includes(outputSlug)) {
      continue;
    }
    const possiblePaths = getEntrypointPaths(outputSlug);
    const input = possiblePaths.reduce((source, d) => {
      if (source) {
        return source;
      }
      const SOURCE_RE = new RegExp(
        `(?<=/|$)${d}${isDir ? "" : String.raw`\.\w+`}$`
      );
      return sourceFiles.find((i) => SOURCE_RE.test(i))?.replace(/(\.d\.(m|c)?ts|\.\w+)$/, "");
    }, void 0);
    if (!input) {
      if (!existsSync(resolve(rootDir || ".", output.file))) {
        warnings.push(`Could not find entrypoint for \`${output.file}\``);
      }
      continue;
    }
    if (output.type === "cjs") {
      cjs = true;
    }
    const entry = entries.find((i) => i.input === input) || entries[entries.push({ input }) - 1];
    if (/\.d\.(m|c)?ts$/.test(output.file)) {
      dts = true;
    }
    if (isDir) {
      entry.outDir = outputSlug;
      entry.format = output.type;
    }
  }
  return { entries, cjs, dts, warnings };
}
const getEntrypointPaths = (path) => {
  const segments = normalize(path).split("/");
  return segments.map((_, index) => segments.slice(index).join("/")).filter(Boolean);
};

async function ensuredir(path) {
  await fsp.mkdir(dirname(path), { recursive: true });
}
function warn(ctx, message) {
  if (ctx.warnings.has(message)) {
    return;
  }
  consola.debug("[unbuild] [warn]", message);
  ctx.warnings.add(message);
}
async function symlink(from, to, force = true) {
  await ensuredir(to);
  if (force) {
    await fsp.unlink(to).catch(() => {
    });
  }
  await fsp.symlink(from, to, "junction");
}
function dumpObject(obj) {
  return "{ " + Object.keys(obj).map((key) => `${key}: ${JSON.stringify(obj[key])}`).join(", ") + " }";
}
function getpkg(id = "") {
  const s = id.split("/");
  return s[0][0] === "@" ? `${s[0]}/${s[1]}` : s[0];
}
async function rmdir(dir) {
  await fsp.unlink(dir).catch(() => {
  });
  await fsp.rm(dir, { recursive: true, force: true }).catch(() => {
  });
}
function listRecursively(path) {
  const filenames = /* @__PURE__ */ new Set();
  const walk = (path2) => {
    const files = readdirSync(path2);
    for (const file of files) {
      const fullPath = resolve(path2, file);
      if (statSync(fullPath).isDirectory()) {
        filenames.add(fullPath + "/");
        walk(fullPath);
      } else {
        filenames.add(fullPath);
      }
    }
  };
  walk(path);
  return [...filenames];
}
async function resolvePreset(preset, rootDir) {
  if (preset === "auto") {
    preset = autoPreset;
  } else if (typeof preset === "string") {
    preset = await createJiti(rootDir, { interopDefault: true }).import(preset, {
      default: true
    }) || {};
  }
  if (typeof preset === "function") {
    preset = preset();
  }
  return preset;
}
function inferExportType(condition, previousConditions = [], filename = "") {
  if (filename) {
    if (filename.endsWith(".d.ts")) {
      return "esm";
    }
    if (filename.endsWith(".mjs")) {
      return "esm";
    }
    if (filename.endsWith(".cjs")) {
      return "cjs";
    }
  }
  switch (condition) {
    case "import": {
      return "esm";
    }
    case "require": {
      return "cjs";
    }
    default: {
      if (previousConditions.length === 0) {
        return "esm";
      }
      const [newCondition, ...rest] = previousConditions;
      return inferExportType(newCondition, rest, filename);
    }
  }
}
function extractExportFilenames(exports, conditions = []) {
  if (!exports) {
    return [];
  }
  if (typeof exports === "string") {
    return [{ file: exports, type: "esm" }];
  }
  return Object.entries(exports).filter(([subpath]) => !subpath.endsWith(".json")).flatMap(
    ([condition, exports2]) => typeof exports2 === "string" ? {
      file: exports2,
      type: inferExportType(condition, conditions, exports2)
    } : extractExportFilenames(exports2, [...conditions, condition])
  );
}
function arrayIncludes(arr, searchElement) {
  return arr.some(
    (entry) => entry instanceof RegExp ? entry.test(searchElement) : entry === searchElement
  );
}
function removeExtension(filename) {
  return filename.replace(/\.(js|mjs|cjs|ts|mts|cts|json|jsx|tsx)$/, "");
}
function inferPkgExternals(pkg) {
  const externals = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.devDependencies || {}).filter(
      (dep) => dep.startsWith("@types/")
    ),
    ...Object.keys(pkg.optionalDependencies || {})
  ];
  if (pkg.name) {
    externals.push(pkg.name);
    if (pkg.exports) {
      for (const subpath of Object.keys(pkg.exports)) {
        if (subpath.startsWith("./")) {
          externals.push(pathToRegex(`${pkg.name}/${subpath.slice(2)}`));
        }
      }
    }
  }
  if (pkg.imports) {
    for (const importName of Object.keys(pkg.imports)) {
      if (importName.startsWith("#")) {
        externals.push(pathToRegex(importName));
      }
    }
  }
  return [...new Set(externals)];
}
function pathToRegex(path) {
  return path.includes("*") ? new RegExp(
    `^${path.replace(/\./g, String.raw`\.`).replace(/\*/g, ".*")}$`
  ) : path;
}
function withTrailingSlash(path) {
  return path.endsWith("/") ? path : `${path}/`;
}

function validateDependencies(ctx) {
  const usedDependencies = /* @__PURE__ */ new Set();
  const unusedDependencies = new Set(
    Object.keys(ctx.pkg.dependencies || {})
  );
  const implicitDependencies = /* @__PURE__ */ new Set();
  for (const id of ctx.usedImports) {
    unusedDependencies.delete(id);
    usedDependencies.add(id);
  }
  if (Array.isArray(ctx.options.dependencies)) {
    for (const id of ctx.options.dependencies) {
      unusedDependencies.delete(id);
    }
  }
  for (const id of usedDependencies) {
    if (!arrayIncludes(ctx.options.externals, id) && !id.startsWith("chunks/") && !ctx.options.dependencies.includes(getpkg(id)) && !ctx.options.peerDependencies.includes(getpkg(id))) {
      implicitDependencies.add(id);
    }
  }
  if (unusedDependencies.size > 0) {
    warn(
      ctx,
      "Potential unused dependencies found: " + [...unusedDependencies].map((id) => colors.cyan(id)).join(", ")
    );
  }
  if (implicitDependencies.size > 0 && !ctx.options.rollup.inlineDependencies) {
    warn(
      ctx,
      "Potential implicit dependencies found: " + [...implicitDependencies].map((id) => colors.cyan(id)).join(", ")
    );
  }
}
function validatePackage(pkg, rootDir, ctx) {
  if (!pkg) {
    return;
  }
  const filenames = new Set(
    [
      ...typeof pkg.bin === "string" ? [pkg.bin] : Object.values(pkg.bin || {}),
      pkg.main,
      pkg.module,
      pkg.types,
      pkg.typings,
      ...extractExportFilenames(pkg.exports).map((i) => i.file)
    ].map((i) => i && resolve(rootDir, i.replace(/\/[^/]*\*.*$/, "")))
  );
  const missingOutputs = [];
  for (const filename of filenames) {
    if (filename && !filename.includes("*") && !existsSync(filename)) {
      missingOutputs.push(filename.replace(rootDir + "/", ""));
    }
  }
  if (missingOutputs.length > 0) {
    warn(
      ctx,
      `Potential missing package.json files: ${missingOutputs.map((o) => colors.cyan(o)).join(", ")}`
    );
  }
}

const SHEBANG_RE = /^#![^\n]*/;
function shebangPlugin() {
  return {
    name: "unbuild-shebang",
    async writeBundle(options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== "chunk") {
          continue;
        }
        if (output.code?.match(SHEBANG_RE)) {
          const outFile = resolve(options.dir, fileName);
          await makeExecutable(outFile);
        }
      }
    }
  };
}
function removeShebangPlugin() {
  return {
    name: "unbuild-remove-shebang",
    renderChunk(code) {
      return code.replace(SHEBANG_RE, "");
    }
  };
}
async function makeExecutable(filePath) {
  await promises.chmod(
    filePath,
    493
    /* rwx r-x r-x */
  ).catch(() => {
  });
}
function getShebang(code, append = "\n") {
  const m = code.match(SHEBANG_RE);
  return m ? m + append : "";
}

const DefaultLoaders = {
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".ts": "ts",
  ".mts": "ts",
  ".cts": "ts",
  ".tsx": "tsx",
  ".jsx": "jsx"
};
function esbuild(options) {
  const {
    include = new RegExp(Object.keys(DefaultLoaders).join("|")),
    exclude = /node_modules/,
    loaders: loaderOptions,
    ...esbuildOptions
  } = options;
  const loaders = { ...DefaultLoaders };
  if (loaderOptions) {
    for (const [key, value] of Object.entries(loaderOptions)) {
      if (typeof value === "string") {
        loaders[key] = value;
      } else if (value === false) {
        delete loaders[key];
      }
    }
  }
  const getLoader = (id = "") => {
    return loaders[extname(id)];
  };
  const filter = createFilter(include, exclude);
  return {
    name: "esbuild",
    async transform(code, id) {
      if (!filter(id)) {
        return null;
      }
      const loader = getLoader(id);
      if (!loader) {
        return null;
      }
      const result = await transform(code, {
        ...esbuildOptions,
        loader,
        sourcefile: id
      });
      printWarnings(id, result, this);
      return {
        code: result.code || "",
        map: result.map || null
      };
    },
    async renderChunk(code, { fileName }) {
      if (!options.minify) {
        return null;
      }
      if (/\.d\.(c|m)?tsx?$/.test(fileName)) {
        return null;
      }
      const loader = getLoader(fileName);
      if (!loader) {
        return null;
      }
      const result = await transform(code, {
        ...esbuildOptions,
        loader,
        sourcefile: fileName,
        minify: true
      });
      return {
        code: result.code || "",
        map: result.map || null
      };
    }
  };
}
function printWarnings(id, result, plugin) {
  if (result.warnings) {
    for (const warning of result.warnings) {
      let message = "[esbuild]";
      if (warning.location) {
        message += ` (${relative(process.cwd(), id)}:${warning.location.line}:${warning.location.column})`;
      }
      message += ` ${warning.text}`;
      plugin.warn(message);
    }
  }
}

const EXPORT_DEFAULT = "export default ";
function JSONPlugin(options) {
  const plugin = rollupJSONPlugin(options);
  return {
    ...plugin,
    name: "unbuild-json",
    transform(code, id) {
      const res = plugin.transform.call(this, code, id);
      if (res && typeof res !== "string" && "code" in res && res.code && res.code.startsWith(EXPORT_DEFAULT)) {
        res.code = res.code.replace(EXPORT_DEFAULT, "module.exports = ");
      }
      return res;
    }
  };
}

const defaults = {
  include: [/\.(md|txt|css|htm|html)$/],
  exclude: []
};
function rawPlugin(opts = {}) {
  opts = { ...opts, ...defaults };
  const filter = createFilter(opts.include, opts.exclude);
  return {
    name: "unbuild-raw",
    transform(code, id) {
      if (filter(id)) {
        return {
          code: `export default ${JSON.stringify(code)}`,
          map: null
        };
      }
    }
  };
}

function cjsPlugin(_opts) {
  return {
    name: "unbuild-cjs",
    renderChunk(code, _chunk, opts) {
      if (opts.format === "es") {
        return CJSToESM(code);
      }
      return null;
    }
  };
}
function fixCJSExportTypePlugin(ctx) {
  const regexp = ctx.options.declaration === "node16" ? /\.d\.cts$/ : /\.d\.c?ts$/;
  return FixDtsDefaultCjsExportsPlugin({
    warn: (msg) => ctx.warnings.add(msg),
    matcher: (info) => {
      return info.type === "chunk" && info.exports?.length > 0 && info.exports.includes("default") && regexp.test(info.fileName) && info.isEntry;
    }
  });
}
const CJSyntaxRe = /__filename|__dirname|require\(|require\.resolve\(/;
const CJSShim = `

// -- Unbuild CommonJS Shims --
import __cjs_url__ from 'url';
import __cjs_path__ from 'path';
import __cjs_mod__ from 'module';
const __filename = __cjs_url__.fileURLToPath(import.meta.url);
const __dirname = __cjs_path__.dirname(__filename);
const require = __cjs_mod__.createRequire(import.meta.url);
`;
function CJSToESM(code) {
  if (code.includes(CJSShim) || !CJSyntaxRe.test(code)) {
    return null;
  }
  const lastESMImport = findStaticImports(code).pop();
  const indexToAppend = lastESMImport ? lastESMImport.end : 0;
  const s = new MagicString(code);
  s.appendRight(indexToAppend, CJSShim);
  return {
    code: s.toString(),
    map: s.generateMap()
  };
}

const DEFAULT_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
  ".js",
  ".jsx",
  ".json"
];
function resolveAliases(ctx) {
  const aliases = {
    [ctx.pkg.name]: ctx.options.rootDir,
    ...ctx.options.alias
  };
  if (ctx.options.rollup.alias) {
    if (Array.isArray(ctx.options.rollup.alias.entries)) {
      Object.assign(
        aliases,
        Object.fromEntries(
          ctx.options.rollup.alias.entries.map((entry) => {
            return [entry.find, entry.replacement];
          })
        )
      );
    } else {
      Object.assign(
        aliases,
        ctx.options.rollup.alias.entries || ctx.options.rollup.alias
      );
    }
  }
  return aliases;
}
function getChunkFilename(ctx, chunk, ext) {
  if (chunk.isDynamicEntry) {
    return `chunks/[name].${ext}`;
  }
  return `shared/${ctx.options.name}.[hash].${ext}`;
}

function getRollupOptions(ctx) {
  const _aliases = resolveAliases(ctx);
  return {
    input: Object.fromEntries(
      ctx.options.entries.filter((entry) => entry.builder === "rollup").map((entry) => [
        entry.name,
        resolve(ctx.options.rootDir, entry.input)
      ])
    ),
    output: [
      ctx.options.rollup.emitCJS && {
        dir: resolve(ctx.options.rootDir, ctx.options.outDir),
        entryFileNames: "[name].cjs",
        chunkFileNames: (chunk) => getChunkFilename(ctx, chunk, "cjs"),
        format: "cjs",
        exports: "auto",
        interop: "compat",
        generatedCode: { constBindings: true },
        externalLiveBindings: false,
        freeze: false,
        sourcemap: ctx.options.sourcemap,
        ...ctx.options.rollup.output
      },
      {
        dir: resolve(ctx.options.rootDir, ctx.options.outDir),
        entryFileNames: "[name].mjs",
        chunkFileNames: (chunk) => getChunkFilename(ctx, chunk, "mjs"),
        format: "esm",
        exports: "auto",
        generatedCode: { constBindings: true },
        externalLiveBindings: false,
        freeze: false,
        sourcemap: ctx.options.sourcemap,
        ...ctx.options.rollup.output
      }
    ].filter(Boolean),
    external(originalId) {
      const resolvedId = resolveAlias(originalId, _aliases);
      const pkgName = parseNodeModulePath(resolvedId)?.name || parseNodeModulePath(originalId)?.name || getpkg(originalId);
      if (arrayIncludes(ctx.options.externals, pkgName) || arrayIncludes(ctx.options.externals, originalId) || arrayIncludes(ctx.options.externals, resolvedId)) {
        return true;
      }
      for (const id of [originalId, resolvedId]) {
        if (id[0] === "." || isAbsolute(id) || /src[/\\]/.test(id) || id.startsWith(ctx.pkg.name)) {
          return false;
        }
      }
      if (ctx.options.rollup.inlineDependencies === true || Array.isArray(ctx.options.rollup.inlineDependencies) && (arrayIncludes(ctx.options.rollup.inlineDependencies, pkgName) || arrayIncludes(ctx.options.rollup.inlineDependencies, originalId) || arrayIncludes(ctx.options.rollup.inlineDependencies, resolvedId))) {
        return false;
      }
      warn(ctx, `Implicitly bundling "${originalId}"`);
      return false;
    },
    onwarn(warning, rollupWarn) {
      if (!warning.code || !["CIRCULAR_DEPENDENCY"].includes(warning.code)) {
        rollupWarn(warning);
      }
    },
    plugins: [
      ctx.options.rollup.replace && replace({
        ...ctx.options.rollup.replace,
        values: {
          ...ctx.options.replace,
          ...ctx.options.rollup.replace.values
        }
      }),
      ctx.options.rollup.alias && alias({
        ...ctx.options.rollup.alias,
        entries: _aliases
      }),
      ctx.options.rollup.resolve && nodeResolve({
        extensions: DEFAULT_EXTENSIONS,
        exportConditions: ["production"],
        ...ctx.options.rollup.resolve
      }),
      ctx.options.rollup.json && JSONPlugin({
        ...ctx.options.rollup.json
      }),
      shebangPlugin(),
      ctx.options.rollup.esbuild && esbuild({
        sourcemap: ctx.options.sourcemap,
        ...ctx.options.rollup.esbuild
      }),
      ctx.options.rollup.commonjs && commonjs({
        extensions: DEFAULT_EXTENSIONS,
        ...ctx.options.rollup.commonjs
      }),
      ctx.options.rollup.preserveDynamicImports && {
        name: "unbuild=preserve-dynamic-imports",
        renderDynamicImport() {
          return { left: "import(", right: ")" };
        }
      },
      ctx.options.rollup.cjsBridge && cjsPlugin(),
      rawPlugin()
    ].filter((p) => !!p)
  };
}

async function rollupStub(ctx) {
  const babelPlugins = ctx.options.stubOptions.jiti.transformOptions?.babel?.plugins;
  const importedBabelPlugins = [];
  const jitiImportResolve = ctx.options.stubOptions.absoluteJitiPath ? (...args) => pathToFileURL(resolve(...args)) : relative;
  const serializedJitiOptions = JSON.stringify(
    {
      ...ctx.options.stubOptions.jiti,
      alias: {
        ...resolveAliases(ctx),
        ...ctx.options.stubOptions.jiti.alias
      },
      transformOptions: {
        ...ctx.options.stubOptions.jiti.transformOptions,
        babel: {
          ...ctx.options.stubOptions.jiti.transformOptions?.babel,
          plugins: "__$BABEL_PLUGINS"
        }
      }
    },
    null,
    2
  ).replace(
    '"__$BABEL_PLUGINS"',
    Array.isArray(babelPlugins) ? "[" + babelPlugins.map((plugin, i) => {
      if (Array.isArray(plugin)) {
        const [name, ...args] = plugin;
        importedBabelPlugins.push(name);
        return `[` + [
          `plugin${i}`,
          ...args.map((val) => JSON.stringify(val))
        ].join(", ") + "]";
      } else {
        importedBabelPlugins.push(plugin);
        return `plugin${i}`;
      }
    }).join(",") + "]" : "[]"
  );
  for (const entry of ctx.options.entries.filter(
    (entry2) => entry2.builder === "rollup"
  )) {
    const output = resolve(
      ctx.options.rootDir,
      ctx.options.outDir,
      entry.name
    );
    const isESM = ctx.pkg.type === "module";
    const resolvedEntry = fileURLToPath(ctx.jiti.esmResolve(entry.input));
    const resolvedEntryWithoutExt = resolvedEntry.slice(
      0,
      Math.max(0, resolvedEntry.length - extname(resolvedEntry).length)
    );
    const resolvedEntryForTypeImport = isESM ? `${resolvedEntry.replace(/(\.m?)(ts)$/, "$1js")}` : resolvedEntryWithoutExt;
    const code = await promises.readFile(resolvedEntry, "utf8");
    const shebang = getShebang(code);
    await mkdir(dirname(output), { recursive: true });
    if (ctx.options.rollup.emitCJS) {
      const jitiCJSPath = jitiImportResolve(
        dirname(output),
        await resolvePath("jiti", {
          url: import.meta.url,
          conditions: ["node", "require"]
        })
      );
      await writeFile(
        output + ".cjs",
        shebang + [
          `const { createJiti } = require(${JSON.stringify(jitiCJSPath)})`,
          ...importedBabelPlugins.map(
            (plugin, i) => `const plugin${i} = require(${JSON.stringify(plugin)})`
          ),
          "",
          `const jiti = createJiti(__filename, ${serializedJitiOptions})`,
          "",
          `/** @type {import(${JSON.stringify(
            resolvedEntryForTypeImport
          )})} */`,
          `module.exports = jiti(${JSON.stringify(resolvedEntry)})`
        ].join("\n")
      );
    }
    const namedExports = await resolveModuleExportNames(
      resolvedEntry,
      {
        extensions: DEFAULT_EXTENSIONS
      }
    ).catch((error) => {
      warn(ctx, `Cannot analyze ${resolvedEntry} for exports:` + error);
      return [];
    });
    const hasDefaultExport = namedExports.includes("default") || namedExports.length === 0;
    const jitiESMPath = jitiImportResolve(
      dirname(output),
      await resolvePath("jiti", {
        url: import.meta.url,
        conditions: ["node", "import"]
      })
    );
    await writeFile(
      output + ".mjs",
      shebang + [
        `import { createJiti } from ${JSON.stringify(jitiESMPath)};`,
        ...importedBabelPlugins.map(
          (plugin, i) => `import plugin${i} from ${JSON.stringify(plugin)}`
        ),
        "",
        `const jiti = createJiti(import.meta.url, ${serializedJitiOptions})`,
        "",
        `/** @type {import(${JSON.stringify(resolvedEntryForTypeImport)})} */`,
        `const _module = await jiti.import(${JSON.stringify(
          resolvedEntry
        )});`,
        hasDefaultExport ? "\nexport default _module?.default ?? _module;" : "",
        ...namedExports.filter((name) => name !== "default").map((name) => `export const ${name} = _module.${name};`)
      ].join("\n")
    );
    if (ctx.options.declaration) {
      const dtsContent = [
        `export * from ${JSON.stringify(resolvedEntryForTypeImport)};`,
        hasDefaultExport ? `export { default } from ${JSON.stringify(resolvedEntryForTypeImport)};` : ""
      ].join("\n");
      await writeFile(output + ".d.cts", dtsContent);
      await writeFile(output + ".d.mts", dtsContent);
      if (ctx.options.declaration === "compatible" || ctx.options.declaration === true) {
        await writeFile(output + ".d.ts", dtsContent);
      }
    }
    if (shebang) {
      await makeExecutable(output + ".cjs");
      await makeExecutable(output + ".mjs");
    }
  }
}

function rollupWatch(rollupOptions) {
  const watcher = watch(rollupOptions);
  let inputs;
  if (Array.isArray(rollupOptions.input)) {
    inputs = rollupOptions.input;
  } else if (typeof rollupOptions.input === "string") {
    inputs = [rollupOptions.input];
  } else {
    inputs = Object.keys(rollupOptions.input || {});
  }
  consola$1.info(
    `[unbuild] [rollup] Starting watchers for entries: ${inputs.map((input) => "./" + relative(process.cwd(), input)).join(", ")}`
  );
  consola$1.warn(
    "[unbuild] [rollup] Watch mode is experimental and may be unstable"
  );
  watcher.on("change", (id, { event }) => {
    consola$1.info(`${colors.cyan(relative(".", id))} was ${event}d`);
  });
  watcher.on("restart", () => {
    consola$1.info(colors.gray("[unbuild] [rollup] Rebuilding bundle"));
  });
  watcher.on("event", (event) => {
    if (event.code === "END") {
      consola$1.success(colors.green("[unbuild] [rollup] Rebuild finished\n"));
    }
  });
}

async function rollupBuild(ctx) {
  if (ctx.options.stub) {
    await rollupStub(ctx);
    await ctx.hooks.callHook("rollup:done", ctx);
    return;
  }
  const rollupOptions = getRollupOptions(ctx);
  await ctx.hooks.callHook("rollup:options", ctx, rollupOptions);
  if (Object.keys(rollupOptions.input).length === 0) {
    await ctx.hooks.callHook("rollup:done", ctx);
    return;
  }
  const buildResult = await rollup(rollupOptions);
  await ctx.hooks.callHook("rollup:build", ctx, buildResult);
  const allOutputOptions = rollupOptions.output;
  for (const outputOptions of allOutputOptions) {
    const { output } = await buildResult.write(outputOptions);
    const chunkFileNames = /* @__PURE__ */ new Set();
    const outputChunks = output.filter(
      (e) => e.type === "chunk"
    );
    for (const entry of outputChunks) {
      chunkFileNames.add(entry.fileName);
      for (const id of entry.imports) {
        ctx.usedImports.add(id);
      }
      if (entry.isEntry) {
        ctx.buildEntries.push({
          chunks: entry.imports.filter(
            (i) => outputChunks.find((c) => c.fileName === i)
          ),
          modules: Object.entries(entry.modules).map(([id, mod]) => ({
            id,
            bytes: mod.renderedLength
          })),
          path: entry.fileName,
          bytes: Buffer.byteLength(entry.code, "utf8"),
          exports: entry.exports
        });
      }
    }
    for (const chunkFileName of chunkFileNames) {
      ctx.usedImports.delete(chunkFileName);
    }
  }
  if (ctx.options.watch) {
    rollupWatch(rollupOptions);
    if (ctx.options.declaration && ctx.options.watch) {
      consola$1.warn("`rollup` DTS builder does not support watch mode yet.");
    }
    return;
  }
  if (ctx.options.declaration) {
    rollupOptions.plugins = [
      ...rollupOptions.plugins,
      dts(ctx.options.rollup.dts),
      removeShebangPlugin(),
      ctx.options.rollup.emitCJS && fixCJSExportTypePlugin(ctx)
    ].filter(
      (plugin) => (
        /**
         * Issue: #396
         * rollup-plugin-dts conflicts with rollup-plugin-commonjs:
         * https://github.com/Swatinem/rollup-plugin-dts?tab=readme-ov-file#what-to-expect
         */
        !!plugin && (!("name" in plugin) || plugin.name !== "commonjs")
      )
    );
    await ctx.hooks.callHook("rollup:dts:options", ctx, rollupOptions);
    const typesBuild = await rollup(rollupOptions);
    await ctx.hooks.callHook("rollup:dts:build", ctx, typesBuild);
    if (ctx.options.rollup.emitCJS) {
      await typesBuild.write({
        dir: resolve(ctx.options.rootDir, ctx.options.outDir),
        entryFileNames: "[name].d.cts",
        chunkFileNames: (chunk) => getChunkFilename(ctx, chunk, "d.cts")
      });
    }
    await typesBuild.write({
      dir: resolve(ctx.options.rootDir, ctx.options.outDir),
      entryFileNames: "[name].d.mts",
      chunkFileNames: (chunk) => getChunkFilename(ctx, chunk, "d.mts")
    });
    if (ctx.options.declaration === true || ctx.options.declaration === "compatible") {
      await typesBuild.write({
        dir: resolve(ctx.options.rootDir, ctx.options.outDir),
        entryFileNames: "[name].d.ts",
        chunkFileNames: (chunk) => getChunkFilename(ctx, chunk, "d.ts")
      });
    }
  }
  await ctx.hooks.callHook("rollup:done", ctx);
}

async function typesBuild(ctx) {
  const entries = ctx.options.entries.filter(
    (entry) => entry.builder === "untyped"
  );
  await ctx.hooks.callHook("untyped:entries", ctx, entries);
  for (const entry of entries) {
    const options = {
      jiti: {
        interopDefault: true,
        transformOptions: {
          babel: {
            plugins: [untypedPlugin]
          }
        }
      }
    };
    await ctx.hooks.callHook("untyped:entry:options", ctx, entry, options);
    const untypedJiti = createJiti(ctx.options.rootDir, options.jiti);
    const distDir = entry.outDir;
    let rawSchema = await untypedJiti.import(resolve(ctx.options.rootDir, entry.input), {
      try: true
    }) || {};
    const rawSchemaKeys = Object.keys(rawSchema);
    if (rawSchemaKeys.length === 1 && rawSchemaKeys[0] === "default") {
      rawSchema = rawSchema.default;
    }
    const defaults = entry.defaults || {};
    const schema = await resolveSchema(rawSchema, defaults);
    await ctx.hooks.callHook("untyped:entry:schema", ctx, entry, schema);
    const outputs = {
      markdown: {
        fileName: resolve(distDir, `${entry.name}.md`),
        contents: generateMarkdown(schema)
      },
      schema: {
        fileName: `${entry.name}.schema.json`,
        contents: JSON.stringify(schema, null, 2)
      },
      defaults: {
        fileName: `${entry.name}.defaults.json`,
        contents: JSON.stringify(defaults, null, 2)
      },
      declaration: entry.declaration ? {
        fileName: `${entry.name}.d.ts`,
        contents: generateTypes(schema, {
          interfaceName: pascalCase(entry.name + "-schema")
        })
      } : void 0
    };
    await ctx.hooks.callHook("untyped:entry:outputs", ctx, entry, outputs);
    for (const output of Object.values(outputs)) {
      if (!output) continue;
      await writeFile(
        resolve(distDir, output.fileName),
        output.contents,
        "utf8"
      );
    }
  }
  await ctx.hooks.callHook("untyped:done", ctx);
  if (entries.length > 0 && ctx.options.watch) {
    consola$1.warn("`untyped` builder does not support watch mode yet.");
  }
}

async function mkdistBuild(ctx) {
  const entries = ctx.options.entries.filter(
    (e) => e.builder === "mkdist"
  );
  await ctx.hooks.callHook("mkdist:entries", ctx, entries);
  for (const entry of entries) {
    const distDir = entry.outDir;
    if (ctx.options.stub) {
      await rmdir(distDir);
      await symlink(entry.input, distDir);
    } else {
      const mkdistOptions = {
        rootDir: ctx.options.rootDir,
        srcDir: entry.input,
        distDir,
        cleanDist: false,
        ...entry
      };
      await ctx.hooks.callHook(
        "mkdist:entry:options",
        ctx,
        entry,
        mkdistOptions
      );
      const output = await mkdist(mkdistOptions);
      ctx.buildEntries.push({
        path: distDir,
        chunks: output.writtenFiles.map((p) => relative(ctx.options.outDir, p))
      });
      await ctx.hooks.callHook("mkdist:entry:build", ctx, entry, output);
      if (output.errors) {
        for (const error of output.errors) {
          warn(
            ctx,
            `mkdist build failed for \`${relative(ctx.options.rootDir, error.filename)}\`:
${error.errors.map((e) => `  - ${e}`).join("\n")}`
          );
        }
      }
    }
  }
  await ctx.hooks.callHook("mkdist:done", ctx);
  if (entries.length > 0 && ctx.options.watch) {
    consola$1.warn("`mkdist` builder does not support watch mode yet.");
  }
}

const copy = promises.cp || promises.copyFile;
async function copyBuild(ctx) {
  const entries = ctx.options.entries.filter(
    (e) => e.builder === "copy"
  );
  await ctx.hooks.callHook("copy:entries", ctx, entries);
  for (const entry of entries) {
    const distDir = entry.outDir;
    if (ctx.options.stub) {
      await rmdir(distDir);
      await symlink(entry.input, distDir);
    } else {
      const patterns = Array.isArray(entry.pattern) ? entry.pattern : [entry.pattern || "**"];
      const paths = await glob(patterns, {
        cwd: resolve(ctx.options.rootDir, entry.input),
        absolute: false
      });
      const outputList = await Promise.allSettled(
        paths.map(async (path) => {
          const src = resolve(ctx.options.rootDir, entry.input, path);
          const dist = resolve(ctx.options.rootDir, distDir, path);
          await copy(src, dist);
          return dist;
        })
      );
      for (const output of outputList) {
        if (output.status === "rejected") {
          warn(ctx, output.reason);
        }
      }
      ctx.buildEntries.push({
        path: distDir,
        chunks: outputList.filter(({ status }) => status === "fulfilled").map(
          (p) => relative(
            ctx.options.outDir,
            p.value
          )
        )
      });
    }
  }
  await ctx.hooks.callHook("copy:done", ctx);
  if (entries.length > 0 && ctx.options.watch) {
    consola$1.warn("`untyped` builder does not support watch mode yet.");
  }
}

async function build(rootDir, stub, inputConfig = {}) {
  rootDir = resolve(process.cwd(), rootDir || ".");
  const jiti = createJiti(rootDir);
  const _buildConfig = await jiti.import(inputConfig?.config || "./build.config", {
    try: !inputConfig.config,
    default: true
  }) || {};
  const buildConfigs = (Array.isArray(_buildConfig) ? _buildConfig : [_buildConfig]).filter(Boolean);
  const pkg = await jiti.import("./package.json", {
    try: true,
    default: true
  }) || {};
  const cleanedDirs = [];
  const _watchMode = inputConfig.watch === true;
  const _stubMode = !_watchMode && (stub || inputConfig.stub === true);
  if (!_watchMode && !_stubMode) {
    Object.assign(pkg, pkg.publishConfig);
  }
  for (const buildConfig of buildConfigs) {
    await _build(
      rootDir,
      inputConfig,
      buildConfig,
      pkg,
      cleanedDirs,
      _stubMode,
      _watchMode
    );
  }
}
async function _build(rootDir, inputConfig = {}, buildConfig, pkg, cleanedDirs, _stubMode, _watchMode) {
  const preset = await resolvePreset(
    buildConfig.preset || pkg.unbuild?.preset || pkg.build?.preset || inputConfig.preset || "auto",
    rootDir
  );
  const options = defu(
    buildConfig,
    pkg.unbuild || pkg.build,
    inputConfig,
    preset,
    {
      name: (pkg?.name || "").split("/").pop() || "default",
      rootDir,
      entries: [],
      clean: true,
      declaration: void 0,
      outDir: "dist",
      stub: _stubMode,
      stubOptions: {
        /**
         * See https://github.com/unjs/jiti#%EF%B8%8F-options
         */
        jiti: {
          interopDefault: true,
          alias: {}
        }
      },
      watch: _watchMode,
      watchOptions: _watchMode ? {
        exclude: "node_modules/**",
        include: "src/**"
      } : void 0,
      externals: [
        ...Module.builtinModules,
        ...Module.builtinModules.map((m) => "node:" + m)
      ],
      dependencies: [],
      devDependencies: [],
      peerDependencies: [],
      alias: {},
      replace: {},
      failOnWarn: true,
      sourcemap: false,
      rollup: {
        emitCJS: false,
        watch: false,
        cjsBridge: false,
        inlineDependencies: false,
        preserveDynamicImports: true,
        output: {
          // https://v8.dev/features/import-attributes
          importAttributesKey: "with"
        },
        // Plugins
        replace: {
          preventAssignment: true
        },
        alias: {},
        resolve: {
          preferBuiltins: true
        },
        json: {
          preferConst: true
        },
        commonjs: {
          ignoreTryCatch: true
        },
        esbuild: { target: "esnext" },
        dts: {
          compilerOptions: {
            // https://github.com/Swatinem/rollup-plugin-dts/issues/143
            preserveSymlinks: false,
            // https://github.com/Swatinem/rollup-plugin-dts/issues/127
            composite: false
          },
          respectExternal: true
        }
      },
      parallel: false
    }
  );
  options.outDir = resolve(options.rootDir, options.outDir);
  const jiti = createJiti(options.rootDir, { interopDefault: true });
  const ctx = {
    options,
    jiti,
    warnings: /* @__PURE__ */ new Set(),
    pkg,
    buildEntries: [],
    usedImports: /* @__PURE__ */ new Set(),
    hooks: createHooks()
  };
  if (preset.hooks) {
    ctx.hooks.addHooks(preset.hooks);
  }
  if (inputConfig.hooks) {
    ctx.hooks.addHooks(inputConfig.hooks);
  }
  if (buildConfig.hooks) {
    ctx.hooks.addHooks(buildConfig.hooks);
  }
  await ctx.hooks.callHook("build:prepare", ctx);
  options.entries = options.entries.map(
    (entry) => typeof entry === "string" ? { input: entry } : entry
  );
  for (const entry of options.entries) {
    if (typeof entry.name !== "string") {
      let relativeInput = isAbsolute(entry.input) ? relative(rootDir, entry.input) : normalize(entry.input);
      if (relativeInput.startsWith("./")) {
        relativeInput = relativeInput.slice(2);
      }
      entry.name = removeExtension(relativeInput.replace(/^src\//, ""));
    }
    if (!entry.input) {
      throw new Error("Missing entry input: " + dumpObject(entry));
    }
    if (!entry.builder) {
      entry.builder = entry.input.endsWith("/") ? "mkdist" : "rollup";
    }
    if (options.declaration !== void 0 && entry.declaration === void 0) {
      entry.declaration = options.declaration;
    }
    entry.input = resolve(options.rootDir, entry.input);
    entry.outDir = resolve(options.rootDir, entry.outDir || options.outDir);
  }
  options.dependencies = Object.keys(pkg.dependencies || {});
  options.peerDependencies = Object.keys(pkg.peerDependencies || {});
  options.devDependencies = Object.keys(pkg.devDependencies || {});
  options.externals.push(...inferPkgExternals(pkg));
  options.externals = [...new Set(options.externals)];
  await ctx.hooks.callHook("build:before", ctx);
  consola.info(
    colors.cyan(`${options.stub ? "Stubbing" : "Building"} ${options.name}`)
  );
  if (process.env.DEBUG) {
    consola.info(`${colors.bold("Root dir:")} ${options.rootDir}
  ${colors.bold("Entries:")}
  ${options.entries.map((entry) => "  " + dumpObject(entry)).join("\n  ")}
`);
  }
  if (options.clean) {
    for (const dir of new Set(
      options.entries.map((e) => e.outDir).filter((p) => !!p).sort()
    )) {
      if (dir === options.rootDir || options.rootDir.startsWith(withTrailingSlash(dir)) || cleanedDirs.some((c) => dir.startsWith(c))) {
        continue;
      }
      cleanedDirs.push(dir);
      consola.info(
        `Cleaning dist directory: \`./${relative(process.cwd(), dir)}\``
      );
      await rmdir(dir);
      await promises.mkdir(dir, { recursive: true });
    }
  }
  const buildTasks = [
    typesBuild,
    // untyped
    mkdistBuild,
    // mkdist
    rollupBuild,
    // rollup
    copyBuild
    // copy
  ];
  if (options.parallel) {
    await Promise.all(buildTasks.map((task) => task(ctx)));
  } else {
    for (const task of buildTasks) {
      await task(ctx);
    }
  }
  if (options.stub || options.watch) {
    await ctx.hooks.callHook("build:done", ctx);
    return;
  }
  consola.success(colors.green("Build succeeded for " + options.name));
  const outFiles = await glob(["**"], { cwd: options.outDir });
  for (const file of outFiles) {
    let entry = ctx.buildEntries.find((e) => e.path === file);
    if (!entry) {
      entry = {
        path: file,
        chunk: true
      };
      ctx.buildEntries.push(entry);
    }
    if (!entry.bytes) {
      const stat = await promises.stat(resolve(options.outDir, file));
      entry.bytes = stat.size;
    }
  }
  const rPath = (p) => relative(process.cwd(), resolve(options.outDir, p));
  for (const entry of ctx.buildEntries.filter((e) => !e.chunk)) {
    let totalBytes = entry.bytes || 0;
    for (const chunk of entry.chunks || []) {
      totalBytes += ctx.buildEntries.find((e) => e.path === chunk)?.bytes || 0;
    }
    let line = `  ${colors.bold(rPath(entry.path))} (` + [
      totalBytes && `total size: ${colors.cyan(prettyBytes(totalBytes))}`,
      entry.bytes && `chunk size: ${colors.cyan(prettyBytes(entry.bytes))}`,
      entry.exports?.length && `exports: ${colors.gray(entry.exports.join(", "))}`
    ].filter(Boolean).join(", ") + ")";
    if (entry.chunks?.length) {
      line += "\n" + entry.chunks.map((p) => {
        const chunk = ctx.buildEntries.find((e) => e.path === p) || {};
        return colors.gray(
          "  \u2514\u2500 " + rPath(p) + colors.bold(
            chunk.bytes ? ` (${prettyBytes(chunk?.bytes)})` : ""
          )
        );
      }).join("\n");
    }
    if (entry.modules?.length) {
      line += "\n" + entry.modules.filter((m) => m.id.includes("node_modules")).sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).map((m) => {
        return colors.gray(
          "  \u{1F4E6} " + rPath(m.id) + colors.bold(m.bytes ? ` (${prettyBytes(m.bytes)})` : "")
        );
      }).join("\n");
    }
    consola.log(entry.chunk ? colors.gray(line) : line);
  }
  console.log(
    "\u03A3 Total dist size (byte size):",
    colors.cyan(
      prettyBytes(ctx.buildEntries.reduce((a, e) => a + (e.bytes || 0), 0))
    )
  );
  validateDependencies(ctx);
  validatePackage(pkg, rootDir, ctx);
  await ctx.hooks.callHook("build:done", ctx);
  consola.log("");
  if (ctx.warnings.size > 0) {
    consola.warn(
      "Build is done with some warnings:\n\n" + [...ctx.warnings].map((msg) => "- " + msg).join("\n")
    );
    if (ctx.options.failOnWarn) {
      consola.error(
        "Exiting with code (1). You can change this behavior by setting `failOnWarn: false` ."
      );
      process.exit(1);
    }
  }
}

export { definePreset as a, build as b, defineBuildConfig as d };
