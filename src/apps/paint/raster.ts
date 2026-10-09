export function floodFill(image: ImageData, x: number, y: number, hex: string) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const pixels = image.data;
  const first = (y * image.width + x) * 4;
  const target = Array.from(pixels.slice(first, first + 4));
  const rgb = hex.replace("#", "");
  const replacement = [
    parseInt(rgb.slice(0, 2), 16),
    parseInt(rgb.slice(2, 4), 16),
    parseInt(rgb.slice(4, 6), 16),
    255,
  ];
  if (target.every((v, i) => v === replacement[i])) return;
  const stack = [y * image.width + x];
  const matches = (offset: number) =>
    pixels[offset] === target[0] &&
    pixels[offset + 1] === target[1] &&
    pixels[offset + 2] === target[2] &&
    pixels[offset + 3] === target[3];
  while (stack.length) {
    let index = stack.pop()!;
    if (!matches(index * 4)) continue;
    while (index % image.width > 0 && matches((index - 1) * 4)) index--;
    let above = false,
      below = false;
    const rowEnd = (Math.floor(index / image.width) + 1) * image.width;
    for (; index < rowEnd && matches(index * 4); index++) {
      pixels.set(replacement, index * 4);
      const up = index - image.width,
        down = index + image.width;
      if (up >= 0 && matches(up * 4)) {
        if (!above) stack.push(up);
        above = true;
      } else above = false;
      if (down < image.width * image.height && matches(down * 4)) {
        if (!below) stack.push(down);
        below = true;
      } else below = false;
    }
  }
}
