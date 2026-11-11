export function createShipHumController() {
  let humAudio,
    humGain,
    humPlaying = false,
    humBusy = false;
  function createShipHum() {
    humAudio = new (window.AudioContext || window.webkitAudioContext)();
    humGain = humAudio.createGain();
    humGain.gain.value = 0;
    humGain.connect(humAudio.destination);
    // Broad, unpitched air movement rather than oscillators or musical notes.
    const rate = humAudio.sampleRate,
      duration = 12,
      overlap = Math.floor(rate * 0.5);
    const buffer = humAudio.createBuffer(2, rate * duration, rate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0,
        brown = 0;
      for (let i = 0; i < samples.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
        brown = 0.995 * brown + white * 0.02;
        samples[i] = pink * 0.65 + brown * 0.75;
      }
      // Crossfade the loop boundary so ventilation has no recurring click.
      for (let i = 0; i < overlap; i++) {
        const t = i / (overlap - 1),
          j = samples.length - overlap + i;
        samples[j] =
          samples[j] * Math.cos((t * Math.PI) / 2) +
          samples[i] * Math.sin((t * Math.PI) / 2);
      }
    }
    const air = humAudio.createBufferSource(),
      low = humAudio.createBiquadFilter(),
      high = humAudio.createBiquadFilter();
    air.buffer = buffer;
    air.loop = true;
    air.loopStart = 0.5;
    air.loopEnd = duration;
    high.type = "highpass";
    high.frequency.value = 40;
    high.Q.value = 0.5;
    low.type = "lowpass";
    low.frequency.value = 420;
    low.Q.value = 0.5;
    // Very slow, inaudible modulation gives the noise a distant, drifting quality.
    const drift = humAudio.createOscillator(),
      driftDepth = humAudio.createGain();
    drift.frequency.value = 0.025;
    driftDepth.gain.value = 65;
    drift.connect(driftDepth).connect(low.frequency);
    drift.start();
    const swell = humAudio.createGain(),
      swellMotion = humAudio.createOscillator(),
      swellDepth = humAudio.createGain();
    swell.gain.value = 0.95;
    swellMotion.frequency.value = 0.018;
    swellDepth.gain.value = 0.04;
    swellMotion.connect(swellDepth).connect(swell.gain);
    swellMotion.start();
    air.connect(high).connect(low).connect(swell).connect(humGain);
    air.start(0, 0.5);
  }
  async function toggle() {
    if (humBusy) return;
    humBusy = true;
    try {
      if (!humAudio) createShipHum();
      await humAudio.resume();
      if (humAudio.state !== "running") throw new Error("Audio did not start");
      humPlaying = !humPlaying;
      const now = humAudio.currentTime;
      humGain.gain.cancelScheduledValues(now);
      humGain.gain.setValueAtTime(humGain.gain.value, now);
      humGain.gain.linearRampToValueAtTime(humPlaying ? 0.1 : 0, now + 0.7);
      return humPlaying;
    } catch (error) {
      console.error("Ship hum:", error);
      throw error;
    } finally {
      humBusy = false;
    }
  }

  return {
    toggle,
    dispose() {
      if (humAudio) void humAudio.close();
    },
  };
}
