import { cabinGeometry } from "./cabin-geometry.js";
import { createDriftScreens } from "./instrument-screens.js";
import { createCabinLighting } from "./cabin-light-engine.js";
import { destinations } from "../destinations.js";

export async function createDashboard(
  cabin,
  fixtures,
  travel,
  signal,
  onChange,
) {
  const art = cabin.querySelector(".art");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    destination: destinations[0],
    position: { x: 140, y: 305 },
    paceName: "Slow drift",
    engine: {
      load: "32.4",
      temp: "64.2",
      energy: "87.6",
      draw: "2.4",
      rpm: "1,240",
    },
    log: [],
  };
  const startTime = performance.now();
  let lastTick = startTime,
    lastLog = startTime,
    lastPaint = 0,
    returnFocus,
    currentModule = "navigation",
    closing = false,
    animation;
  const screens = createDriftScreens();
  const world = art.querySelector(".console-world");
  const switches = world.querySelector(".course-switches");
  const hotspots = art.querySelector(".instrument-hotspots");
  const dialog = cabin.querySelector(".console-view");
  const surface = await createCabinLighting(
    screens.canvases,
    {
      navigation: [
        [879, 571],
        [1013, 575],
        [987, 630],
        [845, 623],
      ],
      engineering: [
        [694, 588],
        [781, 591],
        [766, 620],
        [675, 616],
      ],
      activity: [
        [1047, 588],
        [1094, 591],
        [1081, 628],
        [1035, 624],
      ],
    },
    fixtures,
  );
  if (signal.aborted) {
    surface.dispose();
    return null;
  }
  world.prepend(surface.canvas);
  art.classList.add("surface-ready");
  const q = (s) => dialog.querySelector(s);
  function project(el, w, h, points) {
    const [p0, p1, p2, p3] = points.map(([x, y]) => cabinGeometry.point(x, y)),
      dx1 = p1[0] - p2[0],
      dx2 = p3[0] - p2[0],
      dx3 = p0[0] - p1[0] + p2[0] - p3[0],
      dy1 = p1[1] - p2[1],
      dy2 = p3[1] - p2[1],
      dy3 = p0[1] - p1[1] + p2[1] - p3[1];
    const det = dx1 * dy2 - dx2 * dy1,
      g = (dx3 * dy2 - dx2 * dy3) / det,
      hp = (dx1 * dy3 - dx3 * dy1) / det;
    const a = p1[0] - p0[0] + g * p1[0],
      b = p3[0] - p0[0] + hp * p3[0],
      d = p1[1] - p0[1] + g * p1[1],
      e = p3[1] - p0[1] + hp * p3[1];
    Object.assign(el.style, {
      width: w + "px",
      height: h + "px",
      transform: `matrix3d(${a / w},${d / w},0,${g / w},${b / h},${e / h},0,${hp / h},0,0,1,0,${p0[0]},${p0[1]},0,1)`,
    });
  }
  // Transparent hit targets follow physical buttons; all visible instruments live in the cabin material.
  project(switches, 300, 60, [
    [832, 638],
    [898, 643],
    [892, 654],
    [826, 649],
  ]);
  function geometry() {
    const w = art.clientWidth,
      h = art.clientHeight;
    return { w, h, scale: w / cabinGeometry.width, left: 0, top: 0 };
  }
  function overviewCamera() {
    const g = geometry();
    world.style.transform = `scale(${g.scale})`;
  }
  function placeHotspots() {
    const g = geometry();
    for (const [selector, x, y, w, h] of [
      [".nav-hotspot", 930, 598, 185, 86],
      [".engine-hotspot", 725, 603, 130, 65],
    ]) {
      const [px, py] = cabinGeometry.point(x, y);
      Object.assign(hotspots.querySelector(selector).style, {
        left: `${px * g.scale}px`,
        top: `${py * g.scale}px`,
        width: `${w * 0.75 * g.scale}px`,
        height: `${h * 0.75 * g.scale}px`,
      });
    }
  }
  function returnWorld() {
    world.inert = true;
    art.prepend(world);
    surface.resolution(false);
    surface.render();
    overviewCamera();
  }
  function cabinCamera() {
    const g = geometry(),
      r = art.getBoundingClientRect();
    return `translate(${r.left}px,${r.top}px) scale(${g.scale})`;
  }
  function focusFrame() {
    const nav = currentModule === "navigation",
      [x, y] = cabinGeometry.point(nav ? 963 : 735, nav ? 604 : 605),
      portraitPhone = innerWidth <= 700 && innerHeight > innerWidth,
      scale = Math.min(
        innerWidth /
          (nav ? (portraitPhone ? 185 : 248) : portraitPhone ? 120 : 150),
        (innerHeight - (portraitPhone ? 220 : 140)) / (nav ? 135 : 101),
      );
    return {
      left: x - innerWidth / 2 / scale,
      top: y - (innerHeight * 0.52) / scale,
      width: innerWidth / scale,
      height: innerHeight / scale,
      scale,
    };
  }
  function focusCamera() {
    const v = focusFrame();
    return `translate(${-v.left * v.scale}px,${-v.top * v.scale}px) scale(${v.scale})`;
  }
  function sharpenConsole() {
    surface.resolution(true, focusFrame());
    surface.render();
  }
  function openConsole(module, trigger) {
    const switching = dialog.open;
    if (switching && currentModule === module) return;
    if (!switching) returnFocus = trigger;
    const from = switching ? getComputedStyle(world).transform : cabinCamera();
    animation?.cancel();
    currentModule = module;
    onChange({ module });
    dialog.dataset.module = currentModule;
    switches.inert = currentModule !== "navigation";
    const to = focusCamera();
    surface.resolution(true);
    surface.render();
    if (!switching) {
      dialog.prepend(world);
      world.inert = false;
    }
    world.style.transform = to;
    if (!switching) dialog.showModal();
    animation = world.animate([{ transform: from }, { transform: to }], {
      duration: reducedMotion.matches ? 0 : 850,
      easing: "cubic-bezier(.22,.68,.2,1)",
    });
    const opening = animation;
    opening.finished.then(
      () => {
        if (dialog.open && !closing && animation === opening) sharpenConsole();
      },
      () => {},
    );
    if (!switching) q(".console-close").focus({ preventScroll: true });
  }
  async function closeConsole() {
    if (closing) return;
    closing = true;
    const from = getComputedStyle(world).transform;
    animation?.cancel();
    surface.resolution(true);
    surface.render();
    const to = cabinCamera();
    world.style.transform = to;
    animation = world.animate([{ transform: from }, { transform: to }], {
      duration: reducedMotion.matches ? 0 : 550,
      easing: "cubic-bezier(.3,0,.3,1)",
    });
    try {
      await animation.finished;
    } catch {
      closing = false;
      return;
    }
    if (signal.aborted) return;
    returnWorld();
    dialog.close();
    closing = false;
    returnFocus?.focus({ preventScroll: true });
  }
  returnWorld();
  const observer = new ResizeObserver(() => {
    placeHotspots();
    if (!dialog.open) overviewCamera();
    else if (!closing) {
      animation?.cancel();
      world.style.transform = focusCamera();
      sharpenConsole();
    }
  });
  observer.observe(art);
  placeHotspots();
  function addLog(label, detail) {
    const elapsed = Math.floor((performance.now() - startTime) / 1000);
    state.log.unshift({
      stamp: `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`,
      label,
      detail,
    });
    state.log.length = Math.min(state.log.length, 4);
  }
  function setCourse(id) {
    const next = destinations.find((destination) => destination.id === id);
    if (!next) return;
    if (next.id !== state.destination.id) {
      state.destination = next;
      addLog("COURSE SET", next.name);
      onChange({
        destination: next.id,
        status: `Course set for ${next.name}.`,
      });
    }
  }
  addLog("HULL SURVEY", "Seals sound");
  addLog("DRIVE SYNC", "Steady hum");
  addLog("COURSE SET", state.destination.name);
  let frameId;
  function frame(now) {
    frameId = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min((now - lastTick) / 1000, 0.1);
    lastTick = now;
    const p = state.position,
      d = state.destination,
      dx = d.x - p.x,
      dy = d.y - p.y,
      r = Math.hypot(dx, dy),
      step = Math.min(r, dt * travel.pace * 0.08);
    if (r) {
      p.x += (dx / r) * step;
      p.y += (dy / r) * step;
    }
    if (now - lastPaint < 125) return;
    lastPaint = now;
    const t = now / 1000;
    state.paceName = travel.label;
    state.engine = {
      load: (
        (travel.pace === 0 ? 12 : travel.pace === 0.8 ? 48 : 32) +
        Math.sin(t * 0.23) * 1.5
      ).toFixed(1),
      temp: (64 + Math.sin(t * 0.11) * 0.7).toFixed(1),
      energy: (87.6 + Math.sin(t * 0.04) * 0.2).toFixed(1),
      draw: (1.4 + travel.pace * 2.8 + Math.sin(t * 0.3) * 0.1).toFixed(1),
      rpm: Math.round(
        700 + travel.pace * 1540 + Math.sin(t * 0.4) * 12,
      ).toLocaleString(),
    };
    if (now - lastLog >= 22000) {
      lastLog = now;
      const updates = [
          ["NAV FIX", "Position confirmed"],
          ["CORE CHECK", "Temperature steady"],
          ["HULL SURVEY", "Seals sound"],
          ["POWER BUS", "Reserves healthy"],
        ],
        entry = updates[Math.floor((now - startTime) / 22000) % 4];
      addLog(...entry);
    }
    screens.render(state, reducedMotion.matches ? 0 : now);
    surface.render();
    onChange({
      summary: `Hearth system. Position ${(p.x / 100).toFixed(2)}, ${(p.y / 100).toFixed(2)}. Course: ${d.name}, ${(r / 100).toFixed(2)} AU remaining. ${state.paceName}. Engine ${state.engine.load} percent. Energy ${state.engine.energy} percent. Hull corrosion 1.8 percent.`,
    });
  }
  screens.render(state, startTime);
  surface.render();
  frameId = requestAnimationFrame(frame);
  return {
    open: openConsole,
    close: closeConsole,
    setCourse,
    dispose() {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      animation?.cancel();
      surface.dispose();
      // Restore the React-owned world before the component is unmounted.
      if (world.parentNode !== art) art.prepend(world);
      if (dialog.open) dialog.close();
      art.classList.remove("surface-ready");
    },
  };
}
