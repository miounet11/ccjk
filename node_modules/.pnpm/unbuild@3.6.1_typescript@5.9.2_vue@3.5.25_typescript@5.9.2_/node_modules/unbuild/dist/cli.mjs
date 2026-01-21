#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import consola from 'consola';
import { resolve } from 'pathe';
import { b as build } from './shared/unbuild.CyYtfvFx.mjs';
import 'node:module';
import 'node:fs';
import 'consola/utils';
import 'defu';
import 'hookable';
import 'pretty-bytes';
import 'tinyglobby';
import 'node:fs/promises';
import 'jiti';
import 'rollup';
import 'rollup-plugin-dts';
import '@rollup/plugin-commonjs';
import '@rollup/plugin-node-resolve';
import '@rollup/plugin-alias';
import '@rollup/plugin-replace';
import 'pathe/utils';
import 'mlly';
import 'esbuild';
import '@rollup/pluginutils';
import '@rollup/plugin-json';
import 'magic-string';
import 'fix-dts-default-cjs-exports/rollup';
import 'untyped';
import 'untyped/babel-plugin';
import 'scule';
import 'mkdist';

const name = "unbuild";
const version = "3.6.1";
const description = "A unified JavaScript build system";

const main = defineCommand({
  meta: {
    name,
    version,
    description
  },
  args: {
    dir: {
      type: "positional",
      description: "The directory to build",
      required: false
    },
    config: {
      type: "string",
      description: [
        "The configuration file to use relative to the current working directory.",
        "                 Unbuild tries to read `build.config` from the build `DIR` by default.",
        ""
      ].join("\n")
    },
    watch: {
      type: "boolean",
      description: "Watch the src dir and rebuild on change (experimental)"
    },
    stub: {
      type: "boolean",
      description: "Stub the package for JIT compilation"
    },
    minify: {
      type: "boolean",
      description: "Minify build"
    },
    sourcemap: {
      type: "boolean",
      description: "Generate sourcemaps (experimental)"
    },
    parallel: {
      type: "boolean",
      description: "Run different types of builds (untyped, mkdist, Rollup, copy) simultaneously."
    }
  },
  async run({ args }) {
    const rootDir = resolve(process.cwd(), args.dir || ".");
    await build(rootDir, args.stub, {
      sourcemap: args.sourcemap,
      config: args.config ? resolve(args.config) : void 0,
      stub: args.stub,
      watch: args.watch,
      rollup: {
        esbuild: {
          minify: args.minify
        }
      }
    }).catch((error) => {
      consola.error(`Error building ${rootDir}: ${error}`);
      throw error;
    });
  }
});
runMain(main);
