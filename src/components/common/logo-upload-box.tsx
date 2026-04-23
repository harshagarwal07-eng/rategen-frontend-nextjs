"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Show from "../ui/show";

interface LogoUploadBoxProps {
  title: string;
  description: string;
  preview?: string;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  recommendedSize: string;
  aspectRatio?: "landscape" | "square";
  required?: boolean;
  maxSizeMB?: number;
}

export function LogoUploadBox({
  title,
  description,
  preview,
  onFileSelect,
  onRemove,
  recommendedSize,
  aspectRatio = "landscape",
  required = false,
  maxSizeMB = 4,
}: LogoUploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const validateImage = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        resolve(false);
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Image size must be less than ${maxSizeMB}MB`);
        resolve(false);
        return;
      }

      // Validate dimensions
      const img = new Image();
      img.onload = () => {
        setError("");

        // For landscape (full logo), recommend 240x80 but allow some flexibility
        if (aspectRatio === "landscape") {
          const ratio = img.width / img.height;
          if (ratio < 2 || ratio > 4) {
            setError(
              `Recommended aspect ratio is 3:1 (e.g., ${recommendedSize}). Your image is ${img.width}x${img.height}.`
            );
          }
          if (img.height < 60 || img.height > 120) {
            setError(
              `Recommended height is 60-120px. Your image is ${img.height}px tall.`
            );
          }
        }

        // For square (icon), enforce square ratio
        if (aspectRatio === "square") {
          const ratio = img.width / img.height;
          if (ratio < 0.9 || ratio > 1.1) {
            setError(
              `Icon should be square. Your image is ${img.width}x${img.height}.`
            );
            resolve(false);
            return;
          }
          if (img.width < 64 || img.width > 512) {
            setError(
              `Recommended size is 64-512px square. Your image is ${img.width}x${img.height}.`
            );
          }
        }

        resolve(true);
      };
      img.onerror = () => {
        setError("Failed to load image");
        resolve(false);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFile = async (file: File) => {
    const isValid = await validateImage(file);
    if (isValid) {
      onFileSelect(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only process the drop if this component was actually in dragging state
    const wasActive = isDragging || dragCounterRef.current > 0;

    // Reset counter and dragging state
    dragCounterRef.current = 0;
    setIsDragging(false);

    // Only process files if this component was the active drop target
    if (wasActive) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", aspectRatio === "landscape" && "w-fit")}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium">
            {title} {required && <span className="text-destructive">★</span>}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <Show when={aspectRatio === "square"}>
            <p className="text-xs text-muted-foreground">
              Recommended: {recommendedSize}
            </p>
          </Show>
        </div>
        <Show when={aspectRatio === "landscape"}>
          <p className="text-xs text-muted-foreground">
            Recommended: {recommendedSize}
          </p>
        </Show>
      </div>

      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg overflow-hidden transition-all",
          aspectRatio === "square"
            ? "aspect-square w-full max-w-[280px]"
            : "aspect-[3/1] min-h-[180px]", // Temporary: added min-height for better proportions
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          preview ? "bg-muted/30" : "bg-muted/10"
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative w-full h-full group">
            {/* Preview - split view for icon/square, white only for logo/landscape */}
            {aspectRatio === "square" ? (
              // Split view for icon to check transparency
              <div className={cn("absolute inset-0", "grid grid-rows-2")}>
                <div className="bg-white flex items-center justify-center p-4 relative">
                  <div className="absolute top-2 left-2 px-2 py-1 bg-neutral-900 text-white text-xs font-medium rounded">
                    Light Mode
                  </div>
                  <img
                    src={preview}
                    alt={title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="bg-neutral-800 flex items-center justify-center p-4 relative">
                  <div className="absolute top-2 left-2 px-2 py-1 bg-white text-neutral-900 text-xs font-medium rounded">
                    Dark Mode
                  </div>
                  <img
                    src={preview}
                    alt={title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              // White background only for logo
              <div className="absolute inset-0 bg-white flex items-center justify-center p-4">
                <img
                  src={preview}
                  alt={title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                  setError("");
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer"
            onClick={handleClick}
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-center mb-1">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-muted-foreground text-center">
              PNG, JPG, SVG (max {maxSizeMB}MB)
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Transparent background recommended
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-warning p-2 rounded">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
