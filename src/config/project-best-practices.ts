import type { ProjectContext } from './project-scanner.js'

/**
 * Return concise, actionable best practices based on detected project context.
 */
export function getProjectBestPractices(ctx: ProjectContext): string {
  const lines: string[] = []

  // Language-specific practices
  switch (ctx.language) {
    case 'typescript':
      lines.push('- Use strict TypeScript. Prefer `interface` over `type` for object shapes. Run `tsc --noEmit` before committing.')
      break
    case 'python':
      if (ctx.linter === 'ruff' || ctx.formatter === 'ruff') {
        lines.push('- Use ruff for linting and formatting. Run `ruff check .` and `ruff format .` before committing.')
      }
      else {
        if (ctx.linter === 'flake8') {
          lines.push('- Run `flake8` before committing.')
        }
        if (ctx.formatter === 'black') {
          lines.push('- Use black for formatting. Run `black --check .` before committing.')
        }
      }
      break
    case 'go':
      lines.push('- Run `go vet ./...` and `gofmt` before committing. Use `golangci-lint` if available.')
      break
    case 'rust':
      lines.push('- Run `cargo clippy` and `cargo fmt` before committing.')
      break
  }

  // Linter (JS/TS ecosystem — not already covered above)
  if (ctx.linter === 'eslint' && (ctx.language === 'typescript' || ctx.language === 'javascript')) {
    lines.push('- Run `eslint .` before committing to catch lint issues.')
  }

  // Formatter (JS/TS ecosystem)
  if (ctx.formatter === 'prettier' && (ctx.language === 'typescript' || ctx.language === 'javascript')) {
    lines.push('- Run `prettier --check .` to verify formatting.')
  }

  // Test runner
  if (ctx.testRunner !== 'none') {
    const cmd = ctx.testRunner === 'vitest' ? 'vitest run' : ctx.testRunner === 'jest' ? 'jest' : ctx.testRunner === 'pytest' ? 'pytest' : ctx.testRunner
    lines.push(`- Run tests with \`${cmd}\` before committing.`)
  }

  // Package manager
  if (ctx.packageManager) {
    lines.push(`- Use \`${ctx.packageManager}\` for dependency management.`)
  }

  // Monorepo
  if (ctx.isMonorepo) {
    lines.push('- This is a monorepo. Be aware of workspace boundaries.')
  }

  // Conventional commits
  if (ctx.usesConventionalCommits) {
    lines.push('- Follow conventional commit format: `feat|fix|chore|docs(scope): message`')
  }

  return lines.join('\n')
}
