import { readonly, ref } from "vue";

// Install state is device-wide, so it lives at module level and the browser
// events are subscribed exactly once, at import. `beforeinstallprompt` fires
// early in the page's life — registering for it in a component's onMounted
// meant the event had long passed by the time the user reached Settings →
// Offline, and the install button never appeared on Chrome, Edge or Android.
// `main.ts` imports this module so the listener is in place before the event.
const isInstalled = ref(false);
const isInstallable = ref(false);
// https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let deferredPrompt: any | null = null;

// Check if app is running in standalone mode (PWA installed)
const checkIfInstalled = () => {
  if (typeof window === "undefined") return;
  // Check if running in standalone mode
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
  // Check if running as PWA on iOS
  const isIosPwa = !!("standalone" in window.navigator && window.navigator["standalone"]);

  isInstalled.value = isInStandaloneMode || isIosPwa;
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;
    isInstallable.value = true;
  });

  // Listen for app installed event
  window.addEventListener("appinstalled", () => {
    isInstalled.value = true;
    isInstallable.value = false;
    deferredPrompt = null;
  });
}

// Install the PWA
const install = async () => {
  if (!deferredPrompt) return false;

  try {
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      isInstalled.value = true;
      isInstallable.value = false;
    }

    deferredPrompt = null;
    return choiceResult.outcome === "accepted";
  } catch (error) {
    console.error("Error installing PWA:", error);
    return false;
  }
};

export const usePWA = () => {
  checkIfInstalled();

  return {
    isInstalled: readonly(isInstalled),
    isInstallable: readonly(isInstallable),
    install,
  };
};
