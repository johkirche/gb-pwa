<template>
  <div
    class="relative min-h-screen flex items-center justify-center overflow-hidden bg-background py-12 px-4 sm:px-6 lg:px-8"
  >
    <!-- Animated "sacred" backdrop: a base warm gradient, slow-drifting amber
         aurora blobs, a soft breathing glow behind the card, and a few musical
         notes rising on the breeze. All colours come from theme tokens, so it
         adapts to dark mode; motion is disabled for prefers-reduced-motion. -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute inset-0 bg-gradient-to-b from-accent/40 via-background to-background" />
      <div class="aurora-blob aurora-blob--1 opacity-[0.34] dark:opacity-[0.2]" />
      <div class="aurora-blob aurora-blob--2 opacity-[0.3] dark:opacity-[0.16]" />
      <div class="aurora-blob aurora-blob--3 opacity-[0.28] dark:opacity-[0.13]" />
      <div class="aurora-glow opacity-[0.18] dark:opacity-[0.12]" />

      <component
        :is="note.icon"
        v-for="(note, i) in floatingNotes"
        :key="i"
        class="float-note text-[oklch(0.6_0.13_68)] dark:text-primary [--note-peak:0.36] dark:[--note-peak:0.17]"
        :style="{
          left: note.left,
          width: note.size,
          height: note.size,
          animationDuration: note.duration,
          animationDelay: note.delay,
          '--note-depth': note.depth,
        }"
      />
    </div>

    <!-- Theme + language controls, anchored to the page corner so they never crowd the card. -->
    <div class="absolute top-4 right-4 z-20 flex items-center gap-3">
      <button
        type="button"
        class="relative flex h-6 w-6 items-center justify-center text-muted-foreground transition-transform duration-200 hover:scale-110 hover:text-foreground"
        :title="colorMode === 'dark' ? t('login.themeToLight') : t('login.themeToDark')"
        @click="toggleDarkMode"
      >
        <Sun class="h-5 w-5 scale-100 transition-transform duration-200 dark:scale-0" />
        <Moon class="absolute h-5 w-5 scale-0 transition-transform duration-200 dark:scale-100" />
        <span class="sr-only">{{ t("login.toggleTheme") }}</span>
      </button>
      <LanguageSwitch variant="flag-button" flag-size="sm" />
    </div>

    <div class="relative z-10 w-full max-w-md">
      <!-- Brand mark: the winged-hymnal emblem set in a gold medallion. -->
      <div class="mb-6 flex flex-col items-center text-center">
        <div
          class="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 ring-1 ring-primary/20"
        >
          <img src="/logo.png" alt="" class="h-20 w-20 object-contain" />
        </div>
        <h1 class="mt-4 text-2xl font-semibold tracking-tight text-foreground">Gesangbuch</h1>
      </div>

      <Card class="w-full shadow-xl shadow-black/5">
        <template v-if="checking">
          <CardContent class="text-center">
            <Loader2 class="animate-spin h-8 w-8 text-primary mx-auto mb-4" />
            <CardTitle>{{ t("login.checkingAuth") }}</CardTitle>
            <CardDescription class="mt-1.5">
              {{ t("login.checkingAuthDescription") }}
            </CardDescription>
          </CardContent>
        </template>

        <template v-else>
          <CardHeader class="text-center">
            <CardTitle class="text-2xl font-bold">
              {{ t("login.title") }}
            </CardTitle>
            <CardDescription>
              {{ t("login.description") }}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form class="space-y-6" @submit.prevent="handleLogin">
              <div class="space-y-4">
                <div>
                  <Label for="email" class="mb-2">{{ t("login.emailLabel") }}</Label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail class="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="email"
                      v-model="email"
                      type="email"
                      name="email"
                      autocomplete="email"
                      required
                      :placeholder="t('login.emailPlaceholder')"
                      class="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label for="password" class="mb-2">{{ t("login.passwordLabel") }}</Label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock class="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="password"
                      v-model="password"
                      type="password"
                      name="password"
                      autocomplete="current-password"
                      required
                      :placeholder="t('login.passwordPlaceholder')"
                      class="pl-10"
                    />
                  </div>
                </div>
              </div>

              <Alert v-if="error" variant="destructive">
                <AlertCircle />
                <AlertDescription>
                  {{ error }}
                </AlertDescription>
              </Alert>

              <div>
                <Button type="submit" :disabled="isLoading" class="w-full" size="lg">
                  <span v-if="isLoading" class="flex items-center">
                    <Loader2 class="animate-spin -ml-1 mr-3 h-5 w-5" />
                    {{ t("login.signingInButton") }}
                  </span>
                  <span v-else class="flex items-center">
                    <LogIn class="h-5 w-5 mr-2" />
                    {{ t("login.signInButton") }}
                  </span>
                </Button>
              </div>
            </form>

            <!-- Offline access: let users with downloaded content into the app
                 without signing in (e.g. after a logout or an expired session). -->
            <div v-if="hasOfflineContent">
              <div class="mt-6 flex items-center gap-3">
                <span class="h-px flex-1 bg-border" />
                <span class="text-xs uppercase text-muted-foreground">{{ t("login.orDivider") }}</span>
                <span class="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                class="w-full mt-4"
                size="lg"
                @click="continueOffline"
              >
                <WifiOff class="h-5 w-5 mr-2" />
                {{ t("login.continueOffline") }}
              </Button>

              <p class="mt-2 text-center text-xs text-muted-foreground">
                {{ t("login.continueOfflineHint") }}
              </p>
            </div>
          </CardContent>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AlertCircle,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Moon,
  Music,
  Music2,
  Music3,
  Music4,
  Sun,
  WifiOff,
} from "lucide-vue-next";
import { useColorMode } from "@vueuse/core";

