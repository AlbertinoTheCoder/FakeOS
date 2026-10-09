import { it, expect } from "vitest";
import { floodFill } from "./raster";
it("fills only connected pixels and stops at boundaries", () => {
  const data = new Uint8ClampedArray(3 * 3 * 4).fill(255);
  for (let y = 0; y < 3; y++) data.set([0, 0, 0, 255], (y * 3 + 1) * 4);
  const image = { data, width: 3, height: 3 } as ImageData;
  floodFill(image, 0, 0, "#ff0000");
  expect([...data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
  expect([...data.slice(8, 12)]).toEqual([255, 255, 255, 255]);
  expect([...data.slice(4, 8)]).toEqual([0, 0, 0, 255]);
  floodFill(image, 0, 0, "#ff0000");
});
