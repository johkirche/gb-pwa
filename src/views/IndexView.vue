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
</script>
