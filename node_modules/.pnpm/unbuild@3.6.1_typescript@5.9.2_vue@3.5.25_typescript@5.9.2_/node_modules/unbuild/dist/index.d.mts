import { PackageJson } from 'pkg-types';
import { Hookable } from 'hookable';
import { OutputOptions, RollupOptions as RollupOptions$1, Plugin, RollupBuild, WatcherOptions } from 'rollup';
import { JitiOptions, Jiti } from 'jiti';
import { RollupReplaceOptions } from '@rollup/plugin-replace';
import { RollupAliasOptions } from '@rollup/plugin-alias';
import { RollupNodeResolveOptions } from '@rollup/plugin-node-resolve';
import { RollupJsonOptions } from '@rollup/plugin-json';
import { Options } from 'rollup-plugin-dts';
import commonjs from '@rollup/plugin-commonjs';
import { FilterPattern } from '@rollup/pluginutils';
import { CommonOptions, Loader } from 'esbuild';
import { MkdistOptions } from 'mkdist';
import { Schema } from 'untyped';

type EsbuildOptions = CommonOptions & {
    include?: FilterPattern;
    exclude?: FilterPattern;
    /**
     * Map extension to esbuild loader
     * Note that each entry (the extension) needs to start with a dot
     */
    loaders?: {
        [ext: string]: Loader | false;
    };
};

type RollupCommonJSOptions = Parameters<typeof commonjs>[0] & {};
interface RollupBuildEntry extends BaseBuildEntry {
    builder: "rollup";
}
interface RollupBuildOptions {
    /**
     * If enabled, unbuild generates a CommonJS build in addition to the ESM build.
     */
    emitCJS?: boolean;
    /**
     * Enable experimental active watcher
     *
     * @experimental
     */
    watch?: boolean;
    /**
     * If enabled, unbuild generates CommonJS polyfills for ESM builds.
     */
    cjsBridge?: boolean;
    /**
     * Preserve dynamic imports as-is
     */
    preserveDynamicImports?: boolean;
    /**
     * Whether to inline dependencies not explicitly set in "dependencies" or "peerDependencies" or as marked externals to the bundle.
     *
     * If set to true, all such dependencies will be inlined.
     * If an array of string or regular expressions is passed, these will be used to determine whether to inline such a dependency.
     */
    inlineDependencies?: boolean | Array<string | RegExp>;
    /**
     * Rollup [Output Options](https://rollupjs.org/configuration-options)
     */
    output?: OutputOptions;
    /**
     * Replace plugin options
     * Set to `false` to disable the plugin.
     * Read more: [@rollup/plugin-replace](https://www.npmjs.com/package/@rollup/plugin-replace)
     */
    replace: RollupReplaceOptions | false;
    /**
     * Alias plugin options
     * Set to `false` to disable the plugin.
     * Read more: [@rollup/plugin-alias](https://www.npmjs.com/package/@rollup/plugin-alias)
     */
    alias: RollupAliasOptions | false;
    /**
     * Resolve plugin options
     * Set to `false` to disable the plugin.
     * Read more: [@rollup/plugin-node-resolve](https://www.npmjs.com/package/@rollup/plugin-node-resolve)
     */
    resolve: RollupNodeResolveOptions | false;
    /**
     * JSON plugin options
     * Set to `false` to disable the plugin.
     * Read more: [@rollup/plugin-json](https://www.npmjs.com/package/@rollup/plugin-json)
     */
    json: RollupJsonOptions | false;
    /**
     * ESBuild plugin options
     * Set to `false` to disable the plugin.
     * Read more: [esbuild](https://www.npmjs.com/package/esbuild)
     */
    esbuild: EsbuildOptions | false;
    /**
     * CommonJS plugin options
     * Set to `false` to disable the plugin.
     * Read more: [@rollup/plugin-commonjs](https://www.npmjs.com/package/@rollup/plugin-commonjs)
     */
    commonjs: RollupCommonJSOptions | false;
    /**
     * DTS plugin options
     * Read more: [rollup-plugin-dts](https://www.npmjs.com/package/rollup-plugin-dts)
     */
    dts: Options;
}
interface RollupOptions extends RollupOptions$1 {
    plugins: Plugin[];
}
interface RollupHooks {
    "rollup:options": (ctx: BuildContext, options: RollupOptions) => void | Promise<void>;
    "rollup:build": (ctx: BuildContext, build: RollupBuild) => void | Promise<void>;
    "rollup:dts:options": (ctx: BuildContext, options: RollupOptions) => void | Promise<void>;
    "rollup:dts:build": (ctx: BuildContext, build: RollupBuild) => void | Promise<void>;
    "rollup:done": (ctx: BuildContext) => void | Promise<void>;
}

