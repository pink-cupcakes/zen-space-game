# Drift

A quiet little space-travel game. No objectives, no score, just a cockpit and a slow journey through the stars.

Open `index.html` in a modern browser, or serve this directory with `python3 -m http.server` and visit http://localhost:8000. Use the controls to change pace, turn the ship hum on or off, or clear the view. The journey is intentionally ephemeral.

The cockpit art was generated for this project with OpenAI image generation.

Use **Your ship** to switch between **Night watch** (the original cockpit with only the floor rug, chair blanket, and pillow removed) and **Amber voyager**. Night watch is the default. Your selection is remembered in this browser when local storage is available. Switching ships keeps your journey, pace, and sound settings running.

## Deep Space Radio

The player includes three locally bundled CC0 tracks by HoliznaCC0: Tokyo Sunset, Ease into Night, and Calm Currents. Use the native audio controls to play/pause, seek, and adjust volume; the selector and previous/next buttons change tracks. Playback advances through the playlist automatically. Track and volume preferences are remembered; playback never starts automatically on page load. The music and ship hum are independent. Clear window hides the player without stopping the music.

See `assets/music/credits.html` for provenance and `assets/music/CC0-1.0.txt` for the license. These are existing instrumental recordings from HoliznaCC0’s Public Domain Lofi collection. The mellow station starts at 18% volume and plays at 90% speed with pitch preserved. When migrating from the original playlist, saved volume is capped at 18% once; subsequent volume adjustments are remembered.
