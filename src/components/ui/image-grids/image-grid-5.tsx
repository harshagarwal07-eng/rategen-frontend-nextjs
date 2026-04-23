"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Skeleton } from "../skeleton";
import { FileAttachment } from "@/types/common";
import ImageCarouselDialog from "./image-carousel-dialog";
import { Expand } from "lucide-react";

type ImageGridProps = {
  images: FileAttachment[];
};

export default function ImageGrid5({ images }: ImageGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<number>>(new Set());

  const visibleImages = images.slice(0, 5);
  const extraImagesCount = images.length - visibleImages.length;

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

  const handleImageError = (index: number) => {
    setErrorImages((prev) => new Set(prev).add(index));
  };

  return (
    <div className="h-64 grid grid-cols-5 gap-2 group">
      {/* Main large image */}
      <ImageCarouselDialog
        images={images}
        triggerClssName={visibleImages.length > 1 ? "col-span-3" : "col-span-5"}
      >
        <div className="relative w-full h-full cursor-pointer rounded-l-lg overflow-hidden group/item">
          {!loadedImages.has(0) && !errorImages.has(0) && (
            <Skeleton className="absolute inset-0 w-full h-full" />
          )}
          {errorImages.has(0) ? (
            <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Image unavailable</p>
            </div>
          ) : (
            <Image
              src={visibleImages[0].url}
              alt={visibleImages[0].name}
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className={cn(
                "object-cover transition-all duration-300",
                "group-hover/item:scale-105",
                loadedImages.has(0) ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => handleImageLoad(0)}
              onError={() => handleImageError(0)}
            />
          )}
          {/* Overlay with expand icon */}
          {!errorImages.has(0) && (
            <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-all duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 bg-white/90 p-2 rounded-full">
                <Expand className="size-5 text-black" />
              </div>
            </div>
          )}
        </div>
      </ImageCarouselDialog>

      {/* Grid of smaller images */}
      <div
        className={cn(
          "h-64 col-span-2",
          visibleImages.length > 2 ? "grid grid-cols-2 gap-2" : "",
          visibleImages.length < 2 && "hidden"
        )}
      >
        {visibleImages.slice(1).map((image, index) => {
          const imageIndex = index + 1;
          const isLastImage = index === 3;
          const isTopRight = index === 0;
          const isBottomRight = index === 3;

          return (
            <ImageCarouselDialog key={image.url + index} images={images}>
              <div
                className={cn(
                  "relative w-full h-full cursor-pointer overflow-hidden group/item",
                  isTopRight && "rounded-tr-lg",
                  isBottomRight && "rounded-br-lg"
                )}
              >
                {!loadedImages.has(imageIndex) && !errorImages.has(imageIndex) && (
                  <Skeleton className="absolute inset-0 w-full h-full" />
                )}
                {errorImages.has(imageIndex) ? (
                  <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Unavailable</p>
                  </div>
                ) : (
                  <Image
                    src={image.url}
                    alt={image.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className={cn(
                      "object-cover transition-all duration-300",
                      "group-hover/item:scale-105",
                      loadedImages.has(imageIndex) ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => handleImageLoad(imageIndex)}
                    onError={() => handleImageError(imageIndex)}
                  />
                )}

                {/* Overlay with expand icon */}
                {!errorImages.has(imageIndex) && (
                  <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 bg-white/90 p-2 rounded-full">
                      <Expand className="size-4 text-black" />
                    </div>
                  </div>
                )}

                {/* Extra images count badge */}
                {isLastImage && extraImagesCount > 0 && (
                  <div className="absolute inset-0 bg-black/40 flex items-end justify-end">
                    <div className="py-3 px-5 bg-black/60 backdrop-blur-sm rounded-lg font-semibold text-white text-xl flex items-center gap-x-2 border border-white/20">
                      <span>+{extraImagesCount} more</span>
                    </div>
                  </div>
                )}
              </div>
            </ImageCarouselDialog>
          );
        })}
      </div>
    </div>
  );
}
