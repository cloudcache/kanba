/**
 * Internationalization Configuration
 * Phase 1: Basic i18n infrastructure
 */

export const locales = ['en', 'zh-CN', 'zh-TW', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  'ja': '日本語',
};

export const localeFlags: Record<Locale, string> = {
  'en': '🇺🇸',
  'zh-CN': '🇨🇳',
  'zh-TW': '🇹🇼',
  'ja': '🇯🇵',
};

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get the locale from various sources (cookie, header, default)
 */
export function getLocaleFromRequest(
  cookieLocale?: string,
  headerLocale?: string
): Locale {
  // Priority: Cookie > Header > Default
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale;
  }
  
  if (headerLocale) {
    // Parse Accept-Language header
    const preferredLocale = headerLocale.split(',')[0]?.split('-')[0];
    if (preferredLocale && isValidLocale(preferredLocale)) {
      return preferredLocale;
    }
    // Check for full locale match (e.g., zh-CN)
    const fullLocale = headerLocale.split(',')[0]?.trim();
    if (fullLocale && isValidLocale(fullLocale)) {
      return fullLocale;
    }
  }
  
  return defaultLocale;
}

/**
 * Date format options per locale
 */
export const dateFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  'en': {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
  'zh-CN': {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  'zh-TW': {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  'ja': {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
};

/**
 * Number format options per locale
 */
export const numberFormats: Record<Locale, Intl.NumberFormatOptions> = {
  'en': {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  'zh-CN': {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  'zh-TW': {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
  'ja': {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  },
};
