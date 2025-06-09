<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="flex justify-center mb-6">
        <div class="bg-indigo-100 p-4 rounded-full">
          <Loader2Icon class="animate-spin h-12 w-12 text-indigo-600" />
        </div>
      </div>
      <h1 class="text-2xl font-semibold text-gray-900 mb-2">Loading...</h1>
      <p class="text-gray-600">Routing to the correct page</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loader2Icon } from "lucide-vue-next";

const { checkAuth, isLoggedIn } = useAuth();

// Handle initial routing logic
onMounted(async () => {
  // Use nextTick to ensure the auth plugin has run
  await nextTick();

  try {
    if (isLoggedIn.value) {
      // User is already authenticated, redirect to home
      await navigateTo("/home");
    } else {
      // Check authentication status
      const authenticated = await checkAuth();

      if (authenticated) {
        await navigateTo("/home");
      } else {
        await navigateTo("/auth/login");
      }
    }
  } catch (error) {
    console.error("Authentication check failed:", error);
    // On error, redirect to login page
    await navigateTo("/auth/login");
  }
});
</script>
