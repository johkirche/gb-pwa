<template>
  <div class="min-h-screen bg-background">
    <AppHeader :page-title="`Willkommen, ${userName}!`" :show-logout-button="true" @logout="handleLogout" />

    <!-- Main Content -->
    <main class="container mx-auto py-8">
      <HomeWelcomeCard />
      <HomeUserInfoCard :user="user" />
      <HomeGesangbuchliederCard :songs="gesangbuchlieder" :is-loading="isLoading" :query-error="queryError"
        @fetch-songs="fetchGesangbuchlieder" />
    </main>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: "auth",
});

const { user, userName, logout } = useAuth();

const handleLogout = async () => {
  await logout();
};

const gesangbuchlieder = ref([]);
const isLoading = ref(false);
const queryError = ref(null);

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
      },
    };

    // Much cleaner - direct async call!
    const { queryGesangbuchlied } = useGesangbuchlied();
    const result = await queryGesangbuchlied(variables);

    gesangbuchlieder.value = result;
  } catch (err) {
    console.error("Error fetching gesangbuchlieder:", err);
    queryError.value =
      err instanceof Error ? err.message : "Unknown error occurred";
  } finally {
    isLoading.value = false;
  }
};
</script>
