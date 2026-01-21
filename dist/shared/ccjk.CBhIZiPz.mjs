import { existsSync, readFileSync } from 'node:fs';
import process__default from 'node:process';
import { join } from 'pathe';

function readPackageJson(dir) {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath))
    return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
}
function detectPackageManager(dir) {
  if (existsSync(join(dir, "bun.lockb")))
    return "bun";
  if (existsSync(join(dir, "pnpm-lock.yaml")))
    return "pnpm";
  if (existsSync(join(dir, "yarn.lock")))
    return "yarn";
  if (existsSync(join(dir, "package-lock.json")))
    return "npm";
  const pkg = readPackageJson(dir);
  if (pkg?.packageManager) {
    if (pkg.packageManager.startsWith("pnpm"))
      return "pnpm";
    if (pkg.packageManager.startsWith("yarn"))
      return "yarn";
    if (pkg.packageManager.startsWith("bun"))
      return "bun";
  }
  return "unknown";
}
function detectFrameworks(dir) {
  const frameworks = [];
  const pkg = readPackageJson(dir);
  if (!pkg)
    return frameworks;
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };
  if (allDeps.react)
    frameworks.push("react");
  if (allDeps.vue)
    frameworks.push("vue");
  if (allDeps["@angular/core"])
    frameworks.push("angular");
  if (allDeps.svelte)
    frameworks.push("svelte");
  if (allDeps.next)
    frameworks.push("nextjs");
  if (allDeps.nuxt)
    frameworks.push("nuxt");
  if (allDeps["@remix-run/react"])
    frameworks.push("remix");
  if (allDeps.astro)
    frameworks.push("astro");
  if (allDeps.express)
    frameworks.push("express");
  if (allDeps.fastify)
    frameworks.push("fastify");
  if (allDeps["@nestjs/core"])
    frameworks.push("nestjs");
  if (allDeps.koa)
    frameworks.push("koa");
  if (allDeps.hono)
    frameworks.push("hono");
  if (allDeps.electron)
    frameworks.push("electron");
  if (allDeps["@tauri-apps/api"])
    frameworks.push("tauri");
  if (allDeps["react-native"])
    frameworks.push("react-native");
  if (existsSync(join(dir, "requirements.txt")) || existsSync(join(dir, "pyproject.toml"))) {
    const reqPath = join(dir, "requirements.txt");
    if (existsSync(reqPath)) {
      const reqs = readFileSync(reqPath, "utf-8").toLowerCase();
      if (reqs.includes("django"))
        frameworks.push("django");
      if (reqs.includes("flask"))
        frameworks.push("flask");
      if (reqs.includes("fastapi"))
        frameworks.push("fastapi");
    }
  }
  if (existsSync(join(dir, "Gemfile"))) {
    const gemfile = readFileSync(join(dir, "Gemfile"), "utf-8").toLowerCase();
    if (gemfile.includes("rails"))
      frameworks.push("rails");
  }
  if (existsSync(join(dir, "composer.json"))) {
    try {
      const composer = JSON.parse(readFileSync(join(dir, "composer.json"), "utf-8"));
      if (composer.require?.["laravel/framework"])
        frameworks.push("laravel");
    } catch {
    }
  }
  return frameworks;
}
function detectBuildTools(dir) {
  const tools = [];
  const pkg = readPackageJson(dir);
  if (existsSync(join(dir, "vite.config.ts")) || existsSync(join(dir, "vite.config.js")))
    tools.push("vite");
  if (existsSync(join(dir, "webpack.config.js")) || existsSync(join(dir, "webpack.config.ts")))
    tools.push("webpack");
  if (existsSync(join(dir, "rollup.config.js")) || existsSync(join(dir, "rollup.config.ts")))
    tools.push("rollup");
  if (existsSync(join(dir, "tsup.config.ts")) || existsSync(join(dir, "tsup.config.js")))
    tools.push("tsup");
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.esbuild)
      tools.push("esbuild");
    if (allDeps["@swc/core"])
      tools.push("swc");
    if (allDeps.turbo)
      tools.push("turbopack");
    if (allDeps.parcel)
      tools.push("parcel");
    if (allDeps.unbuild)
      tools.push("unbuild");
  }
  return tools;
}
function detectTestFrameworks(dir) {
  const frameworks = [];
  const pkg = readPackageJson(dir);
  if (existsSync(join(dir, "vitest.config.ts")) || existsSync(join(dir, "vitest.config.js")))
    frameworks.push("vitest");
  if (existsSync(join(dir, "jest.config.js")) || existsSync(join(dir, "jest.config.ts")))
    frameworks.push("jest");
  if (existsSync(join(dir, "cypress.config.ts")) || existsSync(join(dir, "cypress.config.js")))
    frameworks.push("cypress");
  if (existsSync(join(dir, "playwright.config.ts")))
    frameworks.push("playwright");
  if (existsSync(join(dir, "pytest.ini")) || existsSync(join(dir, "conftest.py")))
    frameworks.push("pytest");
  if (pkg) {
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.vitest && !frameworks.includes("vitest"))
      frameworks.push("vitest");
    if (allDeps.jest && !frameworks.includes("jest"))
      frameworks.push("jest");
    if (allDeps.mocha)
      frameworks.push("mocha");
    if (allDeps.cypress && !frameworks.includes("cypress"))
      frameworks.push("cypress");
    if (allDeps["@playwright/test"] && !frameworks.includes("playwright"))
      frameworks.push("playwright");
  }
  return frameworks;
}
function detectCICDSystems(dir) {
  const systems = [];
  if (existsSync(join(dir, ".github", "workflows")))
    systems.push("github-actions");
  if (existsSync(join(dir, ".gitlab-ci.yml")))
    systems.push("gitlab-ci");
  if (existsSync(join(dir, "Jenkinsfile")))
    systems.push("jenkins");
  if (existsSync(join(dir, ".circleci")))
    systems.push("circleci");
  if (existsSync(join(dir, ".travis.yml")))
    systems.push("travis");
  if (existsSync(join(dir, "azure-pipelines.yml")))
    systems.push("azure-pipelines");
  return systems;
}
function detectLanguages(dir) {
  const languages = [];
  if (existsSync(join(dir, "tsconfig.json")))
    languages.push("typescript");
  if (existsSync(join(dir, "package.json"))) {
    if (!languages.includes("typescript"))
      languages.push("javascript");
  }
  if (existsSync(join(dir, "requirements.txt")) || existsSync(join(dir, "pyproject.toml")) || existsSync(join(dir, "setup.py")))
    languages.push("python");
  if (existsSync(join(dir, "Gemfile")))
    languages.push("ruby");
  if (existsSync(join(dir, "go.mod")))
    languages.push("go");
  if (existsSync(join(dir, "Cargo.toml")))
    languages.push("rust");
  if (existsSync(join(dir, "pom.xml")) || existsSync(join(dir, "build.gradle"))) {
    languages.push("java");
    if (existsSync(join(dir, "build.gradle.kts")))
      languages.push("kotlin");
  }
  if (existsSync(join(dir, "composer.json")))
    languages.push("php");
  if (existsSync(join(dir, "Package.swift")))
    languages.push("swift");
  if (existsSync(join(dir, "pubspec.yaml")))
    languages.push("dart");
  return languages;
}
function determineProjectType(info) {
  const frameworks = info.frameworks || [];
  if (frameworks.includes("react-native") || frameworks.includes("flutter"))
    return "mobile";
  if (frameworks.includes("electron") || frameworks.includes("tauri"))
    return "desktop";
  const pkg = info.rootDir ? readPackageJson(info.rootDir) : null;
  if (pkg?.bin)
    return "cli";
  if (pkg?.main || pkg?.exports) {
    const hasAppFramework = frameworks.some(
      (f) => ["react", "vue", "angular", "svelte", "nextjs", "nuxt", "express", "fastify", "nestjs"].includes(f)
    );
    if (!hasAppFramework)
      return "library";
  }
  const frontendFrameworks = ["react", "vue", "angular", "svelte"];
  const backendFrameworks = ["express", "fastify", "nestjs", "koa", "hono", "django", "flask", "fastapi", "rails", "laravel"];
  const metaFrameworks = ["nextjs", "nuxt", "remix", "astro"];
  const hasFrontend = frameworks.some((f) => frontendFrameworks.includes(f));
  const hasBackend = frameworks.some((f) => backendFrameworks.includes(f));
  const hasMeta = frameworks.some((f) => metaFrameworks.includes(f));
  if (hasMeta)
    return "fullstack";
  if (hasFrontend && hasBackend)
    return "fullstack";
  if (hasFrontend)
    return "frontend";
  if (hasBackend)
    return "backend";
  return "unknown";
}
function detectProject(dir = process__default.cwd()) {
  const pkg = readPackageJson(dir);
  const frameworks = detectFrameworks(dir);
  const languages = detectLanguages(dir);
  const info = {
    name: pkg?.name || "unknown",
    type: "unknown",
    packageManager: detectPackageManager(dir),
    frameworks,
    buildTools: detectBuildTools(dir),
    testFrameworks: detectTestFrameworks(dir),
    cicd: detectCICDSystems(dir),
    languages,
    hasTypeScript: existsSync(join(dir, "tsconfig.json")),
    hasDocker: existsSync(join(dir, "Dockerfile")) || existsSync(join(dir, "docker-compose.yml")),
    hasMonorepo: existsSync(join(dir, "pnpm-workspace.yaml")) || existsSync(join(dir, "lerna.json")) || pkg?.workspaces != null,
    rootDir: dir
  };
  info.type = determineProjectType(info);
  return info;
}
function generateSuggestions(project) {
  const suggestions = {
    workflows: ["git"],
    mcpServices: [],
    agents: [],
    skills: [],
    subagentGroups: [],
    outputStyle: "technical-precise"
  };
  if (project.hasTypeScript || project.languages.includes("typescript")) {
    suggestions.subagentGroups.push("typescript-dev");
    suggestions.skills.push("ts-debug", "ts-refactor", "ts-test");
  }
  if (project.languages.includes("python")) {
    suggestions.subagentGroups.push("python-dev");
    suggestions.skills.push("py-debug", "py-refactor", "py-test");
  }
  if (project.frameworks.includes("nextjs") || project.frameworks.includes("nuxt")) {
    suggestions.workflows.push("frontend", "testing");
    suggestions.agents.push("ccjk-performance-expert");
  }
  if (project.frameworks.includes("express") || project.frameworks.includes("fastify") || project.frameworks.includes("nestjs")) {
    suggestions.workflows.push("backend", "testing");
    suggestions.agents.push("ccjk-security-expert");
  }
  if (project.hasDocker || project.cicd.length > 0) {
    suggestions.workflows.push("devops");
    suggestions.subagentGroups.push("devops-team");
    suggestions.skills.push("devops-docker", "devops-ci");
  }
  if (project.testFrameworks.length > 0) {
    suggestions.workflows.push("testing");
    suggestions.agents.push("ccjk-testing-specialist");
  }
  if (project.hasMonorepo) {
    suggestions.agents.push("ccjk-code-reviewer");
  }
  if (project.type === "frontend" || project.type === "fullstack") {
    suggestions.subagentGroups.push("seo-team");
    suggestions.skills.push("seo-meta", "seo-schema");
  }
  suggestions.subagentGroups.push("security-team");
  suggestions.workflows = [...new Set(suggestions.workflows)];
  suggestions.agents = [...new Set(suggestions.agents)];
  suggestions.skills = [...new Set(suggestions.skills)];
  suggestions.subagentGroups = [...new Set(suggestions.subagentGroups)];
  return suggestions;
}
function getProjectSummary(project) {
  const parts = [];
  parts.push(`Project: ${project.name}`);
  parts.push(`Type: ${project.type}`);
  if (project.languages.length > 0) {
    parts.push(`Languages: ${project.languages.join(", ")}`);
  }
  if (project.frameworks.length > 0) {
    parts.push(`Frameworks: ${project.frameworks.join(", ")}`);
  }
  if (project.buildTools.length > 0) {
    parts.push(`Build: ${project.buildTools.join(", ")}`);
  }
  if (project.testFrameworks.length > 0) {
    parts.push(`Testing: ${project.testFrameworks.join(", ")}`);
  }
  parts.push(`Package Manager: ${project.packageManager}`);
  const features = [];
  if (project.hasTypeScript)
    features.push("TypeScript");
  if (project.hasDocker)
    features.push("Docker");
  if (project.hasMonorepo)
    features.push("Monorepo");
  if (features.length > 0) {
    parts.push(`Features: ${features.join(", ")}`);
  }
  return parts.join("\n");
}

export { generateSuggestions as a, detectProject as d, getProjectSummary as g };
