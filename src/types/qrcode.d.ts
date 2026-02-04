declare module 'qrcode' {
  export function toString(
    text: string,
    options?: { type?: string; width?: number }
  ): Promise<string>
}
