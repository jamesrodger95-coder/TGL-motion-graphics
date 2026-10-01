// The film is composed for two frames: 16:9 (1920x1080) and, with
// ?format=9x16, 9:16 (1080x1920) for Reels, Shorts and TikTok. Timing, motion
// and soundtrack are shared; only the composition changes, and every shot
// reads its frame from here.
const query = typeof location === 'undefined' ? '' : location.search;
export const VERTICAL = new URLSearchParams(query).get('format') === '9x16';
export const W = VERTICAL ? 1080 : 1920;
export const H = VERTICAL ? 1920 : 1080;
export const MX = W / 2; // the frame's centre
export const MY = H / 2;
/** The 16:9 value, or the 9:16 one. */
export const fit = (wide, tall) => (VERTICAL ? tall : wide);
