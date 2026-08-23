/**
 * Everything about the animal/accessory art pack that both the pet screens
 * and the store need to agree on. Pure — no Prisma import, same "a client
 * component can import this directly" split `pet-mood.ts` documents.
 *
 * The pack (2026-08-23) replaced the three square 375×375 animal SVGs with a
 * full set of 23 species drawn on a shared **1080×1400** canvas, in two moods
 * (`/animals/happy/koala.svg`, `/animals/sad/koala-sad.svg`), plus 21
 * accessories drawn on *the same* canvas at the exact spot they sit on an
 * animal. That shared canvas is the whole trick: an accessory needs no
 * per-species offset or scale, it just paints over the animal at the same
 * size and lands where it should.
 *
 * The cost of it is dead space. A hat's file is 93% empty, and every animal
 * leaves the top third clear for one; the mandarin occupies 19% × 10% of its
 * file. That's correct on a pet stage and useless in a 44px store thumbnail,
 * so `ART_FOCUS` below records where the ink actually is and `ItemWell` crops
 * to it. Nothing on a *pet* surface crops — the moment you crop the animal
 * and the accessory differently they stop lining up.
 */

/** The art pack's shared canvas. Every animal and accessory SVG is this size. */
export const ART_CANVAS = { width: 1080, height: 1400 } as const;

/** Portrait, ~0.771. Anywhere that used to draw an animal as a square needs this instead. */
export const ART_ASPECT = ART_CANVAS.width / ART_CANVAS.height;

/** The canvas width that pairs with `height`, rounded to a whole pixel. */
export function artWidthFor(height: number): number {
  return Math.round(height * ART_ASPECT);
}

