import { CCJK_CLOUD_API_URL } from './constants.mjs';
import 'node:os';
import 'pathe';
import './index.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';

const LOCAL_PROVIDER_PRESETS = [
  {
    id: "glm",
    name: "GLM",
    supportedCodeTools: ["claude-code", "codex"],
    claudeCode: {
      baseUrl: "https://open.bigmodel.cn/api/anthropic",
      authType: "auth_token"
    },
    codex: {
      baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
      wireApi: "chat",
      defaultModel: "GLM-4.7"
    },
    description: "GLM (\u667A\u8C31AI)"
  },
  {
    id: "minimax",
    name: "MiniMax",
    supportedCodeTools: ["claude-code", "codex"],
    claudeCode: {
      baseUrl: "https://api.minimaxi.com/anthropic",
      authType: "auth_token",
      defaultModels: ["MiniMax-M2", "MiniMax-M2"]
    },
    codex: {
      baseUrl: "https://api.minimaxi.com/v1",
      wireApi: "chat",
      defaultModel: "MiniMax-M2"
    },
    description: "MiniMax API Service"
  },
  {
    id: "kimi",
    name: "Kimi",
    supportedCodeTools: ["claude-code", "codex"],
    claudeCode: {
      baseUrl: "https://api.kimi.com/coding/",
      authType: "auth_token"
    },
    codex: {
      baseUrl: "https://api.kimi.com/coding/v1",
      wireApi: "chat",
      defaultModel: "kimi-for-coding"
    },
    description: "Kimi (Moonshot AI)"
  }
];
let cloudProvidersCache = null;
let cloudProvidersCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1e3;
async function fetchCloudProviders(codeType) {
  try {
    const url = new URL(`${CCJK_CLOUD_API_URL}/providers`);
    if (codeType) {
      url.searchParams.set("codeType", codeType);
    }
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(5e3)
      // 5 second timeout
    });
    if (!response.ok) {
      return [];
    }
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((p) => ({ ...p, isCloud: true }));
    }
    return [];
  } catch {
    return [];
  }
}
async function getApiProvidersAsync(codeToolType) {
  const now = Date.now();
  if (cloudProvidersCache && now - cloudProvidersCacheTime < CACHE_TTL) {
    const providers = cloudProvidersCache;
    if (codeToolType) {
      return providers.filter((p) => p.supportedCodeTools.includes(codeToolType));
    }
    return providers;
  }
  const cloudProviders = await fetchCloudProviders(codeToolType);
  if (cloudProviders.length > 0) {
    cloudProvidersCache = cloudProviders;
    cloudProvidersCacheTime = now;
    return cloudProviders;
  }
  if (codeToolType) {
    return LOCAL_PROVIDER_PRESETS.filter((p) => p.supportedCodeTools.includes(codeToolType));
  }
  return LOCAL_PROVIDER_PRESETS;
}
function getApiProviders(codeToolType) {
  if (cloudProvidersCache) {
    return cloudProvidersCache.filter((p) => p.supportedCodeTools.includes(codeToolType));
  }
  return LOCAL_PROVIDER_PRESETS.filter((p) => p.supportedCodeTools.includes(codeToolType));
}
function getProviderPreset(providerId) {
  if (cloudProvidersCache) {
    const cachedProvider = cloudProvidersCache.find((p) => p.id === providerId);
    if (cachedProvider) {
      return cachedProvider;
    }
  }
  return LOCAL_PROVIDER_PRESETS.find((p) => p.id === providerId);
}
function getValidProviderIds() {
  if (cloudProvidersCache) {
    return cloudProvidersCache.map((p) => p.id);
  }
  return LOCAL_PROVIDER_PRESETS.map((p) => p.id);
}
const getApiProviderPresets = getApiProvidersAsync;

export { LOCAL_PROVIDER_PRESETS, getApiProviderPresets, getApiProviders, getApiProvidersAsync, getProviderPreset, getValidProviderIds };
