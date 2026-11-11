export function createStars(canvas, look, travel, onDistance) {
  const context = canvas.getContext("2d");
  let width,
    height,
    stars,
    distance = 0,
    last = 0,
    lastUpdate = 0,
    frame;
  function resize() {
    width = canvas.width = innerWidth * devicePixelRatio;
    height = canvas.height = innerHeight * devicePixelRatio;
    stars = Array.from({ length: 65 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.65,
      r: (0.3 + Math.random() * 0.8) * devicePixelRatio,
      a: 0.15 + Math.random() * 0.5,
    }));
  }
  function animate(time) {
    const dt = Math.min((time - last) / 1000 || 0, 0.05);
    last = time;
    context.clearRect(0, 0, width, height);
    for (const star of stars) {
      star.x -= travel.pace * dt * devicePixelRatio * 5;
      if (star.x < 0) star.x = width;
      context.beginPath();
      context.fillStyle = `rgba(209,230,232,${star.a})`;
      context.arc(
        (star.x + look.x * 0.08 * devicePixelRatio + width) % width,
        star.y + look.y * 0.04 * devicePixelRatio,
        star.r,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    distance += dt * travel.pace * 0.003;
    if (time - lastUpdate > 250) {
      onDistance(distance);
      lastUpdate = time;
    }
    frame = requestAnimationFrame(animate);
  }
  window.addEventListener("resize", resize);
  resize();
  frame = requestAnimationFrame(animate);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
  };
}
