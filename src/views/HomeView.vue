<template>
  <AppLayout>
    <div class="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
      <!-- Greeting -->
      <header>
        <p class="text-sm text-muted-foreground capitalize">{{ todayLabel }}</p>
        <h1 class="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight">
          {{ greeting }}<span v-if="userName">, {{ userName }}</span>
        </h1>
        <p class="mt-2 text-muted-foreground">{{ t("home.subtitle") }}</p>
      </header>

      <!-- Prominent search -->
      <SearchSection />

      <!-- Stat strip -->
      <StatsRow />

      <!-- Quick access -->
      <section>
        <h2 class="text-lg font-semibold tracking-tight mb-4">{{ t("home.quickAccess") }}</h2>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            v-for="action in quickActions"
            :key="action.key"
            class="group flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50"
            @click="router.push(action.to)"
          >
            <div
              class="grid place-items-center w-10 h-10 rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <component :is="action.icon" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <p class="font-medium leading-tight">{{ action.title }}</p>
              <p class="text-sm text-muted-foreground mt-0.5 line-clamp-2">{{ action.desc }}</p>
            </div>
          </button>
        </div>
      </section>

      <!-- Categories -->
      <CategoriesSection />

      <!-- Recent services -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold tracking-tight">{{ t("home.recentHeading") }}</h2>
          <Button
            v-if="recentServices.length"
            variant="ghost"
            size="sm"
            class="text-muted-foreground"
            @click="router.push({ name: 'church-service' })"
          >
            {{ t("home.recentViewAll") }}
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </div>

        <p v-if="!recentServices.length" class="text-sm text-muted-foreground">
          {{ t("home.recentEmpty") }}
        </p>

        <ul v-else class="-mx-2 divide-y divide-border">
          <li v-for="service in recentServices" :key="service.id">
            <button
              class="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-accent"
              @click="handleLoadService(service)"
            >
              <div
                class="grid place-items-center w-10 h-10 rounded-lg bg-muted text-lg shrink-0"
              >
                ⛪
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{{ service.name }}</p>
                <p class="text-xs text-muted-foreground">{{ formatDate(service.createdAt) }}</p>
              </div>
              <Badge variant="secondary" class="shrink-0">
                {{ t("home.songsCountLabel", { count: service.songs.length }) }}
              </Badge>
              <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { type ServiceHistoryItem, useChurchServiceStore } from "@/stores/churchService";
import { useStatsStore } from "@/stores/stats";
import { Church, ChevronRight, Heart, ListMusic, Music } from "lucide-vue-next";

import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import AppLayout from "@/components/layout/AppLayout.vue";
import CategoriesSection from "@/components/home/CategoriesSection.vue";
import SearchSection from "@/components/home/SearchSection.vue";
import StatsRow from "@/components/home/StatsRow.vue";

import { useAuth } from "@/composables/useAuth";

const { t, locale } = useI18n();
const { userName } = useAuth();
const statsStore = useStatsStore();
const router = useRouter();
const churchServiceStore = useChurchServiceStore();

// Time-of-day greeting
const greeting = computed(() => {
  const hour = new Date().getHours();
  const key =
    hour < 5 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return t(`home.greeting.${key}`);
});

const todayLabel = computed(() =>
  new Date().toLocaleDateString(locale.value === "de" ? "de-DE" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }),
);

const quickActions = computed(() => [
  {
    key: "songs",
    icon: Music,
    title: t("home.actions.browseSongs"),
    desc: t("home.actions.browseSongsDesc"),
    to: { name: "songs" },
  },
  {
    key: "favorites",
    icon: Heart,
    title: t("home.actions.favorites"),
    desc: t("home.actions.favoritesDesc"),
    to: { name: "songs", query: { favoritesOnly: "true" } },
  },
  {
    key: "playlists",
    icon: ListMusic,
    title: t("playlist.title"),
    desc: t("playlist.description"),
    to: { name: "playlists" },
  },
  {
    key: "church-service",
    icon: Church,
    title: t("home.actions.churchService"),
    desc: t("home.actions.churchServiceDesc"),
    to: { name: "church-service" },
  },
]);

const recentServices = computed(() => churchServiceStore.serviceHistory.slice(0, 3));

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString(locale.value === "de" ? "de-DE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return t("utils.unknown");
  }
};

const handleLoadService = async (service: ServiceHistoryItem) => {
  churchServiceStore.loadService(service);
  await router.push({ name: "church-service" });
};

onMounted(async () => {
  await statsStore.loadStats();
  await churchServiceStore.loadHistory();
});
</script>
