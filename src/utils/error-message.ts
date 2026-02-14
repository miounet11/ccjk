/**
 * Extract error message from unknown error type.
 * Replaces the repetitive `error instanceof Error ? error.message : String(error)` pattern.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
