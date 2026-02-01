/**
 * Simple i18n module for menu system
 *
 * Provides basic translation functionality with fallback support.
 */

/**
 * Simple i18n implementation with fallback support
 */
export const i18n = {
  /**
   * Translate a key with fallback
   * @param key - Translation key (e.g., 'common:invalidChoice')
   * @param fallback - Fallback value if key not found
   * @returns Translated string or fallback
   */
  t(key: string, fallback: string): string {
    // For now, just return the fallback
    // This can be extended to support actual translations
    return fallback
  },

  /**
   * Get current language
   */
  get language(): string {
    return process.env.LANG?.startsWith('zh') ? 'zh-CN' : 'en'
  },

  /**
   * Check if current language is Chinese
   */
  get isZh(): boolean {
    return this.language.startsWith('zh')
  },
}

export default i18n
