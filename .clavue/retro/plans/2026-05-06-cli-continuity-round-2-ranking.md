# Round 2 Critique and Ranking

## round goal
Rank concrete upgrade candidates and pick one minimal, verified slice.

## baseline command or observation
Read `src/config/smart-defaults.ts`: `detect()` calls `detectClaudeCodeVersion()` before code-tool detection, and that helper checks `claude` before `clavue`. Read `src/constants.ts`: default tool is `clavue`; `CODE_TOOL_INFO.clavue.runtimeCommand` is `clavue`.

## primary metric
One focused test can prove the chosen slice improves the default user path.

## chosen slice or candidate ranking
1. Smart defaults runtime version routing — user impact 4/5, roadmap alignment 5/5, implementation risk 5/5, verification clarity 5/5, simplicity payoff 4/5, total = 23/25.
2. Startup discovery banner wording — user impact 3/5, roadmap alignment 3/5, implementation risk 5/5, verification clarity 4/5, simplicity payoff 3/5, total = 18/25.
3. Clavue completion guidance polish — user impact 3/5, roadmap alignment 4/5, implementation risk 5/5, verification clarity 4/5, simplicity payoff 2/5, total = 18/25.
4. Capability executable matrix — user impact 5/5, roadmap alignment 5/5, implementation risk 2/5, verification clarity 2/5, simplicity payoff 4/5, total = 18/25.
5. Recreate PRODUCT/ARCHITECTURE — user impact 2/5, roadmap alignment 2/5, implementation risk 1/5, verification clarity 1/5, simplicity payoff 1/5, total = 7/25.

Winner: Smart defaults runtime version routing.

## implementation notes
Keep public shape compatible. Use active detected code tool to order candidate commands. Add focused regression in `tests/config/smart-defaults.test.ts`.

## verification command and result
Planned baseline/post-change command: `pnpm vitest run tests/config/smart-defaults.test.ts`.

## compatibility, stability, interaction logic, and reliability scorecard
- compatibility: expected improve/neutral. Existing `claudeCodeVersion` remains.
- stability: expected improve. Version evidence follows selected runtime.
- interaction logic: expected improve. Clavue default path checks Clavue first.
- reliability: expected improve. Regression test locks the behavior.

## keep/discard decision
keep

## next hypothesis
Implement the smart-defaults change and evaluate with the focused test lane.
