'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageSelectorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LanguageSelector({ 
  className = '', 
  showLabel = true, 
  size = 'md' 
}: LanguageSelectorProps) {
  const { language, setLanguage, availableLanguages, getLanguageName } = useLanguage();

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'ml');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getLanguageName(language)}:
        </span>
      )}
      <select
        value={language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className={`
          ${sizeClasses[size]}
          border border-gray-300 dark:border-gray-600 
          rounded-lg 
          bg-white dark:bg-gray-800 
          text-gray-900 dark:text-gray-100
          focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
          transition-colors duration-200
          cursor-pointer
        `}
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
