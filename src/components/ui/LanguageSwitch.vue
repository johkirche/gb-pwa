<template>
  <div v-if="variant === 'dropdown'">
    <!-- Language Switcher Dropdown -->
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button variant="outline" :size="size">
          <LanguagesIcon class="w-4 h-4 mr-2" />
          {{ currentLanguageDisplay }}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem @click="switchLanguage('de')">
          <img
            src="https://flagcdn.com/de.svg"
            alt="DE"
            :class="['mr-2 flex-shrink-0', flagSizeClasses]"
          />
          Deutsch
        </DropdownMenuItem>
        <DropdownMenuItem @click="switchLanguage('en')">
          <img
            src="https://flagcdn.com/us.svg"
            alt="US"
            :class="['mr-2 flex-shrink-0', flagSizeClasses]"
          />
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  <div v-else-if="variant === 'toggle'" class="space-y-2">
    <!-- Language Switcher Toggle Buttons -->
    <Button
      variant="outline"
      :class="['justify-start w-full', { 'bg-accent': locale === 'de' }]"
      :size="size"
      @click="switchLanguage('de')"
    >
      <img
        src="https://flagcdn.com/de.svg"
        alt="DE"
        :class="['mr-2 flex-shrink-0', flagSizeClasses]"
      />
      Deutsch
    </Button>
    <Button
      variant="outline"
      :class="['justify-start w-full', { 'bg-accent': locale === 'en' }]"
      :size="size"
      @click="switchLanguage('en')"
    >
      <img
        src="https://flagcdn.com/us.svg"
        alt="US"
        :class="['mr-2 flex-shrink-0', flagSizeClasses]"
      />
      English
    </Button>
  </div>

  <div v-else-if="variant === 'flag-button'" class="relative">
    <!-- Simple Flag Button -->
    <button
      @click="toggleLanguage"
      :class="['cursor-pointer hover:scale-110 transition-transform duration-200  hover:shadow-md']"
      :title="`Switch to ${locale === 'de' ? 'English' : 'Deutsch'}`"
    >
      <img
        :src="locale === 'de' ? 'https://flagcdn.com/de.svg' : 'https://flagcdn.com/us.svg'"
        :alt="locale === 'de' ? 'DE' : 'US'"
        :class="flagSizeClasses"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { LanguagesIcon } from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  variant?: "dropdown" | "toggle" | "flag-button";
  size?: "sm" | "default" | "lg";
  flagSize?: "xs" | "sm" | "md" | "lg";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "dropdown",
  size: "sm",
  flagSize: "sm",
});

const { locale } = useI18n();

// Language display for dropdown
const currentLanguageDisplay = computed(() => {
  return locale.value === "de" ? "DE" : "EN";
});

// Flag size classes
const flagSizeClasses = computed(() => {
  switch (props.flagSize) {
    case "xs":
      return "w-5 h-3";
    case "sm":
      return "w-6 h-4";
    case "md":
      return "w-8 h-5";
    case "lg":
      return "w-10 h-6";
    default:
      return "w-6 h-4";
  }
});

const switchLanguage = (lang: string) => {
  locale.value = lang;
  // Save to localStorage for persistence
  localStorage.setItem("preferred-language", lang);
};

const toggleLanguage = () => {
  const newLang = locale.value === "de" ? "en" : "de";
  switchLanguage(newLang);
};
</script>

<style scoped>
/* Focus styles for flag button accessibility */
button:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  outline: none;
}
</style>
