'use client';

/**
 * Language Switcher Component
 * Phase 1: Basic language switching UI
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { type Locale, localeFlags } from '@/lib/i18n/config';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon';
  align?: 'start' | 'center' | 'end';
}

export function LanguageSwitcher({ variant = 'default', align = 'end' }: LanguageSwitcherProps) {
  const { locale, setLocale, availableLocales, localeNames } = useI18n();

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Switch language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          {availableLocales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={locale === loc ? 'bg-accent' : ''}
            >
              <span className="mr-2">{localeFlags[loc]}</span>
              {localeNames[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <span>{localeFlags[locale]}</span>
            <span className="hidden sm:inline">{locale.toUpperCase()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          {availableLocales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={locale === loc ? 'bg-accent' : ''}
            >
              <span className="mr-2">{localeFlags[loc]}</span>
              {localeNames[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="h-4 w-4" />
          <span>{localeFlags[locale]}</span>
          <span>{localeNames[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {availableLocales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeFlags[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
