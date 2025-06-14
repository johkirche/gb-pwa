<template>
  <div>
    <VitePwaManifest />
    <NuxtRouteAnnouncer />

    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp();

onMounted(() => {
  if ($pwa.offlineReady) console.log("PWA is ready to work offline");
  if ($pwa.swActivated) {
    console.log("Service Worker is activated");
  }
});
</script>
