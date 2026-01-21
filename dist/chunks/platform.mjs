import * as fs from 'node:fs';
import { homedir, platform as platform$1 } from 'node:os';
import process__default from 'node:process';
import { dirname } from 'pathe';
import { exec } from 'tinyexec';

const WINDOWS_WRAPPED_COMMANDS = ["npx", "uvx", "uv"];
function getPlatform() {
  const p = platform$1();
  if (p === "win32")
    return "windows";
  if (p === "darwin")
    return "macos";
  return "linux";
}
function isTermux() {
  return !!(process__default.env.PREFIX && process__default.env.PREFIX.includes("com.termux")) || !!process__default.env.TERMUX_VERSION || fs.existsSync("/data/data/com.termux/files/usr");
}
function getTermuxPrefix() {
  return process__default.env.PREFIX || "/data/data/com.termux/files/usr";
}
function isWindows() {
  return getPlatform() === "windows";
}
function isWSL() {
  if (process__default.env.WSL_DISTRO_NAME) {
    return true;
  }
  if (fs.existsSync("/proc/version")) {
    try {
      const version = fs.readFileSync("/proc/version", "utf8");
      if (version.includes("Microsoft") || version.includes("WSL")) {
        return true;
      }
    } catch {
    }
  }
  if (fs.existsSync("/mnt/c")) {
    return true;
  }
  return false;
}
function getWSLDistro() {
  if (process__default.env.WSL_DISTRO_NAME) {
    return process__default.env.WSL_DISTRO_NAME;
  }
  if (fs.existsSync("/etc/os-release")) {
    try {
      const osRelease = fs.readFileSync("/etc/os-release", "utf8");
      const nameMatch = osRelease.match(/^PRETTY_NAME="(.+)"$/m);
      if (nameMatch) {
        return nameMatch[1];
      }
    } catch {
    }
  }
  return null;
}
function getWSLInfo() {
  if (!isWSL()) {
    return null;
  }
  let version = null;
  if (fs.existsSync("/proc/version")) {
    try {
      version = fs.readFileSync("/proc/version", "utf8").trim();
    } catch {
    }
  }
  return {
    isWSL: true,
    distro: getWSLDistro(),
    version
  };
}
function getMcpCommand(command = "npx") {
  if (isWindows() && WINDOWS_WRAPPED_COMMANDS.includes(command)) {
    return ["cmd", "/c", command];
  }
  return [command];
}
function normalizeTomlPath(str) {
  return str.replace(/\\+/g, "/").replace(/\/+/g, "/");
}
function getSystemRoot() {
  if (!isWindows())
    return null;
  const env = process__default.env;
  let systemRoot = "C:\\Windows";
  if (Object.prototype.hasOwnProperty.call(env, "SYSTEMROOT") && env.SYSTEMROOT)
    systemRoot = env.SYSTEMROOT;
  else if (Object.prototype.hasOwnProperty.call(env, "SystemRoot") && env.SystemRoot)
    systemRoot = env.SystemRoot;
  return normalizeTomlPath(systemRoot);
}
function shouldUseSudoForGlobalInstall() {
  if (isTermux())
    return false;
  if (getPlatform() !== "linux")
    return false;
  const npmPrefix = getGlobalNpmPrefix();
  if (npmPrefix) {
    if (isPathInsideHome(npmPrefix) || canWriteToPath(npmPrefix))
      return false;
  }
  const getuid = process__default.getuid;
  if (typeof getuid !== "function")
    return false;
  try {
    return getuid() !== 0;
  } catch {
    return false;
  }
}
function wrapCommandWithSudo(command, args) {
  if (shouldUseSudoForGlobalInstall()) {
    return {
      command: "sudo",
      args: [command, ...args],
      usedSudo: true
    };
  }
  return {
    command,
    args,
    usedSudo: false
  };
}
const WRITE_CHECK_FLAG = 2;
function normalizePath(path) {
  return normalizeTomlPath(path).replace(/\/+$/, "");
}
function isPathInsideHome(path) {
  const home = homedir();
  if (!home)
    return false;
  const normalizedHome = normalizePath(home);
  const normalizedPath = normalizePath(path);
  return normalizedPath === normalizedHome || normalizedPath.startsWith(`${normalizedHome}/`);
}
function canWriteToPath(path) {
  try {
    fs.accessSync(path, WRITE_CHECK_FLAG);
    return true;
  } catch {
    return false;
  }
}
function getGlobalNpmPrefix() {
  const env = process__default.env;
  const envPrefix = env.npm_config_prefix || env.NPM_CONFIG_PREFIX || env.PREFIX;
  if (envPrefix)
    return envPrefix;
  const execPath = process__default.execPath;
  if (execPath) {
    const binDir = dirname(execPath);
    return dirname(binDir);
  }
  return null;
}
async function commandExists(command) {
  try {
    const cmd = getPlatform() === "windows" ? "where" : "which";
    const res = await exec(cmd, [command]);
    if (res.exitCode === 0) {
      return true;
    }
  } catch {
  }
  if (isTermux()) {
    const termuxPrefix = getTermuxPrefix();
    const possiblePaths = [
      `${termuxPrefix}/bin/${command}`,
      `${termuxPrefix}/usr/bin/${command}`,
      `/data/data/com.termux/files/usr/bin/${command}`
    ];
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        return true;
      }
    }
  }
  if (getPlatform() !== "windows") {
    const home = homedir();
    const commonPaths = [
      `/usr/local/bin/${command}`,
      `/usr/bin/${command}`,
      `/bin/${command}`,
      `${home}/.local/bin/${command}`
    ];
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        return true;
      }
    }
    if (getPlatform() === "macos") {
      const homebrewPaths = await getHomebrewCommandPaths(command);
      for (const path of homebrewPaths) {
        if (fs.existsSync(path)) {
          return true;
        }
      }
    }
  }
  return false;
}
async function getHomebrewCommandPaths(command) {
  const paths = [];
  const homebrewPrefixes = [
    "/opt/homebrew",
    // Apple Silicon (M1/M2)
    "/usr/local"
    // Intel Mac
  ];
  for (const prefix of homebrewPrefixes) {
    paths.push(`${prefix}/bin/${command}`);
  }
  for (const prefix of homebrewPrefixes) {
    const cellarNodePath = `${prefix}/Cellar/node`;
    if (fs.existsSync(cellarNodePath)) {
      try {
        const versions = fs.readdirSync(cellarNodePath);
        for (const version of versions) {
          const binPath = `${cellarNodePath}/${version}/bin/${command}`;
          paths.push(binPath);
        }
      } catch {
      }
    }
  }
  const caskNameMap = {
    claude: "claude-code",
    codex: "codex"
  };
  const caskName = caskNameMap[command];
  if (caskName) {
    for (const prefix of homebrewPrefixes) {
      const caskroomPath = `${prefix}/Caskroom/${caskName}`;
      if (fs.existsSync(caskroomPath)) {
        try {
          const versions = fs.readdirSync(caskroomPath).filter((v) => !v.startsWith("."));
          for (const version of versions) {
            const binPath = `${caskroomPath}/${version}/${command}`;
            paths.push(binPath);
          }
        } catch {
        }
      }
    }
  }
  return paths;
}
async function findCommandPath(command) {
  try {
    const cmd = getPlatform() === "windows" ? "where" : "which";
    const res = await exec(cmd, [command]);
    if (res.exitCode === 0 && res.stdout) {
      return res.stdout.trim().split("\n")[0];
    }
  } catch {
  }
  const home = homedir();
  const commonPaths = [
    `/usr/local/bin/${command}`,
    `/usr/bin/${command}`,
    `/bin/${command}`,
    `${home}/.local/bin/${command}`
  ];
  for (const path of commonPaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  if (getPlatform() === "macos") {
    const homebrewPaths = await getHomebrewCommandPaths(command);
    for (const path of homebrewPaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
  }
  if (isTermux()) {
    const termuxPrefix = getTermuxPrefix();
    const termuxPaths = [
      `${termuxPrefix}/bin/${command}`,
      `${termuxPrefix}/usr/bin/${command}`
    ];
    for (const path of termuxPaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
  }
  return null;
}
async function findRealCommandPath(command) {
  const platform2 = getPlatform();
  if (platform2 !== "windows") {
    try {
      const res = await exec("bash", ["-c", `type -P ${command}`]);
      if (res.exitCode === 0 && res.stdout) {
        const path = res.stdout.trim();
        if (path && fs.existsSync(path)) {
          return path;
        }
      }
    } catch {
    }
  }
  const home = homedir();
  const commonPaths = [
    `/usr/local/bin/${command}`,
    `/opt/homebrew/bin/${command}`,
    `/usr/bin/${command}`,
    `/bin/${command}`,
    `${home}/.local/bin/${command}`
  ];
  for (const path of commonPaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }
  if (platform2 === "macos") {
    const homebrewPaths = await getHomebrewCommandPaths(command);
    for (const path of homebrewPaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
  }
  if (isTermux()) {
    const termuxPrefix = getTermuxPrefix();
    const termuxPaths = [
      `${termuxPrefix}/bin/${command}`,
      `${termuxPrefix}/usr/bin/${command}`
    ];
    for (const path of termuxPaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
  }
  return null;
}
function getRecommendedInstallMethods(codeType) {
  const platform2 = getPlatform();
  const wsl = isWSL();
  if (codeType === "claude-code") {
    if (platform2 === "macos") {
      return ["homebrew", "curl", "npm"];
    }
    if (platform2 === "linux" || wsl) {
      return ["curl", "npm"];
    }
    if (platform2 === "windows") {
      return ["powershell", "npm"];
    }
  }
  if (codeType === "codex") {
    if (platform2 === "macos") {
      return ["homebrew", "npm"];
    }
    if (platform2 === "linux" || wsl || platform2 === "windows") {
      return ["npm"];
    }
  }
  return ["npm"];
}

const platform = {
  __proto__: null,
  commandExists: commandExists,
  findCommandPath: findCommandPath,
  findRealCommandPath: findRealCommandPath,
  getHomebrewCommandPaths: getHomebrewCommandPaths,
  getMcpCommand: getMcpCommand,
  getPlatform: getPlatform,
  getRecommendedInstallMethods: getRecommendedInstallMethods,
  getSystemRoot: getSystemRoot,
  getTermuxPrefix: getTermuxPrefix,
  getWSLDistro: getWSLDistro,
  getWSLInfo: getWSLInfo,
  isTermux: isTermux,
  isWSL: isWSL,
  isWindows: isWindows,
  normalizeTomlPath: normalizeTomlPath,
  shouldUseSudoForGlobalInstall: shouldUseSudoForGlobalInstall,
  wrapCommandWithSudo: wrapCommandWithSudo
};

export { getHomebrewCommandPaths as a, getTermuxPrefix as b, isWSL as c, getWSLInfo as d, commandExists as e, findCommandPath as f, getPlatform as g, getRecommendedInstallMethods as h, isTermux as i, findRealCommandPath as j, isWindows as k, getMcpCommand as l, getSystemRoot as m, normalizeTomlPath as n, platform as p, shouldUseSudoForGlobalInstall as s, wrapCommandWithSudo as w };
