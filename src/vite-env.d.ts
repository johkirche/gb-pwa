/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Not ideal and shouldn't be nessary but :shrug:
declare module "vue-i18n" {
  import { App } from "vue";
  export function createI18n(options: any): any;
  export function useI18n(): {
    t: (key: string, params?: any) => string;
    locale: { value: string };
  };
}