/** `/animals/happy/koala.svg` → `koala`; `/accessories/collar-wide.svg` → `collar-wide`. */
export function artKey(imageUrl: string): string {
  return imageUrl.replace(/^.*\//, "").replace(/\.svg$/, "");
}

/**
 * The sad cut of a species' art, for the two below-par moods. Derived from
 * the happy path rather than stored as a second `StoreItem` column — the pack
 * names every file the same way (`happy/fox.svg` ↔ `sad/fox-sad.svg`), and a
 * mood is a runtime property of one pet, not of the catalogue row 23 pets
 * might share.
 *
 * This replaces the `grayscale` filter the Sanctuary and gallery cards used
 * to apply for the same states — the pack now draws the unhappy face itself,
 * which says it better than a desaturated happy one did.
 *
 * Passing an icon-name fallback (an `imageUrl` that isn't a path) returns it
 * unchanged; callers gate on `hasRealArt()` first anyway.
 */
export function moodArtUrl(imageUrl: string, sad: boolean): string {
  if (!sad || !imageUrl.startsWith("/animals/happy/")) return imageUrl;
  return imageUrl.replace("/animals/happy/", "/animals/sad/").replace(/\.svg$/, "-sad.svg");
}

/**
 * The two species whose necks are too narrow for the default collar — the
 * pack ships the collar twice (`collar-wide`, the default, and
 * `collar-small`) for exactly this, and they are one catalogue item ("Red
 * collar"), not two. Which file gets drawn is a property of the animal
 * wearing it, so it's resolved at render time here rather than stored.
 */
const SMALL_COLLAR_SPECIES = new Set(["giraffe", "ostrich"]);

const WIDE_COLLAR = "/accessories/collar-wide.svg";
const SMALL_COLLAR = "/accessories/collar-small.svg";

/**
 * The accessory art to draw on *this* animal. Only the collar varies today;
 * everything else is one file whatever it's worn on.
 */
export function accessoryArtUrl(accessoryUrl: string, animalUrl: string): string {
  if (accessoryUrl !== WIDE_COLLAR) return accessoryUrl;
  return SMALL_COLLAR_SPECIES.has(artKey(animalUrl)) ? SMALL_COLLAR : accessoryUrl;
}

/** A sub-rectangle of `ART_CANVAS`, as fractions of it. */
export type ArtFocus = { x: number; y: number; width: number; height: number };

/**
 * Where the ink is in each file — the rendered alpha bounding box plus a
 * 1.5% margin, keyed by `artKey()`. Regenerate with
 * `npx tsx scripts/measure-art-focus.ts` after any change to the art pack;
 * a key that's missing here just means no crop (the full canvas), so a new
 * file degrades to "looks small in thumbnails", never to a broken image.
 *
 * Sad cuts deliberately have no entries: nothing crops on a pet surface, and
 * thumbnails only ever show the happy cut.
 */
export const ART_FOCUS: Record<string, ArtFocus> = {
  // /animals/happy
  axlotl: { x: 0.045, y: 0.328, width: 0.91, height: 0.43 },
  bunny: { x: 0.193, y: 0.181, width: 0.613, height: 0.576 },
  cappybara: { x: 0.175, y: 0.239, width: 0.65, height: 0.523 },
  donkey: { x: 0.203, y: 0.131, width: 0.595, height: 0.626 },
  elephant: { x: 0.008, y: 0.317, width: 0.984, height: 0.534 },
  flamingo: { x: 0.189, y: 0.289, width: 0.623, height: 0.609 },
  fox: { x: 0.087, y: 0.203, width: 0.826, height: 0.559 },
  giraffe: { x: 0.216, y: 0.196, width: 0.567, height: 0.784 },
  hedgehog: { x: 0.105, y: 0.181, width: 0.789, height: 0.58 },
  hyrax: { x: 0.156, y: 0.299, width: 0.687, height: 0.459 },
  jaguar: { x: 0.179, y: 0.264, width: 0.641, height: 0.498 },
  koala: { x: 0.091, y: 0.256, width: 0.817, height: 0.505 },
  lion: { x: 0.027, y: 0.135, width: 0.956, height: 0.73 },
  monkey: { x: 0.17, y: 0.235, width: 0.66, height: 0.523 },
  ostrich: { x: 0.193, y: 0.321, width: 0.613, height: 0.562 },
  otter: { x: 0.124, y: 0.299, width: 0.752, height: 0.459 },
  panda: { x: 0.138, y: 0.26, width: 0.724, height: 0.501 },
  penguin: { x: 0.138, y: 0.26, width: 0.724, height: 0.509 },
  platypus: { x: 0.152, y: 0.281, width: 0.697, height: 0.523 },
  rhino: { x: 0.166, y: 0.242, width: 0.669, height: 0.576 },
  tiger: { x: 0.179, y: 0.26, width: 0.641, height: 0.498 },
  tortoise: { x: 0.17, y: 0.306, width: 0.66, height: 0.451 },
  zebra: { x: 0.203, y: 0.21, width: 0.595, height: 0.548 },

  // /accessories
  bawler: { x: 0.226, y: 0.142, width: 0.549, height: 0.269 },
  "collar-small": { x: 0.388, y: 0.753, width: 0.224, height: 0.166 },
  "collar-wide": { x: 0.286, y: 0.696, width: 0.428, height: 0.176 },
  cowboy: { x: 0.166, y: 0.114, width: 0.669, height: 0.351 },
  crown: { x: 0.263, y: 0.049, width: 0.498, height: 0.348 },
  fedora: { x: 0.216, y: 0.167, width: 0.567, height: 0.262 },
  "flower-crown": { x: 0.142, y: 0.239, width: 0.715, height: 0.23 },
  "glasses-aviators": { x: 0.193, y: 0.46, width: 0.613, height: 0.198 },
  "glasses-reading": { x: 0.096, y: 0.406, width: 0.808, height: 0.173 },
  "glasses-running": { x: 0.184, y: 0.435, width: 0.632, height: 0.212 },
  jester: { x: 0.124, y: 0, width: 0.752, height: 0.365 },
  mandarin: { x: 0.406, y: 0.199, width: 0.187, height: 0.101 },
  moustache: { x: 0.323, y: 0.567, width: 0.354, height: 0.273 },
  pirate: { x: 0.082, y: 0.11, width: 0.836, height: 0.351 },
  "tie-blue": { x: 0.416, y: 0.724, width: 0.169, height: 0.276 },
  "tie-bow": { x: 0.355, y: 0.678, width: 0.289, height: 0.148 },
  "tie-gingham": { x: 0.416, y: 0.724, width: 0.169, height: 0.276 },
  "tie-hearts": { x: 0.416, y: 0.724, width: 0.169, height: 0.276 },
  "tie-red": { x: 0.416, y: 0.721, width: 0.169, height: 0.279 },
  "tie-stars": { x: 0.416, y: 0.724, width: 0.169, height: 0.276 },
  "top-hat": { x: 0.212, y: 0.017, width: 0.576, height: 0.448 },
};

/** The crop for one art path, or `undefined` for "draw the whole canvas". */
export function artFocusFor(imageUrl: string): ArtFocus | undefined {
  return ART_FOCUS[artKey(imageUrl)];
}

/**
 * The drop shadow under the art, at three sizes (2026-08-23, at the user's
 * request — one behind the animal, one behind whatever it's wearing).
 *
 * `filter: drop-shadow` rather than `box-shadow`: these are cut-out SVGs on a
 * transparent canvas, so the shadow has to follow the silhouette, not the
 * (mostly empty) box around it. It's also why the accessory's own shadow
 * lands *on the animal* — which is the point, it's what makes a hat read as
 * sitting on a head rather than being printed onto one.
 *
 * Three fixed sizes rather than one, because a drop shadow's blur and offset
 * are absolute lengths: the 12px lift that reads correctly under a 300px
 * Sanctuary animal is a smudge under a 38px purchase-history thumbnail.
 * Callers pick by how big they're drawing, not by which screen they are.
 *
 * The accessory's shadow is tighter and slightly darker than the animal's at
 * every size — it sits a few millimetres off the fur, not off the ground.
 *
 * Ink (`rgba(46,42,38,…)`) is the same warm near-black `ZooGalleryCard`'s
 * original card shadow already used, not a neutral grey.
 */
export const ANIMAL_SHADOW = {
  stage: "drop-shadow-[0_12px_16px_rgba(46,42,38,0.22)]",
  card: "drop-shadow-[0_7px_10px_rgba(46,42,38,0.20)]",
  thumb: "drop-shadow-[0_3px_5px_rgba(46,42,38,0.18)]",
} as const;

export const ACCESSORY_SHADOW = {
  stage: "drop-shadow-[0_5px_7px_rgba(46,42,38,0.30)]",
  card: "drop-shadow-[0_3px_4px_rgba(46,42,38,0.28)]",
  thumb: "drop-shadow-[0_2px_3px_rgba(46,42,38,0.25)]",
} as const;

export type ArtShadowSize = keyof typeof ANIMAL_SHADOW;
