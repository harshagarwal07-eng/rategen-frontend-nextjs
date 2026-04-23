import { EyeIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import S3Image from "@/components/ui/s3-image";
import { useState } from "react";
import { Button } from "../button";

type Props = { images: string[]; docType: string };

export function ImagesCell({ images, docType }: Props) {
  const [open, setOpen] = useState(false);
  if (!images.length) return "-";

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <EyeIcon />
      </Button>
      <Modal
        title={`${docType} Images`}
        description="Browse all images."
        isOpen={open}
        onClose={() => setOpen(false)}
        className="sm:max-w-4xl"
      >
        <Carousel className="w-full max-w-3xl mx-auto">
          <CarouselContent>
            {images.map((url, idx) => (
              <CarouselItem key={url + idx}>
                <div className="flex items-center justify-center aspect-square w-full h-[60vh] relative">
                  <S3Image url={url} index={idx} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </Modal>
    </>
  );
}
