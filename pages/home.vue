<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">
              Welcome, {{ userName }}!
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <button
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              @click="handleLogout"
            >
              <Icon name="lucide:log-out" class="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <!-- Welcome Section -->
        <div class="bg-white overflow-hidden shadow-sm rounded-lg mb-8">
          <div class="px-6 py-8 text-center">
            <div class="max-w-2xl mx-auto">
              <h2 class="text-3xl font-bold text-gray-900 mb-4">
                Protected Home Page
              </h2>
              <p class="text-lg text-gray-600 mb-8">
                This page is only accessible to authenticated users. Welcome to
                your dashboard!
              </p>

              <!-- Status Badge -->
              <div
                class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800"
              >
                <Icon name="lucide:check-circle" class="w-4 h-4 mr-2" />
                Authenticated
              </div>
            </div>
          </div>
        </div>

        <!-- User Information Card -->
        <div v-if="user" class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="px-6 py-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-medium text-gray-900 flex items-center">
                <Icon name="lucide:user" class="w-5 h-5 mr-2 text-gray-500" />
                User Information
              </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div class="flex-shrink-0">
                    <Icon name="lucide:tag" class="w-5 h-5 text-gray-400" />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">User ID</p>
                    <p class="text-sm text-gray-900 font-mono">{{ user.id }}</p>
                  </div>
                </div>

                <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div class="flex-shrink-0">
                    <Icon name="lucide:mail" class="w-5 h-5 text-gray-400" />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">Email</p>
                    <p class="text-sm text-gray-900">{{ user.email }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div
                  v-if="user.first_name"
                  class="flex items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div class="flex-shrink-0">
                    <Icon
                      name="lucide:user-check"
                      class="w-5 h-5 text-gray-400"
                    />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">First Name</p>
                    <p class="text-sm text-gray-900">{{ user.first_name }}</p>
                  </div>
                </div>

                <div
                  v-if="user.last_name"
                  class="flex items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div class="flex-shrink-0">
                    <Icon
                      name="lucide:user-check"
                      class="w-5 h-5 text-gray-400"
                    />
                  </div>
                  <div class="ml-3">
                    <p class="text-sm font-medium text-gray-500">Last Name</p>
                    <p class="text-sm text-gray-900">{{ user.last_name }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-else class="bg-white overflow-hidden shadow-sm rounded-lg">
          <div class="px-6 py-12 text-center">
            <Icon
              name="lucide:loader-2"
              class="animate-spin h-8 w-8 text-gray-400 mx-auto mb-4"
            />
            <p class="text-gray-500">Loading user information...</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

const { user, userName, logout } = useAuth();

const handleLogout = async () => {
  await logout();
};
</script>
