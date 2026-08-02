/**
 * Issue #20 — Playlists store: validation/robustness asymmetries
 * https://github.com/johkirche/gb-pwa/issues/20
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * Two asymmetries in src/stores/playlists.ts, both cases of one path guarding
 * what its sibling does not:
 *
 * (a) addSongToPlaylist early-returns on `pl.songIds.includes(songId)`, but
 *     removeSongFromPlaylist has no membership guard. Removing a song that is
 *     not in the playlist still runs `filter` (which changes nothing), still
 *     writes to IndexedDB and still stamps a new updatedAt — and updatedAt is
 *     the sort key of the playlists overview, so a no-op remove jumps the
 *     playlist to the top of the list.
 *
 * (b) createPlaylist stores `name.trim()` and `description?.trim()`, but
 *     updatePlaylist writes the patch verbatim. The same padded input therefore
 *     survives an edit while being cleaned on create, so a rename can leave a
 *     name that sorts and renders differently from the one the user typed.
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
const T1 = "2026-05-01T10:05:00.000Z";
const T2 = "2026-05-01T10:10:00.000Z";

function setNow(iso: string): void {
  vi.setSystemTime(new Date(iso));
}

let store: ReturnType<typeof usePlaylistStore>;

beforeEach(() => {
  installFreshIndexedDB();
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(T0);
  store = newStoreInstance();
});

// ---------------------------------------------------------------------------
describe("issue #20 (a): removeSongFromPlaylist needs a membership guard", () => {
  it("leaves updatedAt untouched when the song is not in the playlist", async () => {
    setNow(T0);
    const created = await store.createPlaylist("Advent");
    setNow(T1);
    await store.addSongToPlaylist(created.id, "song-1");

    setNow(T2);
    await store.removeSongFromPlaylist(created.id, "song-999");

    expect(store.getPlaylist(created.id)?.updatedAt).toBe(T1);
  });

  it("does not rewrite the IndexedDB row for a song that is not there", async () => {
    setNow(T0);
    const created = await store.createPlaylist("Advent");
    setNow(T1);
    await store.addSongToPlaylist(created.id, "song-1");

    setNow(T2);
    await store.removeSongFromPlaylist(created.id, "song-999");

    expect((await readPersisted(created.id))?.updatedAt).toBe(T1);
  });

  it("does not reorder the overview when a no-op remove runs on an older playlist", async () => {
    // The user-visible symptom: playlists are sorted by updatedAt, newest first,
    // so a remove that changes nothing must not push a playlist past a newer one.
    setNow(T0);
    const first = await store.createPlaylist("Advent");
    setNow(T1);
    await store.createPlaylist("Ostern");

    setNow(T2);
    await store.removeSongFromPlaylist(first.id, "song-999");

    expect(store.playlists.map((p) => p.name)).toEqual(["Ostern", "Advent"]);
  });

  it("still removes a song that IS in the playlist, and still bumps updatedAt", async () => {
    // Guards the fix against over-correction: the membership guard must gate only
    // the miss, never the hit. Passes today and must keep passing.
    setNow(T0);
    const created = await store.createPlaylist("Advent");
    setNow(T1);
    await store.addSongToPlaylist(created.id, "song-1");
    await store.addSongToPlaylist(created.id, "song-2");

    setNow(T2);
    await store.removeSongFromPlaylist(created.id, "song-2");

    const after = store.getPlaylist(created.id)!;
    expect(after.songIds).toEqual(["song-1"]);
    expect(after.updatedAt).toBe(T2);
    expect((await readPersisted(created.id))?.songIds).toEqual(["song-1"]);
  });

  it("still resolves quietly for an unknown playlist id", async () => {
    // Guards the fix against over-correction: neither miss may start throwing —
    // the detail view calls this straight from a swipe handler.
    const created = await store.createPlaylist("Advent");

    await expect(
      store.removeSongFromPlaylist("no-such-id", "song-1"),
    ).resolves.toBeUndefined();
    await expect(
      store.removeSongFromPlaylist(created.id, "song-999"),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe("issue #20 (b): updatePlaylist must trim like createPlaylist", () => {
  it("trims surrounding whitespace from a patched name", async () => {
    const created = await store.createPlaylist("Advent");

    await store.updatePlaylist(created.id, { name: "  Advent 2026  " });

    expect(store.getPlaylist(created.id)?.name).toBe("Advent 2026");
  });

  it("trims surrounding whitespace from a patched description", async () => {
    const created = await store.createPlaylist("Advent", "Vier Sonntage");

    await store.updatePlaylist(created.id, { description: "  Vier Sonntage im Advent  " });

    expect(store.getPlaylist(created.id)?.description).toBe("Vier Sonntage im Advent");
  });

  it("persists the trimmed name rather than the padded one", async () => {
    // The padded string is what a later app start reads back and sorts on, so
    // pin the durable copy too.
    const created = await store.createPlaylist("Advent");

    await store.updatePlaylist(created.id, { name: "\tAdvent 2026\n" });

    expect((await readPersisted(created.id))?.name).toBe("Advent 2026");
  });

  it("still trims on create", async () => {
    // Guards the fix against over-correction: the create path already behaves,
    // and must not be traded away while the update path is aligned to it.
    const created = await store.createPlaylist("  Advent  ", "  Vier Sonntage  ");

    expect(created.name).toBe("Advent");
    expect(created.description).toBe("Vier Sonntage");
  });

  it("still leaves whitespace inside a name alone", async () => {
    // Guards the fix against over-correction: trim, not collapse. German hymn
    // titles legitimately contain runs of spaces around punctuation.
    const created = await store.createPlaylist("Advent");

    await store.updatePlaylist(created.id, { name: "Advent  2026" });

    expect(store.getPlaylist(created.id)?.name).toBe("Advent  2026");
  });

  it("still leaves a patch that omits name and description alone", async () => {
    // Guards the fix against over-correction: trimming must be applied to the
    // patch, not to `undefined` — an emoji-only patch must not blank the name.
    const created = await store.createPlaylist("Advent", "Vier Sonntage");

    await store.updatePlaylist(created.id, { emoji: "🕯️" });

    const after = store.getPlaylist(created.id)!;
    expect(after.name).toBe("Advent");
    expect(after.description).toBe("Vier Sonntage");
    expect(after.emoji).toBe("🕯️");
  });
});
