<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
  >
    <div
      v-if="!checking"
      class="max-w-md w-full bg-white rounded-lg shadow-lg p-8"
    >
      <div class="text-center mb-8">
        <h2 class="text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <form class="space-y-6" @submit.prevent="handleLogin">
        <div class="space-y-4">
          <div>
            <label
              for="email"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Email address
            </label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Icon name="lucide:mail" class="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                v-model="email"
                type="email"
                name="email"
                autocomplete="email"
                required
                placeholder="Enter your email"
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <div class="relative">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <Icon name="lucide:lock" class="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                v-model="password"
                type="password"
                name="password"
                autocomplete="current-password"
                required
                placeholder="Enter your password"
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 transition-colors"
              />
            </div>
          </div>
        </div>

        <div
          v-if="error"
          class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div class="flex items-center">
            <Icon
              name="lucide:alert-circle"
              class="h-5 w-5 text-red-500 mr-2 flex-shrink-0"
            />
            <span>{{ error }}</span>
          </div>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isLoading || checking"
            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="checking" class="flex items-center">
              <Icon
                name="lucide:loader-2"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              />
              Checking authentication...
            </span>
            <span v-else-if="isLoading" class="flex items-center">
              <Icon
                name="lucide:loader-2"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              />
              Signing in...
            </span>
            <span v-else class="flex items-center">
              <Icon name="lucide:log-in" class="h-5 w-5 mr-2" />
              Sign in
            </span>
          </button>
        </div>
      </form>
    </div>
    <div v-else class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-extrabold text-gray-900">
          Checking authentication...
        </h2>
        <p class="text-gray-600">
          Please wait while we check your authentication status.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const email = ref("");
const password = ref("");
const error = ref("");
const checking = ref(true);

const { login, isLoading, checkAuth } = useAuth();

// Check if user should be automatically logged in on page load
onMounted(async () => {
  checking.value = true;
  try {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
      // User is already authenticated, redirect to home
      await navigateTo("/home");
    }
  } catch (error) {
    console.error("Auth check failed:", error);
  } finally {
    checking.value = false;
  }
});

const handleLogin = async () => {
  error.value = "";

  if (!email.value || !password.value) {
    error.value = "Please fill in all fields";
    return;
  }

  const result = await login(email.value, password.value);

  if (result.success) {
    // Use the redirect URL if available, otherwise go to home
    const { getRedirectUrl } = useRouteGuards();
    const redirectTo = getRedirectUrl("/home");
    await navigateTo(redirectTo);
  } else {
    error.value = result.error || "Login failed";
  }
};
</script>
