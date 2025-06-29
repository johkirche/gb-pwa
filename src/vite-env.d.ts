/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// vue-i18n.d.ts
declare module "vue-i18n" {
  import { App, Ref } from "vue";

  export function createI18n(options: any): any;

  export function useI18n(): {
    t: (key: string, params?: any) => string;
    locale: Ref<string>; // This should be Ref<string>, not { value: string }
    // Add other properties as needed:
    // availableLocales: readonly string[];
    // fallbackLocale: Ref<string>;
    // messages: Ref<any>;
    // etc.
  };
}
