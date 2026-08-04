import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePlaylistStore } from "@/stores/playlists";

import {
  breakIndexedDB,
  installFreshIndexedDB,
  newStoreInstance,
  readPersisted,
  readPersistedPlaylists,
} from "../helpers/playlists-store";

// Timestamps are the store's only sort key, so the clock has to be explicit.
// Only `Date` is faked: fake-indexeddb drives its transactions off
// setImmediate/setTimeout, and faking those would deadlock every await below.
const T0 = "2026-05-01T10:00:00.000Z";
const T1 = "2026-05-01T10:05:00.000Z";
const T2 = "2026-05-01T10:10:00.000Z";

function setNow(iso: string): void {
  vi.setSystemTime(new Date(iso));
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let store: ReturnType<typeof usePlaylistStore>;

beforeEach(() => {
  installFreshIndexedDB();
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(T0);
  store = newStoreInstance();
});

// ---------------------------------------------------------------------------
describe("createPlaylist", () => {
  it("returns the new playlist and puts it in state", async () => {
    const created = await store.createPlaylist("Advent");

    expect(created.name).toBe("Advent");
    expect(created.songIds).toEqual([]);
    expect(store.playlists).toHaveLength(1);
    // State is rebuilt from IndexedDB after the write, so the returned object
    // and the one callers read back must not drift apart.
    expect(store.getPlaylist(created.id)).toEqual(created);
  });

  it("persists the playlist so a later app start can read it", async () => {
    const created = await store.createPlaylist("Advent", "Vier Sonntage", "🕯️");

    const rows = await readPersistedPlaylists();
    expect(rows).toEqual([
      {
        id: created.id,
        name: "Advent",
        description: "Vier Sonntage",
        emoji: "🕯️",
        songIds: [],
        createdAt: T0,
        updatedAt: T0,
      },
    ]);
  });

  it("trims surrounding whitespace from the name and description", async () => {
    const created = await store.createPlaylist("  Advent  ", "  Vier Sonntage  ");

    expect(created.name).toBe("Advent");
    expect(created.description).toBe("Vier Sonntage");
  });

  it("stores a blank description or emoji as undefined rather than an empty string", async () => {
    // The detail view renders the description block on truthiness; an empty
    // string would leave an empty box behind.
    const created = await store.createPlaylist("Advent", "   ", "");

    expect(created.description).toBeUndefined();
    expect(created.emoji).toBeUndefined();
    expect((await readPersisted(created.id))?.description).toBeUndefined();
  });

  it("stamps createdAt and updatedAt with the current time", async () => {
    setNow(T1);

    const created = await store.createPlaylist("Advent");

    expect(created.createdAt).toBe(T1);
    expect(created.updatedAt).toBe(T1);
  });

  it("gives every playlist a distinct v4 uuid", async () => {
    const first = await store.createPlaylist("Advent");
    const second = await store.createPlaylist("Ostern");

    expect(first.id).toMatch(UUID_V4);
    expect(second.id).toMatch(UUID_V4);
    expect(first.id).not.toBe(second.id);
  });

  it("keys the IndexedDB row by the generated id", async () => {
    const fixed = "11111111-2222-4333-8444-555555555555" as ReturnType<Crypto["randomUUID"]>;
    vi.spyOn(crypto, "randomUUID").mockReturnValue(fixed);

    const created = await store.createPlaylist("Advent");

    expect(created.id).toBe(fixed);
    const rows = await readPersistedPlaylists();
    expect(rows.map((row) => row.id)).toEqual([fixed]);
  });

  it("keeps two playlists with the same name as separate rows", async () => {
    // The object store is keyed by id, not name — duplicate names are legal and
    // must not overwrite each other.
    setNow(T0);
    const first = await store.createPlaylist("Advent");
    setNow(T1);
    const second = await store.createPlaylist("Advent");

    expect(first.id).not.toBe(second.id);
    expect(await readPersistedPlaylists()).toHaveLength(2);
    expect(store.playlists).toHaveLength(2);
  });

  it("rejects when the database cannot be opened", async () => {
    // Unlike loadPlaylists, the write paths do not swallow the failure — the
    // caller sees the rejection and can tell the user nothing was saved. Every
    // mutating view now catches this and renders playlist.saveFailed; before
    // that it died as an unhandled rejection and the Save button just went dead
    // (issue #19).
    breakIndexedDB();
    const offlineStore = newStoreInstance();

    await expect(offlineStore.createPlaylist("Advent")).rejects.toThrow(
      "IndexedDB unavailable",
    );
    expect(offlineStore.playlists).toEqual([]);
  });

  it("keeps rejecting for every mutation the views surface", async () => {
    // The views can only report a failure they are handed, so pin that each of
    // the write paths behind a catch in PlaylistDetailView / PlaylistAddSongsView
    // actually rejects rather than resolving quietly.
    breakIndexedDB();
    const offlineStore = newStoreInstance();

    await expect(offlineStore.updatePlaylist("pl-1", { name: "x" })).rejects.toThrow(
      "IndexedDB unavailable",
    );
    await expect(offlineStore.deletePlaylist("pl-1")).rejects.toThrow("IndexedDB unavailable");
    await expect(offlineStore.addSongToPlaylist("pl-1", "song-1")).rejects.toThrow(
      "IndexedDB unavailable",
    );
    await expect(offlineStore.removeSongFromPlaylist("pl-1", "song-1")).rejects.toThrow(
      "IndexedDB unavailable",
    );
  });
});

// ---------------------------------------------------------------------------
describe("getPlaylist", () => {
  it("returns undefined on an empty store", () => {
    expect(store.getPlaylist("anything")).toBeUndefined();
  });

  it("finds a playlist by id", async () => {
    const created = await store.createPlaylist("Advent");

    expect(store.getPlaylist(created.id)?.name).toBe("Advent");
  });

  it("returns undefined for an unknown id", async () => {
    await store.createPlaylist("Advent");

    expect(store.getPlaylist("no-such-id")).toBeUndefined();
  });

  it("does not see a persisted playlist until loadPlaylists has run", async () => {
    // The getter reads in-memory state only. Views that deep-link into a
    // playlist must await loadPlaylists() before resolving the route param,
    // otherwise they render a "not found" state for a playlist that exists.
    const created = await store.createPlaylist("Advent");
    const restarted = newStoreInstance();

    expect(restarted.getPlaylist(created.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe("hasAnyPlaylist", () => {
  it("is false on an empty store", () => {
    expect(store.hasAnyPlaylist).toBe(false);
  });

  it("is false after a load that finds nothing", async () => {
    await store.loadPlaylists();

    expect(store.hasAnyPlaylist).toBe(false);
    expect(store.playlists).toEqual([]);
  });

  it("flips to true on the first playlist and back to false when the last one goes", async () => {
    const created = await store.createPlaylist("Advent");
    expect(store.hasAnyPlaylist).toBe(true);

    await store.deletePlaylist(created.id);

    expect(store.hasAnyPlaylist).toBe(false);
  });

  it("stays true while a playlist merely has no songs", async () => {
    // SongSelector hides its Playlists tab on this flag — an empty playlist is
    // still a playlist the user should be able to open and fill.
    await store.createPlaylist("Advent");

    expect(store.hasAnyPlaylist).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("loadPlaylists", () => {
  it("rebuilds state from IndexedDB after an app restart", async () => {
    await store.createPlaylist("Advent");
    const restarted = newStoreInstance();
    expect(restarted.playlists).toEqual([]);

    await restarted.loadPlaylists();

    expect(restarted.playlists.map((p) => p.name)).toEqual(["Advent"]);
  });

  it("orders playlists by updatedAt, newest first", async () => {
    setNow(T0);
    await store.createPlaylist("Advent");
    setNow(T1);
    await store.createPlaylist("Ostern");
    setNow(T2);
    await store.createPlaylist("Weihnachten");

    expect(store.playlists.map((p) => p.name)).toEqual(["Weihnachten", "Ostern", "Advent"]);
  });

  it("moves an edited playlist back to the top", async () => {
    setNow(T0);
    const first = await store.createPlaylist("Advent");
    setNow(T1);
    await store.createPlaylist("Ostern");

    setNow(T2);
    await store.addSongToPlaylist(first.id, "song-1");

    expect(store.playlists.map((p) => p.name)).toEqual(["Advent", "Ostern"]);
  });

  it("flags isLoading while the read is in flight", async () => {
    const pending = store.loadPlaylists();
    expect(store.isLoading).toBe(true);

    await pending;

    expect(store.isLoading).toBe(false);
  });

  it("falls back to an empty list when the database cannot be opened", async () => {
    // A hymnal that throws on startup is worse than one with no playlists: the
    // rest of the app has to keep working.
    breakIndexedDB();
    const offlineStore = newStoreInstance();

    await expect(offlineStore.loadPlaylists()).resolves.toBeUndefined();

    expect(offlineStore.playlists).toEqual([]);
    expect(offlineStore.isLoading).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("keeps the playlists it already had when a reload fails", async () => {
    // A failed refresh used to blank the list. Every mutation and every mount of
    // the detail view triggers a reload, so a database that goes away mid-service
    // — an eviction, a locked profile — would take the visible playlists with it
    // even though they are still on disk and still usable.
    breakIndexedDB();
    const brokenStore = newStoreInstance();
    brokenStore.playlists = [
      {
        id: "pl-1",
        name: "Advent",
        songIds: ["song-1"],
        createdAt: T0,
        updatedAt: T0,
      },
    ];

    await brokenStore.loadPlaylists();

    expect(brokenStore.playlists.map((p) => p.name)).toEqual(["Advent"]);
    expect(brokenStore.isLoading).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The patches below carry an explicit `songIds` array. That used to be load
// bearing (a patch without it threw DataCloneError); it is now merely explicit.
// The "reactive proxy" block after this one covers the omitted-songIds case.
describe("updatePlaylist", () => {
  it("renames the playlist and persists it", async () => {
    const created = await store.createPlaylist("Advent");

    await store.updatePlaylist(created.id, { name: "Advent 2026", songIds: [] });

    expect(store.getPlaylist(created.id)?.name).toBe("Advent 2026");
    expect((await readPersisted(created.id))?.name).toBe("Advent 2026");
  });

  it("bumps updatedAt but leaves createdAt and id alone", async () => {
    setNow(T0);
    const created = await store.createPlaylist("Advent");

    setNow(T1);
    await store.updatePlaylist(created.id, { name: "Advent 2026", songIds: [] });

    const updated = store.getPlaylist(created.id)!;
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(T0);
    expect(updated.updatedAt).toBe(T1);
  });

  it("leaves fields the patch omits untouched", async () => {
    const created = await store.createPlaylist("Advent", "Vier Sonntage", "🕯️");
    await store.addSongToPlaylist(created.id, "song-1");

    await store.updatePlaylist(created.id, { name: "Advent 2026", songIds: ["song-1"] });

    const updated = store.getPlaylist(created.id)!;
    expect(updated.description).toBe("Vier Sonntage");
    expect(updated.emoji).toBe("🕯️");
    expect(updated.songIds).toEqual(["song-1"]);
  });

  it("clears a field that is explicitly patched to undefined", async () => {
    // The edit dialog sends `description: trimmed || undefined`, so this is how
    // a user empties the description box.
    const created = await store.createPlaylist("Advent", "Vier Sonntage");

    await store.updatePlaylist(created.id, { description: undefined, songIds: [] });

    expect(store.getPlaylist(created.id)?.description).toBeUndefined();
    expect((await readPersisted(created.id))?.description).toBeUndefined();
  });

  // Regression guards for issue #20 (b). createPlaylist stored `name.trim()`
  // while updatePlaylist wrote the patch verbatim, so the same padded input was
  // cleaned on create and preserved on rename — leaving a name that sorts and
  // renders differently from the one the user typed.
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

  it("clears a description patched to nothing but whitespace", async () => {
    // Same rule createPlaylist has always applied: a blank description is
    // undefined, not "  ", so the detail view does not render an empty box.
    const created = await store.createPlaylist("Advent", "Vier Sonntage");

    await store.updatePlaylist(created.id, { description: "   " });

    expect(store.getPlaylist(created.id)?.description).toBeUndefined();
    expect((await readPersisted(created.id))?.description).toBeUndefined();
  });

  it("leaves whitespace inside a name alone", async () => {
    // Trim, not collapse. German hymn titles legitimately contain runs of
    // spaces around punctuation.
    const created = await store.createPlaylist("Advent");

    await store.updatePlaylist(created.id, { name: "Advent  2026" });

    expect(store.getPlaylist(created.id)?.name).toBe("Advent  2026");
  });

  it("leaves a patch that omits name and description alone", async () => {
    // Trimming is applied to the patch, not to `undefined` — an emoji-only
    // patch must not blank the name.
    const created = await store.createPlaylist("Advent", "Vier Sonntage");

    await store.updatePlaylist(created.id, { emoji: "🕯️" });

    const after = store.getPlaylist(created.id)!;
    expect(after.name).toBe("Advent");
    expect(after.description).toBe("Vier Sonntage");
    expect(after.emoji).toBe("🕯️");
  });

  it("is a silent no-op for an unknown id", async () => {
    const created = await store.createPlaylist("Advent");

    await expect(store.updatePlaylist("no-such-id", { name: "Ghost" })).resolves.toBeUndefined();

    expect(store.playlists).toHaveLength(1);
    expect(store.getPlaylist(created.id)?.name).toBe("Advent");
    expect(await readPersistedPlaylists()).toHaveLength(1);
  });

  it("applies an edit to a playlist that exists on disk but was never loaded", async () => {
    // The target used to be resolved through in-memory state alone, so before
    // loadPlaylists() resolved every mutation was a silent no-op — a tap in the
    // few ms between first paint and hydration was simply swallowed. The store
    // now falls back to reading the row from IndexedDB.
    const created = await store.createPlaylist("Advent");
    const restarted = newStoreInstance();

    await restarted.updatePlaylist(created.id, { name: "Advent 2026" });

    expect((await readPersisted(created.id))?.name).toBe("Advent 2026");
  });

  it("warns rather than staying silent when the playlist exists nowhere", async () => {
    // A dropped write must leave a trace; the caller still sees a quiet resolve.
    await expect(store.updatePlaylist("no-such-id", { name: "Ghost" })).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith("Ignoring update for unknown playlist no-such-id");
  });
});

// ---------------------------------------------------------------------------
// Regression guard. updatePlaylist used to build the row as
// `{ ...existing, ...patch }`, where `existing` comes out of a Vue `ref` and is
// therefore a reactive Proxy. Spreading flattens only the top level, so
// `songIds` stayed a Proxy — and IndexedDB's structured clone algorithm rejects
// a Proxy with DataCloneError. Any patch that did not happen to supply a freshly
// built array failed, which is exactly what the edit dialog in
// PlaylistDetailView sends (`{ name, description, emoji }`). Fixed by unwrapping
// with toRaw() and always storing a plain songIds array.
describe("updatePlaylist and the reactive songIds proxy", () => {
  it("persists a patch that omits songIds", async () => {
    const created = await store.createPlaylist("Advent");

    await expect(
      store.updatePlaylist(created.id, { name: "Advent 2026" }),
    ).resolves.toBeUndefined();

    expect(store.getPlaylist(created.id)?.name).toBe("Advent 2026");
    expect((await readPersisted(created.id))?.name).toBe("Advent 2026");
  });

  it("preserves existing songs when the patch omits songIds", async () => {
    const created = await store.createPlaylist("Advent", "Vier Sonntage");
    await store.addSongToPlaylist(created.id, "song-1");
    await store.addSongToPlaylist(created.id, "song-2");

    await store.updatePlaylist(created.id, { name: "Advent 2026" });

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1", "song-2"]);
    expect((await readPersisted(created.id))?.songIds).toEqual([
      "song-1",
      "song-2",
    ]);
  });

  it("persists an emoji-only patch on a playlist that has songs", async () => {
    // The proxy broke this whatever songIds held, so cover the non-empty case.
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");

    await store.updatePlaylist(created.id, { emoji: "🕯️" });

    expect((await readPersisted(created.id))?.emoji).toBe("🕯️");
  });

  it("saves exactly what PlaylistDetailView's edit dialog sends", async () => {
    // The real caller: src/views/PlaylistDetailView.vue passes name,
    // description and emoji with no songIds. This is the shape that was broken.
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");

    await store.updatePlaylist(created.id, {
      name: "Advent 2026",
      description: "Vier Sonntage",
      emoji: "🕯️",
    });

    const persisted = await readPersisted(created.id);
    expect(persisted?.name).toBe("Advent 2026");
    expect(persisted?.description).toBe("Vier Sonntage");
    expect(persisted?.emoji).toBe("🕯️");
    expect(persisted?.songIds).toEqual(["song-1"]);
  });

  it("stores songIds as a plain array, not a reactive proxy", async () => {
    // The actual invariant: whatever reaches IndexedDB must be structured
    // cloneable. Assert it directly rather than relying on the write not throwing.
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");
    await store.updatePlaylist(created.id, { name: "Advent 2026" });

    const persisted = await readPersisted(created.id);
    expect(() => structuredClone(persisted)).not.toThrow();
  });

  it("does not reach the write at all for an unknown id, so no rejection", async () => {
    await store.createPlaylist("Advent");

    await expect(store.updatePlaylist("no-such-id", { name: "Ghost" })).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe("deletePlaylist", () => {
  it("removes the playlist from state and from IndexedDB", async () => {
    const created = await store.createPlaylist("Advent");

    await store.deletePlaylist(created.id);

    expect(store.getPlaylist(created.id)).toBeUndefined();
    expect(store.playlists).toEqual([]);
    expect(await readPersistedPlaylists()).toEqual([]);
  });

  it("leaves the other playlists alone", async () => {
    setNow(T0);
    const first = await store.createPlaylist("Advent");
    setNow(T1);
    const second = await store.createPlaylist("Ostern");

    await store.deletePlaylist(first.id);

    expect(store.playlists.map((p) => p.id)).toEqual([second.id]);
    expect((await readPersistedPlaylists()).map((p) => p.id)).toEqual([second.id]);
  });

  it("resolves quietly for an unknown id", async () => {
    await store.createPlaylist("Advent");

    await expect(store.deletePlaylist("no-such-id")).resolves.toBeUndefined();

    expect(store.playlists).toHaveLength(1);
  });

  it("deletes straight from IndexedDB even on an un-hydrated store", async () => {
    // Unlike update/add/remove, delete never consults in-memory state — worth
    // pinning, because it is the one mutation that works before a load.
    const created = await store.createPlaylist("Advent");
    const restarted = newStoreInstance();

    await restarted.deletePlaylist(created.id);

    expect(await readPersistedPlaylists()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe("addSongToPlaylist", () => {
  it("appends the song and persists it", async () => {
    const created = await store.createPlaylist("Advent");

    await store.addSongToPlaylist(created.id, "song-1");

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1"]);
    expect((await readPersisted(created.id))?.songIds).toEqual(["song-1"]);
  });

  it("keeps songs in the order they were added", async () => {
    const created = await store.createPlaylist("Advent");

    await store.addSongToPlaylist(created.id, "song-3");
    await store.addSongToPlaylist(created.id, "song-1");
    await store.addSongToPlaylist(created.id, "song-2");

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-3", "song-1", "song-2"]);
  });

  it("bumps updatedAt", async () => {
    setNow(T0);
    const created = await store.createPlaylist("Advent");

    setNow(T1);
    await store.addSongToPlaylist(created.id, "song-1");

    expect(store.getPlaylist(created.id)?.updatedAt).toBe(T1);
  });

  it("ignores a duplicate add without writing at all", async () => {
    // The add-songs view toggles selection, and re-adding must not create a
    // second entry — nor reshuffle the playlist list by bumping updatedAt.
    setNow(T0);
    const created = await store.createPlaylist("Advent");
    setNow(T1);
    await store.addSongToPlaylist(created.id, "song-1");

    setNow(T2);
    await store.addSongToPlaylist(created.id, "song-1");

    const after = store.getPlaylist(created.id)!;
    expect(after.songIds).toEqual(["song-1"]);
    expect(after.updatedAt).toBe(T1);
  });

  it("is a silent no-op for an unknown playlist id", async () => {
    await store.createPlaylist("Advent");

    await expect(store.addSongToPlaylist("no-such-id", "song-1")).resolves.toBeUndefined();

    expect(await readPersistedPlaylists()).toHaveLength(1);
    expect((await readPersistedPlaylists())[0].songIds).toEqual([]);
  });

  it("adds the song to a playlist that was never loaded into state", async () => {
    // Same un-hydrated no-op as updatePlaylist: the add-songs view could swallow
    // a tap made before loadPlaylists() had resolved.
    const created = await store.createPlaylist("Advent");
    const restarted = newStoreInstance();

    await restarted.addSongToPlaylist(created.id, "song-1");

    expect((await readPersisted(created.id))?.songIds).toEqual(["song-1"]);
  });

  it("adds the same song only once when it is tapped twice at once", async () => {
    // Two concurrent adds of the *same* id must still leave one entry. This
    // holds today and stays correct once the lost-update in issue #18 is fixed,
    // so it is safe to pin here.
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist(created.id, "song-1"),
      store.addSongToPlaylist(created.id, "song-1"),
    ]);

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1"]);
    expect((await readPersisted(created.id))?.songIds).toEqual(["song-1"]);
  });

  // Regression guards for issue #18. addSongToPlaylist read `pl.songIds`, then
  // awaited an IndexedDB write and a full reload before the new array was
  // visible in state — so two calls started before either write landed both
  // built their array from the same snapshot and the second overwrote the first.
  // A rapid double tap in the add-songs picker is exactly that interleaving, and
  // the first song disappeared with no error. Mutations are now serialised, so
  // each one re-reads only after the previous write has landed.
  it("keeps both songs when two adds are started before either resolves", async () => {
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
    // This is the copy the user gets back after the phone locks mid-service.
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist(created.id, "song-1"),
      store.addSongToPlaylist(created.id, "song-2"),
    ]);

    const persisted = [...((await readPersisted(created.id))?.songIds ?? [])].sort();
    expect(persisted).toEqual(["song-1", "song-2"]);
  });

  it("keeps every song when four adds are fired at once", async () => {
    // A drag across the selection grid produces more than two taps.
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

  it("ignores concurrent adds to a playlist that does not exist", async () => {
    // An unknown id stays a no-op rather than being queued into existence.
    const created = await store.createPlaylist("Advent");

    await Promise.all([
      store.addSongToPlaylist("no-such-id", "song-1"),
      store.addSongToPlaylist("no-such-id", "song-2"),
    ]);

    expect(store.playlists).toHaveLength(1);
    expect((await readPersisted(created.id))?.songIds).toEqual([]);
  });

  it("does not let one failed mutation skip the ones queued behind it", async () => {
    // Serialising is only safe if a rejection cannot poison the chain: the
    // caller sees its own write fail, but the next tap must still go through.
    // Were the queue left holding a rejected promise, the second call would be
    // rejected without its task ever running.
    breakIndexedDB();
    const brokenStore = newStoreInstance();
    await expect(brokenStore.createPlaylist("Advent")).rejects.toBeTruthy();

    installFreshIndexedDB();

    await expect(brokenStore.createPlaylist("Ostern")).resolves.toMatchObject({ name: "Ostern" });
    expect(brokenStore.playlists.map((p) => p.name)).toEqual(["Ostern"]);
  });
});

// ---------------------------------------------------------------------------
describe("removeSongFromPlaylist", () => {
  it("removes the song and keeps the remaining order", async () => {
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");
    await store.addSongToPlaylist(created.id, "song-2");
    await store.addSongToPlaylist(created.id, "song-3");

    await store.removeSongFromPlaylist(created.id, "song-2");

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1", "song-3"]);
    expect((await readPersisted(created.id))?.songIds).toEqual(["song-1", "song-3"]);
  });

  it("leaves an empty song list behind when the last song goes", async () => {
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");

    await store.removeSongFromPlaylist(created.id, "song-1");

    expect(store.getPlaylist(created.id)?.songIds).toEqual([]);
    expect(store.hasAnyPlaylist).toBe(true);
  });

  // Regression guards for issue #20 (a). removeSongFromPlaylist had no
  // membership guard, unlike its addSongToPlaylist sibling: `filter` returned an
  // equal-but-new array, so removing a song that was never there still wrote and
  // still stamped a new updatedAt — the sort key of the overview.
  it("leaves the song list alone when the song is not in the playlist", async () => {
    setNow(T0);
    const created = await store.createPlaylist("Advent");
    setNow(T1);
    await store.addSongToPlaylist(created.id, "song-1");

    setNow(T2);
    await store.removeSongFromPlaylist(created.id, "song-999");

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1"]);
    expect((await readPersisted(created.id))?.songIds).toEqual(["song-1"]);
  });

  it("leaves updatedAt untouched when the song is not in the playlist", async () => {
    setNow(T0);
    const created = await store.createPlaylist("Advent");
    setNow(T1);
    await store.addSongToPlaylist(created.id, "song-1");

    setNow(T2);
    await store.removeSongFromPlaylist(created.id, "song-999");

    expect(store.getPlaylist(created.id)?.updatedAt).toBe(T1);
    expect((await readPersisted(created.id))?.updatedAt).toBe(T1);
  });

  it("does not reorder the overview when a no-op remove runs on an older playlist", async () => {
    // The user-visible symptom: playlists are sorted by updatedAt, newest first,
    // so a remove that changes nothing must not push one past a newer one.
    setNow(T0);
    const first = await store.createPlaylist("Advent");
    setNow(T1);
    await store.createPlaylist("Ostern");

    setNow(T2);
    await store.removeSongFromPlaylist(first.id, "song-999");

    expect(store.playlists.map((p) => p.name)).toEqual(["Ostern", "Advent"]);
  });

  it("still removes a song that IS in the playlist, and still bumps updatedAt", async () => {
    // The membership guard must gate only the miss, never the hit.
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

  it("resolves quietly for both kinds of miss", async () => {
    // Neither miss may start throwing — the detail view calls this straight from
    // a swipe handler.
    const created = await store.createPlaylist("Advent");

    await expect(store.removeSongFromPlaylist("no-such-id", "song-1")).resolves.toBeUndefined();
    await expect(store.removeSongFromPlaylist(created.id, "song-999")).resolves.toBeUndefined();
  });

  it("is a silent no-op for an unknown playlist id", async () => {
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");

    await expect(
      store.removeSongFromPlaylist("no-such-id", "song-1"),
    ).resolves.toBeUndefined();

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1"]);
    expect(await readPersistedPlaylists()).toHaveLength(1);
  });

  it("removes only the requested song when the same id was added to two playlists", async () => {
    setNow(T0);
    const first = await store.createPlaylist("Advent");
    setNow(T1);
    const second = await store.createPlaylist("Ostern");
    await store.addSongToPlaylist(first.id, "song-1");
    await store.addSongToPlaylist(second.id, "song-1");

    await store.removeSongFromPlaylist(first.id, "song-1");

    expect(store.getPlaylist(first.id)?.songIds).toEqual([]);
    expect(store.getPlaylist(second.id)?.songIds).toEqual(["song-1"]);
  });
});

// ---------------------------------------------------------------------------
describe("reordering songs", () => {
  it("persists a new song order through updatePlaylist", async () => {
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");
    await store.addSongToPlaylist(created.id, "song-2");
    await store.addSongToPlaylist(created.id, "song-3");

    await store.updatePlaylist(created.id, { songIds: ["song-3", "song-1", "song-2"] });

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-3", "song-1", "song-2"]);
    expect((await readPersisted(created.id))?.songIds).toEqual(["song-3", "song-1", "song-2"]);
  });

  it("keeps the reordered list after a restart", async () => {
    // Drag-and-drop order is the running order of a church service — it has to
    // survive the reload that happens when the phone locks mid-service.
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");
    await store.addSongToPlaylist(created.id, "song-2");
    await store.updatePlaylist(created.id, { songIds: ["song-2", "song-1"] });

    const restarted = newStoreInstance();
    await restarted.loadPlaylists();

    expect(restarted.getPlaylist(created.id)?.songIds).toEqual(["song-2", "song-1"]);
  });

  it("does not resurrect a removed song when a stale order is written back", async () => {
    // updatePlaylist takes the songIds it is handed verbatim — no intersection
    // with the catalogue, no de-duplication.
    const created = await store.createPlaylist("Advent");
    await store.addSongToPlaylist(created.id, "song-1");

    await store.updatePlaylist(created.id, { songIds: ["song-1", "song-1"] });

    expect(store.getPlaylist(created.id)?.songIds).toEqual(["song-1", "song-1"]);
  });
});
