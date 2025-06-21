<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
  >
    <Card class="max-w-md w-full">
      <template v-if="checking">
        <div class="mb-6">
          <Loader2 class="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
        </div>
        <CardTitle> Checking authentication... </CardTitle>
        <CardDescription>
          Please wait while we verify your login status.
        </CardDescription>
      </template>

      <template v-else>
        <CardHeader>
          <CardTitle class="text-2xl font-bold">
            Sign in to your account
          </CardTitle>
          <CardDescription>
            Enter your email and password to sign in to your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form class="space-y-6" @submit.prevent="handleLogin">
            <div class="space-y-4">
              <div>
                <Label for="email" class="mb-2"> Email address </Label>
                <div class="relative">
                  <div
                    class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  >
                    <Mail class="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    v-model="email"
                    type="email"
                    name="email"
                    autocomplete="email"
                    required
                    placeholder="Enter your email"
                    class="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label for="password" class="mb-2"> Password </Label>
                <div class="relative">
                  <div
                    class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                  >
                    <Lock class="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="password"
                    v-model="password"
                    type="password"
                    name="password"
                    autocomplete="current-password"
                    required
                    placeholder="Enter your password"
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
              <Button
                type="submit"
                :disabled="isLoading"
                class="w-full"
                size="lg"
              >
                <span v-if="isLoading" class="flex items-center">
                  <Loader2 class="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Signing in...
                </span>
                <span v-else class="flex items-center">
                  <LogIn class="h-5 w-5 mr-2" />
                  Sign in
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
import { useRouter } from "vue-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useAuth } from "@/composables/useAuth";

const email = ref("");
const password = ref("");
const error = ref("");
const checking = ref(false);

const { login, isLoading, checkAuth, getRedirectUrl, isLoggedIn } = useAuth();
const router = useRouter();

// Check authentication status on mount
onMounted(async () => {
  // Only check auth if not already logged in to prevent unnecessary calls
  if (isLoggedIn.value) {
    await router.push("/home");
    return;
  }

  checking.value = true;
  try {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
      await router.push("/home");
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    // Continue to show login form on error
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
    const redirectTo = getRedirectUrl("/home");
    await router.push(redirectTo);
  } else {
    error.value = result.error || "Login failed";
  }
};
</script>
