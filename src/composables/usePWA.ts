import { ref, readonly, onMounted } from "vue";

export const usePWA = () => {
  const isInstalled = ref(false);
  const isInstallable = ref(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPrompt = ref<any | null>(null); // https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent

  // Check if app is running in standalone mode (PWA installed)
  const checkIfInstalled = () => {
    if (typeof window !== "undefined") {
      // Check if running in standalone mode
      const isInStandaloneMode = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      // Check if running as PWA on iOS
      const isIosPwa = !!(
        "standalone" in window.navigator && window.navigator["standalone"]
      );

      isInstalled.value = isInStandaloneMode || isIosPwa;
    }
  };

  // Listen for beforeinstallprompt event
  const setupInstallPrompt = () => {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();

        // Stash the event so it can be triggered later
        deferredPrompt.value = e;
        isInstallable.value = true;
      });

      // Listen for app installed event
      window.addEventListener("appinstalled", () => {
        isInstalled.value = true;
        isInstallable.value = false;
        deferredPrompt.value = null;
      });
    }
  };

  // Install the PWA
  const install = async () => {
    if (!deferredPrompt.value) return false;

    try {
      // Show the install prompt
      deferredPrompt.value.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.value.userChoice;

      if (choiceResult.outcome === "accepted") {
        isInstalled.value = true;
        isInstallable.value = false;
      }

      deferredPrompt.value = null;
      return choiceResult.outcome === "accepted";
    } catch (error) {
      console.error("Error installing PWA:", error);
      return false;
    }
  };

  onMounted(() => {
    checkIfInstalled();
    setupInstallPrompt();
  });

  return {
    isInstalled: readonly(isInstalled),
    isInstallable: readonly(isInstallable),
    install,
  };
};
