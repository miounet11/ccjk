export interface McpService {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  requiresKey?: string;
}

export const MCP_SERVICES: McpService[] = [
  {
    id: 'context7',
    name: 'Context7',
    description: '从代码库自动拉取最新文档',
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest'],
  },
  {
    id: 'serena',
    name: 'Serena',
    description: '语义代码分析（基于 LSP）',
    command: 'uvx',
    args: ['--from', 'git+https://github.com/oraios/serena', 'serena-mcp-server'],
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: '浏览器自动化（视觉、E2E）',
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
  },
  {
    id: 'open-websearch',
    name: 'Web Search',
    description: '免 key 网页搜索',
    command: 'npx',
    args: ['-y', '@aas-ee/open-websearch'],
  },
  {
    id: 'mcp-deepwiki',
    name: 'DeepWiki',
    description: '查 GitHub 仓库的智能文档',
    command: 'npx',
    args: ['-y', 'mcp-deepwiki@latest'],
  },
];

export function findMcp(id: string): McpService | undefined {
  return MCP_SERVICES.find(s => s.id === id);
}
