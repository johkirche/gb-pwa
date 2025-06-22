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

        <!-- Desktop navigation (hidden on mobile) -->
        <div class="hidden md:flex items-center space-x-2">
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

        <!-- Mobile menu (visible on mobile only) -->
        <div class="md:hidden">
          <Dialog v-model:open="mobileMenuOpen">
            <DialogTrigger as-child>
              <Button variant="outline" size="sm">
                <Menu class="w-4 h-4" />
                <span class="sr-only">Open menu</span>
              </Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Menu</DialogTitle>
              </DialogHeader>
              <div class="grid gap-4 py-4">
                <!-- Dark Mode Toggle -->
                <Button
                  variant="outline"
                  class="justify-start"
                  @click="toggleDarkMode"
                >
                  <Sun
                    class="h-[1.2rem] w-[1.2rem] scale-100 transition-all dark:scale-0 mr-2"
                  />
                  <Moon
                    class="absolute h-[1.2rem] w-[1.2rem] scale-0 transition-all dark:scale-100 mr-2"
                  />
                  <span class="ml-6">{{
                    colorMode === "dark" ? "Light Mode" : "Dark Mode"
                  }}</span>
                </Button>

                <!-- Language Switcher -->
                <div class="space-y-2">
                  <Button
                    variant="outline"
                    class="justify-start w-full"
                    :class="{ 'bg-accent': locale.value === 'de' }"
                    @click="switchLanguage('de')"
                  >
                    <div
                      class="mr-2 w-4 h-3 flag flag-germany flex-shrink-0"
                    ></div>
                    Deutsch
                  </Button>
                  <Button
                    variant="outline"
                    class="justify-start w-full"
                    :class="{ 'bg-accent': locale.value === 'en' }"
                    @click="switchLanguage('en')"
                  >
                    <div
                      class="mr-2 w-4 h-3 flag flag-england flex-shrink-0"
                    ></div>
                    English
                  </Button>
                </div>

                <!-- Separator -->
                <div
                  v-if="showBackButton || showHomeButton || showLogoutButton"
                  class="border-t my-2"
                ></div>

                <!-- Navigation buttons -->
                <Button
                  v-if="showBackButton"
                  variant="outline"
                  class="justify-start"
                  @click="
                    handleBack;
                    mobileMenuOpen = false;
                  "
                >
                  <ArrowLeft class="w-4 h-4 mr-2" />
                  {{ backButtonText }}
                </Button>

                <Button
                  v-if="showHomeButton"
                  variant="outline"
                  class="justify-start"
                  @click="
                    router.push('/home');
                    mobileMenuOpen = false;
                  "
                >
                  <Home class="w-4 h-4 mr-2" />
                  {{ t("utils.home") }}
                </Button>

                <Button
                  v-if="showLogoutButton"
                  variant="destructive"
                  class="justify-start"
                  @click="
                    handleLogout;
                    mobileMenuOpen = false;
                  "
                >
                  <LogOut class="w-4 h-4 mr-2" />
                  {{ t("utils.logout") }}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
  Menu,
  Moon,
  Sun,
} from "lucide-vue-next";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

// Mobile menu state
const mobileMenuOpen = ref(false);
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
