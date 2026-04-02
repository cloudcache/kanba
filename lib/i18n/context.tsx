'use client';

/**
 * I18n Context Provider
 * Phase 1: Client-side i18n context
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { type Locale, defaultLocale, isValidLocale, locales, localeNames } from './config';
import { createTranslator, formatDate, formatDateTime, formatRelativeTime, formatNumber } from './index';
import type { Messages } from './index';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string) => string;
  formatDateTime: (date: Date | string) => string;
  formatRelativeTime: (date: Date | string) => string;
  formatNumber: (num: number) => string;
  availableLocales: typeof locales;
  localeNames: typeof localeNames;
}

const I18nContext = createContext<I18nContextType | null>(null);

const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Try to get locale from cookie on client side
    if (typeof window !== 'undefined') {
      const cookieLocale = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${LOCALE_COOKIE_NAME}=`))
        ?.split('=')[1];
      
      if (cookieLocale && isValidLocale(cookieLocale)) {
        return cookieLocale;
      }
    }
    return initialLocale || defaultLocale;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    if (isValidLocale(newLocale)) {
      setLocaleState(newLocale);
      // Set cookie
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale};path=/;max-age=31536000`;
      // Optionally reload to apply locale changes
      // window.location.reload();
    }
  }, []);

  // Sync with user profile locale if available
  useEffect(() => {
    // This will be connected to UserProvider in the future
    // to sync locale preference with user profile
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const translator = createTranslator(locale);
      return translator(key, params);
    },
    [locale]
  );

  const value: I18nContextType = {
    locale,
    setLocale,
    t,
    formatDate: (date: Date | string) => formatDate(date, locale),
    formatDateTime: (date: Date | string) => formatDateTime(date, locale),
    formatRelativeTime: (date: Date | string) => formatRelativeTime(date, locale),
    formatNumber: (num: number) => formatNumber(num, locale),
    availableLocales: locales,
    localeNames,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to use i18n context
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * Hook to get translation function
 */
export function useTranslation() {
  const { t, locale } = useI18n();
  return { t, locale };
}
