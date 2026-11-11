import { createCamera } from "./engines/camera.js";
import { createStars } from "./engines/stars.js";
import { createShipHumController } from "./engines/shipHum.js";
import { createLighting } from "./engines/lighting.js";

// Each mounted scene owns its resources. The abort signal also covers a
// dashboard whose textures are still loading when the scene is removed.
export function createExperience(
  scene,
  travel,
  onDistance,
  onInstrumentChange,
) {
  const controller = new AbortController();
  const camera = createCamera(scene);
  const stopStars = createStars(
    scene.querySelector("#stars"),
    camera.look,
    travel,
    onDistance,
  );
  const hum = createShipHumController();
  const lighting = createLighting(scene.querySelector(".light-layer"));
  let dashboard;
  import("./engines/dashboard.js")
    .then(({ createDashboard }) =>
      controller.signal.aborted
        ? null
        : createDashboard(
            scene,
            lighting.fixtures,
            travel,
            controller.signal,
            onInstrumentChange,
          ),
    )
    .then((instance) => {
      if (controller.signal.aborted) instance?.dispose();
      else dashboard = instance;
    })
    .catch((error) => {
      if (!controller.signal.aborted)
        console.error("Unable to start instruments:", error);
    });

  return {
    hum,
    lighting,
    get dashboard() {
      return dashboard;
    },
    dispose() {
      controller.abort();
      dashboard?.dispose();
      lighting.dispose();
      hum.dispose();
      stopStars();
      camera.dispose();
    },
  };
}
