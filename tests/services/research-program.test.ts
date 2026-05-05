import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('../../src/utils/fs-operations', () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

describe('research program', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves the default program path from cwd', async () => {
    const { resolveResearchProgramPath } = await import('../../src/services/research-program');

    expect(resolveResearchProgramPath(undefined, '/repo')).toBe('/repo/.ccjk/research/program.md');
    expect(resolveResearchProgramPath('custom/program.md', '/repo')).toBe('/repo/custom/program.md');
  });

  it('creates a default program template with normalized defaults', async () => {
    const {
      createDefaultResearchProgramTemplate,
      DEFAULT_RESEARCH_BUDGET_MS,
      DEFAULT_RESEARCH_MAX_NO_IMPROVE_ROUNDS,
      DEFAULT_RESEARCH_MAX_ROUNDS,
    } = await import('../../src/services/research-program');

    const content = createDefaultResearchProgramTemplate('/repo');

    expect(content).toContain('name: repo-research');
    expect(content).toContain('metric: test_pass_rate');
    expect(content).toContain('objective: maximize');
    expect(content).toContain('baselineCommand: pnpm test:run');
    expect(content).toContain('candidateCommand: pnpm test:run');
    expect(content).toContain(`cwd: /repo`);
    expect(content).toContain(`maxRounds: ${DEFAULT_RESEARCH_MAX_ROUNDS}`);
    expect(content).toContain(`maxNoImproveRounds: ${DEFAULT_RESEARCH_MAX_NO_IMPROVE_ROUNDS}`);
    expect(content).toContain(`budgetMs: ${DEFAULT_RESEARCH_BUDGET_MS}`);
  });

  it('parses research program frontmatter and notes', async () => {
    const { parseResearchProgram } = await import('../../src/services/research-program');

    const program = parseResearchProgram(`---
name: latency-research
metric: latency_ms
objective: minimize
baselineCommand: pnpm bench:baseline
candidateCommand: pnpm bench:candidate
cwd: /repo
maxRounds: 5
maxNoImproveRounds: 2
budgetMs: 30000
targetMetric: 120.5
---

# Goal

Reduce API latency.
`, '/repo/.ccjk/research/program.md');

    expect(program).toEqual({
      name: 'latency-research',
      metric: 'latency_ms',
      objective: 'minimize',
      baselineCommand: 'pnpm bench:baseline',
      candidateCommand: 'pnpm bench:candidate',
      cwd: '/repo',
      maxRounds: 5,
      maxNoImproveRounds: 2,
      budgetMs: 30000,
      targetMetric: 120.5,
      notes: '# Goal\n\nReduce API latency.',
      programPath: '/repo/.ccjk/research/program.md',
    });
  });

  it('normalizes invalid optional values to defaults', async () => {
    const {
      parseResearchProgram,
      DEFAULT_RESEARCH_BUDGET_MS,
      DEFAULT_RESEARCH_MAX_NO_IMPROVE_ROUNDS,
      DEFAULT_RESEARCH_MAX_ROUNDS,
    } = await import('../../src/services/research-program');

    const program = parseResearchProgram(`---
name: test
objective: unsupported
baselineCommand: pnpm test:run
candidateCommand: pnpm test:run
maxRounds: nope
maxNoImproveRounds: 0
budgetMs: -1
---

Notes
`);

    expect(program.objective).toBe('auto');
    expect(program.maxRounds).toBe(DEFAULT_RESEARCH_MAX_ROUNDS);
    expect(program.maxNoImproveRounds).toBe(DEFAULT_RESEARCH_MAX_NO_IMPROVE_ROUNDS);
    expect(program.budgetMs).toBe(DEFAULT_RESEARCH_BUDGET_MS);
    expect(program.targetMetric).toBeUndefined();
  });

  it('throws when required commands are missing', async () => {
    const { parseResearchProgram } = await import('../../src/services/research-program');

    expect(() => parseResearchProgram(`---
name: invalid
candidateCommand: pnpm test:run
---
`)).toThrow('Missing required \'baselineCommand\'');

    expect(() => parseResearchProgram(`---
name: invalid
baselineCommand: pnpm test:run
---
`)).toThrow('Missing required \'candidateCommand\'');
  });

  it('reads and parses a program file', async () => {
    const { readResearchProgram } = await import('../../src/services/research-program');

    mockReadFile.mockReturnValue(`---
name: read-test
baselineCommand: pnpm test:run
candidateCommand: pnpm test:run
---

Body
`);

    const program = readResearchProgram(undefined, '/repo');

    expect(mockReadFile).toHaveBeenCalledWith('/repo/.ccjk/research/program.md');
    expect(program.name).toBe('read-test');
    expect(program.programPath).toBe('/repo/.ccjk/research/program.md');
  });

  it('writes a default program template', async () => {
    const { initResearchProgram } = await import('../../src/services/research-program');

    const result = initResearchProgram(undefined, '/repo');

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile).toHaveBeenCalledWith('/repo/.ccjk/research/program.md', expect.stringContaining('baselineCommand: pnpm test:run'));
    expect(result.programPath).toBe('/repo/.ccjk/research/program.md');
    expect(result.content).toContain('candidateCommand: pnpm test:run');
  });
});