import { onMounted, ref } from "vue";
import type { Ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { hasOfflineContentAvailable } from "@/composables/useOfflineDownload";
import { useAuthStore } from "@/stores/auth";

import LanguageSwitch from "@/components/ui/LanguageSwitch.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/composables/useAuth";

// Ornamental notes drifting up through the backdrop. Negative delays stagger
// them so several are already mid-flight on first paint; varied size/opacity
// suggests depth. Purely decorative (the whole layer is aria-hidden).
const floatingNotes = [
  { icon: Music, left: "8%", size: "1.75rem", duration: "17s", delay: "-2s", depth: 1.2 },
  { icon: Music2, left: "20%", size: "1.25rem", duration: "22s", delay: "-11s", depth: 0.85 },
  { icon: Music3, left: "34%", size: "2rem", duration: "19s", delay: "-7s", depth: 1 },
  { icon: Music4, left: "61%", size: "1.5rem", duration: "21s", delay: "-3s", depth: 0.95 },
  { icon: Music, left: "78%", size: "2.25rem", duration: "16s", delay: "-13s", depth: 1.15 },
  { icon: Music2, left: "90%", size: "1.25rem", duration: "24s", delay: "-6s", depth: 0.75 },
];

const email: Ref<string> = ref("");
const password: Ref<string> = ref("");
const error: Ref<string> = ref("");
const checking: Ref<boolean> = ref(false);
const hasOfflineContent: Ref<boolean> = ref(false);

const { login, isLoading, checkAuth, getRedirectUrl, isLoggedIn } = useAuth();
const authStore = useAuthStore();
const router = useRouter();
const { t } = useI18n();

// Theme toggle. Shares vueuse's default storage key with the in-app header
// toggle, so the choice the user makes here persists into the app.
const colorMode = useColorMode({ initialValue: "auto" });
const toggleDarkMode = (): void => {
  colorMode.value = colorMode.value === "dark" ? "light" : "dark";
};

// Check authentication status on mount
onMounted(async (): Promise<void> => {
  // Surface the offline-entry option if the user has downloaded content.
  hasOfflineContent.value = await hasOfflineContentAvailable();

  // Only check auth if not already logged in to prevent unnecessary calls
  if (isLoggedIn.value) {
    await router.push("/home");
    return;
  }

  checking.value = true;
  try {
    const isAuthenticated: boolean = await checkAuth();
    if (isAuthenticated) {
      await router.push("/home");
    }
  } catch (error: unknown) {
    console.error("Auth check failed:", error);
    // Continue to show login form on error
  } finally {
    checking.value = false;
  }
});

// Enter the app in offline mode using downloaded content. Clears any explicit
// logout flag (pressing this is a deliberate choice to use the app again) so
// the offline-first router guard lets the user through to /home.
const continueOffline = async (): Promise<void> => {
  authStore.setLoggedOut(false);
  await router.push("/home");
};

const handleLogin = async (): Promise<void> => {
  error.value = "";

  if (!email.value || !password.value) {
    error.value = t("login.fillAllFields");
    return;
  }

  const result = await login(email.value, password.value);

  if (result.success) {
    // Use the redirect URL if available, otherwise go to home
    const redirectTo: string = getRedirectUrl("/home");
    await router.push(redirectTo);
  } else {
    error.value = result.error || t("login.loginFailed");
  }
};
</script>

<style scoped>
/* Slow-drifting amber "aurora" blobs. Colours pull from the global theme
   tokens so the whole scene re-tints automatically in dark mode. */
.aurora-blob {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  will-change: transform;
}
/* Per-theme intensity (opacity / colour / --note-peak) is set with Tailwind
   `dark:` utilities in the template, NOT here: these warm, light-ish blobs read
   strongly on the dark background but weakly on the near-white one, so light
   mode needs MORE opacity and dark mode LESS. Driving that from the template
   keeps it on the proven `dark:` variant and avoids scoped `:global()` quirks. */
.aurora-blob--1 {
  top: -8rem;
  left: -6rem;
  width: 34rem;
  height: 34rem;
  background: var(--primary);
  animation: drift-1 24s ease-in-out infinite alternate;
}
.aurora-blob--2 {
  right: -6rem;
  bottom: -8rem;
  width: 30rem;
  height: 30rem;
  /* Warm orange — a literal so it stays in the amber family in both light and
     dark (the theme's chart tokens flip to cool hues in dark mode). */
  background: oklch(0.68 0.15 52);
  animation: drift-2 28s ease-in-out infinite alternate;
}
.aurora-blob--3 {
  top: 28%;
  right: 10%;
  width: 26rem;
  height: 26rem;
  /* Soft gold, likewise pinned to a warm hue. */
  background: oklch(0.82 0.14 85);
  animation: drift-3 32s ease-in-out infinite alternate;
}

/* Soft glow that gently breathes (scale only) directly behind the card. */
.aurora-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 36rem;
  height: 36rem;
  margin-top: -18rem;
  margin-left: -18rem;
  border-radius: 9999px;
  background: var(--primary);
  filter: blur(80px);
  animation: breathe 9s ease-in-out infinite;
}

