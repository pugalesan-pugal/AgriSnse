import { en } from './en';
import { ml } from './ml';

export type Language = 'en' | 'ml';

export const translations = {
  en,
  ml,
};

export const getTranslation = (key: string, language: Language = 'en'): string => {
  const keys = key.split('.');
  let value: any = translations[language];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return the key if not found in any language
        }
      }
      break;
    }
  }
  
  return typeof value === 'string' ? value : key;
};

export const getAvailableLanguages = (): Array<{ code: Language; name: string; nativeName: string }> => [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
];

export const getLanguageName = (code: Language): string => {
  const languages = getAvailableLanguages();
  const language = languages.find(lang => lang.code === code);
  return language ? language.nativeName : code;
};
