// Two audio decks blend through Web Audio gain automation, including in background tabs.
(() => {
  const $ = id => document.getElementById(id);
  const selector = $('music-track'), status = $('music-status');
  const play = $('music-play'), seek = $('seek'), volume = $('music-volume'), mute = $('music-mute');
  const tracks = [...selector.options].map(option => option.value);
  const MIX = 'mellow-v1', FADE = 8, RATE = 0.9;
  let index = 0, level = 0.18, muted = false, wanted = false;
  let context, master, current, outgoing, transitionEnd = 0, operation = 0, switching = false;
  const cache = new Map();
  const failed = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem('drift-radio'));
    if (saved && tracks.includes(saved.track)) index = tracks.indexOf(saved.track);
    if (saved && Number.isFinite(saved.volume) && saved.volume >= 0 && saved.volume <= 1)
      level = saved.mix === MIX ? saved.volume : Math.min(saved.volume, 0.18);
  } catch {}
  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function newRound(last) {
    const round = shuffled(tracks.map((_, i) => i));
    if (round.length > 1 && round[0] === last) {
      const j = 1 + Math.floor(Math.random() * (round.length - 1));
      [round[0], round[j]] = [round[j], round[0]];
    }
    return round;
  }
  // Start a fresh shuffle each visit, avoiding the last saved track at the start.
  let queue = newRound(index);
  index = queue.shift();
  let history = [], historyPosition = -1;
  function nextTrack() {
    if (historyPosition + 1 < history.length) return history[historyPosition + 1];
    if (!queue.length) queue = newRound(index);
    return queue.find(i => !failed.has(i) && (i !== index || tracks.length === 1));
  }
  function recordTrack(nextIndex, direction) {
    if (direction === 'back') historyPosition--;
    else if (direction === 'forward') historyPosition++;
    else {
      history = history.slice(0, historyPosition + 1);
      history.push(nextIndex);
      if (history.length > 100) history.shift();
      historyPosition = history.length - 1;
      queue = queue.filter(i => i !== nextIndex);
    }
  }
  function advance(seconds = 1.5, automatic = false) {
    const next = nextTrack();
    if (next === undefined) {
      if (automatic) { wanted = false; status.textContent = 'Tracks unavailable — try again'; update(); }
      return;
    }
    choose(next, seconds, automatic, historyPosition + 1 < history.length ? 'forward' : 'new');
  }
  const time = s => Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';
  function save() {
    try { localStorage.setItem('drift-radio', JSON.stringify({track: tracks[index], volume: level, mix: MIX})); } catch {}
  }
  function audioGraph() {
    if (context) return;
    context = new (window.AudioContext || window.webkitAudioContext)();
    master = context.createGain();
    master.gain.value = muted ? 0 : level;
    master.connect(context.destination);
    for (const deck of [current, outgoing].filter(Boolean)) connect(deck);
  }
  function connect(deck) {
    if (!context || deck.gain) return;
    deck.source = context.createMediaElementSource(deck.audio);
    deck.gain = context.createGain();
    deck.source.connect(deck.gain).connect(master);
  }
  function fetchTrack(i) {
    const id = tracks[i];
    if (!cache.has(id)) {
      const request = fetch(`assets/music/${id}.mp3`).then(response => {
        if (!response.ok) throw new Error('Track unavailable');
        return response.blob();
      }).catch(error => { cache.delete(id); throw error; });
      cache.set(id, request);
      // Keep the playing track and the actual next shuffled track, not the whole library.
      for (const key of cache.keys()) if (![tracks[index], tracks[nextTrack()], id].includes(key)) cache.delete(key);
    }
    return cache.get(id);
  }
  function preload() {
    const next = nextTrack();
    if (next !== undefined) fetchTrack(next).catch(() => {});
  }
  function dispose(deck) {
    if (!deck) return;
    deck.audio.pause();
    deck.audio.removeAttribute('src');
    deck.audio.load();
    deck.source?.disconnect();
    deck.gain?.disconnect();
    URL.revokeObjectURL(deck.url);
    deck.audio.remove();
  }
  function finishFade() {
    dispose(outgoing); outgoing = null; transitionEnd = 0;
    if (current?.gain) {
      current.gain.gain.cancelScheduledValues(context.currentTime);
      current.gain.gain.setValueAtTime(1, context.currentTime);
    }
    if (wanted) status.textContent = 'On air';
    preload();
  }
  function update() {
    const audio = current?.audio;
    const valid = audio && Number.isFinite(audio.duration) && audio.duration > 0;
    seek.disabled = !valid;
    seek.value = valid ? audio.currentTime / audio.duration * 100 : 0;
    seek.setAttribute('aria-valuetext', `${time(audio?.currentTime)} of ${time(audio?.duration)}`);
    $('elapsed').textContent = time(audio?.currentTime);
    $('duration').textContent = time(audio?.duration);
    play.textContent = wanted ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', wanted ? 'Pause' : 'Play');
    play.title = wanted ? 'Pause' : 'Play';
    volume.value = Math.round(level * 100);
    $('volume-value').textContent = muted ? 'MUTED' : `${volume.value}%`;
    mute.textContent = muted || level === 0 ? '×' : '♪';
    mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    mute.title = muted ? 'Unmute' : 'Mute';
  }
  function fade(from, to, seconds) {
    const now = context.currentTime;
    const down = new Float32Array(65), up = new Float32Array(65);
    for (let i = 0; i < 65; i++) {
      down[i] = Math.cos(i / 64 * Math.PI / 2);
      up[i] = Math.sin(i / 64 * Math.PI / 2);
    }
    from.gain.gain.cancelScheduledValues(now);
    to.gain.gain.cancelScheduledValues(now);
    from.gain.gain.setValueCurveAtTime(down, now, seconds);
    to.gain.gain.setValueCurveAtTime(up, now, seconds);
    outgoing = from;
    transitionEnd = now + seconds;
    status.textContent = 'Blending…';
  }
  async function choose(nextIndex, seconds = 1.5, automatic = false, direction = 'new') {
    const token = ++operation;
    switching = true;
    if (!Number.isInteger(nextIndex) || !tracks[nextIndex]) { switching = false; return; }
    status.textContent = 'Loading…';
    let candidate;
    try {
      const blob = await fetchTrack(nextIndex);
      if (token !== operation) return;
      const audio = new Audio();
      audio.preload = 'auto';
      audio.defaultPlaybackRate = RATE;
      audio.playbackRate = RATE;
      audio.preservesPitch = true;
      candidate = {audio, url: URL.createObjectURL(blob)};
      audio.src = candidate.url;
      connect(candidate);
      if (candidate.gain) candidate.gain.gain.value = 0;
      // If paused during loading, adopt the new track silently instead.
      if (wanted) await audio.play();
      if (token !== operation) { dispose(candidate); return; }
      if (!wanted) audio.pause();
      const old = current;
      if (outgoing) finishFade();
      current = candidate;
      recordTrack(nextIndex, direction);
      index = nextIndex;
      selector.value = tracks[index];
      if (wanted && old && !old.audio.paused && !old.audio.ended) {
        const remaining = (old.audio.duration - old.audio.currentTime) / RATE;
        fade(old, current, Math.max(0.15, Math.min(seconds, remaining || seconds)));
      } else {
        dispose(old);
        if (current.gain) current.gain.gain.value = 1;
        status.textContent = wanted ? 'On air' : 'Ready when you are';
      }
      audio.addEventListener('timeupdate', tick);
      audio.addEventListener('loadedmetadata', update);
      audio.addEventListener('ended', () => { if (current?.audio === audio) tick(); });
      audio.addEventListener('error', () => { if (current?.audio === audio) status.textContent = 'Track unavailable — try next'; });
      failed.delete(nextIndex);
      save(); preload(); update();
    } catch (error) {
      dispose(candidate);
      if (token !== operation) return;
      selector.value = tracks[index];
      status.textContent = 'Track unavailable — try next';
      if (automatic) failed.add(nextIndex);
      if (!current) wanted = false;
      update();
    } finally { if (token === operation) switching = false; }
  }
  function tick() {
    if (outgoing && context.currentTime >= transitionEnd) finishFade();
    update();
    if (!wanted || !current || switching || outgoing) return;
    const audio = current.audio;
    const remaining = (audio.duration - audio.currentTime) / RATE;
    if (audio.ended || (Number.isFinite(remaining) && remaining <= FADE)) {
      advance(FADE, true);
    }
  }
  play.addEventListener('click', async () => {
    wanted = !wanted;
    update();
    if (!wanted) {
      for (const deck of [current, outgoing].filter(Boolean)) deck.audio.pause();
      await context?.suspend();
      if (!wanted) status.textContent = 'Paused';
      return;
    }
    try {
      audioGraph();
      await context.resume();
      if (!wanted) return;
      await Promise.all([current, outgoing].filter(Boolean).map(deck => deck.audio.play()));
      if (!wanted) { for (const deck of [current, outgoing].filter(Boolean)) deck.audio.pause(); return; }
      if (!current && !switching) choose(index);
      else status.textContent = outgoing ? 'Blending…' : 'On air';
    } catch { wanted = false; status.textContent = 'Press play to listen'; }
    update();
  });
  selector.addEventListener('change', () => {
    const next = tracks.indexOf(selector.value);
    if (next !== index) choose(next);
  });
  $('previous-track').addEventListener('click', () => {
    if (historyPosition > 0) choose(history[historyPosition - 1], 1.5, false, 'back');
    else if (current) current.audio.currentTime = 0;
  });
  $('next-track').addEventListener('click', () => advance());
  seek.addEventListener('input', () => {
    if (!current || !Number.isFinite(current.audio.duration)) return;
    if (outgoing) finishFade();
    current.audio.currentTime = Number(seek.value) / 100 * current.audio.duration;
    update();
  });
  function setVolume() {
    if (master) master.gain.setTargetAtTime(muted ? 0 : level, context.currentTime, 0.04);
    save(); update();
  }
  volume.addEventListener('input', () => { level = Number(volume.value) / 100; muted = false; setVolume(); });
  mute.addEventListener('click', () => { muted = !muted; setVolume(); });
  $('radio-toggle').addEventListener('click', () => {
    const panel = $('radio-panel'), toggle = $('radio-toggle');
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    toggle.setAttribute('aria-label', panel.hidden ? 'Open radio' : 'Shelve radio');
    toggle.title = panel.hidden ? 'Open radio' : 'Shelve radio';
    toggle.textContent = panel.hidden ? '+' : '−';
    toggle.closest('.music-player').classList.toggle('shelved', panel.hidden);
  });
  // A timer supplements media events; audio gain curves run on the audio thread.
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', tick);
  update(); choose(index, 0);
})();
