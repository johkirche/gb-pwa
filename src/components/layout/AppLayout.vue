<template>
  <div class="h-dvh flex overflow-hidden bg-background text-foreground">
    <!-- ============ Desktop sidebar ============ -->
    <aside
      class="hidden md:flex md:flex-col w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground"
    >
      <!-- Brand -->
      <RouterLink
        to="/home"
        class="flex items-center gap-2.5 h-16 px-5 border-b border-sidebar-border"
      >
        <img src="/logo.png" alt="" class="w-8 h-8 invert dark:invert-0" />
        <span class="text-base font-semibold tracking-tight">{{ t("nav.brand") }}</span>
      </RouterLink>

      <!-- Nav links -->
      <nav class="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          :to="item.to"
          :class="[
            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive(item)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          ]"
        >
          <component
            :is="item.icon"
            :class="[
              'w-[18px] h-[18px] shrink-0 transition-colors',
              isActive(item) ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
            ]"
          />
          <span class="truncate">{{ t(item.label) }}</span>
        </RouterLink>
      </nav>

      <!-- Footer: preferences + account -->
      <div class="border-t border-sidebar-border p-3 space-y-3">
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            class="shrink-0"
            :title="t('nav.toggleTheme')"
            @click="toggleTheme"
          >
            <Sun class="h-[1.1rem] w-[1.1rem] scale-100 dark:scale-0 transition-transform" />
            <Moon
              class="absolute h-[1.1rem] w-[1.1rem] scale-0 dark:scale-100 transition-transform"
            />
            <span class="sr-only">{{ t("nav.toggleTheme") }}</span>
          </Button>
          <LanguageSwitch variant="dropdown" size="sm" class="flex-1 [&_button]:w-full" />
        </div>

        <!-- Account row only when actually signed in; in offline mode there is
             no real user, so we offer a sign-in shortcut instead. -->
        <div v-if="user" class="flex items-center gap-2 rounded-lg px-1.5 py-1">
          <div
            class="w-8 h-8 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold"
          >
            {{ initials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ userName }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ t("nav.account") }}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            class="shrink-0 text-muted-foreground hover:text-destructive"
            :title="t('utils.logout')"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
            <span class="sr-only">{{ t("utils.logout") }}</span>
          </Button>
        </div>
        <Button
          v-else
          variant="outline"
          size="sm"
          class="w-full justify-start gap-2"
          @click="goToLogin"
        >
          <LogIn class="w-4 h-4" />
          {{ t("utils.login") }}
        </Button>
      </div>
    </aside>

    <!-- ============ Content column ============ -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile top bar -->
      <header
        class="md:hidden flex items-center justify-between h-14 px-4 border-b bg-background/80 backdrop-blur-sm shrink-0"
      >
        <RouterLink to="/home" class="flex items-center gap-2">
          <img src="/logo.png" alt="" class="w-7 h-7 invert dark:invert-0" />
          <span class="font-semibold tracking-tight">{{ t("nav.brand") }}</span>
        </RouterLink>
        <Button
          variant="ghost"
          size="icon"
          :title="t('nav.toggleTheme')"
          @click="toggleTheme"
        >
          <Sun class="h-5 w-5 scale-100 dark:scale-0 transition-transform" />
          <Moon class="absolute h-5 w-5 scale-0 dark:scale-100 transition-transform" />
          <span class="sr-only">{{ t("nav.toggleTheme") }}</span>
        </Button>
      </header>

      <!-- Page content (each view owns its own scroll) -->
      <main class="flex-1 min-h-0 overflow-y-auto">
        <slot />
      </main>

      <!-- Mobile bottom navigation -->
      <nav
        class="md:hidden shrink-0 border-t bg-background/95 backdrop-blur-sm grid grid-cols-5"
        :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
      >
        <RouterLink
          v-for="item in primaryNav"
          :key="item.key"
          :to="item.to"
          :class="[
            'flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
            isActive(item) ? 'text-primary' : 'text-muted-foreground',
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
          <span class="truncate max-w-full px-1">{{ t(item.label) }}</span>
        </RouterLink>

        <!-- More menu -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              :class="[
                'flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors w-full',
                moreActive ? 'text-primary' : 'text-muted-foreground',
              ]"
            >
              <MoreHorizontal class="w-5 h-5" />
              <span>{{ t("nav.more") }}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" class="w-52 mb-1">
            <DropdownMenuItem
              v-for="item in moreNav"
              :key="item.key"
              @click="router.push(item.to)"
            >
              <component :is="item.icon" class="w-4 h-4 mr-2 text-muted-foreground" />
              {{ t(item.label) }}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="switchLanguage('de')">
              <img src="https://flagcdn.com/de.svg" alt="" class="w-5 h-3.5 mr-2 rounded-xs" />
              Deutsch
            </DropdownMenuItem>
            <DropdownMenuItem @click="switchLanguage('en')">
              <img src="https://flagcdn.com/us.svg" alt="" class="w-5 h-3.5 mr-2 rounded-xs" />
              English
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              v-if="user"
              class="text-destructive focus:text-destructive"
              @click="handleLogout"
            >
              <LogOut class="w-4 h-4 mr-2" />
              {{ t("utils.logout") }}
            </DropdownMenuItem>
            <DropdownMenuItem v-else @click="goToLogin">
              <LogIn class="w-4 h-4 mr-2" />
              {{ t("utils.login") }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import {
  Church,
  DownloadCloud,
  Home,
  ListMusic,
  LogIn,
  LogOut,
  Moon,
  MoreHorizontal,
  Music,
  Settings,
  Sun,
} from "lucide-vue-next";

import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { type RouteLocationRaw, RouterLink, useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LanguageSwitch from "@/components/ui/LanguageSwitch.vue";

import { useAuth } from "@/composables/useAuth";

interface NavItem {
  key: string;
  label: string;
  icon: unknown;
  to: RouteLocationRaw;
  /** route names that should mark this entry active (incl. detail routes) */
  match: string[];
}

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { user, userName, logout } = useAuth();

const navItems: NavItem[] = [
  { key: "home", label: "nav.home", icon: Home, to: { name: "home" }, match: ["home"] },
  { key: "songs", label: "nav.songs", icon: Music, to: { name: "songs" }, match: ["songs", "lied"] },
  {
    key: "playlists",
    label: "nav.playlists",
    icon: ListMusic,
    to: { name: "playlists" },
    match: ["playlists", "playlist-detail"],
  },
  {
    key: "service",
    label: "nav.churchService",
    icon: Church,
    to: { name: "church-service" },
    match: ["church-service"],
  },
  {
    key: "offline",
    label: "nav.offline",
    icon: DownloadCloud,
    to: { name: "offline" },
    match: ["offline"],
  },
  {
    key: "settings",
    label: "nav.settings",
    icon: Settings,
    to: { name: "settings" },
    match: ["settings"],
  },
];

// Mobile: first four are tabs, the rest fold into the "More" menu.
const primaryNav = computed(() => navItems.slice(0, 4));
const moreNav = computed(() => navItems.slice(4));

const isActive = (item: NavItem) => item.match.includes(route.name as string);
const moreActive = computed(() => moreNav.value.some((i) => isActive(i)));

const colorMode = useColorMode({ initialValue: "auto" });
const toggleTheme = () => {
  colorMode.value = colorMode.value === "dark" ? "light" : "dark";
};

const switchLanguage = (lang: string) => {
  locale.value = lang;
  localStorage.setItem("preferred-language", lang);
};

const initials = computed(() => {
  const name = (userName.value || "").trim();
  if (!name) return "·";
  const parts = name.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || first.toUpperCase();
});

const handleLogout = async () => {
  await logout();
};

const goToLogin = () => {
  router.push("/login");
};
</script>
