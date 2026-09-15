<script setup lang="ts">
// App setup for Vue Router
import { Toaster } from "@/components/ui/toast";

import PwaUpdateNotification from "@/components/PwaUpdateNotification.vue";
</script>

<template>
  <div id="app">
    <PwaUpdateNotification />
    <RouterView />
    <!-- Single toast host for the whole app: stores queue messages without a
         component instance, this renders them above every route and dialog. -->
    <Toaster />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
}
</style>
