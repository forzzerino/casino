/**
 * Canvas textures (layout, wheel numbers, chips) are painted with web fonts, so
 * the scene waits for them to be ready — with a timeout so a blocked font never
 * stops the game from loading.
 */
const FONT_FACES = [
  '600 92px "Cormorant Garamond"',
  '500 40px "Cormorant Garamond"',
  '700 84px Manrope',
  '800 60px Manrope',
  '600 74px Manrope',
];

export async function fontsReady(timeoutMs = 2500): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const loading = Promise.all(FONT_FACES.map((face) => document.fonts.load(face))).then(() => undefined);
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  try {
    await Promise.race([loading, timeout]);
  } catch {
    // Fall back to system fonts.
  }
}
