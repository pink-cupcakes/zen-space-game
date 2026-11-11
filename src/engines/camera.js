import { cabinGeometry } from "./cabin-geometry.js";

export function createCamera(scene) {
  const controller = new AbortController();
  const { signal } = controller;
  // Move the camera crop across the approved illustration; never expose empty edges.
  const look = { x: 0, y: 0, pointer: null };
  function updateLook() {
    const g = cabinGeometry,
      width = scene.clientWidth,
      height = scene.clientHeight;
    const scale = g.scale(width, height),
      imageWidth = g.width * scale,
      imageHeight = g.height * scale;
    const maxX = Math.max(0, (imageWidth - width) / 2),
      maxY = Math.max(0, (imageHeight - height) / 2);
    look.x = Math.max(-maxX, Math.min(maxX, look.x));
    look.y = Math.max(-maxY, Math.min(maxY, look.y));
    for (const layer of scene.querySelectorAll(".art,.light-layer"))
      Object.assign(layer.style, {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        left: `${-maxX}px`,
        top: `${-maxY}px`,
      });
    scene.style.setProperty("--look-x", `${look.x}px`);
    scene.style.setProperty("--look-y", `${look.y}px`);
  }
  updateLook();
  scene.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.button !== 0 ||
        event.target.closest(
          "button, select, input, label, a, audio, .music-player",
        )
      )
        return;
      look.pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      scene.setPointerCapture(event.pointerId);
      scene.classList.add("looking");
    },
    { signal },
  );
  scene.addEventListener(
    "pointermove",
    (event) => {
      if (!look.pointer || event.pointerId !== look.pointer.id) return;
      const dx = event.clientX - look.pointer.x,
        dy = event.clientY - look.pointer.y;
      look.x += dx * 2;
      look.y += dy;
      look.pointer.x = event.clientX;
      look.pointer.y = event.clientY;
      if (dx || dy) scene.classList.add("has-looked");
      updateLook();
    },
    { signal },
  );
  function endLook(event) {
    if (!look.pointer || event.pointerId !== look.pointer.id) return;
    look.pointer = null;
    scene.classList.remove("looking");
  }
  scene.addEventListener("pointerup", endLook, { signal });
  scene.addEventListener("pointercancel", endLook, { signal });
  scene.addEventListener("lostpointercapture", endLook, { signal });
  scene.addEventListener(
    "keydown",
    (event) => {
      if (event.target !== scene) return;
      if (event.key === "Home") {
        event.preventDefault();
        look.x = 0;
        look.y = 0;
        updateLook();
        return;
      }
      const horizontalStep = scene.clientWidth * (event.shiftKey ? 0.18 : 0.06);
      const offsets = {
        ArrowLeft: [horizontalStep, 0],
        ArrowRight: [-horizontalStep, 0],
        ArrowUp: [0, 24],
        ArrowDown: [0, -24],
      };
      if (!offsets[event.key]) return;
      event.preventDefault();
      look.x += offsets[event.key][0];
      look.y += offsets[event.key][1];
      scene.classList.add("has-looked");
      updateLook();
    },
    { signal },
  );
  window.addEventListener("resize", updateLook, { signal });

  // Horizontal trackpad gestures and Shift+wheel share the same real image bounds.
  scene.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || event.target.closest(".music-player,input,select"))
        return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? scene.clientWidth
            : 1;
      const dx = event.shiftKey ? event.deltaY : event.deltaX;
      const dy = event.shiftKey ? 0 : event.deltaY;
      if (!dx && !dy) return;
      event.preventDefault();
      look.x -= dx * unit * 2;
      look.y -= dy * unit;
      scene.classList.add("has-looked");
      updateLook();
    },
    { passive: false, signal },
  );

  return { look, dispose: () => controller.abort() };
}
