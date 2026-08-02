/**
 * Issue #18 — Tapping two songs quickly in the playlist picker silently drops one
 * https://github.com/johkirche/gb-pwa/issues/18
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * addSongToPlaylist reads `pl.songIds`, then awaits updatePlaylist, which awaits
 * an IndexedDB write and a full reload before the new array is visible in state.
 * Two calls started before either write lands therefore both build their new
 * array from the same snapshot, and the second `put` overwrites the first — the
 * whole array is written back wholesale, so there is nothing to merge. In the
 * add-songs view a rapid double tap is exactly this interleaving, and the first
 * song disappears without any error.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { usePlaylistStore } from "@/stores/playlists";

import {
  installFreshIndexedDB,
  newStoreInstance,
  readPersisted,
} from "../helpers/playlists-store";

// Only `Date` is faked: fake-indexeddb drives its transactions off
// setImmediate/setTimeout, and faking those would deadlock every await below.
const T0 = "2026-05-01T10:00:00.000Z";

let store: ReturnType<typeof usePlaylistStore>;

beforeEach(() => {
  installFreshIndexedDB();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(T0));
  store = newStoreInstance();
});

describe("issue #18: concurrent addSongToPlaylist calls must not drop a song", () => {
  it("keeps both songs in state when two adds are started before either resolves", async () => {
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist(created.id, "song-1"),
      store.addSongToPlaylist(created.id, "song-2"),
    ]);

    // Sorted, because the interleaving decides the append order and only
    // membership is guaranteed behaviour.
    const songIds = [...(store.getPlaylist(created.id)?.songIds ?? [])].sort();
    expect(songIds).toEqual(["song-1", "song-2"]);
  });

  it("persists both songs to IndexedDB, not just the last writer's", async () => {
    // State and disk are refreshed from the same read, so a lost update is lost
    // in both places — assert the durable side separately anyway, since this is
    // the copy the user gets back after the phone locks mid-service.
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist(created.id, "song-1"),
      store.addSongToPlaylist(created.id, "song-2"),
    ]);

    const persisted = [...((await readPersisted(created.id))?.songIds ?? [])].sort();
    expect(persisted).toEqual(["song-1", "song-2"]);
  });

  it("keeps every song when four adds are fired at once", async () => {
    // A drag across the selection grid produces more than two taps; the fix has
    // to serialise all of them, not just pairs.
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist(created.id, "song-1"),
      store.addSongToPlaylist(created.id, "song-2"),
      store.addSongToPlaylist(created.id, "song-3"),
      store.addSongToPlaylist(created.id, "song-4"),
    ]);

    const songIds = [...(store.getPlaylist(created.id)?.songIds ?? [])].sort();
    expect(songIds).toEqual(["song-1", "song-2", "song-3", "song-4"]);
  });

  it("still adds nothing twice when the same song is tapped twice at once", async () => {
    // Guards the fix against over-correction: serialising the adds must not turn
    // a double tap on ONE song into two entries. Passes today (both calls see the
    // same empty snapshot and both write ["song-1"]) and must keep passing.
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist(created.id, "song-1"),
      store.addSongToPlaylist(created.id, "song-1"),
    ]);

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1"]);
  });

  it("still appends sequential adds in tap order", async () => {
    // Guards the fix against over-correction: whatever queue or merge is added,
    // the ordinary one-at-a-time path must keep its insertion order, because that
    // order is the running order of a church service.
    const created = await store.createPlaylist("Advent");

    await store.addSongToPlaylist(created.id, "song-3");
    await store.addSongToPlaylist(created.id, "song-1");
    await store.addSongToPlaylist(created.id, "song-2");

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-3", "song-1", "song-2"]);
  });

  it("still ignores concurrent adds to a playlist that does not exist", async () => {
    // Guards the fix against over-correction: an unknown id must stay a silent
    // no-op rather than being queued into existence.
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist("no-such-id", "song-1"),
      store.addSongToPlaylist("no-such-id", "song-2"),
    ]);

    expect(store.playlists).toHaveLength(1);
    expect((await readPersisted(created.id))?.songIds).toEqual([]);
  });
});