type _BaseAndMkdist = BaseBuildEntry & MkdistOptions;
interface MkdistBuildEntry extends _BaseAndMkdist {
    builder: "mkdist";
}
interface MkdistHooks {
    "mkdist:entries": (ctx: BuildContext, entries: MkdistBuildEntry[]) => void | Promise<void>;
    "mkdist:entry:options": (ctx: BuildContext, entry: MkdistBuildEntry, options: MkdistOptions) => void | Promise<void>;
    "mkdist:entry:build": (ctx: BuildContext, entry: MkdistBuildEntry, output: {
        writtenFiles: string[];
    }) => void | Promise<void>;
    "mkdist:done": (ctx: BuildContext) => void | Promise<void>;
}

interface CopyBuildEntry extends BaseBuildEntry {
    builder: "copy";
    pattern?: string | string[];
}
interface CopyHooks {
    "copy:entries": (ctx: BuildContext, entries: CopyBuildEntry[]) => void | Promise<void>;
    "copy:done": (ctx: BuildContext) => void | Promise<void>;
}

interface UntypedBuildEntry extends BaseBuildEntry {
    builder: "untyped";
    defaults?: Record<string, any>;
}
interface UntypedOutput {
    fileName: string;
    contents: string;
}
interface UntypedOutputs {
    markdown: UntypedOutput;
    schema: UntypedOutput;
    defaults: UntypedOutput;
    declaration?: UntypedOutput;
}
interface UntypedHooks {
    "untyped:entries": (ctx: BuildContext, entries: UntypedBuildEntry[]) => void | Promise<void>;
    "untyped:entry:options": (ctx: BuildContext, entry: UntypedBuildEntry, options: any) => void | Promise<void>;
    "untyped:entry:schema": (ctx: BuildContext, entry: UntypedBuildEntry, schema: Schema) => void | Promise<void>;
    "untyped:entry:outputs": (ctx: BuildContext, entry: UntypedBuildEntry, outputs: UntypedOutputs) => void | Promise<void>;
    "untyped:done": (ctx: BuildContext) => void | Promise<void>;
}

interface BaseBuildEntry {
    builder?: "untyped" | "rollup" | "mkdist" | "copy";
    input: string;
    name?: string;
    outDir?: string;
    declaration?: "compatible" | "node16" | boolean;
}

