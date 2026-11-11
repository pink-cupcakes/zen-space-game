import { cabinGeometry } from "./cabin-geometry.js";
import * as THREE from "../../assets/vendor/three.module.js";

// The cabin is a flat illustration. Lights select complete, registered image states.
// Only live instrument pixels are added to the same flat material.
const WIDTH = 2149,
  HEIGHT = 732;
export async function createCabinLighting(screens, surfaces, fixtures) {
  if (!fixtures?.length)
    throw new Error("Cabin light controls must initialize first");
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.className = "cabin-surface";
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.dataset.lightingEngine = "authored-image-states";
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(
      -WIDTH / 2,
      WIDTH / 2,
      HEIGHT / 2,
      -HEIGHT / 2,
      0.1,
      10,
    );
  camera.position.z = 2;
  const loader = new THREE.TextureLoader();
  const paths = [
    "cockpit-wide-strips-off.png",
    "cockpit-lights-left.png",
    "cockpit-lights-right.png",
    "cockpit-lights-both.png",
  ];
  const states = await Promise.all(
    paths.map(async (path) => {
      const texture = await loader.loadAsync("assets/" + path);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      return texture;
    }),
  );
  const screenTextures = Object.fromEntries(
    Object.entries(screens).map(([name, canvas]) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.NearestFilter;
      return [name, texture];
    }),
  );
  const strips = { value: new THREE.Vector2() };
  const material = new THREE.MeshBasicMaterial({ map: states[0] });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.stripPower = strips;
    for (const [name, texture] of Object.entries(screenTextures)) {
      shader.uniforms[name] = { value: texture };
      shader.uniforms[name + "UV"] = { value: surfaceUV(surfaces[name]) };
    }
    shader.fragmentShader =
      instrumentGLSL +
      `
      uniform vec2 stripPower;
      float stripSource(vec2 p,vec2 a,vec2 b,float r){vec2 d=b-a;float t=clamp(dot(p-a,d)/dot(d,d),0.,1.);return 1.-smoothstep(r*.5,r,length(p-a-t*d));}
    ` +
      shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
      vec2 px=vec2(vMapUv.x*2149.,(1.-vMapUv.y)*732.);
      outgoingLight+=phosphor(navigation,navigationUV,px,diffuseColor.rgb)
        +phosphor(engineering,engineeringUV,px,diffuseColor.rgb)
        +phosphor(activity,activityUV,px,diffuseColor.rgb);
      float overhead=stripSource(px,vec2(947.,52.),vec2(980.,49.),2.4);
      float shelf=stripSource(px,vec2(1575.,131.),vec2(1616.,115.),2.8);
      outgoingLight+=vec3(1.,.4,.065)*dot(vec2(overhead,shelf),stripPower)*.4;
      #include <opaque_fragment>
    `,
    );
  };
  const geometry = new THREE.PlaneGeometry(WIDTH, HEIGHT);
  scene.add(new THREE.Mesh(geometry, material));
  let frame = 0,
    disposed = false;
  function render() {
    frame = 0;
    if (disposed) return;
    const on = fixtures.map(
      (f) => f.button.getAttribute("aria-pressed") === "true",
    );
    material.map = states[(on[0] ? 1 : 0) + (on[1] ? 2 : 0)];
    strips.value.set(on[2] ? 1 : 0, on[3] ? 1 : 0);
    renderer.render(scene, camera);
  }
  function requestRender() {
    if (!frame && !disposed) frame = requestAnimationFrame(render);
  }
  const observer = new MutationObserver(requestRender);
  fixtures.forEach((f) =>
    observer.observe(f.button, {
      attributes: true,
      attributeFilter: ["aria-pressed"],
    }),
  );
  function resolution(closeup, view) {
    const canvas = renderer.domElement;
    if (closeup && view) {
      // Rasterize only the visible crop, directly at display-pixel resolution.
      // This avoids enlarging a low-resolution copy of the entire panorama.
      camera.setViewOffset(
        WIDTH,
        HEIGHT,
        view.left,
        view.top,
        view.width,
        view.height,
      );
      const size = instrumentRasterSize(
        view,
        devicePixelRatio || 1,
        renderer.capabilities.maxTextureSize,
      );
      renderer.setSize(size.width, size.height, false);
      Object.assign(canvas.style, {
        position: "absolute",
        left: `${view.left}px`,
        top: `${view.top}px`,
        width: `${view.width}px`,
        height: `${view.height}px`,
      });
    } else {
      camera.clearViewOffset();
      const scale = Math.min(
        closeup ? 2 : 1.25,
        renderer.capabilities.maxTextureSize / WIDTH,
      );
      renderer.setSize(
        Math.round(WIDTH * scale),
        Math.round(HEIGHT * scale),
        false,
      );
      Object.assign(canvas.style, {
        position: "",
        left: "",
        top: "",
        width: "100%",
        height: "100%",
      });
    }
    requestRender();
  }
  function updateInstruments() {
    for (const texture of Object.values(screenTextures))
      texture.needsUpdate = true;
    requestRender();
  }
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
  });
  renderer.domElement.addEventListener("webglcontextrestored", requestRender);
  resolution(false);
  return {
    canvas: renderer.domElement,
    render: updateInstruments,
    resolution,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      states.forEach((t) => t.dispose());
      Object.values(screenTextures).forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function instrumentRasterSize(view, pixelRatio, maximum) {
  const width = view.width * view.scale,
    height = view.height * view.scale;
  const density = Math.min(pixelRatio, maximum / width, maximum / height);
  return {
    width: Math.ceil(width * density),
    height: Math.ceil(height * density),
  };
}

// Panorama pixels -> UVs on each physical instrument glass (projective mapping).
export function surfaceUV(corners) {
  const target = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
    rows = [];
  corners
    .map(([x, y]) => cabinGeometry.point(x, y))
    .forEach(([x, y], i) => {
      const [u, v] = target[i];
      rows.push(
        [x, y, 1, 0, 0, 0, -u * x, -u * y, u],
        [0, 0, 0, x, y, 1, -v * x, -v * y, v],
      );
    });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++)
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    if (Math.abs(divisor) < 1e-12)
      throw new Error("Invalid instrument surface");
    for (let j = col; j < 9; j++) rows[col][j] /= divisor;
    for (let row = 0; row < 8; row++)
      if (row !== col) {
        const factor = rows[row][col];
        for (let j = col; j < 9; j++) rows[row][j] -= factor * rows[col][j];
      }
  }
  const [a, b, c, d, e, f, g, h] = rows.map((row) => row[8]);
  return new THREE.Matrix3().set(a, b, c, d, e, f, g, h, 1);
}
const instrumentGLSL = `
  uniform sampler2D navigation,engineering,activity;
  uniform mat3 navigationUV,engineeringUV,activityUV;
  vec3 phosphor(sampler2D pixels,mat3 mapping,vec2 px,vec3 glass){
    vec3 point=mapping*vec3(px,1.);vec2 st=point.xy/point.z;
    if(any(lessThan(st,vec2(0.)))||any(greaterThan(st,vec2(1.))))return vec3(0.);
    vec2 centered=st*2.-1.;st+=centered*dot(centered,centered)*.008;
    if(any(lessThan(st,vec2(0.)))||any(greaterThan(st,vec2(1.))))return vec3(0.);
    vec4 ink=texture2D(pixels,vec2(st.x,1.-st.y));
    float transmission=mix(.68,.94,clamp(dot(glass,vec3(.21,.72,.07))*9.,0.,1.));
    return ink.rgb*ink.a*transmission*.82;
  }
`;
