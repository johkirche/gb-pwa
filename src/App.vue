<script setup lang="ts">
// App setup for Vue Router
import { Toaster } from "@/components/ui/toast";
</script>

<template>
  <div id="app">
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
