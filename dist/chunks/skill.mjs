import ansis from 'ansis';
import { g as getPluginManager } from '../shared/ccjk.DH6cOJsf.mjs';
import 'node:fs';
import 'node:os';
import 'pathe';
import 'tinyexec';
import 'node:child_process';

async function handleSkillCommand(args, options = {}) {
  const subcommand = args[0];
  const restArgs = args.slice(1);
  switch (subcommand) {
    case "install":
    case "add":
      await installSkill(restArgs[0], options);
      break;
    case "list":
    case "ls":
      await listSkills(options);
      break;
    case "info":
    case "show":
      await showSkillInfo(restArgs[0], options);
      break;
    case "remove":
    case "rm":
    case "uninstall":
      await removeSkill(restArgs[0]);
      break;
    case "search":
      await searchSkills(restArgs.join(" "));
      break;
    default:
      showSkillHelp();
  }
}
async function installSkill(source, options) {
  if (!source) {
    console.log(ansis.red("Error: Please specify a skill source"));
    console.log(ansis.dim("Example: skill install vercel-labs/agent-skills/skills/react-best-practices"));
    return;
  }
  console.log(ansis.cyan(`
\u{1F4E6} Installing skill from: ${source}
`));
  const manager = await getPluginManager();
  const result = await manager.install(source, { force: options.force });
  if (result.success) {
    console.log(ansis.green(`\u2705 Successfully installed: ${result.pluginId}`));
    console.log(ansis.dim(`   Version: ${result.version}`));
    console.log(ansis.dim(`   Path: ${result.path}`));
    const plugin = manager.getPlugin(result.pluginId);
    if (plugin?.skill) {
      console.log("");
      console.log(ansis.bold("Skill Info:"));
      console.log(ansis.dim(`   ${plugin.skill.description}`));
      if (plugin.skill.applicability.taskTypes.length > 0) {
        console.log("");
        console.log(ansis.bold("When to use:"));
        for (const task of plugin.skill.applicability.taskTypes.slice(0, 3)) {
          console.log(ansis.dim(`   \u2022 ${task}`));
        }
      }
    }
  } else {
    console.log(ansis.red(`\u274C Installation failed: ${result.error}`));
  }
}
async function listSkills(options) {
  const manager = await getPluginManager();
  const plugins = manager.listPlugins();
  const skills = plugins.filter((p) => p.skill || p.manifest.formatVersion === "2.0");
  if (options.json) {
    console.log(JSON.stringify(skills.map((s) => ({
      id: s.manifest.id,
      name: s.manifest.name.en,
      version: s.manifest.version,
      hasSkill: !!s.skill,
      scripts: s.scripts?.length ?? 0
    })), null, 2));
    return;
  }
  console.log(ansis.cyan("\n\u{1F4DA} Installed Skills\n"));
  if (skills.length === 0) {
    console.log(ansis.dim("No skills installed yet."));
    console.log(ansis.dim("\nInstall skills with:"));
    console.log(ansis.dim("  skill install vercel-labs/agent-skills/skills/react-best-practices"));
    return;
  }
  for (const skill of skills) {
    const name = skill.manifest.name.en || skill.manifest.id;
    const version = skill.manifest.version;
    const hasScripts = skill.scripts && skill.scripts.length > 0;
    console.log(`  ${ansis.bold(name)} ${ansis.dim(`(${skill.manifest.id})`)} ${ansis.dim(`v${version}`)}`);
    if (skill.skill) {
      console.log(ansis.dim(`    ${skill.skill.description.substring(0, 60)}...`));
    }
    const badges = [];
    if (hasScripts)
      badges.push("\u{1F4DC} scripts");
    if (skill.intents?.length)
      badges.push("\u{1F3AF} intents");
    if (skill.skill?.rules?.length)
      badges.push(`\u{1F4CB} ${skill.skill.rules.length} rules`);
    if (badges.length > 0) {
      console.log(ansis.dim(`    ${badges.join(" \u2022 ")}`));
    }
    console.log("");
  }
  console.log(ansis.dim(`Total: ${skills.length} skills`));
}
async function showSkillInfo(skillId, options) {
  if (!skillId) {
    console.log(ansis.red("Error: Please specify a skill ID"));
    return;
  }
  const manager = await getPluginManager();
  const plugin = manager.getPlugin(skillId);
  if (!plugin) {
    console.log(ansis.red(`Skill not found: ${skillId}`));
    return;
  }
  if (options.json) {
    console.log(JSON.stringify({
      manifest: plugin.manifest,
      skill: plugin.skill ? {
        title: plugin.skill.title,
        description: plugin.skill.description,
        applicability: plugin.skill.applicability,
        rulesCount: plugin.skill.rules?.length ?? 0,
        sectionsCount: plugin.skill.sections.length
      } : null,
      scripts: plugin.scripts,
      intents: plugin.intents
    }, null, 2));
    return;
  }
  console.log("");
  console.log(ansis.bold(ansis.cyan(`\u{1F4E6} ${plugin.manifest.name.en}`)));
  console.log(ansis.dim(`ID: ${plugin.manifest.id}`));
  console.log(ansis.dim(`Version: ${plugin.manifest.version}`));
  console.log(ansis.dim(`Category: ${plugin.manifest.category}`));
  console.log("");
  if (plugin.skill) {
    console.log(ansis.bold("\u{1F4D6} Skill Document"));
    console.log(ansis.dim(`Title: ${plugin.skill.title}`));
    console.log(ansis.dim(`Description: ${plugin.skill.description}`));
    console.log("");
    if (plugin.skill.applicability.taskTypes.length > 0) {
      console.log(ansis.bold("\u{1F3AF} When to Apply"));
      for (const task of plugin.skill.applicability.taskTypes) {
        console.log(ansis.dim(`  \u2022 ${task}`));
      }
      console.log("");
    }
    if (plugin.skill.rules && plugin.skill.rules.length > 0) {
      console.log(ansis.bold(`\u{1F4CB} Rules (${plugin.skill.rules.length} total)`));
      const byPriority = {
        critical: plugin.skill.rules.filter((r) => r.priority === "critical"),
        high: plugin.skill.rules.filter((r) => r.priority === "high"),
        medium: plugin.skill.rules.filter((r) => r.priority === "medium"),
        low: plugin.skill.rules.filter((r) => r.priority === "low")
      };
      if (byPriority.critical.length > 0) {
        console.log(ansis.red(`  \u{1F534} Critical (${byPriority.critical.length})`));
        for (const rule of byPriority.critical.slice(0, 3)) {
          console.log(ansis.dim(`     ${rule.id}: ${rule.title}`));
        }
      }
      if (byPriority.high.length > 0) {
        console.log(ansis.yellow(`  \u{1F7E1} High (${byPriority.high.length})`));
        for (const rule of byPriority.high.slice(0, 3)) {
          console.log(ansis.dim(`     ${rule.id}: ${rule.title}`));
        }
      }
      console.log("");
    }
    if (plugin.skill.sections.length > 0) {
      console.log(ansis.bold("\u{1F4D1} Sections"));
      for (const section of plugin.skill.sections) {
        console.log(ansis.dim(`  \u2022 ${section.title}`));
      }
      console.log("");
    }
  }
  if (plugin.scripts && plugin.scripts.length > 0) {
    console.log(ansis.bold("\u{1F4DC} Scripts"));
    for (const script of plugin.scripts) {
      console.log(ansis.dim(`  \u2022 ${script.name} (${script.type})`));
    }
    console.log("");
  }
  if (plugin.intents && plugin.intents.length > 0) {
    console.log(ansis.bold("\u{1F3AF} Auto-Activation Intents"));
    for (const intent of plugin.intents) {
      console.log(ansis.dim(`  \u2022 ${intent.name.en}`));
      console.log(ansis.dim(`    Patterns: ${intent.patterns.slice(0, 2).join(", ")}...`));
    }
    console.log("");
  }
  console.log(ansis.bold("\u{1F4CD} Source"));
  console.log(ansis.dim(`  Type: ${plugin.source.type}`));
  if (plugin.source.type === "local") {
    console.log(ansis.dim(`  Path: ${plugin.source.path}`));
  } else if (plugin.source.type === "github") {
    console.log(ansis.dim(`  Repo: ${plugin.source.repo}`));
  }
}
async function removeSkill(skillId, _options) {
  if (!skillId) {
    console.log(ansis.red("Error: Please specify a skill ID"));
    return;
  }
  const manager = await getPluginManager();
  const plugin = manager.getPlugin(skillId);
  if (!plugin) {
    console.log(ansis.red(`Skill not found: ${skillId}`));
    return;
  }
  console.log(ansis.yellow(`
\u26A0\uFE0F  Removing skill: ${plugin.manifest.name.en}`));
  const success = await manager.uninstall(skillId);
  if (success) {
    console.log(ansis.green(`\u2705 Successfully removed: ${skillId}`));
  } else {
    console.log(ansis.red(`\u274C Failed to remove: ${skillId}`));
  }
}
async function searchSkills(query, _options) {
  console.log(ansis.cyan(`
\u{1F50D} Searching for skills: "${query}"
`));
  const popularSkills = [
    {
      source: "vercel-labs/agent-skills/skills/react-best-practices",
      name: "React Best Practices",
      description: "40+ React/Next.js performance optimization rules"
    },
    {
      source: "vercel-labs/agent-skills/skills/web-design-guidelines",
      name: "Web Design Guidelines",
      description: "100+ UI/UX rules for accessibility and performance"
    },
    {
      source: "vercel-labs/agent-skills/skills/vercel-deploy-claimable",
      name: "Vercel Deploy",
      description: "One-click deployment with framework auto-detection"
    }
  ];
  console.log(ansis.bold("Popular Skills:"));
  console.log("");
  for (const skill of popularSkills) {
    console.log(`  ${ansis.bold(skill.name)}`);
    console.log(ansis.dim(`    ${skill.description}`));
    console.log(ansis.dim(`    Install: skill install ${skill.source}`));
    console.log("");
  }
  console.log(ansis.dim("More skills coming soon..."));
}
function showSkillHelp() {
  console.log(`
${ansis.bold(ansis.cyan("\u{1F4DA} Skill Command"))}

${ansis.bold("Usage:")}
  skill <command> [options]

${ansis.bold("Commands:")}
  ${ansis.green("install")} <source>   Install a skill from GitHub or local path
  ${ansis.green("list")}              List installed skills
  ${ansis.green("info")} <id>         Show detailed skill information
  ${ansis.green("remove")} <id>       Remove an installed skill
  ${ansis.green("search")} <query>    Search for skills

${ansis.bold("Options:")}
  --force            Force reinstall
  --json             Output as JSON

${ansis.bold("Examples:")}
  ${ansis.dim("# Install from GitHub")}
  skill install vercel-labs/agent-skills/skills/react-best-practices

  ${ansis.dim("# Install from local path")}
  skill install ./my-skill

  ${ansis.dim("# List installed skills")}
  skill list

  ${ansis.dim("# Show skill details")}
  skill info react-best-practices

${ansis.bold("Skill Format:")}
  Skills follow the SKILL.md format with optional scripts:

  my-skill/
  \u251C\u2500\u2500 SKILL.md          # AI instructions
  \u251C\u2500\u2500 plugin.json       # Metadata (optional)
  \u251C\u2500\u2500 scripts/          # Executable scripts
  \u2502   \u2514\u2500\u2500 main.sh
  \u2514\u2500\u2500 references/       # Reference documents
      \u2514\u2500\u2500 rules/
`);
}

export { handleSkillCommand as default, handleSkillCommand };
