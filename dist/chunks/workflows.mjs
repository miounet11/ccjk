import { ensureI18nInitialized, i18n } from './index.mjs';
import 'node:fs';
import 'node:process';
import 'node:url';
import 'i18next';
import 'i18next-fs-backend';
import 'pathe';

const WORKFLOW_CONFIG_BASE = [
  {
    id: "interviewWorkflow",
    defaultSelected: true,
    order: 1,
    commands: ["interview.md"],
    agents: [],
    autoInstallAgents: false,
    category: "interview",
    displayCategory: "planning",
    outputDir: "interview",
    metadata: {
      version: "1.0.0",
      addedDate: "2025-01",
      tags: ["recommended", "popular"],
      difficulty: "beginner"
    }
  },
  {
    id: "essentialTools",
    defaultSelected: true,
    order: 2,
    commands: ["init-project.md", "feat.md"],
    agents: [
      { id: "init-architect", filename: "init-architect.md", required: true },
      { id: "get-current-datetime", filename: "get-current-datetime.md", required: true },
      { id: "planner", filename: "planner.md", required: true },
      { id: "ui-ux-designer", filename: "ui-ux-designer.md", required: true }
    ],
    autoInstallAgents: true,
    category: "essential",
    displayCategory: "planning",
    outputDir: "essential",
    metadata: {
      version: "1.0.0",
      addedDate: "2025-01",
      tags: ["essential"],
      difficulty: "beginner"
    }
  },
  {
    id: "gitWorkflow",
    defaultSelected: true,
    order: 3,
    commands: ["git-commit.md", "git-rollback.md", "git-cleanBranches.md", "git-worktree.md"],
    agents: [],
    autoInstallAgents: false,
    category: "git",
    displayCategory: "versionControl",
    outputDir: "git",
    metadata: {
      version: "1.0.0",
      addedDate: "2025-01",
      tags: ["popular"],
      difficulty: "beginner"
    }
  },
  {
    id: "sixStepsWorkflow",
    defaultSelected: false,
    order: 4,
    commands: ["workflow.md"],
    agents: [],
    autoInstallAgents: false,
    category: "sixStep",
    displayCategory: "development",
    outputDir: "workflow",
    metadata: {
      version: "1.0.0",
      addedDate: "2025-01",
      tags: ["professional"],
      difficulty: "intermediate"
    }
  }
];
function getWorkflowConfigs() {
  ensureI18nInitialized();
  const workflowTranslations = [
    {
      id: "interviewWorkflow",
      name: i18n.t("workflow:workflowOption.interviewWorkflow"),
      description: i18n.t("workflow:workflowDescription.interviewWorkflow"),
      stats: i18n.t("workflow:workflowStats.interviewWorkflow")
    },
    {
      id: "essentialTools",
      name: i18n.t("workflow:workflowOption.essentialTools"),
      description: i18n.t("workflow:workflowDescription.essentialTools"),
      stats: i18n.t("workflow:workflowStats.essentialTools")
    },
    {
      id: "gitWorkflow",
      name: i18n.t("workflow:workflowOption.gitWorkflow"),
      description: i18n.t("workflow:workflowDescription.gitWorkflow"),
      stats: i18n.t("workflow:workflowStats.gitWorkflow")
    },
    {
      id: "sixStepsWorkflow",
      name: i18n.t("workflow:workflowOption.sixStepsWorkflow"),
      description: i18n.t("workflow:workflowDescription.sixStepsWorkflow"),
      stats: i18n.t("workflow:workflowStats.sixStepsWorkflow")
    }
  ];
  return WORKFLOW_CONFIG_BASE.map((baseConfig) => {
    const translation = workflowTranslations.find((t) => t.id === baseConfig.id);
    return {
      ...baseConfig,
      name: translation?.name || baseConfig.id,
      description: translation?.description,
      stats: translation?.stats
    };
  });
}
function getWorkflowConfig(workflowId) {
  return getWorkflowConfigs().find((config) => config.id === workflowId);
}
function getOrderedWorkflows() {
  return getWorkflowConfigs().sort((a, b) => a.order - b.order);
}
function getTagLabel(tag) {
  ensureI18nInitialized();
  const tagKeys = {
    recommended: "workflow:tags.recommended",
    popular: "workflow:tags.popular",
    new: "workflow:tags.new",
    essential: "workflow:tags.essential",
    professional: "workflow:tags.professional"
  };
  return i18n.t(tagKeys[tag]);
}

export { WORKFLOW_CONFIG_BASE, getOrderedWorkflows, getTagLabel, getWorkflowConfig, getWorkflowConfigs };
