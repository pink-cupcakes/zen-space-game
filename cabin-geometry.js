// Shared panorama coordinates keep the original instrument and lamp overlays registered.
window.DriftCabin = {
  width: 2149, height: 732,
  // Feature-matched original illustration -> generated panorama homography.
  matrix: [.747026619,.0190215661,365.2949,-.0021832383,.754719555,.792822284,-.00000790876105,.00000710982725],
  point(x,y) {
    const [a,b,c,d,e,f,g,h]=this.matrix, z=g*x+h*y+1;
    return [(a*x+b*y+c)/z,(d*x+e*y+f)/z];
  },
  scale(w,h) { return Math.max(w/1350,h/this.height)*1.06; },
  overlayTransform(scale) {
    const [a,b,c,d,e,f,g,h]=this.matrix;
    return `matrix3d(${a*scale},${d*scale},0,${g},${b*scale},${e*scale},0,${h},0,0,1,0,${c*scale},${f*scale},0,1)`;
  }
};
