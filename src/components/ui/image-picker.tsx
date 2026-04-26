"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ImagePlus, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { uploadToS3 } from "@/lib/s3-upload";
import useUser from "@/hooks/use-user";

type AspectRatio = "16/9" | "4/3" | "1/1";
type Size = "sm" | "md" | "lg";

export interface ImagePickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspectRatio?: AspectRatio;
  size?: Size;
  /** Used to scope S3 uploads. e.g. picker inside an FD form passes the package id. */
  packageId?: string | null;
}

const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "max-w-[140px]",
  md: "max-w-[200px]",
  lg: "max-w-[280px]",
};

export function ImagePicker({
  value,
  onChange,
  label,
  aspectRatio = "16/9",
  size = "md",
  packageId,
}: ImagePickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {label && <Label className="text-xs">{label}</Label>}
      <div className={cn("flex flex-col gap-2", SIZE_CLASS[size])}>
        {value ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="View full image"
          >
            <PreviewFrame aspectRatio={aspectRatio}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt={label ?? "Image"}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </PreviewFrame>
          </button>
        ) : (
          <PreviewFrame aspectRatio={aspectRatio} dashed>
            <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground gap-1">
              <ImagePlus className="h-6 w-6" />
              <div className="text-xs">No image</div>
            </div>
          </PreviewFrame>
        )}
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
            {value ? "Change" : "Add Image"}
          </Button>
          {value && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="text-xs text-muted-foreground hover:text-destructive underline-offset-2 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <PickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        currentValue={value}
        packageId={packageId}
        onPick={(url) => {
          onChange(url);
          setPickerOpen(false);
        }}
      />

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0 z-[60] bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">{label ?? "Image preview"}</DialogTitle>
          {value && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={value}
              alt={label ?? "Image preview"}
              className="max-h-[80vh] w-full object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove image?</AlertDialogTitle>
            <AlertDialogDescription>
              The image reference will be cleared. The original file (if uploaded) is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onChange(null);
                setConfirmRemove(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PreviewFrameProps {
  children: React.ReactNode;
  aspectRatio: AspectRatio;
  dashed?: boolean;
}

function PreviewFrame({ children, aspectRatio, dashed }: PreviewFrameProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-md bg-muted",
        ASPECT_CLASS[aspectRatio],
        dashed ? "border-2 border-dashed" : "border",
      )}
    >
      {children}
    </div>
  );
}

// ── Picker Dialog ────────────────────────────────────────────────────

interface NormalizedPhoto {
  id: string;
  thumb: string;
  full: string;
  photographer: string;
  source: "pexels" | "unsplash";
}

interface PickerDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentValue: string | null;
  packageId?: string | null;
  onPick: (url: string) => void;
}

type SourceTab = "pexels" | "unsplash" | "url" | "upload";

function PickerDialog({ open, onOpenChange, packageId, onPick }: PickerDialogProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>("pexels");
  // Selection lives at the dialog level so the footer "Use Image" button can act
  // on any source tab. We clear it on tab switch so what's "selected" always
  // matches what's visible.
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveTab("pexels");
      setSelectedUrl(null);
    }
  }, [open]);

  const handleTabChange = (next: string) => {
    setSelectedUrl(null);
    setActiveTab(next as SourceTab);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // High z-index so this nests cleanly above the FD fullscreen Dialog.
        className="max-w-3xl p-0 gap-0 z-[60]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Choose an image</DialogTitle>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-semibold">Choose an image</div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="px-4 pt-3 gap-3">
          <TabsList className="h-9">
            <TabsTrigger value="pexels">Pexels</TabsTrigger>
            <TabsTrigger value="unsplash">Unsplash</TabsTrigger>
            <TabsTrigger value="url">Paste URL</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <div className="min-h-[420px] max-h-[60vh] overflow-y-auto pb-3">
            <TabsContent value="pexels">
              <ProviderGrid
                source="pexels"
                selectedUrl={selectedUrl}
                onSelect={setSelectedUrl}
              />
            </TabsContent>
            <TabsContent value="unsplash">
              <ProviderGrid
                source="unsplash"
                selectedUrl={selectedUrl}
                onSelect={setSelectedUrl}
              />
            </TabsContent>
            <TabsContent value="url">
              <UrlPasteTab
                onSelect={setSelectedUrl}
                selectedUrl={selectedUrl}
              />
            </TabsContent>
            <TabsContent value="upload">
              <UploadTab
                packageId={packageId}
                onSelect={setSelectedUrl}
                selectedUrl={selectedUrl}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {selectedUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={selectedUrl}
                alt="Selected"
                className="h-10 w-16 object-cover rounded border"
              />
            )}
            <Button
              type="button"
              disabled={!selectedUrl}
              onClick={() => selectedUrl && onPick(selectedUrl)}
            >
              Use Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Provider Grid (Pexels / Unsplash) ────────────────────────────────

