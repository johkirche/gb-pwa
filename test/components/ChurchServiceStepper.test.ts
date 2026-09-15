import type { WizardStep } from "@/stores/churchService";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { createI18n } from "vue-i18n";

import ChurchServiceStepper from "@/components/church-service/ChurchServiceStepper.vue";

const i18n = createI18n({
  legacy: false,
  locale: "de",
  messages: {
    de: { churchService: { stepper: { setup: "Aufbau", device: "Gerät", run: "Ablauf" } } },
  },
});

function mountAt(current: WizardStep) {
  return mount(ChurchServiceStepper, {
    props: { current },
    global: { plugins: [i18n] },
  });
}

describe("ChurchServiceStepper", () => {
  it("lets the user jump back to a completed step while setting up", async () => {
    const wrapper = mountAt("device");
    const [setup, device, run] = wrapper.findAll("button");

    expect(setup.attributes("disabled")).toBeUndefined();
    expect(device.attributes("disabled")).toBeDefined(); // current
    expect(run.attributes("disabled")).toBeDefined(); // upcoming

    await setup.trigger("click");

    expect(wrapper.emitted("jump")).toEqual([["setup"]]);
  });

  it("locks every earlier step while the service is running", async () => {
    // The stepper stays on screen during the run step. Jumping back unmounts
    // RunStep — which stops the organ mid-hymn — and the only way back
    // restarts the service at hymn 1. One stray tap used to do exactly that.
    const wrapper = mountAt("run");
    const [setup, device] = wrapper.findAll("button");

    expect(setup.attributes("disabled")).toBeDefined();
    expect(device.attributes("disabled")).toBeDefined();

    await setup.trigger("click");
    await device.trigger("click");

    expect(wrapper.emitted("jump")).toBeUndefined();
  });

  it("marks the active step for assistive tech", () => {
    const wrapper = mountAt("device");
    const [, device] = wrapper.findAll("button");

    expect(device.attributes("aria-current")).toBe("step");
  });
});