.float-note {
  position: absolute;
  bottom: -3rem;
  /* --note-peak (per-theme target opacity, set in the template) × --note-depth
     (per-note, set inline) gives each note its animated peak opacity. */
  opacity: 0;
  will-change: transform, opacity;
  animation-name: float-up;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes drift-1 {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(5rem, 3rem, 0) scale(1.12);
  }
}
@keyframes drift-2 {
  from {
    transform: translate3d(0, 0, 0) scale(1.05);
  }
  to {
    transform: translate3d(-4rem, -3rem, 0) scale(1);
  }
}
@keyframes drift-3 {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-3rem, 4rem, 0) scale(1.1);
  }
}
@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
}
@keyframes float-up {
  0% {
    transform: translateY(0) rotate(-6deg);
    opacity: 0;
  }
  12% {
    opacity: calc(var(--note-peak, 0.3) * var(--note-depth, 1));
  }
  88% {
    opacity: calc(var(--note-peak, 0.3) * var(--note-depth, 1));
  }
  100% {
    transform: translateY(-105vh) rotate(8deg);
    opacity: 0;
  }
}

/* Respect users who prefer reduced motion: keep the static gradient + blobs
   for atmosphere, but stop all movement and hide the drifting notes. */
@media (prefers-reduced-motion: reduce) {
  .aurora-blob,
  .aurora-glow {
    animation: none;
  }
  .float-note {
    display: none;
  }
}
</style>
