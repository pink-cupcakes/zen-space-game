export function Controls({
  speed,
  onSpeed,
  onHide,
  hum,
  humError,
  onHum,
  onInstruments,
}) {
  return (
    <footer className="controls">
      <div className="control-label">
        <span className="dot"></span>
        <div>
          <b>YOUR LITTLE CORNER OF SPACE</b>
          <small>Make yourself comfortable.</small>
        </div>
      </div>
      <div className="actions">
        <button
          id="instruments"
          type="button"
          onClick={onInstruments}
          data-console="navigation"
        >
          <span>⌖</span>
          <div>
            <small>INSTRUMENTS</small>
            <b>Navigation &amp; ship</b>
          </div>
        </button>
        <button id="speed" onClick={onSpeed} title="Change travel speed">
          <span>◌</span>
          <div>
            <small>TRAVEL PACE</small>
            <b>{speed}</b>
          </div>
        </button>
        <button
          id="sound"
          onClick={onHum}
          aria-pressed={hum}
          title={humError ? "Click to retry audio" : "Toggle ambient ship hum"}
        >
          <span>♫</span>
          <div>
            <small>SHIP HUM</small>
            <b>{humError ? "Try again" : hum ? "On" : "Off"}</b>
          </div>
        </button>
        <button id="hide" onClick={onHide} title="Hide controls">
          <span>⌁</span>
          <div>
            <small>VIEW</small>
            <b>Clear window</b>
          </div>
        </button>
      </div>
    </footer>
  );
}
