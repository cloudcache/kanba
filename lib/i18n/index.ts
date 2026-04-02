/**
 * Internationalization Service
 * Phase 1: Basic i18n infrastructure
 */

import { type Locale, defaultLocale, isValidLocale } from './config';

// Import locale messages
import en from '@/locales/en.json';
import zhCN from '@/locales/zh-CN.json';
import zhTW from '@/locales/zh-TW.json';
import ja from '@/locales/ja.json';

// Type for messages
export type Messages = typeof en;

// Messages map
const messages: Record<Locale, Messages> = {
  'en': en,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja': ja,
};

/**
 * Get messages for a locale
 */
export function getMessages(locale: string): Messages {
  if (isValidLocale(locale)) {
    return messages[locale];
  }
  return messages[defaultLocale];
}

/**
 * Get a nested translation key
 * @example getTranslation(messages, 'auth.login') => 'Sign In'
 */
export function getTranslation(
  msgs: Messages,
  key: string,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.');
  let result: unknown = msgs;

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key; // Return the key if translation not found
    }
  }

  if (typeof result !== 'string') {
    return key;
  }

  // Replace parameters
  if (params) {
    return Object.entries(params).reduce((str, [paramKey, value]) => {
      return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    }, result);
  }

  return result;
}

/**
 * Create a translation function for a specific locale
 */
export function createTranslator(locale: string) {
  const msgs = getMessages(locale);
  
  return function t(key: string, params?: Record<string, string | number>): string {
    return getTranslation(msgs, key, params);
  };
}

/**
 * Format date according to locale
 */
export function formatDate(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'ja': 'ja-JP',
  };

  return d.toLocaleDateString(localeMap[locale] || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time according to locale
 */
export function formatDateTime(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'ja': 'ja-JP',
  };

  return d.toLocaleString(localeMap[locale] || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const t = createTranslator(locale);
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) {
    return t('time.justNow');
  } else if (minutes < 60) {
    return t(minutes === 1 ? 'time.minutesAgo' : 'time.minutesAgo_plural', { count: minutes });
  } else if (hours < 24) {
    return t(hours === 1 ? 'time.hoursAgo' : 'time.hoursAgo_plural', { count: hours });
  } else if (days < 7) {
    return t(days === 1 ? 'time.daysAgo' : 'time.daysAgo_plural', { count: days });
  } else if (weeks < 4) {
    return t(weeks === 1 ? 'time.weeksAgo' : 'time.weeksAgo_plural', { count: weeks });
  } else if (months < 12) {
    return t(months === 1 ? 'time.monthsAgo' : 'time.monthsAgo_plural', { count: months });
  } else {
    return t(years === 1 ? 'time.yearsAgo' : 'time.yearsAgo_plural', { count: years });
  }
}

/**
 * Format number according to locale
 */
export function formatNumber(num: number, locale: string): string {
  const localeMap: Record<string, string> = {
    'en': 'en-US',
    'zh-CN': 'zh-CN',
    'zh-TW': 'zh-TW',
    'ja': 'ja-JP',
  };

  return num.toLocaleString(localeMap[locale] || 'en-US');
}

// Re-export config
export * from './config';
