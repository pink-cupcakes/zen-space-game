import { cabinGeometry } from "./cabin-geometry.js";

export function createLighting(layer) {
  // Short tactile effects are synthesized locally and start only after a lamp click.
  // They use their own quiet effects bus, independent of the radio and ship hum.
  let soundContext, soundBus, noiseBuffer;
  function lampAudio() {
    if (!soundContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return null;
      soundContext = new Audio();
      soundBus = soundContext.createGain();
      soundBus.gain.value = 0.34;
      soundBus.connect(soundContext.destination);
      noiseBuffer = soundContext.createBuffer(
        1,
        soundContext.sampleRate * 2,
        soundContext.sampleRate,
      );
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++)
        samples[i] = Math.random() * 2 - 1;
    }
    return soundContext;
  }
  function noise(
    context,
    start,
    duration,
    volume,
    frequency,
    type = "bandpass",
  ) {
    const source = context.createBufferSource(),
      filter = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(soundBus);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(start, Math.random() * 0.8);
    source.stop(start + duration + 0.015);
  }
  function tick(context, start, frequency, volume, duration = 0.025) {
    const source = context.createOscillator(),
      gain = context.createGain();
    source.type = "triangle";
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(
      frequency * 0.6,
      start + duration,
    );
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain).connect(soundBus);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(start);
    source.stop(start + duration + 0.01);
  }
  async function playLampSound(kind, on) {
    try {
      const context = lampAudio();
      if (!context) return;
      if (context.state === "suspended") await context.resume();
      const now = context.currentTime + 0.005;
      if (kind === "cord") {
        // Chain tension, a decisive two-part switch click, and beads settling.
        noise(context, now, 0.035, 0.18, 3200);
        noise(context, now + 0.025, 0.024, 0.8, 1850);
        tick(context, now + 0.026, on ? 780 : 690, 0.19, 0.035);
        noise(context, now + 0.065, 0.018, 0.38, 2900);
        for (let i = 0; i < 4; i++)
          tick(
            context,
            now + 0.095 + i * 0.028,
            3400 + i * 410,
            0.025 / (i + 1),
            0.035,
          );
      } else {
        // The wheel's small brass ratchet is shared by ignition and extinguishing.
        for (let i = 0; i < 4; i++) {
          noise(
            context,
            now + i * 0.035,
            0.018,
            0.2 - i * 0.025,
            1900 + i * 180,
          );
          tick(context, now + i * 0.035, 1150 + i * 110, 0.025, 0.018);
        }
        if (on) {
          noise(context, now + 0.15, 0.09, 0.33, 4200); // match scrape
          noise(context, now + 0.23, 0.3, 0.29, 700, "lowpass"); // small flame catching
          noise(context, now + 0.28, 0.18, 0.07, 2500);
        } else {
          noise(context, now + 0.14, 0.22, 0.27, 850, "lowpass"); // gentle flame-out puff
          noise(context, now + 0.17, 0.16, 0.055, 2800);
        }
      }
    } catch (error) {
      console.warn("Lamp sound unavailable:", error);
    }
  }

  // Accessible switches share the panorama's coordinates with the light sources.
  const fixtures = [
    { selector: ".ceiling-light", box: [138, 240, 145, 100] },
    { selector: ".desk-light", box: [1408, 630, 110, 165] },
    { selector: ".overhead-strip", box: [790, 72, 118, 38] },
    { selector: ".shelf-strip", box: [1615, 166, 110, 36] },
  ].map((fixture) => ({
    ...fixture,
    button: layer.querySelector(fixture.selector),
  }));
  function position() {
    const g = cabinGeometry,
      scale = layer.clientWidth / g.width;
    for (const {
      button,
      box: [x, y, w, h],
    } of fixtures) {
      const [px, py] = g.point(x, y),
        a = g.point(x - w / 2, y - h / 2),
        b = g.point(x + w / 2, y + h / 2);
      Object.assign(button.style, {
        left: `${px * scale}px`,
        top: `${py * scale}px`,
        width: `${(b[0] - a[0]) * scale}px`,
        height: `${(b[1] - a[1]) * scale}px`,
      });
    }
  }
  const observer = new ResizeObserver(position);
  observer.observe(layer);
  position();
  return {
    fixtures,
    playSound: playLampSound,
    dispose() {
      observer.disconnect();
      if (soundContext) void soundContext.close();
    },
  };
}
