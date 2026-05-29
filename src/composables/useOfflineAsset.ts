import { type MaybeRefOrGetter, ref, toValue, watchEffect } from "vue";

import { getOfflineAssetBlob } from "@/composables/useOfflineDownload";

// Returns a reactive URL for a Directus asset id, preferring an IndexedDB Blob
// (via URL.createObjectURL) when one is available and falling back to the
// direct `/assets/<id>` URL otherwise. Use for `<img :src>`, `<audio :src>`,
// and other native-element URL bindings. For fetch-based loaders use
// `fetchAssetByUrl` instead.
//
// The blob URL is revoked when the asset id changes or the scope unmounts —
// callers don't need to clean up.
//
// Optional `params` are appended to the network URL only (e.g.
// `?width=300&height=200&fit=cover` for Directus thumbnails). The IDB path
// always serves the original blob; thumbnail params are a no-op offline,
// which is the correct behavior — a downloaded user wouldn't get a real
// thumbnail anyway.
export function useOfflineAsset(
  id: MaybeRefOrGetter<string | null | undefined>,
  options: { params?: string } = {},
) {
  const url = ref<string | null>(null);

  watchEffect(async (onCleanup) => {
    const fileId = toValue(id);
    let createdBlobUrl: string | null = null;
    onCleanup(() => {
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    });

    if (!fileId) {
      url.value = null;
      return;
    }

    try {
      const blob = await getOfflineAssetBlob(fileId);
      if (blob) {
        createdBlobUrl = URL.createObjectURL(blob);
        url.value = createdBlobUrl;
        return;
      }
    } catch (err) {
      console.warn("useOfflineAsset: IDB read failed, falling back to network", err);
    }

    const directusUrl = import.meta.env.VITE_PUBLIC_DIRECTUS_URL;
    url.value = `${directusUrl}/assets/${fileId}${options.params ?? ""}`;
  });

  return url;
}
