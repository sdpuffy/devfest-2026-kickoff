// Coach avatar images, keyed by coach id (see src/data/coaches.ts).
// Metro needs static require() paths, so each image is listed explicitly.
// Remove a line to fall back to that coach's emoji icon.
export const AVATAR_IMAGES: Record<string, number | undefined> = {
  atlas: require('@/assets/images/coaches/atlas.png'),
  ironside: require('@/assets/images/coaches/ironside.png'),
  blaze: require('@/assets/images/coaches/blaze.png'),
  vanguard: require('@/assets/images/coaches/vanguard.png'),
  rally: require('@/assets/images/coaches/rally.png'),
  strike: require('@/assets/images/coaches/strike.png'),
  anvil: require('@/assets/images/coaches/anvil.png'),
};