// Bundled CC0 recordings; provenance and license are in assets/music/.
(() => {
  const player = document.querySelector('#music');
  const selector = document.querySelector('#music-track');
  const status = document.querySelector('#music-status');
  const tracks = [...selector.options].map(option => option.value);
  let index = 0;
  let selection = 0;
  player.volume = 0.35;
  try {
    const saved = JSON.parse(localStorage.getItem('drift-radio'));
    if (saved && tracks.includes(saved.track)) index = tracks.indexOf(saved.track);
    if (saved && typeof saved.volume === 'number' && saved.volume >= 0 && saved.volume <= 1) player.volume = saved.volume;
  } catch {}
  function save() {
    try { localStorage.setItem('drift-radio', JSON.stringify({track: tracks[index], volume: player.volume})); } catch {}
  }
  async function loadTrack(nextIndex, resume = false) {
    const version = ++selection;
    index = (nextIndex + tracks.length) % tracks.length;
    selector.value = tracks[index];
    status.textContent = 'Loading…';
    player.src = `assets/music/${tracks[index]}.mp3`;
    player.load();
    save();
    if (resume) {
      try { await player.play(); }
      catch (error) {
        if (version === selection && error.name !== 'AbortError') status.textContent = 'Press play to listen';
      }
    }
  }
  selector.addEventListener('change', () => loadTrack(tracks.indexOf(selector.value), !player.paused));
  document.querySelector('#previous-track').addEventListener('click', () => loadTrack(index - 1, !player.paused));
  document.querySelector('#next-track').addEventListener('click', () => loadTrack(index + 1, !player.paused));
  player.addEventListener('ended', () => loadTrack(index + 1, true));
  player.addEventListener('playing', () => { status.textContent = 'On air'; });
  player.addEventListener('pause', () => { if (!player.error) status.textContent = 'Paused'; });
  player.addEventListener('loadedmetadata', () => { if (player.paused) status.textContent = 'Ready when you are'; });
  player.addEventListener('waiting', () => { status.textContent = 'Loading…'; });
  player.addEventListener('error', () => { status.textContent = 'Track unavailable — try next'; });
  player.addEventListener('volumechange', save);
  loadTrack(index);
})();
