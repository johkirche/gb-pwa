import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import TextDisplay from "@/components/song/TextDisplay.vue";

// Messages are inlined rather than pulled from the real plugin so the component
// assertions stay stable if a translation string is reworded.
const i18n = createI18n({
  legacy: false,
  locale: "de",
  messages: {
    de: {
      song: {
        songText: "Liedtext",
        changeSuggestion: "Änderungsvorschlag",
        note: "Notiz",
      },
    },
  },
});

function mountWith(strophes?: unknown[]) {
  return mount(TextDisplay, {
    props: { strophes } as never,
    global: { plugins: [i18n] },
  });
}

describe("TextDisplay", () => {
  it("renders nothing when there are no strophes", () => {
    expect(mountWith(undefined).text()).toBe("");
    expect(mountWith([]).text()).toBe("");
  });

  it("renders one numbered block per strophe", () => {
    const wrapper = mountWith([
      { strophe: "Erste Strophe" },
      { strophe: "Zweite Strophe" },
      { strophe: "Dritte Strophe" },
    ]);

    const blocks = wrapper.findAll("pre.strophe-text");
    expect(blocks).toHaveLength(3);
    expect(blocks[0].text()).toBe("Erste Strophe");
    expect(blocks[2].text()).toBe("Dritte Strophe");
    // Verse numbers are 1-based for singers, not 0-based.
    expect(wrapper.text()).toContain("1");
    expect(wrapper.text()).toContain("3");
  });

  it("strips the manual ¬ hyphenation markers from the rendered text", () => {
    // The source data carries ¬ as a soft-hyphen hint. Rendering relies on CSS
    // `hyphens: auto` with lang="de" instead, so the marker must never reach
    // the screen — a singer seeing "Lo¬be¬sang" mid-service is the bug here.
    const wrapper = mountWith([{ strophe: "Lo¬be¬sang dem Herrn" }]);

    const rendered = wrapper.find("pre.strophe-text").text();
    expect(rendered).toBe("Lobesang dem Herrn");
    expect(rendered).not.toContain("¬");
  });

  it("keeps the element marked as German so the browser can hyphenate", () => {
    const wrapper = mountWith([{ strophe: "Lobesang" }]);

    expect(wrapper.find("pre.strophe-text").attributes("lang")).toBe("de");
  });

  it("preserves line breaks within a strophe", () => {
    const wrapper = mountWith([{ strophe: "Zeile eins\nZeile zwei" }]);

    expect(wrapper.find("pre.strophe-text").text()).toBe(
      "Zeile eins\nZeile zwei",
    );
  });

  it("shows a change suggestion only when the strophe has one", () => {
    expect(mountWith([{ strophe: "A" }]).text()).not.toContain(
      "Änderungsvorschlag",
    );

    const wrapper = mountWith([
      { strophe: "A", aenderungsvorschlag: "Besser so" },
    ]);
    expect(wrapper.text()).toContain("Änderungsvorschlag");
    expect(wrapper.text()).toContain("Besser so");
  });

  it("shows a note only when the strophe has one", () => {
    expect(mountWith([{ strophe: "A" }]).text()).not.toContain("Notiz");

    const wrapper = mountWith([{ strophe: "A", anmerkung: "Langsam singen" }]);
    expect(wrapper.text()).toContain("Notiz");
    expect(wrapper.text()).toContain("Langsam singen");
  });

  it("survives a strophe entry with no text at all", () => {
    // The GraphQL type makes every field optional, so a malformed row must not
    // take the whole song page down.
    const wrapper = mountWith([{}, { strophe: "Echte Strophe" }]);

    expect(wrapper.findAll("pre.strophe-text")).toHaveLength(2);
    expect(wrapper.text()).toContain("Echte Strophe");
  });
});
