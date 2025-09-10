'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language, getTranslation, getAvailableLanguages, getLanguageName } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  availableLanguages: Array<{ code: Language; name: string; nativeName: string }>;
  getLanguageName: (code: Language) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('ml');

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('agrisense.language') as Language;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ml')) {
        setLanguageState(savedLanguage);
      } else {
        // Default to Malayalam if no preference is saved
        setLanguageState('ml');
      }
    }
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agrisense.language', newLanguage);
    }
  };

  // Translation function - use useMemo to ensure it updates when language changes
  const t = useMemo(() => {
    return (key: string): string => {
      return getTranslation(key, language);
    };
  }, [language]);

  const availableLanguages = getAvailableLanguages();

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    availableLanguages,
    getLanguageName,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Hook for easy translation
export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}
