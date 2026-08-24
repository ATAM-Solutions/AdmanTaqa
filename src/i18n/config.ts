import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const LOCALE_STORAGE_KEY = "app_locale";
const RTL_LANGUAGES = ["ar"];

export function isRtl(language: string): boolean {
  return RTL_LANGUAGES.includes(language.split("-")[0]);
}

export function applyDocumentDirection(language: string): void {
  document.documentElement.dir = isRtl(language) ? "rtl" : "ltr";
  document.documentElement.lang = language;
}

/** Every ./locales/<lng>/<namespace>.json is picked up automatically — no manual registration per domain. */
const localeModules = import.meta.glob<{ default: Record<string, unknown> }>("./locales/*/*.json", { eager: true });

function buildResources(): Resource {
  const resources: Resource = {};
  for (const path in localeModules) {
    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
    if (!match) continue;
    const [, lng, ns] = match;
    resources[lng] ??= {};
    resources[lng][ns] = localeModules[path].default;
  }
  return resources;
}

const resources = buildResources();
const namespaces = Array.from(new Set(Object.values(resources).flatMap((byNs) => Object.keys(byNs))));

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    ns: namespaces,
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
