import { useEffect, useRef, useState } from "react";
import { createRadio, tracks } from "../engines/music.js";

const initialState = {
  track: "tokyo-sunset",
  status: "Ready when you are",
  playing: false,
  muted: false,
  volume: 18,
  seek: 0,
  canSeek: false,
  elapsed: "0:00",
  duration: "0:00",
};

export function Radio() {
  const player = useRef(null);
  const [radio, setRadio] = useState(initialState);
  const [shelved, setShelved] = useState(
    () =>
      window.matchMedia(
        "(max-width: 700px), (max-width: 950px) and (max-height: 500px)",
      ).matches,
  );

  useEffect(() => {
    const instance = createRadio(setRadio);
    player.current = instance;
    return () => {
      player.current = null;
      instance.dispose();
    };
  }, []);

  return (
    <section
      className={`music-player${shelved ? " shelved" : ""}`}
      aria-label="Lo-fi radio"
    >
      <div className="radio-heading">
        <div>
          <span className="radio-kicker">DEEP SPACE RADIO</span>
          <span id="music-status" role="status">
            {radio.status}
          </span>
        </div>
        <button
          id="radio-toggle"
          className="radio-toggle"
          type="button"
          aria-expanded={!shelved}
          aria-controls="radio-panel"
          aria-label={shelved ? "Open radio" : "Shelve radio"}
          title={shelved ? "Open radio" : "Shelve radio"}
          onClick={() => setShelved(!shelved)}
        >
          {shelved ? "+" : "−"}
        </button>
      </div>
      <div id="radio-panel" hidden={shelved}>
        <label className="track-label" htmlFor="music-track">
          NOW PLAYING <span>MELLOW / 6 TRACKS</span>
        </label>
        <select
          id="music-track"
          aria-label="Music track"
          value={radio.track}
          onChange={(event) => player.current?.selectTrack(event.target.value)}
        >
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
        <div className="seek-row">
          <span id="elapsed">{radio.elapsed}</span>
          <input
            id="seek"
            type="range"
            min="0"
            max="100"
            value={radio.seek}
            step="0.1"
            disabled={!radio.canSeek}
            aria-label="Seek through track"
            aria-valuetext={`${radio.elapsed} of ${radio.duration}`}
            onChange={(event) => player.current?.seekTo(event.target.value)}
          />
          <span id="duration">{radio.duration}</span>
        </div>
        <div className="transport">
          <button
            id="previous-track"
            type="button"
            aria-label="Previous track"
            title="Previous track"
            onClick={() => player.current?.previous()}
          >
            ⏮
          </button>
          <button
            id="music-play"
            className="play-button"
            type="button"
            aria-label={radio.playing ? "Pause" : "Play"}
            title={radio.playing ? "Pause" : "Play"}
            onClick={() => player.current?.togglePlayback()}
          >
            {radio.playing ? "Ⅱ" : "▶"}
          </button>
          <button
            id="next-track"
            type="button"
            aria-label="Next track"
            title="Next track"
            onClick={() => player.current?.next()}
          >
            ⏭
          </button>
        </div>
        <div className="volume-row">
          <button
            id="music-mute"
            type="button"
            aria-label={radio.muted ? "Unmute" : "Mute"}
            title={radio.muted ? "Unmute" : "Mute"}
            onClick={() => player.current?.toggleMute()}
          >
            {radio.muted || radio.volume === 0 ? "×" : "♪"}
          </button>
          <label htmlFor="music-volume">VOLUME</label>
          <input
            id="music-volume"
            type="range"
            min="0"
            max="100"
            step="1"
            value={radio.volume}
            aria-label="Volume"
            onChange={(event) => player.current?.setVolume(event.target.value)}
          />
          <span id="volume-value">
            {radio.muted ? "MUTED" : `${radio.volume}%`}
          </span>
        </div>
        <a
          className="music-credit"
          href="assets/music/credits.html"
          target="_blank"
          rel="noopener"
        >
          HoliznaCC0 · CC0 · Music credits ↗
        </a>
      </div>
    </section>
  );
}
