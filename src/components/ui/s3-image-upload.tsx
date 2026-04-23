"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { uploadToS3, S3UploadResponse, removeFromS3 } from "@/lib/s3-upload";
import S3Image from "@/components/ui/s3-image";
import { toast } from "sonner";

interface S3ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  userId: string;
  disabled?: boolean;
  maxImages?: number;
  prefix?: string;
}

export function S3ImageUpload({ images, onChange, userId, disabled = false, maxImages, prefix }: S3ImageUploadProps) {
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !userId) return;

    setUploadingImages(true);
    const files = Array.from(e.target.files);

    // Check max images limit
    if (maxImages && images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      setUploadingImages(false);
      return;
    }

    try {
      const uploadPromises = files.map(async (file) => {
        const result: S3UploadResponse = await uploadToS3({
          file,
          userId,
          prefix,
        });

        if (result.error) throw new Error(result.error);
        return result.url!;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onChange([...images, ...uploadedUrls]);
      toast.success("Images uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload images");
      console.error("Upload error:", error);
    } finally {
      setUploadingImages(false);
      // Reset the input
      e.target.value = "";
    }
  };

  const removeImage = async (index: number) => {
    const imageUrl = images[index];

    try {
      // Delete from S3
      await removeFromS3(imageUrl);

      // Remove from local state
      const updatedImages = images.filter((_, i) => i !== index);
      onChange(updatedImages);

      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Error deleting image from S3:", error);
      toast.error("Failed to delete image from storage");
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <label htmlFor="image-upload">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploadingImages || (maxImages ? images.length >= maxImages : false)}
            onClick={() => document.getElementById("image-upload")?.click()}
          >
            {uploadingImages ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4 mr-2" />
                Add Images
              </>
            )}
          </Button>
        </label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
          disabled={disabled || uploadingImages}
        />
        {maxImages && (
          <p className="text-xs text-muted-foreground mt-1">
            {images.length} / {maxImages} images
          </p>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="flex items-center flex-wrap gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden"
              style={{ width: "200px", height: "200px" }}
            >
              <S3Image url={imageUrl} index={index} />
              <div className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => removeImage(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-foreground/70 text-background text-xs p-1 text-center">
                Image {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !disabled && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <ImagePlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
          <p className="text-xs">Click &ldquo;Add Images&rdquo; to upload</p>
        </div>
      )}
    </div>
  );
}
