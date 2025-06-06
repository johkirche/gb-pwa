<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Navigation Header -->
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
          <div class="flex items-center space-x-4">
            <button
              class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              @click="navigateTo('/home')"
            >
              Back to Home
            </button>
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
        <!-- Admin Section -->
        <div class="bg-white overflow-hidden shadow-sm rounded-lg mb-8">
          <div class="px-6 py-8">
            <div class="max-w-2xl mx-auto text-center">
              <div class="flex justify-center mb-4">
                <div class="bg-red-100 p-3 rounded-full">
                  <Icon name="lucide:shield" class="h-8 w-8 text-red-600" />
                </div>
              </div>
              <h2 class="text-3xl font-bold text-gray-900 mb-4">
                Admin Dashboard
              </h2>
              <p class="text-lg text-gray-600 mb-8">
                This page is only accessible to users with admin privileges. You
                can manage users, settings, and system configuration here.
              </p>

              <!-- Status Badge -->
              <div
                class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800"
              >
                <Icon name="lucide:shield-check" class="w-4 h-4 mr-2" />
                Admin Access Granted
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Tools -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="bg-white overflow-hidden shadow-sm rounded-lg">
            <div class="p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <Icon name="lucide:users" class="h-8 w-8 text-blue-600" />
                </div>
                <div class="ml-4">
                  <h3 class="text-lg font-medium text-gray-900">
                    User Management
                  </h3>
                  <p class="text-sm text-gray-500">
                    Manage user accounts and permissions
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow-sm rounded-lg">
            <div class="p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <Icon name="lucide:settings" class="h-8 w-8 text-green-600" />
                </div>
                <div class="ml-4">
                  <h3 class="text-lg font-medium text-gray-900">
                    System Settings
                  </h3>
                  <p class="text-sm text-gray-500">
                    Configure application settings
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white overflow-hidden shadow-sm rounded-lg">
            <div class="p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <Icon
                    name="lucide:bar-chart"
                    class="h-8 w-8 text-purple-600"
                  />
                </div>
                <div class="ml-4">
                  <h3 class="text-lg font-medium text-gray-900">Analytics</h3>
                  <p class="text-sm text-gray-500">
                    View system analytics and reports
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "admin",
});

const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
};
</script>
