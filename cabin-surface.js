/* A single shared surface provides physical cabin lighting and emissive instruments. */
window.createCabinSurface = async function (screens, surfaces) {
  const {createCabinLighting}=await import('./cabin-light-engine.js');
  return createCabinLighting(screens,surfaces);
};
