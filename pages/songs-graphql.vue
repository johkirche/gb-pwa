<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Gesangbuchlied (GraphQL)</h1>

    <!-- Token Status -->
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 class="font-semibold mb-2">Authentication Status</h3>
      <p class="text-sm">
        <strong>Token:</strong>
        <span class="font-mono text-xs">
          {{ token ? `${token.substring(0, 20)}...` : "No token" }}
        </span>
      </p>
      <p class="text-sm mt-1">
        <strong>User:</strong>
        {{ user?.first_name || user?.email || "Not authenticated" }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"
      ></div>
      <p class="mt-4 text-gray-600">Loading songs...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
    >
      <h3 class="font-semibold text-red-800 mb-2">Error</h3>
      <pre class="text-sm text-red-700">{{ error }}</pre>
      <button
        @click="refetch()"
        class="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>

    <!-- Songs List -->
    <div v-else class="space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">
          Songs ({{ gesangbuchlied.length }} items)
        </h2>
        <button
          @click="refetch()"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="song in gesangbuchlied"
          :key="song.id"
          class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <h3 class="font-semibold text-lg mb-2">{{ song.titel }}</h3>

          <div class="space-y-1 text-sm text-gray-600">
            <p v-if="song.autor"><strong>Autor:</strong> {{ song.autor }}</p>
            <p v-if="song.komponist">
              <strong>Komponist:</strong> {{ song.komponist }}
            </p>
            <p v-if="song.kategorie">
              <strong>Kategorie:</strong> {{ song.kategorie.name }}
            </p>
            <p v-if="song.audio_datei">
              <strong>Audio:</strong> {{ song.audio_datei.filename_download }}
            </p>
          </div>

          <!-- Song Text Preview -->
          <div v-if="song.text" class="mt-3 pt-3 border-t border-gray-100">
            <p class="text-sm text-gray-700 line-clamp-3">
              {{ song.text.substring(0, 150)
              }}{{ song.text.length > 150 ? "..." : "" }}
            </p>
          </div>

          <!-- Actions -->
          <div class="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            <button
              @click="viewSong(song.id)"
              class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              View Details
            </button>
            <button
              v-if="song.audio_datei"
              @click="playAudio(song.audio_datei)"
              class="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              Play Audio
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Debug Information -->
    <details class="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <summary class="cursor-pointer font-semibold mb-2">
        Debug Information
      </summary>
      <div class="space-y-2 text-sm">
        <div>
          <strong>GraphQL Variables:</strong>
          <pre class="mt-1 p-2 bg-white border rounded text-xs">{{
            variables
          }}</pre>
        </div>
        <div>
          <strong>Raw Response:</strong>
          <pre
            class="mt-1 p-2 bg-white border rounded text-xs max-h-40 overflow-y-auto"
            >{{ JSON.stringify(gesangbuchlied.slice(0, 2), null, 2) }}</pre
          >
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
// Ensure user is authenticated
definePageMeta({
  middleware: "auth",
});

// Get authentication info for display
const { token } = useDirectusToken();
const { user } = useAuth();

// Use the GraphQL composable
const { useGesangbuchliedQuery } = useGesangbuchlied();

// Query options
const variables = {
  limit: 50,
  offset: 0,
  filter: {
    status: { _eq: "published" },
  },
};

// Execute the query
const { gesangbuchlied, loading, error, refetch } =
  useGesangbuchliedQuery(variables);

// Debug: Log the token for testing
watch(
  token,
  (newToken) => {
    console.log(
      "Token changed:",
      newToken ? `${newToken.substring(0, 20)}...` : "No token"
    );
  },
  { immediate: true }
);

// Actions
const viewSong = (id: string | number) => {
  console.log("Viewing song:", id);
  // Navigate to song details page
  navigateTo(`/songs/${id}`);
};

const playAudio = (audioFile: any) => {
  console.log("Playing audio:", audioFile);
  // Implement audio playback logic
  // You could use Howler.js or similar
};

// Log any errors for debugging
watch(error, (newError) => {
  if (newError) {
    console.error("GraphQL Error:", newError);
  }
});
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
