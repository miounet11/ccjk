import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as process from 'node:process';
import * as fs from 'node:fs';

function getFixCommits(options) {
  const { since, until, limit = 100, cwd = process.cwd() } = options;
  let gitCmd = 'git log --pretty=format:"%H|%h|%s|%an|%ai" --name-only';
  if (since) {
    gitCmd += ` ${since}..${until || "HEAD"}`;
  }
  gitCmd += ` -n ${limit}`;
  try {
    const output = execSync(gitCmd, { cwd, encoding: "utf-8" });
    return parseGitLog(output);
  } catch {
    return [];
  }
}
function parseGitLog(output) {
  const commits = [];
  const entries = output.trim().split("\n\n");
  for (const entry of entries) {
    const lines = entry.split("\n");
    if (lines.length === 0)
      continue;
    const [firstLine, ...fileLines] = lines;
    const parts = firstLine.split("|");
    if (parts.length < 5)
      continue;
    const [hash, shortHash, message, author, date] = parts;
    const files = fileLines.filter((f) => f.trim());
    if (isFixCommit(message)) {
      commits.push({
        hash,
        shortHash,
        message,
        author,
        date,
        files
      });
    }
  }
  return commits;
}
function isFixCommit(message) {
  const fixPatterns = [
    /^fix[(:]/i,
    /^bugfix[(:]/i,
    /^hotfix[(:]/i,
    /\bfix\b/i,
    /\bbug\b/i,
    /\brepair\b/i,
    /\bresolve\b/i,
    /\bcorrect\b/i,
    /修复/,
    /修正/,
    /解决/,
    /bug/i
  ];
  return fixPatterns.some((p) => p.test(message));
}
function analyzeFixCommit(commit, cwd = process.cwd()) {
  const diff = getCommitDiff(commit.hash, cwd);
  const bugType = detectBugType(commit.message, diff);
  const severity = detectSeverity(commit.message, diff, commit.files);
  const rootCause = extractRootCause(commit.message, diff);
  const solution = extractSolution(diff);
  const preventionSuggestions = generatePreventionSuggestions(bugType);
  return {
    commit,
    bugType,
    severity,
    rootCause,
    solution,
    preventionSuggestions,
    relatedPostmortems: []
  };
}
function getCommitDiff(hash, cwd) {
  try {
    return execSync(`git show ${hash} --pretty="" --patch`, {
      cwd,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 10
      // 10MB
    });
  } catch {
    return "";
  }
}
function detectBugType(message, diff) {
  const content = `${message}
${diff}`.toLowerCase();
  const patterns = [
    {
      category: "type-safety",
      patterns: [
        /null|undefined|cannot read|typeerror/,
        /类型|空值|未定义/,
        /optional chaining|\?\./,
        /strict.*null|null.*check/
      ]
    },
    {
      category: "error-handling",
      patterns: [
        /try.*catch|exception|throw|error.*handling/,
        /unhandled.*rejection|promise.*reject/,
        /异常|错误处理|捕获/
      ]
    },
    {
      category: "performance",
      patterns: [
        /performance|slow|timeout|memory|leak/,
        /optimize|optimization|cache/,
        /性能|优化|缓存|内存/
      ]
    },
    {
      category: "security",
      patterns: [
        /security|xss|csrf|injection|auth/,
        /vulnerability|exploit|sanitize/,
        /安全|漏洞|注入|认证/
      ]
    },
    {
      category: "race-condition",
      patterns: [
        /race.*condition|concurrent|async.*await/,
        /deadlock|mutex|lock/,
        /竞态|并发|死锁/
      ]
    },
    {
      category: "logic-error",
      patterns: [
        /logic|incorrect|wrong.*result/,
        /逻辑|错误结果|计算错误/
      ]
    },
    {
      category: "api-misuse",
      patterns: [
        /api.*usage|incorrect.*call|wrong.*parameter/,
        /接口|调用错误|参数错误/
      ]
    },
    {
      category: "configuration",
      patterns: [
        /config|setting|environment|env/,
        /配置|环境|设置/
      ]
    },
    {
      category: "dependency",
      patterns: [
        /dependency|package|version|upgrade/,
        /依赖|版本|升级/
      ]
    }
  ];
  for (const { category, patterns: categoryPatterns } of patterns) {
    if (categoryPatterns.some((p) => p.test(content))) {
      return category;
    }
  }
  return "other";
}
function detectSeverity(message, diff, files) {
  const content = `${message}
${diff}`.toLowerCase();
  if (/critical|crash|data.*loss|security.*vuln/i.test(content) || files.some((f) => /auth|security|payment/i.test(f))) {
    return "critical";
  }
  if (/breaking|major|important|urgent/i.test(content) || files.length > 10) {
    return "high";
  }
  if (/moderate|minor.*issue/i.test(content) || files.length > 3) {
    return "medium";
  }
  return "low";
}
function extractRootCause(message, diff) {
  const causePatterns = [
    /caused by[:\s]+(.+)/i,
    /root cause[:\s]+(.+)/i,
    /because[:\s]+(.+)/i,
    /due to[:\s]+(.+)/i,
    /原因[：:]\s*(.+)/,
    /由于\s*(.+)/
  ];
  for (const pattern of causePatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  const removedLines = diff.match(/^-[^-].*/gm) || [];
  const addedLines = diff.match(/^\+[^+].*/gm) || [];
  if (removedLines.length > 0 && addedLines.length > 0) {
    return `\u4EE3\u7801\u53D8\u66F4: \u79FB\u9664 ${removedLines.length} \u884C, \u65B0\u589E ${addedLines.length} \u884C`;
  }
  return "\u9700\u8981\u8FDB\u4E00\u6B65\u5206\u6790";
}
function extractSolution(diff) {
  const addedLines = diff.match(/^\+[^+].*/gm) || [];
  if (addedLines.length === 0) {
    return "\u5220\u9664\u4E86\u95EE\u9898\u4EE3\u7801";
  }
  if (addedLines.length <= 5) {
    return addedLines.map((l) => l.substring(1)).join("\n");
  }
  return `\u65B0\u589E ${addedLines.length} \u884C\u4EE3\u7801\u4FEE\u590D\u95EE\u9898`;
}
function generatePreventionSuggestions(bugType, _diff) {
  const suggestions = {
    "type-safety": [
      "\u542F\u7528 TypeScript strict \u6A21\u5F0F",
      "\u4F7F\u7528\u53EF\u9009\u94FE\u64CD\u4F5C\u7B26 (?.) \u8FDB\u884C\u7A7A\u503C\u68C0\u67E5",
      "\u4E3A\u6240\u6709\u5916\u90E8\u6570\u636E\u6DFB\u52A0\u8FD0\u884C\u65F6\u9A8C\u8BC1",
      "\u4F7F\u7528 zod \u6216 io-ts \u8FDB\u884C\u7C7B\u578B\u9A8C\u8BC1"
    ],
    "error-handling": [
      "\u4E3A\u6240\u6709\u5F02\u6B65\u64CD\u4F5C\u6DFB\u52A0 try-catch",
      "\u5B9E\u73B0\u5168\u5C40\u9519\u8BEF\u5904\u7406\u4E2D\u95F4\u4EF6",
      "\u6DFB\u52A0\u9519\u8BEF\u8FB9\u754C\u7EC4\u4EF6 (React)",
      "\u4F7F\u7528 Result \u7C7B\u578B\u66FF\u4EE3\u5F02\u5E38"
    ],
    "performance": [
      "\u6DFB\u52A0\u6027\u80FD\u76D1\u63A7\u548C\u544A\u8B66",
      "\u5B9E\u73B0\u7F13\u5B58\u7B56\u7565",
      "\u4F7F\u7528\u61D2\u52A0\u8F7D\u548C\u4EE3\u7801\u5206\u5272",
      "\u5B9A\u671F\u8FDB\u884C\u6027\u80FD\u6D4B\u8BD5"
    ],
    "security": [
      "\u5B9E\u65BD\u5B89\u5168\u4EE3\u7801\u5BA1\u67E5",
      "\u4F7F\u7528\u5B89\u5168\u626B\u63CF\u5DE5\u5177",
      "\u9075\u5FAA OWASP \u5B89\u5168\u6307\u5357",
      "\u5B9A\u671F\u66F4\u65B0\u4F9D\u8D56"
    ],
    "race-condition": [
      "\u4F7F\u7528\u9002\u5F53\u7684\u9501\u673A\u5236",
      "\u907F\u514D\u5171\u4EAB\u53EF\u53D8\u72B6\u6001",
      "\u4F7F\u7528\u539F\u5B50\u64CD\u4F5C",
      "\u6DFB\u52A0\u5E76\u53D1\u6D4B\u8BD5"
    ],
    "logic-error": [
      "\u589E\u52A0\u5355\u5143\u6D4B\u8BD5\u8986\u76D6",
      "\u5B9E\u65BD\u4EE3\u7801\u5BA1\u67E5",
      "\u6DFB\u52A0\u65AD\u8A00\u548C\u4E0D\u53D8\u91CF\u68C0\u67E5",
      "\u4F7F\u7528\u5F62\u5F0F\u5316\u9A8C\u8BC1\u5DE5\u5177"
    ],
    "api-misuse": [
      "\u5B8C\u5584 API \u6587\u6863",
      "\u6DFB\u52A0\u53C2\u6570\u9A8C\u8BC1",
      "\u63D0\u4F9B\u4F7F\u7528\u793A\u4F8B",
      "\u5B9E\u73B0 API \u7248\u672C\u63A7\u5236"
    ],
    "configuration": [
      "\u4F7F\u7528\u914D\u7F6E\u9A8C\u8BC1",
      "\u63D0\u4F9B\u9ED8\u8BA4\u914D\u7F6E",
      "\u6587\u6863\u5316\u6240\u6709\u914D\u7F6E\u9879",
      "\u5B9E\u73B0\u914D\u7F6E\u70ED\u91CD\u8F7D"
    ],
    "dependency": [
      "\u9501\u5B9A\u4F9D\u8D56\u7248\u672C",
      "\u5B9A\u671F\u66F4\u65B0\u4F9D\u8D56",
      "\u4F7F\u7528\u4F9D\u8D56\u626B\u63CF\u5DE5\u5177",
      "\u6D4B\u8BD5\u4F9D\u8D56\u5347\u7EA7"
    ],
    "memory-leak": [
      "\u5B9E\u73B0\u8D44\u6E90\u6E05\u7406",
      "\u4F7F\u7528\u5185\u5B58\u5206\u6790\u5DE5\u5177",
      "\u907F\u514D\u5FAA\u73AF\u5F15\u7528",
      "\u5B9A\u671F\u8FDB\u884C\u5185\u5B58\u6D4B\u8BD5"
    ],
    "other": [
      "\u589E\u52A0\u6D4B\u8BD5\u8986\u76D6",
      "\u5B9E\u65BD\u4EE3\u7801\u5BA1\u67E5",
      "\u5B8C\u5584\u6587\u6863"
    ]
  };
  return suggestions[bugType] || suggestions.other;
}
function generatePostmortem(analyses, existingIds) {
  const grouped = groupByCategory(analyses);
  const reports = [];
  let nextId = getNextId(existingIds);
  for (const [category, categoryAnalyses] of Object.entries(grouped)) {
    const merged = mergeAnalyses(categoryAnalyses);
    for (const analysis of merged) {
      const id = `PM-${String(nextId++).padStart(3, "0")}`;
      const report = {
        id,
        title: generateTitle(analysis),
        severity: analysis.severity,
        category: analysis.bugType,
        status: "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        relatedCommits: [analysis.commit],
        affectedVersions: {
          from: "unknown",
          to: "unknown"
        },
        description: generateDescription(analysis),
        rootCause: [analysis.rootCause],
        solution: {
          description: analysis.solution
        },
        preventionMeasures: analysis.preventionSuggestions,
        aiDirectives: generateAiDirectives(analysis),
        detectionPatterns: generateDetectionPatterns(analysis),
        relatedFiles: analysis.commit.files,
        tags: [category, analysis.severity],
        metadata: {
          generatedBy: "ccjk-postmortem",
          version: "1.0.0"
        }
      };
      reports.push(report);
    }
  }
  return reports;
}
function groupByCategory(analyses) {
  const grouped = {};
  for (const analysis of analyses) {
    const category = analysis.bugType;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(analysis);
  }
  return grouped;
}
function mergeAnalyses(analyses) {
  const merged = [];
  for (const analysis of analyses) {
    const similar = merged.find(
      (m) => calculateFileOverlap(m.commit.files, analysis.commit.files) > 0.5
    );
    if (similar) {
      similar.commit.files = Array.from(/* @__PURE__ */ new Set([...similar.commit.files, ...analysis.commit.files]));
      similar.preventionSuggestions = Array.from(/* @__PURE__ */ new Set([...similar.preventionSuggestions, ...analysis.preventionSuggestions]));
    } else {
      merged.push({ ...analysis });
    }
  }
  return merged;
}
function calculateFileOverlap(files1, files2) {
  const set1 = new Set(files1);
  const set2 = new Set(files2);
  const intersection = Array.from(set1).filter((f) => set2.has(f));
  const union = /* @__PURE__ */ new Set([...files1, ...files2]);
  return intersection.length / union.size;
}
function getNextId(existingIds) {
  const numbers = existingIds.map((id) => Number.parseInt(id.replace("PM-", ""), 10)).filter((n) => !Number.isNaN(n));
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}
function generateTitle(analysis) {
  const categoryTitles = {
    "type-safety": "\u7C7B\u578B\u5B89\u5168\u95EE\u9898",
    "error-handling": "\u9519\u8BEF\u5904\u7406\u7F3A\u5931",
    "performance": "\u6027\u80FD\u95EE\u9898",
    "security": "\u5B89\u5168\u6F0F\u6D1E",
    "race-condition": "\u7ADE\u6001\u6761\u4EF6",
    "logic-error": "\u903B\u8F91\u9519\u8BEF",
    "api-misuse": "API \u4F7F\u7528\u4E0D\u5F53",
    "configuration": "\u914D\u7F6E\u95EE\u9898",
    "dependency": "\u4F9D\u8D56\u95EE\u9898",
    "memory-leak": "\u5185\u5B58\u6CC4\u6F0F",
    "other": "\u5176\u4ED6\u95EE\u9898"
  };
  const baseTitle = categoryTitles[analysis.bugType] || "\u672A\u5206\u7C7B\u95EE\u9898";
  const message = analysis.commit.message;
  const specificPart = message.replace(/^(fix|bugfix|hotfix)[(:]\s*/i, "").split("\n")[0];
  if (specificPart && specificPart.length < 50) {
    return `${baseTitle}: ${specificPart}`;
  }
  return baseTitle;
}
function generateDescription(analysis) {
  return `
\u5728 ${analysis.commit.date} \u53D1\u73B0\u5E76\u4FEE\u590D\u4E86\u4E00\u4E2A ${analysis.bugType} \u7C7B\u578B\u7684\u95EE\u9898\u3002

**\u63D0\u4EA4\u4FE1\u606F**: ${analysis.commit.message}

**\u5F71\u54CD\u6587\u4EF6**:
${analysis.commit.files.map((f) => `- ${f}`).join("\n")}

**\u6839\u672C\u539F\u56E0**: ${analysis.rootCause}
`.trim();
}
function generateAiDirectives(analysis) {
  const directives = [];
  const categoryDirectives = {
    "type-safety": [
      "\u5904\u7406\u5916\u90E8\u6570\u636E\u65F6\u5FC5\u987B\u8FDB\u884C\u7A7A\u503C\u68C0\u67E5",
      "\u4F7F\u7528 TypeScript \u4E25\u683C\u6A21\u5F0F",
      "\u907F\u514D\u4F7F\u7528 any \u7C7B\u578B"
    ],
    "error-handling": [
      "\u6240\u6709\u5F02\u6B65\u64CD\u4F5C\u5FC5\u987B\u6709\u9519\u8BEF\u5904\u7406",
      "\u63D0\u4F9B\u6709\u610F\u4E49\u7684\u9519\u8BEF\u6D88\u606F",
      "\u5B9E\u73B0\u4F18\u96C5\u964D\u7EA7"
    ],
    "performance": [
      "\u907F\u514D\u5728\u5FAA\u73AF\u4E2D\u8FDB\u884C I/O \u64CD\u4F5C",
      "\u4F7F\u7528\u9002\u5F53\u7684\u7F13\u5B58\u7B56\u7565",
      "\u6CE8\u610F\u5927\u6570\u636E\u96C6\u7684\u5904\u7406"
    ],
    "security": [
      "\u9A8C\u8BC1\u6240\u6709\u7528\u6237\u8F93\u5165",
      "\u4F7F\u7528\u53C2\u6570\u5316\u67E5\u8BE2",
      "\u4E0D\u8981\u5728\u65E5\u5FD7\u4E2D\u8BB0\u5F55\u654F\u611F\u4FE1\u606F"
    ],
    "race-condition": [
      "\u6CE8\u610F\u5F02\u6B65\u64CD\u4F5C\u7684\u6267\u884C\u987A\u5E8F",
      "\u4F7F\u7528\u9002\u5F53\u7684\u540C\u6B65\u673A\u5236",
      "\u907F\u514D\u5171\u4EAB\u53EF\u53D8\u72B6\u6001"
    ],
    "logic-error": [
      "\u6DFB\u52A0\u8FB9\u754C\u6761\u4EF6\u68C0\u67E5",
      "\u4F7F\u7528\u65AD\u8A00\u9A8C\u8BC1\u5047\u8BBE",
      "\u7F16\u5199\u5355\u5143\u6D4B\u8BD5\u8986\u76D6\u8FB9\u754C\u60C5\u51B5"
    ],
    "api-misuse": [
      "\u67E5\u9605 API \u6587\u6863\u786E\u8BA4\u6B63\u786E\u7528\u6CD5",
      "\u68C0\u67E5\u53C2\u6570\u7C7B\u578B\u548C\u8303\u56F4",
      "\u5904\u7406\u6240\u6709\u53EF\u80FD\u7684\u8FD4\u56DE\u503C"
    ],
    "configuration": [
      "\u63D0\u4F9B\u5408\u7406\u7684\u9ED8\u8BA4\u503C",
      "\u9A8C\u8BC1\u914D\u7F6E\u503C\u7684\u6709\u6548\u6027",
      "\u6587\u6863\u5316\u914D\u7F6E\u9009\u9879"
    ],
    "dependency": [
      "\u68C0\u67E5\u4F9D\u8D56\u7684\u517C\u5BB9\u6027",
      "\u9605\u8BFB\u66F4\u65B0\u65E5\u5FD7",
      "\u5728\u5347\u7EA7\u524D\u8FDB\u884C\u6D4B\u8BD5"
    ],
    "memory-leak": [
      "\u53CA\u65F6\u6E05\u7406\u4E0D\u518D\u4F7F\u7528\u7684\u8D44\u6E90",
      "\u907F\u514D\u5FAA\u73AF\u5F15\u7528",
      "\u4F7F\u7528 WeakMap/WeakSet"
    ],
    "other": [
      "\u4ED4\u7EC6\u5BA1\u67E5\u4EE3\u7801\u53D8\u66F4",
      "\u6DFB\u52A0\u9002\u5F53\u7684\u6D4B\u8BD5"
    ]
  };
  directives.push(...categoryDirectives[analysis.bugType] || categoryDirectives.other);
  for (const file of analysis.commit.files) {
    if (file.includes("api") || file.includes("service")) {
      directives.push(`\u4FEE\u6539 ${path.basename(file)} \u65F6\u6CE8\u610F API \u517C\u5BB9\u6027`);
    }
    if (file.includes("config")) {
      directives.push(`\u4FEE\u6539\u914D\u7F6E\u6587\u4EF6\u65F6\u786E\u4FDD\u5411\u540E\u517C\u5BB9`);
    }
  }
  return Array.from(new Set(directives));
}
function generateDetectionPatterns(analysis) {
  const patterns = [];
  const categoryPatterns = {
    "type-safety": [
      {
        type: "regex",
        pattern: "\\.\\w+\\.\\w+\\.\\w+(?!\\?)",
        description: "\u8FDE\u7EED\u5C5E\u6027\u8BBF\u95EE\u672A\u4F7F\u7528\u53EF\u9009\u94FE",
        fileTypes: [".ts", ".tsx", ".js", ".jsx"],
        severity: "medium"
      },
      {
        type: "regex",
        pattern: "as any",
        description: "\u4F7F\u7528 any \u7C7B\u578B\u65AD\u8A00",
        fileTypes: [".ts", ".tsx"],
        severity: "low"
      }
    ],
    "error-handling": [
      {
        type: "regex",
        pattern: "catch\\s*\\(\\s*\\w*\\s*\\)\\s*\\{\\s*\\}",
        description: "\u7A7A\u7684 catch \u5757",
        fileTypes: [".ts", ".tsx", ".js", ".jsx"],
        severity: "high"
      },
      {
        type: "regex",
        pattern: "\\.then\\([^)]+\\)(?!\\.catch)",
        description: "Promise \u672A\u5904\u7406 rejection",
        fileTypes: [".ts", ".tsx", ".js", ".jsx"],
        severity: "medium"
      }
    ],
    "performance": [
      {
        type: "regex",
        pattern: "for\\s*\\([^)]+\\)\\s*\\{[^}]*await",
        description: "\u5FAA\u73AF\u4E2D\u4F7F\u7528 await",
        fileTypes: [".ts", ".tsx", ".js", ".jsx"],
        severity: "medium"
      }
    ],
    "security": [
      {
        type: "regex",
        pattern: "innerHTML\\s*=",
        description: "\u76F4\u63A5\u8BBE\u7F6E innerHTML \u53EF\u80FD\u5BFC\u81F4 XSS",
        fileTypes: [".ts", ".tsx", ".js", ".jsx"],
        severity: "high"
      },
      {
        type: "regex",
        pattern: "eval\\s*\\(",
        description: "\u4F7F\u7528 eval \u5B58\u5728\u5B89\u5168\u98CE\u9669",
        fileTypes: [".ts", ".tsx", ".js", ".jsx"],
        severity: "critical"
      }
    ],
    "race-condition": [],
    "logic-error": [],
    "api-misuse": [],
    "configuration": [],
    "dependency": [],
    "memory-leak": [
      {
        type: "regex",
        pattern: "addEventListener\\([^)]+\\)(?![\\s\\S]*removeEventListener)",
        description: "\u6DFB\u52A0\u4E8B\u4EF6\u76D1\u542C\u5668\u4F46\u672A\u79FB\u9664",
        fileTypes: [".ts", ".tsx", ".js", ".jsx"],
        severity: "medium"
      }
    ],
    "other": []
  };
  patterns.push(...categoryPatterns[analysis.bugType] || []);
  return patterns;
}
const PostmortemAnalyzer = {
  getFixCommits,
  analyzeFixCommit,
  generatePostmortem
};

const DEFAULT_CONFIG = {
  enabled: true,
  directory: "./postmortem",
  autoSyncToClaudeMd: true,
  maxSyncItems: 10,
  minSyncSeverity: "medium",
  detection: {
    enabled: true,
    excludePatterns: ["node_modules/**", "dist/**", "*.test.*", "*.spec.*"],
    includePatterns: ["src/**/*.ts", "src/**/*.tsx"]
  },
  aiAnalysis: {
    provider: "claude"
  }
};
const INDEX_FILE = "index.json";
const CLAUDE_MD_SECTION_START = "<!-- POSTMORTEM_START -->";
const CLAUDE_MD_SECTION_END = "<!-- POSTMORTEM_END -->";
class PostmortemManager {
  config;
  projectRoot;
  postmortemDir;
  constructor(projectRoot = process.cwd(), config = {}) {
    this.projectRoot = projectRoot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.postmortemDir = path.join(projectRoot, this.config.directory);
  }
  // ==========================================================================
  // Initialization
  // ==========================================================================
  /**
   * 初始化 Postmortem 系统
   */
  async init() {
    this.ensureDirectories();
    const commits = PostmortemAnalyzer.getFixCommits({
      limit: 200,
      cwd: this.projectRoot
    });
    if (commits.length === 0) {
      this.saveIndex(this.createEmptyIndex());
      return { created: 0, directory: this.postmortemDir };
    }
    const analyses = commits.map(
      (commit) => PostmortemAnalyzer.analyzeFixCommit(commit, this.projectRoot)
    );
    const reports = PostmortemAnalyzer.generatePostmortem(analyses, []);
    for (const report of reports) {
      this.saveReport(report);
    }
    this.updateIndex();
    if (this.config.autoSyncToClaudeMd) {
      await this.syncToClaudeMd();
    }
    return { created: reports.length, directory: this.postmortemDir };
  }
  /**
   * 确保目录存在
   */
  ensureDirectories() {
    const dirs = [
      this.postmortemDir,
      path.join(this.postmortemDir, "categories"),
      path.join(this.postmortemDir, "summaries")
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
  // ==========================================================================
  // Report Management
  // ==========================================================================
  /**
   * 保存 Postmortem 报告
   */
  saveReport(report) {
    const filename = `${report.id}-${this.slugify(report.title)}.md`;
    const filepath = path.join(this.postmortemDir, filename);
    const content = this.renderReportToMarkdown(report);
    fs.writeFileSync(filepath, content, "utf-8");
    const jsonPath = path.join(this.postmortemDir, `${report.id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");
    return filepath;
  }
  /**
   * 读取 Postmortem 报告
   */
  getReport(id) {
    const jsonPath = path.join(this.postmortemDir, `${id}.json`);
    if (!fs.existsSync(jsonPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(jsonPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  /**
   * 列出所有 Postmortem
   */
  listReports() {
    const index = this.loadIndex();
    return index?.reports || [];
  }
  /**
   * 渲染报告为 Markdown
   */
  renderReportToMarkdown(report) {
    const severityEmoji = {
      critical: "\u{1F534}",
      high: "\u{1F7E0}",
      medium: "\u{1F7E1}",
      low: "\u{1F7E2}"
    };
    return `# ${report.id}: ${report.title}

## \u5143\u6570\u636E
- **ID**: ${report.id}
- **\u4E25\u91CD\u7A0B\u5EA6**: ${severityEmoji[report.severity]} ${report.severity.toUpperCase()}
- **\u7C7B\u522B**: ${report.category}
- **\u72B6\u6001**: ${report.status}
- **\u521B\u5EFA\u65F6\u95F4**: ${report.createdAt}
- **\u66F4\u65B0\u65F6\u95F4**: ${report.updatedAt}

## \u76F8\u5173\u63D0\u4EA4
${report.relatedCommits.map((c) => `- \`${c.shortHash}\` - ${c.message} (${c.author}, ${c.date})`).join("\n")}

## \u5F71\u54CD\u7248\u672C
- **\u4ECE**: ${report.affectedVersions.from}
- **\u5230**: ${report.affectedVersions.to}

## \u95EE\u9898\u63CF\u8FF0
${report.description}

## \u6839\u672C\u539F\u56E0
${report.rootCause.map((c) => `- ${c}`).join("\n")}

## \u4FEE\u590D\u65B9\u6848
${report.solution.description}

${report.solution.codeExample ? `
### \u4EE3\u7801\u793A\u4F8B

**\u274C \u9519\u8BEF\u5199\u6CD5**
\`\`\`typescript
${report.solution.codeExample.bad}
\`\`\`

**\u2705 \u6B63\u786E\u5199\u6CD5**
\`\`\`typescript
${report.solution.codeExample.good}
\`\`\`
` : ""}

## \u9884\u9632\u63AA\u65BD
${report.preventionMeasures.map((m, i) => `${i + 1}. ${m}`).join("\n")}

## AI \u5F00\u53D1\u6307\u4EE4
> \u4EE5\u4E0B\u6307\u4EE4\u4F1A\u81EA\u52A8\u6CE8\u5165\u5230 CLAUDE.md \u4E2D\uFF0C\u6307\u5BFC AI \u5728\u5F00\u53D1\u65F6\u907F\u514D\u7C7B\u4F3C\u95EE\u9898

${report.aiDirectives.map((d) => `- ${d}`).join("\n")}

## \u68C0\u6D4B\u6A21\u5F0F
${report.detectionPatterns.length > 0 ? report.detectionPatterns.map((p) => `
### ${p.description}
- **\u7C7B\u578B**: ${p.type}
- **\u6A21\u5F0F**: \`${p.pattern}\`
- **\u9002\u7528\u6587\u4EF6**: ${p.fileTypes.join(", ")}
- **\u4E25\u91CD\u7A0B\u5EA6**: ${p.severity}
`).join("\n") : "\u6682\u65E0\u81EA\u52A8\u68C0\u6D4B\u6A21\u5F0F"}

## \u76F8\u5173\u6587\u4EF6
${report.relatedFiles.map((f) => `- \`${f}\``).join("\n")}

## \u6807\u7B7E
${report.tags.map((t) => `\`${t}\``).join(" ")}

---
*\u7531 CCJK Postmortem System \u81EA\u52A8\u751F\u6210*
`;
  }
  /**
   * 生成 slug
   */
  slugify(text) {
    return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").substring(0, 50);
  }
  // ==========================================================================
  // Index Management
  // ==========================================================================
  /**
   * 创建空索引
   */
  createEmptyIndex() {
    return {
      version: "1.0.0",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      stats: {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
        byCategory: {
          "type-safety": 0,
          "error-handling": 0,
          "performance": 0,
          "security": 0,
          "logic-error": 0,
          "race-condition": 0,
          "memory-leak": 0,
          "api-misuse": 0,
          "configuration": 0,
          "dependency": 0,
          "other": 0
        },
        byStatus: { active: 0, resolved: 0, monitoring: 0, archived: 0 }
      },
      reports: []
    };
  }
  /**
   * 加载索引
   */
  loadIndex() {
    const indexPath = path.join(this.postmortemDir, INDEX_FILE);
    if (!fs.existsSync(indexPath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(indexPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  /**
   * 保存索引
   */
  saveIndex(index) {
    const indexPath = path.join(this.postmortemDir, INDEX_FILE);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf-8");
  }
  /**
   * 更新索引
   */
  updateIndex() {
    const index = this.createEmptyIndex();
    const files = fs.readdirSync(this.postmortemDir).filter((f) => f.startsWith("PM-") && f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.postmortemDir, file), "utf-8");
        const report = JSON.parse(content);
        index.stats.total++;
        index.stats.bySeverity[report.severity]++;
        index.stats.byCategory[report.category]++;
        index.stats.byStatus[report.status]++;
        index.reports.push({
          id: report.id,
          title: report.title,
          severity: report.severity,
          category: report.category,
          status: report.status,
          createdAt: report.createdAt,
          filePath: file.replace(".json", ".md")
        });
      } catch {
      }
    }
    index.reports.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0)
        return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    index.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.saveIndex(index);
    return index;
  }
  // ==========================================================================
  // CLAUDE.md Integration
  // ==========================================================================
  /**
   * 同步到 CLAUDE.md
   */
  async syncToClaudeMd() {
    const claudeMdPath = path.join(this.projectRoot, "CLAUDE.md");
    const injection = this.generateClaudeMdInjection();
    let content = "";
    if (fs.existsSync(claudeMdPath)) {
      content = fs.readFileSync(claudeMdPath, "utf-8");
    }
    const startIndex = content.indexOf(CLAUDE_MD_SECTION_START);
    const endIndex = content.indexOf(CLAUDE_MD_SECTION_END);
    if (startIndex !== -1 && endIndex !== -1) {
      content = content.substring(0, startIndex) + content.substring(endIndex + CLAUDE_MD_SECTION_END.length);
    }
    const injectionContent = `
${CLAUDE_MD_SECTION_START}
${injection.content}
${CLAUDE_MD_SECTION_END}
`;
    content = `${content.trim()}

${injectionContent.trim()}
`;
    fs.writeFileSync(claudeMdPath, content, "utf-8");
    return {
      synced: injection.sourcePostmortems.length,
      claudeMdPath
    };
  }
  /**
   * 生成 CLAUDE.md 注入内容
   */
  generateClaudeMdInjection() {
    const index = this.loadIndex();
    const reports = [];
    if (index) {
      const severityOrder = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3
      };
      const minSeverityOrder = severityOrder[this.config.minSyncSeverity];
      for (const meta of index.reports) {
        if (severityOrder[meta.severity] <= minSeverityOrder && meta.status === "active") {
          const report = this.getReport(meta.id);
          if (report) {
            reports.push(report);
          }
        }
        if (reports.length >= this.config.maxSyncItems) {
          break;
        }
      }
    }
    const lines = [
      "## \u26A0\uFE0F \u5DF2\u77E5\u95EE\u9898\u9884\u8B66 (Postmortem Intelligence)",
      "",
      "> \u57FA\u4E8E\u5386\u53F2 bug \u5206\u6790\u81EA\u52A8\u751F\u6210\uFF0C\u5E2E\u52A9\u907F\u514D\u91CD\u590D\u72AF\u9519",
      ""
    ];
    if (reports.length === 0) {
      lines.push("\u6682\u65E0\u9700\u8981\u5173\u6CE8\u7684\u95EE\u9898\u3002");
    } else {
      const critical = reports.filter((r) => r.severity === "critical");
      const high = reports.filter((r) => r.severity === "high");
      const medium = reports.filter((r) => r.severity === "medium");
      if (critical.length > 0) {
        lines.push("### \u{1F534} \u4E25\u91CD");
        for (const r of critical) {
          lines.push(`- **${r.id}**: ${r.title}`);
          lines.push(`  - ${r.aiDirectives[0] || r.preventionMeasures[0]}`);
        }
        lines.push("");
      }
      if (high.length > 0) {
        lines.push("### \u{1F7E0} \u9AD8\u4F18\u5148\u7EA7");
        for (const r of high) {
          lines.push(`- **${r.id}**: ${r.title}`);
          lines.push(`  - ${r.aiDirectives[0] || r.preventionMeasures[0]}`);
        }
        lines.push("");
      }
      if (medium.length > 0) {
        lines.push("### \u{1F7E1} \u4E2D\u4F18\u5148\u7EA7");
        for (const r of medium) {
          lines.push(`- **${r.id}**: ${r.title}`);
        }
        lines.push("");
      }
      lines.push("### \u{1F4CB} \u5F00\u53D1\u6307\u4EE4");
      const allDirectives = /* @__PURE__ */ new Set();
      for (const r of reports.slice(0, 5)) {
        for (const d of r.aiDirectives.slice(0, 2)) {
          allDirectives.add(d);
        }
      }
      for (const d of allDirectives) {
        lines.push(`- ${d}`);
      }
      lines.push("");
      lines.push(`> \u8BE6\u7EC6\u4FE1\u606F\u8BF7\u67E5\u770B \`${this.config.directory}/\` \u76EE\u5F55`);
    }
    return {
      sectionId: "postmortem-warnings",
      title: "\u5DF2\u77E5\u95EE\u9898\u9884\u8B66",
      content: lines.join("\n"),
      priority: 100,
      sourcePostmortems: reports.map((r) => r.id),
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  // ==========================================================================
  // Code Checking
  // ==========================================================================
  /**
   * 检查代码是否可能触发已知问题
   */
  async checkCode(options = {}) {
    const { files, staged } = options;
    let filesToCheck = [];
    if (files && files.length > 0) {
      filesToCheck = files;
    } else if (staged) {
      filesToCheck = this.getStagedFiles();
    } else {
      filesToCheck = this.getAllSourceFiles();
    }
    const issues = [];
    const index = this.loadIndex();
    if (!index) {
      return this.createEmptyCheckReport(filesToCheck.length);
    }
    const patterns = [];
    for (const meta of index.reports) {
      if (meta.status !== "active")
        continue;
      const report = this.getReport(meta.id);
      if (!report)
        continue;
      for (const pattern of report.detectionPatterns) {
        patterns.push({ pattern, postmortemId: report.id });
      }
    }
    for (const file of filesToCheck) {
      const fullPath = path.isAbsolute(file) ? file : path.join(this.projectRoot, file);
      if (!fs.existsSync(fullPath))
        continue;
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      for (const { pattern, postmortemId } of patterns) {
        if (!pattern.fileTypes.some((ft) => file.endsWith(ft))) {
          continue;
        }
        if (pattern.type === "regex") {
          try {
            const regex = new RegExp(pattern.pattern, "g");
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const matches = line.match(regex);
              if (matches) {
                issues.push({
                  file,
                  line: i + 1,
                  column: line.indexOf(matches[0]) + 1,
                  pattern,
                  postmortemId,
                  message: `\u53EF\u80FD\u89E6\u53D1 ${postmortemId}: ${pattern.description}`,
                  suggestion: `\u53C2\u8003 ${this.config.directory}/${postmortemId}.md`
                });
              }
            }
          } catch {
          }
        }
      }
    }
    const summary = {
      critical: issues.filter((i) => i.pattern.severity === "critical").length,
      high: issues.filter((i) => i.pattern.severity === "high").length,
      medium: issues.filter((i) => i.pattern.severity === "medium").length,
      low: issues.filter((i) => i.pattern.severity === "low").length
    };
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      filesChecked: filesToCheck.length,
      issuesFound: issues,
      summary,
      passed: summary.critical === 0 && summary.high === 0
    };
  }
  /**
   * 获取暂存的文件
   */
  getStagedFiles() {
    try {
      const output = execSync("git diff --cached --name-only", {
        cwd: this.projectRoot,
        encoding: "utf-8"
      });
      return output.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }
  /**
   * 获取所有源文件
   */
  getAllSourceFiles() {
    const files = [];
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectRoot, fullPath);
        if (this.config.detection.excludePatterns.some((p) => this.matchGlob(relativePath, p))) {
          continue;
        }
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          if (this.config.detection.includePatterns.some((p) => this.matchGlob(relativePath, p))) {
            files.push(relativePath);
          }
        }
      }
    };
    walk(this.projectRoot);
    return files;
  }
  /**
   * 简单的 glob 匹配
   */
  matchGlob(filepath, pattern) {
    const regexPattern = pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".");
    return new RegExp(`^${regexPattern}$`).test(filepath);
  }
  /**
   * 创建空的检查报告
   */
  createEmptyCheckReport(filesChecked) {
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      filesChecked,
      issuesFound: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      passed: true
    };
  }
  // ==========================================================================
  // Release Summary
  // ==========================================================================
  /**
   * 生成发布摘要
   */
  async generateReleaseSummary(options) {
    const { version, since, until } = options;
    const commits = PostmortemAnalyzer.getFixCommits({
      since,
      until,
      cwd: this.projectRoot
    });
    const analyses = commits.map(
      (c) => PostmortemAnalyzer.analyzeFixCommit(c, this.projectRoot)
    );
    const existingIds = this.listReports().map((r) => r.id);
    const newReports = PostmortemAnalyzer.generatePostmortem(analyses, existingIds);
    const newIds = [];
    for (const report of newReports) {
      report.affectedVersions = { from: since || "unknown", to: version };
      this.saveReport(report);
      newIds.push(report.id);
    }
    this.updateIndex();
    const summary = {
      version,
      releaseDate: (/* @__PURE__ */ new Date()).toISOString(),
      fixCommitCount: commits.length,
      newPostmortems: newIds,
      updatedPostmortems: [],
      summary: this.generateReleaseSummaryText(commits, newReports),
      keyLessons: this.extractKeyLessons(newReports)
    };
    const summaryPath = path.join(this.postmortemDir, "summaries", `${version}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
    if (this.config.autoSyncToClaudeMd) {
      await this.syncToClaudeMd();
    }
    return summary;
  }
  /**
   * 生成发布摘要文本
   */
  generateReleaseSummaryText(commits, reports) {
    const lines = [
      `\u672C\u6B21\u53D1\u5E03\u5305\u542B ${commits.length} \u4E2A bug \u4FEE\u590D\uFF0C\u751F\u6210\u4E86 ${reports.length} \u4E2A\u65B0\u7684 Postmortem \u62A5\u544A\u3002`,
      ""
    ];
    if (reports.length > 0) {
      lines.push("\u4E3B\u8981\u95EE\u9898\u7C7B\u578B:");
      const categories = /* @__PURE__ */ new Map();
      for (const r of reports) {
        categories.set(r.category, (categories.get(r.category) || 0) + 1);
      }
      for (const [cat, count] of categories) {
        lines.push(`- ${cat}: ${count} \u4E2A`);
      }
    }
    return lines.join("\n");
  }
  /**
   * 提取关键教训
   */
  extractKeyLessons(reports) {
    const lessons = /* @__PURE__ */ new Set();
    for (const report of reports) {
      for (const measure of report.preventionMeasures.slice(0, 2)) {
        lessons.add(measure);
      }
    }
    return Array.from(lessons).slice(0, 10);
  }
}
let managerInstance = null;
function getPostmortemManager(projectRoot, config) {
  if (!managerInstance || projectRoot) {
    managerInstance = new PostmortemManager(projectRoot, config);
  }
  return managerInstance;
}

export { PostmortemAnalyzer, PostmortemManager, getPostmortemManager };
