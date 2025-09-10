# Language System Documentation

## Overview

AgriSense now supports multiple languages with a comprehensive translation system. Users can switch between English and Malayalam throughout the application.

## Features

- **Language Selection**: Users can choose between English and Malayalam
- **Persistent Storage**: Language preference is saved in localStorage
- **Dynamic Translation**: All UI elements update immediately when language changes
- **API Integration**: Backend APIs support multiple languages for responses
- **Context-Aware**: AI responses adapt to the selected language

## Architecture

### 1. Translation Files
- `src/lib/translations/en.ts` - English translations
- `src/lib/translations/ml.ts` - Malayalam translations
- `src/lib/translations/index.ts` - Translation utilities and types

### 2. Language Context
- `src/contexts/LanguageContext.tsx` - React context for language state management
- Provides `useLanguage()` hook for components
- Manages language switching and persistence

### 3. Language Selector
- `src/components/LanguageSelector.tsx` - Reusable language selection component
- Positioned in top-right corner of dashboard
- Shows native language names (English, മലയാളം)

## Usage

### In Components

```tsx
import { useLanguage } from "@/contexts/LanguageContext";

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div>
      <h1>{t("welcomeMessage")}</h1>
      <button onClick={() => setLanguage("ml")}>
        {t("selectLanguage")}
      </button>
    </div>
  );
}
```

### Translation Keys

All translation keys are defined in the translation files. Common keys include:

- Navigation: `dashboard`, `farmerProfiling`, `landManagement`, etc.
- Forms: `name`, `email`, `phone`, `save`, `cancel`, etc.
- Actions: `edit`, `delete`, `add`, `search`, etc.
- Messages: `loading`, `error`, `success`, etc.

### API Integration

APIs that support multiple languages:

1. **Chat API** (`/api/chat-ollama`)
   - Sends `language` parameter
   - AI responds in selected language
   - System prompts adapt to language

2. **Alerts API** (`/api/alerts/generate`)
   - Generates alerts in selected language
   - Weather, market, and government updates
   - Fertilizer schedules

3. **Knowledge Engine** (Right Panel)
   - Sends language preference to chat API
   - Generates tips in selected language

## Language-Specific Features

### Malayalam Support
- Full Unicode support for Malayalam script
- Native language names in selector
- Culturally appropriate translations
- Technical terms in English when necessary

### English Support
- Standard English interface
- Technical terminology
- International compatibility

## Adding New Translations

1. **Add to Translation Files**:
   ```typescript
   // en.ts
   export const en = {
     newKey: "English text",
     // ...
   };
   
   // ml.ts
   export const ml = {
     newKey: "മലയാളം ടെക്സ്റ്റ്",
     // ...
   };
   ```

2. **Use in Components**:
   ```tsx
   const { t } = useLanguage();
   return <span>{t("newKey")}</span>;
   ```

3. **Update APIs** (if needed):
   ```typescript
   // Add language parameter to API calls
   body: JSON.stringify({
     // ... other params
     language: "ml" // or "en"
   });
   ```

## Language Detection

The system automatically:
- Loads saved language preference from localStorage
- Falls back to English if no preference is set
- Updates all components when language changes
- Persists new language selection

## Best Practices

1. **Consistent Keys**: Use descriptive, hierarchical keys
2. **Fallback**: Always provide English fallback
3. **Context**: Consider cultural context for translations
4. **Testing**: Test both languages thoroughly
5. **Performance**: Translations are loaded once and cached

## File Structure

```
src/
├── lib/translations/
│   ├── en.ts              # English translations
│   ├── ml.ts              # Malayalam translations
│   ├── index.ts           # Translation utilities
│   └── README.md          # This documentation
├── contexts/
│   └── LanguageContext.tsx # Language state management
└── components/
    └── LanguageSelector.tsx # Language selection UI
```

## Future Enhancements

- Add more Indian languages (Hindi, Tamil, Telugu)
- Voice interface in multiple languages
- Regional dialect support
- Automatic language detection based on location
- Translation management system for content updates
