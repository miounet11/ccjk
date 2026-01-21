import ansis from 'ansis';
import { homepage, version } from '../chunks/package.mjs';
import { ensureI18nInitialized, i18n } from '../chunks/index.mjs';

const theme = {
  // === Core Colors ===
  /** Terminal green - main text color */
  primary: ansis.hex("#00FF00"),
  /** Bright white - emphasis and highlights */
  secondary: ansis.white,
  /** Dim green - subtle accents */
  accent: ansis.hex("#00CC00"),
  // === Semantic Colors ===
  /** Success - bright green checkmark */
  success: ansis.hex("#00FF7F"),
  /** Warning - amber/yellow for caution */
  warning: ansis.hex("#FFD700"),
  /** Error - red for failures */
  error: ansis.hex("#FF4444"),
  /** Info - cyan for informational messages */
  info: ansis.hex("#00FFFF"),
  // === Text Styles ===
  /** Muted text - gray for less important info */
  muted: ansis.gray,
  /** Bold text */
  bold: ansis.bold,
  /** Dim text - for background info */
  dim: ansis.dim,
  // === MUD-specific Styles ===
  /** Command prompt style - bright green */
  prompt: ansis.hex("#00FF00").bold,
  /** System message - white */
  system: ansis.white,
  /** NPC/hint text - dim green */
  hint: ansis.hex("#88CC88"),
  /** Quest/task highlight - bright */
  quest: ansis.hex("#00FF00").bold,
  /** Item/feature name - white bold */
  item: ansis.white.bold
};
const status = {
  /** ✓ Success indicator */
  ok: (text) => `${ansis.green("\u2713")} ${text}`,
  /** ✗ Error indicator */
  fail: (text) => `${ansis.red("\u2717")} ${text}`,
  /** ⚠ Warning indicator */
  warn: (text) => `${ansis.yellow("\u26A0")} ${text}`,
  /** ℹ Info indicator */
  info: (text) => `${ansis.cyan("\u2139")} ${text}`,
  /** ○ Pending indicator */
  wait: (text) => `${ansis.gray("\u25CB")} ${text}`,
  /** ◐ In-progress indicator */
  work: (text) => `${ansis.green("\u25D0")} ${text}`};
const box = {
  single: { tl: "\u250C", tr: "\u2510", bl: "\u2514", br: "\u2518", h: "\u2500", v: "\u2502" },
  double: { tl: "\u2554", tr: "\u2557", bl: "\u255A", br: "\u255D", h: "\u2550", v: "\u2551" },
  rounded: { tl: "\u256D", tr: "\u256E", bl: "\u2570", br: "\u256F", h: "\u2500", v: "\u2502" },
  heavy: { tl: "\u250F", tr: "\u2513", bl: "\u2517", br: "\u251B", h: "\u2501", v: "\u2503" }
};
function boxify(content, style = "double", title) {
  const chars = box[style];
  const lines = content.split("\n");
  const getWidth = (s) => {
    let w = 0;
    for (const c of s) {
      w += c.match(/[\u4E00-\u9FFF\uFF01-\uFF60\u3000-\u303F]/) ? 2 : 1;
    }
    return w;
  };
  const maxWidth = Math.max(
    ...lines.map(getWidth),
    getWidth(title) + 4 
  );
  const paddedLines = lines.map((line) => {
    const padding = maxWidth - getWidth(line);
    return `${chars.v} ${line}${" ".repeat(padding)} ${chars.v}`;
  });
  let topBorder = `${chars.tl}${chars.h.repeat(maxWidth + 2)}${chars.tr}`;
  {
    const pad = Math.floor((maxWidth - getWidth(title)) / 2);
    topBorder = `${chars.tl}${chars.h.repeat(pad)} ${title} ${chars.h.repeat(maxWidth - pad - getWidth(title))}${chars.tr}`;
  }
  const bottomBorder = `${chars.bl}${chars.h.repeat(maxWidth + 2)}${chars.br}`;
  return theme.primary([topBorder, ...paddedLines, bottomBorder].join("\n"));
}

function getDisplayWidth(str) {
  let width = 0;
  for (const char of str) {
    if (char.match(/[\u4E00-\u9FFF\uFF01-\uFF60\u3000-\u303F]/)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}
function padToDisplayWidth(str, targetWidth) {
  const currentWidth = getDisplayWidth(str);
  const paddingNeeded = Math.max(0, targetWidth - currentWidth);
  return str + " ".repeat(paddingNeeded);
}
function displayBanner(subtitle) {
  ensureI18nInitialized();
  const defaultSubtitle = i18n.t("cli:banner.subtitle");
  const subtitleText = subtitle || defaultSubtitle;
  const paddedSubtitle = padToDisplayWidth(subtitleText, 28);
  console.log(
    ansis.green.bold(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                                                               \u2551
\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557      \u2588\u2588\u2557\u2588\u2588\u2557  \u2588\u2588\u2557                           \u2551
\u2551  \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D      \u2588\u2588\u2551\u2588\u2588\u2551 \u2588\u2588\u2554\u255D                           \u2551
\u2551  \u2588\u2588\u2551      \u2588\u2588\u2551           \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2554\u255D    ${ansis.white.bold("JinKu")}                 \u2551
\u2551  \u2588\u2588\u2551      \u2588\u2588\u2551      \u2588\u2588   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2588\u2588\u2557    ${ansis.gray(`v${version}`)}${" ".repeat(Math.max(0, 17 - version.length))}\u2551
\u2551  \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u255A\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2557                           \u2551
\u2551   \u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D   ${ansis.gray(paddedSubtitle)} \u2551
\u2551                                                               \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`)
  );
}
function displayBannerWithInfo(subtitle) {
  displayBanner(subtitle);
  console.log(ansis.gray(`  ${ansis.green("ccjk")} - Advanced AI Development Assistant`));
  console.log(ansis.gray(`  ${ansis.green(homepage)}
`));
}
const STATUS = {
  success: status.ok,
  error: status.fail,
  warning: status.warn,
  info: status.info,
  pending: status.wait,
  inProgress: status.work
};

export { STATUS as S, displayBanner as a, boxify as b, displayBannerWithInfo as d, padToDisplayWidth as p, theme as t };
