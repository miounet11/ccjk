import { DEFAULT_CODE_TOOL_TYPE } from '../chunks/constants.mjs';
import { i18n } from '../chunks/index.mjs';
import { readZcfConfigAsync } from '../chunks/ccjk-config.mjs';

const CODE_TYPE_ABBREVIATIONS = {
  cc: "claude-code",
  cx: "codex"
};
async function resolveCodeType(codeTypeParam) {
  if (codeTypeParam) {
    const normalizedParam = codeTypeParam.toLowerCase().trim();
    if (normalizedParam in CODE_TYPE_ABBREVIATIONS) {
      return CODE_TYPE_ABBREVIATIONS[normalizedParam];
    }
    if (isValidCodeType(normalizedParam)) {
      return normalizedParam;
    }
    const validAbbreviations = Object.keys(CODE_TYPE_ABBREVIATIONS);
    const validFullTypes = Object.values(CODE_TYPE_ABBREVIATIONS);
    const validOptions = [...validAbbreviations, ...validFullTypes].join(", ");
    let defaultValue = DEFAULT_CODE_TOOL_TYPE;
    try {
      const config = await readZcfConfigAsync();
      if (config?.codeToolType && isValidCodeType(config.codeToolType)) {
        defaultValue = config.codeToolType;
      }
    } catch {
    }
    throw new Error(
      i18n.t("errors:invalidCodeType", { value: codeTypeParam, validOptions, defaultValue })
    );
  }
  try {
    const config = await readZcfConfigAsync();
    if (config?.codeToolType && isValidCodeType(config.codeToolType)) {
      return config.codeToolType;
    }
  } catch {
  }
  return DEFAULT_CODE_TOOL_TYPE;
}
function isValidCodeType(value) {
  return ["claude-code", "codex"].includes(value);
}

export { resolveCodeType as r };
