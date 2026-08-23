import Image from "next/image";

import { cn } from "@/lib/cn";
import {
  accessoryArtUrl,
  ACCESSORY_SHADOW,
  ANIMAL_SHADOW,
  artWidthFor,
  type ArtShadowSize,
  moodArtUrl,
} from "@/lib/pet-art";

/**
 * A pet as it's drawn on every *pet* surface — the Sanctuary stage
 * (`AnimalCard`), the gallery card (`ZooGalleryCard`) and the customize
 * screen's stage — with whatever it's wearing painted on top and a drop
 * shadow under each layer.
 *
 * The layering is the entire reason this is one component instead of three
 * copies. Animal and accessory are drawn on the same 1080×1400 canvas
 * (`src/lib/pet-art.ts`), so "put the hat on the koala" is nothing more than
 * two images stacked in one box at the same size — no per-species anchor, no
 * scaling. What that *does* demand is that both layers get the identical box:
 * crop or letterbox them differently by even a few pixels and the hat slides
 * off the head. So neither layer ever uses `ART_FOCUS`'s thumbnail crop (only
 * `ItemWell` does, where there's no second layer to stay aligned with), and
 * `fill` mode gives both the same `object-contain` treatment in the same
 * parent.
 *
 * Server-safe: no state, no handlers, so `ZooGalleryCard` stays a server
 * component.
 */
export function PetArt({
  animalUrl,
  accessoryUrl,
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
  /** The equipped accessory's art path, if any. Resolved through `accessoryArtUrl()` so the collar picks its narrow cut on a giraffe or ostrich. */
  accessoryUrl?: string;
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
  const accessorySrc = accessoryUrl ? accessoryArtUrl(accessoryUrl, animalUrl) : undefined;
  const box = fill || height === undefined ? undefined : { width: artWidthFor(height), height };

  return (
    <div
      className={cn("relative", fill ? "size-full" : "flex-none", className)}
      style={box}
    >
      {fill ? (
        <>
          <Image src={animalSrc} alt={alt} fill sizes={sizes} className={cn("object-contain", ANIMAL_SHADOW[shadow])} />
          {accessorySrc ? (
            <Image src={accessorySrc} alt="" fill sizes={sizes} aria-hidden className={cn("object-contain", ACCESSORY_SHADOW[shadow])} />
          ) : null}
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
          {accessorySrc ? (
            <Image
              src={accessorySrc}
              alt=""
              width={box!.width}
              height={box!.height}
              aria-hidden
              className={cn("absolute inset-0 block", ACCESSORY_SHADOW[shadow])}
              style={box}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
