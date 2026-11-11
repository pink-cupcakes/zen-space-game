import { useLayoutEffect, useRef, useState } from "react";
import { speeds } from "./travel";
import { Radio } from "./components/Radio";
import { Controls } from "./components/Controls";
import { InstrumentScene, ConsoleDialog } from "./components/Instruments";
import { createExperience } from "./experience";

export default function App() {
  const sceneRef = useRef(null);
  const experience = useRef(null);
  const travel = useRef({ ...speeds[0] });
  const [distance, setDistance] = useState(0);
  const [instrument, setInstrument] = useState({
    module: "navigation",
    destination: "lantern",
    status: "",
    summary: "",
  });
  const [lights, setLights] = useState([false, false, true, true]);
  const [hum, setHum] = useState(false);
  const [humError, setHumError] = useState(false);
  const [settled, setSettled] = useState(false);
  const [minimal, setMinimal] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  function changeSpeed() {
    const next = (speedIndex + 1) % speeds.length;
    Object.assign(travel.current, speeds[next]);
    setSpeedIndex(next);
  }
  function toggleLight(index, sound) {
    const on = !lights[index];
    setLights(lights.map((value, i) => (i === index ? on : value)));
    if (sound) void experience.current?.lighting.playSound(sound, on);
  }
  function openConsole(module, trigger) {
    experience.current?.dashboard?.open(module, trigger);
  }
  function closeConsole() {
    void experience.current?.dashboard?.close();
  }
  function setCourse(id) {
    experience.current?.dashboard?.setCourse(id);
  }
  async function toggleHum() {
    try {
      const playing = await experience.current?.hum.toggle();
      if (typeof playing === "boolean") setHum(playing);
      setHumError(false);
    } catch {
      setHumError(true);
    }
  }
  useLayoutEffect(() => {
    const instance = createExperience(
      sceneRef.current,
      travel.current,
      setDistance,
      (patch) => setInstrument((previous) => ({ ...previous, ...patch })),
    );
    experience.current = instance;
    return () => {
      experience.current = null;
      instance.dispose();
    };
  }, []);
  return (
    <main
      ref={sceneRef}
      className={`scene${settled ? " settled" : ""}${minimal ? " minimal" : ""}`}
      tabIndex="0"
      aria-label="A quiet journey through space. Drag or use arrow keys to look around."
    >
      <div className="art">
        <InstrumentScene
          destination={instrument.destination}
          onOpen={openConsole}
          onCourse={setCourse}
        />
      </div>
      <canvas id="stars" aria-hidden="true"></canvas>
      <div className="shade"></div>
      <div className="light-layer">
        {[
          ["ceiling-light", "Ceiling light", "cord"],
          ["desk-light", "Desk light", "kerosene"],
          ["strip-light overhead-strip", "Overhead strip light"],
          ["strip-light shelf-strip", "Shelf strip light"],
        ].map(([className, label, sound], index) => (
          <button
            key={label}
            className={`cabin-light ${className}`}
            type="button"
            aria-label={label}
            aria-pressed={lights[index]}
            title={`Turn ${lights[index] ? "off" : "on"} ${label.toLowerCase()}`}
            onClick={() => toggleLight(index, sound)}
          />
        ))}
      </div>
      <header className="top">
        <div className="brand">
          <span className="mark">✳</span>
          <span>
            DRIFT <small> / &#160; A QUIET JOURNEY</small>
          </span>
        </div>
        <div className="status">
          <i></i> ALL SYSTEMS CALM
        </div>
      </header>
      <section className="intro">
        <p className="eyebrow">SOMEWHERE BETWEEN HERE AND THERE</p>
        <h1>Take the long way.</h1>
        <p>
          No destination. No rush. Just you and the quiet
          <br className="desktop" /> hum of a ship moving through the dark.
        </p>
        <button id="begin" className="begin" onClick={() => setSettled(true)}>
          SETTLE IN <span>↗</span>
        </button>
      </section>
      <div className="readout">
        <span>VESSEL STATUS</span>
        <strong>Coasting</strong>
        <div className="line"></div>
        <span>THE JOURNEY</span>
        <strong id="distance">
          {distance.toFixed(2).padStart(6, "0")} <small>LY</small>
        </strong>
      </div>
      <Radio />
      <Controls
        speed={speeds[speedIndex].label}
        onSpeed={changeSpeed}
        onHide={() => setMinimal(true)}
        hum={hum}
        humError={humError}
        onHum={toggleHum}
        onInstruments={(event) =>
          openConsole("navigation", event.currentTarget)
        }
      />
      <div className="look-hint" aria-hidden="true">
        <span className="desktop-hint">DRAG TO LOOK AROUND</span>
        <span className="touch-hint">SWIPE TO LOOK AROUND</span>
      </div>
      <ConsoleDialog
        instrument={instrument}
        onClose={closeConsole}
        onCourse={setCourse}
        onOpen={openConsole}
      />
      <button
        className="restore"
        id="restore"
        onClick={() => setMinimal(false)}
      >
        ✳ &#160; SHOW CONTROLS
      </button>
    </main>
  );
}
