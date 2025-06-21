<template>
  <nav class="bg-card border-b">
    <div class="container mx-auto">
      <div class="flex justify-between h-16 items-center">
        <!-- Left side content -->
        <div class="flex items-center space-x-4">
          <img
            src="/logo.png"
            alt="Logo"
            class="w-10 h-10 mr-2 invert dark:invert-0 hover:cursor-pointer hover:scale-105 transition-all duration-300"
            @click="router.push('/home')"
          />
          <h1 class="text-xl font-semibold">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- Right side navigation -->
        <div class="flex items-center space-x-2">
          <!-- Dark Mode Toggle -->
          <Button variant="outline" size="sm" @click="toggleDarkMode">
            <Sun
              class="h-[1.2rem] w-[1.2rem] scale-100 transition-all dark:scale-0"
            />
            <Moon
              class="absolute h-[1.2rem] w-[1.2rem] scale-0 transition-all dark:scale-100"
            />
            <span class="sr-only">Toggle theme</span>
          </Button>

          <!-- Language Switcher -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" size="sm">
                <LanguagesIcon class="w-4 h-4 mr-2" />
                {{ currentLanguageDisplay }}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="switchLanguage('de')">
                <div class="mr-2 w-4 h-3 flag flag-germany flex-shrink-0"></div>
                Deutsch
              </DropdownMenuItem>
              <DropdownMenuItem @click="switchLanguage('en')">
                <div class="mr-2 w-4 h-3 flag flag-england flex-shrink-0"></div>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Back button (when not on home page) -->
          <Button
            v-if="showBackButton"
            variant="outline"
            size="sm"
            @click="handleBack"
          >
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ backButtonText }}
          </Button>

          <!-- Home button (when not on home page) -->
          <Button
            v-if="showHomeButton"
            variant="outline"
            size="sm"
            @click="router.push('/home')"
          >
            <Home class="w-4 h-4 mr-2" />
            {{ t("utils.home") }}
          </Button>

          <!-- Logout button (when on home page) -->
          <Button
            v-if="showLogoutButton"
            variant="destructive"
            size="sm"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4 mr-2" />
            {{ t("utils.logout") }}
          </Button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import {
  ArrowLeft,
  Home,
  LanguagesIcon,
  LogOut,
  Moon,
  Sun,
} from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/composables/useAuth";

interface Props {
  pageTitle?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showLogoutButton?: boolean;
  backButtonText?: string;
  backTo?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: "Gesangbuch",
  showBackButton: false,
  showHomeButton: false,
  showLogoutButton: false,
  backButtonText: "Back",
  backTo: "/home",
});

const emit = defineEmits<{
  logout: [];
  back: [];
}>();

const router = useRouter();
const { logout } = useAuth();
const { t, locale } = useI18n();

// Dark mode functionality - initialize with system preference
const colorMode = useColorMode({
  initialValue: "auto",
});

const toggleDarkMode = () => {
  colorMode.value = colorMode.value === "dark" ? "light" : "dark";
};

// Language switcher functionality
const currentLanguageDisplay = computed(() => {
  return locale.value === "de" ? "DE" : "EN";
});

const switchLanguage = (lang: string) => {
  locale.value = lang;
  // Optionally save to localStorage for persistence
  localStorage.setItem("preferred-language", lang);
};

const handleBack = () => {
  if (props.backTo) {
    router.push(props.backTo);
  } else {
    emit("back");
  }
};

const handleLogout = async () => {
  await logout();
  emit("logout");
};
</script>

<style>
.flag {
  border-radius: 2px;
}

.flag-germany {
  background: linear-gradient(
    to bottom,
    #000000 0%,
    #000000 33.33%,
    #dd0000 33.33%,
    #dd0000 66.66%,
    #ffce00 66.66%,
    #ffce00 100%
  );
}

.flag-england {
  background: white;
  position: relative;
  overflow: hidden;
}

.flag-england::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  background: #ce1124;
  transform: translateX(-50%);
}

.flag-england::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
  background: #ce1124;
  transform: translateY(-50%);
}
</style>
