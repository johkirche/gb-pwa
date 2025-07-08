/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// vue-i18n.d.ts
declare module "vue-i18n" {
  import { App, Ref } from "vue";

  export function createI18n(options: any): any;

  export function useI18n(): {
    t: (key: string, params?: any) => string;
    locale: Ref<string>; // This should be Ref<string>, not { value: string }
    // Add other properties as needed:
    // availableLocales: readonly string[];
    // fallbackLocale: Ref<string>;
    // messages: Ref<any>;
    // etc.
  };
}

// Web MIDI API Type Definitions
declare namespace WebMidi {
  interface MIDIAccess extends EventTarget {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    sysexEnabled: boolean;
    onstatechange: ((event: MIDIConnectionEvent) => void) | null;
  }

  interface MIDIInputMap {
    readonly size: number;
    keys(): Iterator<string>;
    values(): Iterator<MIDIInput>;
    get(key: string): MIDIInput | undefined;
    has(key: string): boolean;
    forEach(callbackfn: (value: MIDIInput, key: string, parent: MIDIInputMap) => void, thisArg?: any): void;
  }

  interface MIDIOutputMap {
    readonly size: number;
    keys(): Iterator<string>;
    values(): Iterator<MIDIOutput>;
    get(key: string): MIDIOutput | undefined;
    has(key: string): boolean;
    forEach(callbackfn: (value: MIDIOutput, key: string, parent: MIDIOutputMap) => void, thisArg?: any): void;
  }

  interface MIDIPort extends EventTarget {
    id: string;
    manufacturer?: string;
    name?: string;
    type: MIDIPortType;
    version?: string;
    state: MIDIPortDeviceState;
    connection: MIDIPortConnectionState;
    onstatechange: ((event: MIDIConnectionEvent) => void) | null;
    open(): Promise<MIDIPort>;
    close(): Promise<MIDIPort>;
  }

  interface MIDIInput extends MIDIPort {
    onmidimessage: ((event: MIDIMessageEvent) => void) | null;
  }

  interface MIDIOutput extends MIDIPort {
    send(data: number[] | Uint8Array, timestamp?: number): void;
    clear(): void;
  }

  interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
  }

  interface MIDIMessageEvent extends Event {
    receivedTime: number;
    data: Uint8Array;
  }

  type MIDIPortType = "input" | "output";
  type MIDIPortDeviceState = "disconnected" | "connected";
  type MIDIPortConnectionState = "open" | "closed" | "pending";
}

interface Navigator {
  requestMIDIAccess(options?: { sysex?: boolean; software?: boolean }): Promise<WebMidi.MIDIAccess>;
}
