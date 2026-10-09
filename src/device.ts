export function detectMobile() {
  const ua = navigator.userAgent;
  const ipad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ipad) return false;
  if (/iPhone|iPod/.test(ua)) return true;
  if (/Android/.test(ua))
    return /Mobile/.test(ua) && Math.min(screen.width, screen.height) < 700;
  return (
    matchMedia("(pointer: coarse)").matches &&
    Math.min(screen.width, screen.height) < 600
  );
}
