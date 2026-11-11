import { destinations } from "../destinations.js";

export function InstrumentScene({
  destination: selectedDestination,
  onOpen,
  onCourse,
}) {
  return (
    <>
      <div className="console-world" inert>
        <div className="course-switches" aria-label="Destination switches">
          {destinations.map((destination) => (
            <button
              key={destination.id}
              type="button"
              data-destination={destination.id}
              aria-pressed={selectedDestination === destination.id}
              onClick={() => onCourse(destination.id)}
              aria-label={`Set course for ${destination.name}`}
              title={`${destination.code} · ${destination.name}`}
            />
          ))}
        </div>
      </div>
      <div className="instrument-hotspots">
        <button
          type="button"
          className="instrument-hotspot nav-hotspot"
          data-console="navigation"
          onClick={(event) => onOpen("navigation", event.currentTarget)}
          aria-label="Open navigation dashboard"
        >
          <span>⌖ NAVIGATION ↗</span>
        </button>
        <button
          type="button"
          className="instrument-hotspot engine-hotspot"
          data-console="engineering"
          onClick={(event) => onOpen("engineering", event.currentTarget)}
          aria-label="Open ship systems dashboard"
        >
          <span>⚙ SHIP SYSTEMS ↗</span>
        </button>
      </div>
    </>
  );
}

export function ConsoleDialog({ instrument, onClose, onCourse }) {
  function handleKeyDown(event) {
    if (
      instrument.module === "navigation" &&
      /^[123]$/.test(event.key) &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      onCourse(destinations[Number(event.key) - 1].id);
    }
  }
  return (
    <dialog
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={handleKeyDown}
      className="console-view"
      aria-label="Close-up of the ship console"
    >
      <header className="console-view-controls">
        <div>
          <span>DRIFT / AT THE CONSOLE</span>
          <h1 id="view-title">
            {instrument.module === "navigation" ? "Navigation" : "Ship systems"}
          </h1>
        </div>
        <button
          type="button"
          className="console-close"
          onClick={onClose}
          aria-label="Return to cabin"
        >
          ↙ BACK TO CABIN <kbd>ESC</kbd>
        </button>
      </header>
      <div className="console-guide">
        <span className="course-legend">
          01 Lantern Station &nbsp; · &nbsp; 02 Moss moon &nbsp; · &nbsp; 03
          Cinder Belt
        </span>
        <small id="console-instruction">
          {instrument.module === "navigation"
            ? "Use the amber buttons, or press 1, 2, or 3"
            : "Engine · energy · hull / all systems calm"}
        </small>
      </div>
      <p className="instrument-accessible" id="instrument-summary">
        {instrument.summary}
      </p>
      <p className="instrument-accessible" role="status" id="course-status">
        {instrument.status}
      </p>
    </dialog>
  );
}
