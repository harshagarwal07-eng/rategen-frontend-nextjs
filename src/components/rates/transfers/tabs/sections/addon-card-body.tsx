"use client";

// Expanded body for an AddonCard. All section state (age policy bands,
// per-band rates, package links, images) is hoisted into the parent so
// the parent's save() handle can flush in one shot. Image add/delete
// self-persists.

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImageIcon, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  TransferAddonImage,
  TransferAddonAgePolicyBand,
  TransferPackageDetail,
} from "@/types/transfers";
import {
  addTransferAddonImage,
  deleteTransferAddonImage,
} from "@/data-access/transfers-api";

import AddonAgePolicySection, {
  AddonAgeBandRow,
} from "./addon-age-policy-section";
import AddonRatesSection, { AddonRateMap } from "./addon-rates-section";
import AddonPackageLinksSection, {
  AddonLinkMap,
} from "./addon-package-links-section";

import { AddonFormValues } from "./addon-card";

interface AddonCardBodyProps {
  addonId: string;
  isPending: boolean;
  form: UseFormReturn<AddonFormValues>;
  packages: TransferPackageDetail[];

  ageBandRows: AddonAgeBandRow[];
  setAgeBandRows: (next: AddonAgeBandRow[]) => void;
  /** Sorted bands derived from ageBandRows — passed in so the per-band
   *  rates table reacts immediately to age-policy edits without a save. */
  sortedBands: TransferAddonAgePolicyBand[];

  rateMap: AddonRateMap;
  setRateMap: (next: AddonRateMap) => void;

  linkMap: AddonLinkMap;
  setLinkMap: (next: AddonLinkMap) => void;

  images: TransferAddonImage[];
  setImages: (next: TransferAddonImage[]) => void;
}

export default function AddonCardBody({
  addonId,
  isPending,
  form,
  packages,
  ageBandRows,
  setAgeBandRows,
  sortedBands,
  rateMap,
  setRateMap,
  linkMap,
  setLinkMap,
  images,
  setImages,
}: AddonCardBodyProps) {
  const [newUrl, setNewUrl] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [addingImage, setAddingImage] = useState(false);

  async function handleAddImage() {
    const url = newUrl.trim();
    if (!url) return;
    if (isPending) {
      toast.info("Save the add-on first before adding images.");
      return;
    }
    setAddingImage(true);
    const res = await addTransferAddonImage(addonId, { url });
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to add image");
      setAddingImage(false);
      return;
    }
    setImages([...images, res.data]);
    setNewUrl("");
    setShowInput(false);
    setAddingImage(false);
    toast.success("Image added");
  }

  async function handleDeleteImage(imageId: string) {
    const res = await deleteTransferAddonImage(imageId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setImages(images.filter((i) => i.id !== imageId));
  }

  return (
    <div className="border-t px-4 py-4 flex flex-col gap-5">
      <Form {...form}>
        {/* Section A — Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Add-on Name *</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Section B — Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Section C — Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Internal notes / voucher text"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>

      {/* Section D — Images (self-persisting) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Images
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowInput(true)}
            disabled={isPending}
            title={
              isPending
                ? "Save the add-on first to attach images"
                : undefined
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Image
          </Button>
        </div>

        {showInput && (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Image URL..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddImage();
                }
                if (e.key === "Escape") {
                  setShowInput(false);
                  setNewUrl("");
                }
              }}
              className="max-w-md"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAddImage}
              disabled={!newUrl.trim() || addingImage}
            >
              {addingImage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowInput(false);
                setNewUrl("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {images.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No images added yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                <div className="h-24 w-24 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.caption ?? ""}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40 absolute" />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section E — Age Policy */}
      <AddonAgePolicySection rows={ageBandRows} onChange={setAgeBandRows} />

      {/* Per Pax — band-driven rates */}
      <AddonRatesSection
        bands={sortedBands}
        values={rateMap}
        onChange={setRateMap}
      />

      {/* Total Rate — single rate + max capacity, bottom of rates area. */}
      <Form {...form}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Total Rate
          </p>
          <div className="flex flex-wrap gap-3">
            <FormField
              control={form.control}
              name="total_rate"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-0.5 space-y-0">
                  <FormLabel className="text-[10px] font-medium text-muted-foreground">
                    Rate
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0"
                      className="h-7 w-32 text-xs"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_participants"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-0.5 space-y-0">
                  <FormLabel className="text-[10px] font-medium text-muted-foreground">
                    Max Capacity
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value, 10),
                        )
                      }
                      placeholder="—"
                      className="h-7 w-32 text-xs"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>

      {/* Package Links */}
      <AddonPackageLinksSection
        packages={packages}
        value={linkMap}
        onChange={setLinkMap}
      />
    </div>
  );
}