interface ProviderGridProps {
  source: "pexels" | "unsplash";
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
}

function ProviderGrid({ source, selectedUrl, onSelect }: ProviderGridProps) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<NormalizedPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Snapshot of the search term we last issued. New searches reset paging;
  // pagination preserves it.
  const issuedQueryRef = useRef("");

  const apiKey =
    source === "pexels"
      ? process.env.NEXT_PUBLIC_PEXELS_API_KEY
      : process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;

  const fetchPage = useCallback(
    async (q: string, pageNum: number, append: boolean) => {
      if (!apiKey) {
        setError(
          `${source === "pexels" ? "Pexels" : "Unsplash"} API key not configured. Add NEXT_PUBLIC_${
            source === "pexels" ? "PEXELS_API_KEY" : "UNSPLASH_ACCESS_KEY"
          } to your .env.`,
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const trimmed = q.trim();
        let res: Response;
        if (source === "pexels") {
          const url = trimmed
            ? `https://api.pexels.com/v1/search?query=${encodeURIComponent(trimmed)}&per_page=15&page=${pageNum}`
            : `https://api.pexels.com/v1/curated?per_page=15&page=${pageNum}`;
          res = await fetch(url, { headers: { Authorization: apiKey } });
        } else {
          const url = trimmed
            ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(trimmed)}&per_page=15&page=${pageNum}&client_id=${apiKey}`
            : `https://api.unsplash.com/photos?per_page=15&page=${pageNum}&client_id=${apiKey}`;
          res = await fetch(url);
        }
        if (!res.ok) throw new Error(`${source} returned ${res.status}`);
        const data = await res.json();
        const normalized = normalize(source, data);
        setPhotos((prev) => (append ? [...prev, ...normalized] : normalized));
        setHasMore(normalized.length === 15);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load images");
        if (!append) setPhotos([]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, source],
  );

  // Debounced search. Empty query → curated/popular feed.
  useEffect(() => {
    const t = setTimeout(() => {
      issuedQueryRef.current = query;
      setPage(1);
      void fetchPage(query, 1, false);
    }, 400);
    return () => clearTimeout(t);
  }, [query, fetchPage]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void fetchPage(issuedQueryRef.current, next, true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8"
          placeholder={`Search ${source === "pexels" ? "Pexels" : "Unsplash"}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {loading && photos.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </div>
      ) : photos.length === 0 && !error ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground italic">
          {query.trim() ? `No results for "${query}".` : "No images available."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => {
              const selected = selectedUrl === p.full;
              return (
                <button
                  key={`${p.source}-${p.id}`}
                  type="button"
                  onClick={() => onSelect(p.full)}
                  className={cn(
                    "group relative aspect-video overflow-hidden rounded-md border bg-muted focus:outline-none focus:ring-2 focus:ring-ring",
                    selected && "ring-2 ring-primary",
                  )}
                  title={p.photographer}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumb}
                    alt={p.photographer}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                    {p.photographer}
                  </div>
                </button>
              );
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-1">
              <Button type="button" variant="outline" size="sm" onClick={loadMore} disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Normalize provider responses into a single shape so the grid doesn't care
// which API answered.
function normalize(source: "pexels" | "unsplash", data: unknown): NormalizedPhoto[] {
  if (source === "pexels") {
    const d = data as {
      photos?: Array<{
        id: number;
        photographer: string;
        src: { medium: string; large: string };
      }>;
    };
    return (d.photos ?? []).map((p) => ({
      id: String(p.id),
      thumb: p.src.medium,
      full: p.src.large,
      photographer: p.photographer,
      source: "pexels",
    }));
  }
  // Unsplash search returns { results: [...] }, popular feed returns [...] directly.
  const arr =
    Array.isArray(data)
      ? (data as Array<{ id: string; user: { name: string }; urls: { small: string; regular: string } }>)
      : ((data as { results?: Array<{ id: string; user: { name: string }; urls: { small: string; regular: string } }> }).results ?? []);
  return arr.map((p) => ({
    id: p.id,
    thumb: p.urls.small,
    full: p.urls.regular,
    photographer: p.user?.name ?? "Unsplash",
    source: "unsplash",
  }));
}

// ── Paste URL Tab ────────────────────────────────────────────────────

interface UrlPasteTabProps {
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
}

function UrlPasteTab({ selectedUrl, onSelect }: UrlPasteTabProps) {
  const [input, setInput] = useState("");
  // "previewed" is the URL that loaded successfully — what we'd hand back.
  // Distinct from `input` so we don't auto-promote bad URLs to selected.
  const [previewed, setPreviewed] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  const tryLoad = () => {
    const url = input.trim();
    if (!url) return;
    setStatus("loading");
    setPreviewed(null);
    const img = new window.Image();
    img.onload = () => {
      setPreviewed(url);
      setStatus("ok");
      onSelect(url);
    };
    img.onerror = () => {
      setStatus("fail");
    };
    img.src = url;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-1.5">
          <Label className="text-xs">Image URL</Label>
          <Input
            placeholder="https://example.com/image.jpg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tryLoad();
              }
            }}
          />
        </div>
        <Button type="button" onClick={tryLoad} disabled={!input.trim() || status === "loading"}>
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load preview"}
        </Button>
      </div>

      {status === "loading" && (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading preview...
        </div>
      )}

      {status === "fail" && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Could not load image. Make sure the URL is publicly accessible and points to an image file.
        </div>
      )}

      {status === "ok" && previewed && (
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewed} alt="Preview" className="max-h-80 w-full object-contain" />
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedUrl === previewed
              ? "Selected. Click \"Use Image\" below to confirm."
              : "Loaded — click \"Use Image\" to confirm."}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Upload Tab ───────────────────────────────────────────────────────

interface UploadTabProps {
  packageId?: string | null;
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
}

function UploadTab({ packageId, selectedUrl, onSelect }: UploadTabProps) {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!user?.id) {
      setError("You must be signed in to upload images.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const prefix = packageId ? `fd/${packageId}/` : "fd/";
      const result = await uploadToS3({ file, userId: user.id, prefix });
      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result.url) {
        setUploadedUrl(result.url);
        onSelect(result.url);
        toast.success("Uploaded");
      }
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          "flex h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted bg-muted/30 hover:bg-muted/50",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <div className="text-sm text-muted-foreground">Uploading...</div>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm font-medium">Drag image here, or click to browse</div>
            <div className="text-xs text-muted-foreground">PNG, JPG, WebP up to 15MB</div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {uploadedUrl && (
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploadedUrl} alt="Uploaded" className="max-h-80 w-full object-contain" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selectedUrl === uploadedUrl
                ? "Selected. Click \"Use Image\" below to confirm."
                : "Uploaded — click \"Use Image\" to confirm."}
            </span>
            <button
              type="button"
              onClick={() => {
                setUploadedUrl(null);
                if (selectedUrl === uploadedUrl) onSelect(null);
              }}
              className="inline-flex items-center gap-1 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
