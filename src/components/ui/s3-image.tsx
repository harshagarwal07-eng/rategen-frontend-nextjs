import { getSignedUrl } from "@/lib/s3-upload";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Show from "./show";
import { Skeleton } from "./skeleton";

type Props = {
  url: string;
  alt?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  fallback?: React.ReactNode;
  /** @deprecated Use alt instead */
  index?: number;
};

export default function S3Image({
  url,
  alt,
  fill = true,
  width,
  height,
  className = "object-cover w-full h-full",
  sizes,
  fallback,
  index,
}: Props) {
  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ["s3-image", url],
    queryFn: () => getSignedUrl(url),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const altText = alt || `Image ${(index ?? 0) + 1}`;

  return (
    <>
      <Show when={!isLoading && !!signedUrl}>
        <Image
          src={signedUrl || ""}
          alt={altText}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={className}
          sizes={sizes}
          onError={() => {
            console.error("Failed to load image");
          }}
        />
      </Show>
      <Show when={isLoading}>{fallback || <Skeleton className="w-full h-full" />}</Show>
    </>
  );
}
