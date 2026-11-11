# Drift

A quiet little space-travel game. No objectives, no score, just a cockpit and a slow journey through the stars.

Open `index.html` in a modern browser, or serve this directory with `python3 -m http.server` and visit http://localhost:8000. Use the controls to change pace, turn the ship hum on or off, or clear the view. The journey is intentionally ephemeral.

The cockpit art was generated for this project with OpenAI image generation.


## Deep Space Radio

The player includes six locally bundled CC0 tracks by HoliznaCC0: Tokyo Sunset, Ease into Night, Calm Currents, Peaceful Drift, Into the Mist, and Reminders. Use the radio controls to play/pause, seek, and adjust volume; the selector and previous/next buttons change tracks. Playback shuffles every pass through the playlist with eight-second equal-power crossfades. Each track plays once per shuffled pass, without back-to-back repeats at the boundary. Each visit opens with Tokyo Sunset, followed by a fresh shuffle of the remaining tracks. Previous retraces listening history; Next continues that history before returning to the shuffle. The next track is prefetched; manual track changes blend over 1.5 seconds. Pause and mute affect both decks, and shelving the radio or hiding controls keeps playback running. Start playback once with Play; it continues in the background while the page stays open. Volume is remembered; playback never starts automatically on page load. The music and ship hum are independent. Ship hum is quiet, deep stereo air noise with slowly drifting filters and subtle swells, without pitched tones; its switch fades fully to silence when off. Clear window hides the player without stopping the music.

See `assets/music/credits.html` for provenance and `assets/music/CC0-1.0.txt` for the license. These are existing instrumental recordings from HoliznaCC0’s Public Domain Lofi collection. The mellow station starts at 18% volume and plays at 90% speed with pitch preserved. When migrating from the original playlist, saved volume is capped at 18% once; subsequent volume adjustments are remembered.

## Ship instruments

Click the illustrated radar or engine screen, or use **Instruments**, to pan and zoom into that same console. One shared set of fixed-resolution canvases renders the navigation radar (384×176), engine telemetry (320×144), and activity log (144×176) in both the cabin and close-up. Their pixels sit inside the painted glass without an extra panel frame. Lamp state never controls instrument visibility.

The navigation screen shows your position in the Hearth system and the route to your destination. The amber button groups select Lantern Station (01), Moss moon (02), and Cinder Belt (03); keyboard shortcuts 1, 2, and 3 also select routes. The adjacent activity display records course changes and quiet system updates. Travel follows the existing pace control and pauses in Stillness. Engine load, temperature, energy, and hull readings are fictional, low-stakes telemetry.

Return with **Back to cabin** or **Escape**; your look-around position is preserved. Reduced motion skips the camera animation. Screen rendering lives in `instrument-screens.js`, interaction and camera behavior in `dashboard.js`, and placement in `dashboard.css`. Lamp behavior is separate in `lighting.js` and `lighting.css`.

`copy-bank.json` reserves “A little closer to somewhere.” for a future journey moment. The built-in image-generation edit and its exact prompt are saved in `assets/cockpit-instruments-v2.png` and `assets/cockpit-instruments-v2.prompt.txt`; it preserves the cabin and provides recessed glass for the live displays.

## GitHub Pages

The static game can be published with `.github/workflows/pages.yml`. Enable **Settings → Pages → Source → GitHub Actions**, then push to `main` or manually run **Publish Drift to GitHub Pages**. GitHub Free requires a public repository; keeping the source repository private requires an eligible paid plan. The published game itself is public.

Run `python3 scripts/build-pages.py` to inspect the deployment bundle in `_site/`. It includes tracked runtime files, images, fonts, music and licenses; it excludes Git metadata, generation prompts and project notes. Commit new runtime assets before publishing. The expected project URL is `https://pink-cupcakes.github.io/zen-space-game/`.
