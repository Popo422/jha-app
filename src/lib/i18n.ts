import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en/common.json';
import es from '../locales/es/common.json';
import pl from '../locales/pl/common.json';
import zh from '../locales/zh/common.json';

const resources = {
  en: {
    common: en,
  },
  es: {
    common: es,
  },
  pl: {
    common: pl,
  },
  zh: {
    common: zh,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;