import { createI18n } from "vue-i18n";

// Dynamically import all translation files
const enModules = import.meta.glob("@/locales/en/*.json", { eager: true });
const deModules = import.meta.glob("@/locales/de/*.json", { eager: true });

// Helper function to create messages object from modules
function createMessagesFromModules(modules: Record<string, unknown>) {
  const messages: Record<string, unknown> = {};

  Object.entries(modules).forEach(([path, module]) => {
    // Extract filename without extension from the path
    const filename = path.split("/").pop()?.replace(".json", "") || "";

    // Handle both ES modules with default export and direct JSON
    const moduleContent = (module as { default?: unknown }).default ?? module;
    messages[filename] = moduleContent;
  });

  return messages;
}

// Create the complete translation objects
const enMessages = createMessagesFromModules(enModules);
const deMessages = createMessagesFromModules(deModules);

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem("preferred-language") || "en",
  fallbackLocale: "en",
  messages: {
    en: enMessages,
    de: deMessages,
  },
} as Parameters<typeof createI18n>[0]);

export default i18n;
