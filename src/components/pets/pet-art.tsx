import Image from "next/image";

import { cn } from "@/lib/cn";
import {
  accessoryArtUrl,
  ACCESSORY_SHADOW,
  ANIMAL_SHADOW,
  artWidthFor,
  type ArtShadowSize,
  inAccessoryDrawOrder,
  moodArtUrl,
} from "@/lib/pet-art";

/**
 * A pet as it's drawn on every *pet* surface — the Sanctuary stage
 * (`AnimalCard`), the gallery card (`ZooGalleryCard`) and the customize
 * screen's stage — with whatever it's wearing painted on top and a drop
 * shadow under each layer.
 *
 * The layering is the entire reason this is one component instead of three
 * copies. Animal and accessories are drawn on the same 1080×1400 canvas
 * (`src/lib/pet-art.ts`), so "put the hat on the koala" is nothing more than
 * two images stacked in one box at the same size — no per-species anchor, no
 * scaling. What that *does* demand is that both layers get the identical box:
 * crop or letterbox them differently by even a few pixels and the hat slides
 * off the head. So neither layer ever uses `ART_FOCUS`'s thumbnail crop (only
 * `ItemWell` does, where there's no second layer to stay aligned with), and
 * `fill` mode gives both the same `object-contain` treatment in the same
 * parent. Stacked accessories (one per spot) are just more layers in that
 * box, drawn in `inAccessoryDrawOrder()` so a hat brim lands over glasses.
 *
 * Server-safe: no state, no handlers, so `ZooGalleryCard` stays a server
 * component.
 */
export function PetArt({
  animalUrl,
  accessoryUrls = [],
  sad = false,
  height,
  fill = false,
  shadow,
  sizes,
  alt,
  className,
}: {
  /** The species' happy art path (`StoreItem.imageUrl`). Callers gate on `hasRealArt()` first. */
  animalUrl: string;
  /** Every equipped accessory's art path, in draw order. Each is resolved through `accessoryArtUrl()` so the collar picks its narrow cut on a giraffe or ostrich. */
  accessoryUrls?: string[];
  /** Draws the species' sad cut instead — the two below-par moods. */
  sad?: boolean;
  /** Canvas height in px; width follows at `ART_ASPECT`. Ignored under `fill`. */
  height?: number;
  /** Sizes to the parent (which owns the box) and letterboxes inside it, rather than taking a fixed `height`. */
  fill?: boolean;
  shadow: ArtShadowSize;
  /** `next/image`'s `sizes`, for the `fill` case. */
  sizes?: string;
  alt: string;
  className?: string;
}) {
  const animalSrc = moodArtUrl(animalUrl, sad);
  const accessorySrcs = inAccessoryDrawOrder(accessoryUrls).map((url) =>
    accessoryArtUrl(url, animalUrl),
  );
  const box =
    fill || height === undefined
      ? undefined
      : { width: artWidthFor(height), height };

  return (
    <div
      className={cn("relative", fill ? "size-full" : "flex-none", className)}
      style={box}
    >
      {fill ? (
        <>
          <Image
            src={animalSrc}
            alt={alt}
            fill
            sizes={sizes}
            className={cn("object-contain", ANIMAL_SHADOW[shadow])}
          />
          {accessorySrcs.map((src) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              sizes={sizes}
              aria-hidden
              className={cn("object-contain", ACCESSORY_SHADOW[shadow])}
            />
          ))}
        </>
      ) : (
        <>
          <Image
            src={animalSrc}
            alt={alt}
            width={box!.width}
            height={box!.height}
            className={cn("block", ANIMAL_SHADOW[shadow])}
            style={box}
          />
          {accessorySrcs.map((src) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={box!.width}
              height={box!.height}
              aria-hidden
              className={cn("absolute inset-0 block", ACCESSORY_SHADOW[shadow])}
              style={box}
            />
          ))}
        </>
      )}
    </div>
  );
}
