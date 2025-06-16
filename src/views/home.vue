<template>
  <div class="min-h-screen bg-background">
    <AppHeader
      :page-title="`Willkommen, ${userName}!`"
      :show-logout-button="true"
      @logout="handleLogout"
    />

    <!-- Main Content -->
    <main class="container mx-auto py-8">
      <HomeUserInfoCard :user="user" class="mb-6" />
      <OfflineDownloadCard class="mb-6" />
      <HomeGesangbuchliederCard
        :songs="gesangbuchlieder"
        :is-loading="isLoading"
        :query-error="queryError"
        @fetch-songs="fetchGesangbuchlieder"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { useAuth } from "@/composables/useAuth";
import { useGesangbuchlied } from "@/composables/useGesangbuchlied";

import AppHeader from "@/components/AppHeader.vue";
import HomeUserInfoCard from "@/components/home/UserInfoCard.vue";
import OfflineDownloadCard from "@/components/OfflineDownloadCard.vue";
import HomeGesangbuchliederCard from "@/components/home/GesangbuchliederCard.vue";
import type { Gesangbuchlied } from "@/gql/graphql";

const { user, userName, logout } = useAuth();

const handleLogout = async () => {
  await logout();
};

const gesangbuchlieder = ref<Gesangbuchlied[]>([]);
const isLoading = ref(false);
const queryError = ref<string | null>(null);

const fetchGesangbuchlieder = async () => {
  try {
    isLoading.value = true;
    queryError.value = null;

    // Query options
    const variables = {
      limit: 150,
      offset: 0,
      filter: {
        status: { _eq: "published" },
        bewertungKleinerKreis: { rangfolge: { _eq: 5 } },
      },
    };

    // Much cleaner - direct async call!
    const { queryGesangbuchlied } = useGesangbuchlied();
    const result = await queryGesangbuchlied(variables);

    gesangbuchlieder.value = result;
  } catch (err) {
    console.error("Error fetching gesangbuchlieder:", err);

    // Handle offline errors gracefully
    if (typeof window !== "undefined" && !navigator.onLine) {
      queryError.value =
        "This feature requires an internet connection. Please check your network and try again.";
    } else {
      queryError.value =
        err instanceof Error ? err.message : "Unknown error occurred";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>