type BuildEntry = BaseBuildEntry | RollupBuildEntry | UntypedBuildEntry | MkdistBuildEntry | CopyBuildEntry;
interface BuildOptions {
    /**
     * The name of the project.
     */
    name: string;
    /**
     * The root directory of the project.
     */
    rootDir: string;
    /**
     * Build entries.
     */
    entries: BuildEntry[];
    /**
     * Clean the output directory before building.
     */
    clean: boolean;
    /**
     * @experimental
     * Generate source mapping file.
     */
    sourcemap: boolean;
    /**
     * Whether to generate declaration files.
     * * `compatible` means "src/index.ts" will generate "dist/index.d.mts", "dist/index.d.cts" and "dist/index.d.ts".
     * * `node16` means "src/index.ts" will generate "dist/index.d.mts" and "dist/index.d.cts".
     * * `true` is equivalent to `compatible`.
     * * `false` will disable declaration generation.
     * * `undefined` will auto detect based on "package.json". If "package.json" has "types" field, it will be `"compatible"`, otherwise `false`.
     */
    declaration?: "compatible" | "node16" | boolean;
    /**
     * Output directory.
     */
    outDir: string;
    /**
     * Whether to build with JIT stubs.
     * Read more: [stubbing](https://antfu.me/posts/publish-esm-and-cjs#stubbing)
     */
    stub: boolean;
    /**
     * Whether to build and actively watch the file changes.
     *
     * @experimental This feature is experimental and incomplete.
     */
    watch: boolean;
    /**
     * Watch mode options.
     */
    watchOptions: WatcherOptions | undefined;
    /**
     * Stub options, where [jiti](https://github.com/unjs/jiti)
     * is an object of type `Omit<JitiOptions, "transform" | "onError">`.
     */
    stubOptions: {
        jiti: Omit<JitiOptions, "transform" | "onError">;
        absoluteJitiPath?: boolean;
    };
    /**
     * Used to specify which modules or libraries should be considered external dependencies
     * and not included in the final build product.
     */
    externals: (string | RegExp)[];
    dependencies: string[];
    peerDependencies: string[];
    devDependencies: string[];
    /**
     * Create aliases for module imports to reference modules in code using more concise paths.
     * Allow you to specify an alias for the module path.
     */
    alias: {
        [find: string]: string;
    };
    /**
     * Replace the text in the source code with rules.
     */
    replace: {
        [find: string]: string;
    };
    /**
     * Terminate the build process when a warning appears
     */
    failOnWarn?: boolean;
    /**
     * [Rollup](https://rollupjs.org/configuration-options) Build Options
     */
    rollup: RollupBuildOptions;
    /**
     * Run different types of builds (untyped, mkdist, Rollup, copy) simultaneously.
     */
    parallel: boolean;
}
interface BuildContext {
    options: BuildOptions;
    pkg: PackageJson;
    jiti: Jiti;
    buildEntries: {
        path: string;
        bytes?: number;
        exports?: string[];
        chunks?: string[];
        chunk?: boolean;
        modules?: {
            id: string;
            bytes: number;
        }[];
    }[];
    usedImports: Set<string>;
    warnings: Set<string>;
    hooks: Hookable<BuildHooks>;
}
type BuildPreset = BuildConfig | (() => BuildConfig);
type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
/**
 * In addition to basic `entries`, `presets`, and `hooks`,
 * there are also all the properties of `BuildOptions` except for BuildOptions's `entries`.
 */
interface BuildConfig extends DeepPartial<Omit<BuildOptions, "entries">> {
    /**
     * Specify the entry file or entry module during the construction process.
     */
    entries?: (BuildEntry | string)[];
    /**
     * Used to specify the preset build configuration.
     */
    preset?: string | BuildPreset;
    /**
     * Used to define hook functions during the construction process to perform custom operations during specific construction stages.
     * This configuration allows you to insert custom logic during the build process to meet specific requirements or perform additional operations.
     */
    hooks?: Partial<BuildHooks>;
}
interface BuildHooks extends CopyHooks, UntypedHooks, MkdistHooks, RollupHooks {
    "build:prepare": (ctx: BuildContext) => void | Promise<void>;
    "build:before": (ctx: BuildContext) => void | Promise<void>;
    "build:done": (ctx: BuildContext) => void | Promise<void>;
}
declare function defineBuildConfig(config: BuildConfig | BuildConfig[]): BuildConfig[];
declare function definePreset(preset: BuildPreset): BuildPreset;

declare function build(rootDir: string, stub: boolean, inputConfig?: BuildConfig & {
    config?: string;
}): Promise<void>;

export { build, defineBuildConfig, definePreset };
export type { BaseBuildEntry, BuildConfig, BuildContext, BuildEntry, BuildHooks, BuildOptions, BuildPreset, CopyBuildEntry, MkdistBuildEntry, RollupBuildEntry, RollupBuildOptions, RollupOptions, UntypedBuildEntry, UntypedOutput, UntypedOutputs };
