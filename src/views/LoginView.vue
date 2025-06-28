<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <Card class="max-w-md w-full relative">
      <!-- Language Switch - Absolute positioned within the card -->
      <div class="absolute top-4 right-4 z-10">
        <LanguageSwitch variant="flag-button" flag-size="sm" />
      </div>
      <template v-if="checking">
        <div class="mb-6">
          <Loader2 class="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
        </div>
        <CardTitle>{{ t("login.checkingAuth") }}</CardTitle>
        <CardDescription>
          {{ t("login.checkingAuthDescription") }}
        </CardDescription>
      </template>

      <template v-else>
        <CardHeader>
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
                    <Mail class="h-5 w-5 text-gray-400" />
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
                    <Lock class="h-5 w-5 text-gray-400" />
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
        </CardContent>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, Loader2, Lock, LogIn, Mail } from "lucide-vue-next";

import { onMounted, ref } from "vue";
import type { Ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import LanguageSwitch from "@/components/ui/LanguageSwitch.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/composables/useAuth";

const email: Ref<string> = ref("");
const password: Ref<string> = ref("");
const error: Ref<string> = ref("");
const checking: Ref<boolean> = ref(false);

const { login, isLoading, checkAuth, getRedirectUrl, isLoggedIn } = useAuth();
const router = useRouter();
const { t } = useI18n();

// Check authentication status on mount
onMounted(async (): Promise<void> => {
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
