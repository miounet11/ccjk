declare module '@typescript-eslint/parser' {
  export function parse(code: string, options?: any): any
  export function parseForESLint(code: string, options?: any): any
}
