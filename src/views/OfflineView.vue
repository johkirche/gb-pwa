<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <div class="text-center max-w-md mx-auto p-6">
      <div class="mb-6">
        <div class="bg-muted p-4 rounded-full inline-block">
          <WifiOff class="h-12 w-12 text-muted-foreground" />
        </div>
      </div>

      <h1 class="text-2xl font-semibold text-foreground mb-2">
        You're offline
      </h1>

      <p class="text-muted-foreground mb-6">
        It looks like you don't have an internet connection. Some features may
        not be available.
      </p>

      <div class="space-y-4">
        <Button variant="default" class="w-full" @click="goHome">
          <Home class="w-4 h-4 mr-2" />
          Go to Home
        </Button>

        <Button variant="outline" class="w-full" @click="goBack">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Go Back
        </Button>

        <Button variant="ghost" class="w-full" @click="refresh">
          <RefreshCw class="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>

      <div class="mt-8 p-4 bg-muted rounded-lg">
        <h3 class="font-medium mb-2">Available offline:</h3>
        <ul class="text-sm text-muted-foreground space-y-1">
          <li>• Previously viewed songs</li>
          <li>• Downloaded offline content</li>
          <li>• Basic navigation</li>
        </ul>
      </div>

      <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p class="text-sm text-blue-800">
          <strong>Tip:</strong> When you're back online, use the "Download All
          Songs" feature on the home page to ensure full offline access.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Home, RefreshCw, WifiOff } from "lucide-vue-next";

import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";

const router = useRouter();

const goHome = () => {
  router.push("/home");
};

const goBack = () => {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
  } else {
    router.push("/");
  }
};

const refresh = () => {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
};
</script>
