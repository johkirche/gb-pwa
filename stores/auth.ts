import { defineStore } from "pinia";

export interface DirectusUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  avatar?: string | null;
}

export interface AuthState {
  user: DirectusUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<DirectusUser | null>(null);
  const isLoggedIn = ref(false);
  const isLoading = ref(false);

  const getUser = computed(() => user.value);
  const getIsLoggedIn = computed(() => isLoggedIn.value);
  const getUserName = computed(
    () => user.value?.first_name || user.value?.email || "User"
  );

  function setUser(newUser: DirectusUser | null) {
    user.value = newUser;
    isLoggedIn.value = !!newUser;
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function clearUser() {
    user.value = null;
    isLoggedIn.value = false;
  }

  return {
    user,
    isLoggedIn,
    isLoading,
    getUser,
    getIsLoggedIn,
    getUserName,
    setUser,
    setLoading,
    clearUser,
  };
});
