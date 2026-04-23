"use client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { FileAttachment } from "@/types/common";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function CarouselImages({ images }: { images: FileAttachment[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!api) {
      return;
    }

    // Initialize state from API
    const updateState = () => {
      setCount(api.scrollSnapList().length);
      setCurrent(api.selectedScrollSnap());
    };

    // Set initial state
    updateState();

    // Listen for changes
    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);

    // Cleanup
    return () => {
      api.off("select", handleSelect);
    };
  }, [api]);

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

  const scrollTo = (index: number) => {
    api?.scrollTo(index);
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Carousel */}
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {images.map(({ url, name }, index) => (
            <CarouselItem key={url + index}>
              <Card className="border-none shadow-none bg-transparent">
                <CardContent className="flex relative aspect-video items-center justify-center max-h-[70vh] w-full p-0">
                  {!loadedImages.has(index) && (
                    <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
                  )}
                  <Image
                    src={url}
                    alt={name || `Image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className={cn(
                      "object-contain transition-opacity duration-300",
                      loadedImages.has(index) ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => handleImageLoad(index)}
                    priority={index === 0}
                  />

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white text-sm font-medium pointer-events-none">
                    {current + 1} / {count}
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 size-12 bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-sm" />
        <CarouselNext className="right-4 size-12 bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-sm" />
      </Carousel>

      {images.length > 1 && (
        <div className="flex gap-2 justify-center overflow-x-auto py-2 max-w-full">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              onClick={() => scrollTo(index)}
              className={cn(
                "relative h-16 w-24 shrink-0 rounded-lg overflow-hidden transition-all cursor-pointer",
                current === index
                  ? " ring-2 ring-destructive"
                  : "border-2 border-transparent hover:border-destructive/50"
              )}
            >
              <Image
                src={image.url}
                alt={image.name || `Thumbnail ${index + 1}`}
                fill
                sizes="100px"
                className="object-cover"
              />
              {current !== index && (
                <div className="absolute inset-0 bg-black/30 hover:bg-black/20 transition-colors" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Image name */}
      {images[current]?.name && (
        <p className="text-center text-sm text-muted-foreground font-medium">
          {images[current].name}
        </p>
      )}
    </div>
  );
}
type Props = {
  images: FileAttachment[];
  children: React.ReactNode;
  triggerClssName?: string;
};
export default function ImageCarouselDialog({
  images,
  children,
  triggerClssName,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={triggerClssName}>{children}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-6xl max-h-[95vh] overflow-hidden p-6 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Image Gallery</DialogTitle>
          <DialogDescription>
            Browse through images. Use arrow keys or click thumbnails to
            navigate.
          </DialogDescription>
        </DialogHeader>
        <CarouselImages images={images} />
      </DialogContent>
    </Dialog>
  );
}
