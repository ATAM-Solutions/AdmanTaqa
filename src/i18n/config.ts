import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enNav from "./locales/en/nav.json";
import enAuth from "./locales/en/auth.json";
import arCommon from "./locales/ar/common.json";
import arNav from "./locales/ar/nav.json";
import arAuth from "./locales/ar/auth.json";

export const LOCALE_STORAGE_KEY = "app_locale";
const RTL_LANGUAGES = ["ar"];

export function isRtl(language: string): boolean {
  return RTL_LANGUAGES.includes(language.split("-")[0]);
}

export function applyDocumentDirection(language: string): void {
  document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
  document.documentElement.lang = language;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, nav: enNav, auth: enAuth },
      ar: { common: arCommon, nav: arNav, auth: arAuth },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    ns: ["common", "nav", "auth"],
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  });

i18n.on("languageChanged", applyDocumentDirection);
applyDocumentDirection(i18n.language);

export default i18n;
