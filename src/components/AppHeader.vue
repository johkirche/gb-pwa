<template>
  <nav class="bg-card border-b">
    <div class="container mx-auto">
      <div class="flex justify-between h-16 items-center">
        <!-- Left side content -->
        <div class="flex items-center space-x-4">
          <h1 class="text-xl font-semibold">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- Right side navigation -->
        <div class="flex items-center space-x-2">
          <!-- Back button (when not on home page) -->
          <Button
            v-if="showBackButton"
            variant="outline"
            size="sm"
            @click="handleBack"
          >
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ backButtonText }}
          </Button>

          <!-- Home button (when not on home page) -->
          <Button
            v-if="showHomeButton"
            variant="outline"
            size="sm"
            @click="router.push('/home')"
          >
            <Home class="w-4 h-4 mr-2" />
            Home
          </Button>

          <!-- Logout button (when on home page) -->
          <Button
            v-if="showLogoutButton"
            variant="destructive"
            size="sm"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ArrowLeft, Home, LogOut } from "lucide-vue-next";

import { useRouter } from "vue-router";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/composables/useAuth";

interface Props {
  pageTitle?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showLogoutButton?: boolean;
  backButtonText?: string;
  backTo?: string;
}

const props = withDefaults(defineProps<Props>(), {
  pageTitle: "Gesangbuch",
  showBackButton: false,
  showHomeButton: false,
  showLogoutButton: false,
  backButtonText: "Back",
  backTo: "/home",
});

const emit = defineEmits<{
  logout: [];
  back: [];
}>();

const router = useRouter();
const { logout } = useAuth();

const handleBack = () => {
  if (props.backTo) {
    router.push(props.backTo);
  } else {
    emit("back");
  }
};

const handleLogout = async () => {
  await logout();
  emit("logout");
};
</script>
