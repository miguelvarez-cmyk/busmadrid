export function hexToRgb(hex) {
  const clean = (hex || '888888').replace('#', '').padStart(6, '0');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
