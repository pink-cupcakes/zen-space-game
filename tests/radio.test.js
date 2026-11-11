import test from "node:test";
import assert from "node:assert/strict";
import { createRadio } from "../src/engines/music.js";

test("starts the first track inside the user's tap, before audio resume resolves", async () => {
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    Audio: globalThis.Audio,
    localStorage: globalThis.localStorage,
    fetch: globalThis.fetch,
  };
  let resolveResume;
  let playCalls = 0;
  const resume = new Promise((resolve) => {
    resolveResume = resolve;
  });
  class FakeAudio extends EventTarget {
    duration = 180;
    currentTime = 0;
    paused = true;
    play() {
      playCalls++;
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    removeAttribute() {}
    load() {}
    remove() {}
  }
  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }
    createMediaElementSource() {
      return {
        connect(node) {
          return node;
        },
        disconnect() {},
      };
    }
    resume() {
      return resume;
    }
    close() {
      return Promise.resolve();
    }
  }
  Object.assign(globalThis, {
    window: { AudioContext: FakeAudioContext },
    document: new EventTarget(),
    Audio: FakeAudio,
    localStorage: { getItem: () => null, setItem() {} },
    fetch: () =>
      Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob()) }),
  });
  let state;
  const radio = createRadio((value) => {
    state = value;
  });
  try {
    const pending = radio.togglePlayback();
    assert.equal(
      playCalls,
      1,
      "play() must not wait for AudioContext.resume()",
    );
    assert.equal(state.status, "Loading…");
    resolveResume();
    await pending;
    assert.equal(state.status, "On air");
    assert.equal(state.playing, true);
  } finally {
    radio.dispose();
    Object.assign(globalThis, previous);
  }
});
