import test from "node:test";
import assert from "node:assert/strict";
import { cabinGeometry } from "../src/engines/cabin-geometry.js";
import {
  instrumentRasterSize,
  surfaceUV,
} from "../src/engines/cabin-light-engine.js";

test("instrument corners project to the correct texture coordinates", () => {
  const corners = [
    [879, 571],
    [1013, 575],
    [987, 630],
    [845, 623],
  ];
  const matrix = surfaceUV(corners).elements;
  const expected = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  corners.forEach(([x, y], index) => {
    const [px, py] = cabinGeometry.point(x, y);
    const divisor = matrix[2] * px + matrix[5] * py + matrix[8];
    const u = (matrix[0] * px + matrix[3] * py + matrix[6]) / divisor;
    const v = (matrix[1] * px + matrix[4] * py + matrix[7]) / divisor;
    assert.ok(Math.abs(u - expected[index][0]) < 1e-6);
    assert.ok(Math.abs(v - expected[index][1]) < 1e-6);
  });
});

test("close-up raster fits the GPU texture limit", () => {
  const size = instrumentRasterSize(
    { width: 1000, height: 500, scale: 2 },
    3,
    4096,
  );
  assert.deepEqual(size, { width: 4096, height: 2048 });
});
