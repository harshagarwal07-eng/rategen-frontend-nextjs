"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import GeoPickerModal, {
  GeoSelection,
} from "@/components/shared/geo-picker-modal";
import { fetchEntity } from "@/data-access/geo-picker-api";
import { addTourImage, deleteTourImage } from "@/data-access/tours-api";
import {
  TourCountryOption,
  TourCurrencyOption,
  TourDetail,
  TourImageRow,
  TourStatus,
} from "@/types/tours";
import { useMemo } from "react";

const GeneralInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Tour name is required"),
  country_id: z.string().optional(),
  geo_id: z.string().optional(),
  currency_id: z.string().optional(),
  website: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  is_preferred: z.boolean().optional(),
  status: z.enum(["draft", "active", "inactive", "published", "archived"]),
});

export type TourGeneralInfoValues = z.infer<typeof GeneralInfoSchema>;

const STATUS_OPTIONS: { value: TourStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

interface TourGeneralInfoFormProps {
  initialData?: Partial<TourDetail> | null;
  countries: TourCountryOption[];
  currencies: TourCurrencyOption[];
  onNext: (data: TourGeneralInfoValues) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onContextChange?: (name: string, countryName: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function TourGeneralInfoForm({
  initialData,
  countries,
  currencies,
  onNext,
  setIsLoading,
  formRef,
  onContextChange,
  onDirtyChange,
}: TourGeneralInfoFormProps) {
  const form = useForm<TourGeneralInfoValues>({
    resolver: zodResolver(GeneralInfoSchema),
    mode: "onBlur",
    defaultValues: {
      id: initialData?.id || undefined,
      name: initialData?.name || "",
      country_id: initialData?.country_id || "",
      geo_id: initialData?.geo_id || "",
      currency_id: initialData?.currency_id || "",
      website: initialData?.website || "",
      latitude:
        typeof initialData?.latitude === "number"
          ? initialData.latitude
          : undefined,
      longitude:
        typeof initialData?.longitude === "number"
          ? initialData.longitude
          : undefined,
      description: initialData?.description ?? "",
      is_preferred: Boolean(initialData?.is_preferred),
      status: ((initialData?.status as TourStatus) ?? "draft"),
    },
  });

  const watchName = form.watch("name");
  const watchCountryId = form.watch("country_id");
  const watchGeoId = form.watch("geo_id");

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.id, label: c.country_name })),
    [countries],
  );
  const currencyOptions = useMemo(
    () =>
      currencies.map((c) => ({
        value: c.id,
        label: `${c.symbol ? `${c.symbol} ` : ""}${c.code} — ${c.name}`,
      })),
    [currencies],
  );

  const { isDirty } = form.formState;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (lastReportedDirty.current !== isDirty) {
      lastReportedDirty.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onContextChangeRef = useRef(onContextChange);
  onContextChangeRef.current = onContextChange;
  const lastReportedContext = useRef<{ name: string; countryName: string } | null>(null);

  const countryName =
    countries.find((c) => c.id === watchCountryId)?.country_name || "";

  useEffect(() => {
    const name = watchName || "";
    if (
      lastReportedContext.current?.name === name &&
      lastReportedContext.current?.countryName === countryName
    ) {
      return;
    }
    lastReportedContext.current = { name, countryName };
    onContextChangeRef.current?.(name, countryName);
  }, [watchName, countryName]);

  // When country changes, clear the geo_id so it gets re-picked under the
  // new country context.
  const lastCountryRef = useRef<string | undefined>(initialData?.country_id ?? "");
  useEffect(() => {
    if (lastCountryRef.current === undefined) {
      lastCountryRef.current = watchCountryId;
      return;
    }
    if (watchCountryId !== lastCountryRef.current) {
      lastCountryRef.current = watchCountryId;
      if (form.getValues("geo_id")) {
        form.setValue("geo_id", "", { shouldDirty: true });
      }
    }
  }, [watchCountryId, form]);

  useEffect(() => {
    if (initialData?.id) {
      form.reset({
        id: initialData.id,
        name: initialData.name || "",
        country_id: initialData.country_id || "",
        geo_id: initialData.geo_id || "",
        currency_id: initialData.currency_id || "",
        website: initialData.website || "",
        latitude:
          typeof initialData.latitude === "number"
            ? initialData.latitude
            : undefined,
        longitude:
          typeof initialData.longitude === "number"
            ? initialData.longitude
            : undefined,
        description: initialData.description ?? "",
        is_preferred: Boolean(initialData.is_preferred),
        status: (initialData.status as TourStatus) ?? "draft",
      });
      lastCountryRef.current = initialData.country_id ?? "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, initialData?.description, initialData?.geo_id]);

  const onSubmit = (data: TourGeneralInfoValues) => {
    setIsLoading?.(true);
    onNext({ ...data, id: initialData?.id });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">General Information</h2>
        <p className="text-muted-foreground">
          Enter the basic details about this tour
        </p>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Bali Temples Tour" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Autocomplete
                    options={countryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search country..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="geo_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <CityPicker
                    value={field.value || ""}
                    countryId={watchCountryId || ""}
                    onChange={(id) =>
                      form.setValue("geo_id", id, { shouldDirty: true })
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Autocomplete
                    options={currencyOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search currency..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_preferred"
              render={({ field }) => (
                <FormItem className="flex items-end gap-3 pb-2">
                  <div className="flex flex-col gap-1">
                    <FormLabel>Preferred</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Highlight this tour with a star.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={
                        typeof field.value === "number" && !Number.isNaN(field.value)
                          ? field.value
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? undefined : parseFloat(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={
                        typeof field.value === "number" && !Number.isNaN(field.value)
                          ? field.value
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? undefined : parseFloat(e.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={5} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      {initialData?.id && (
        <ImagesSection
          tourId={initialData.id}
          initialImages={
            (initialData.tour_images as TourImageRow[] | undefined) ?? []
          }
        />
      )}
      {watchGeoId && watchCountryId === "" && null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// City picker — single-select wrapper around GeoPickerModal
// ─────────────────────────────────────────────────────────────────────────

function CityPicker({
  value,
  countryId,
  onChange,
}: {
  value: string;
  countryId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setLabel("");
      return;
    }
    fetchEntity(value).then((r) => {
      if (cancelled || !r.data) return;
      setLabel(r.data.name);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const initialSelections: GeoSelection[] = value
    ? [{ kind: "geo", id: value, label, country_id: countryId || undefined }]
    : [];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!countryId}
        title={!countryId ? "Select a country first" : undefined}
        className={cn(
          "h-9 w-full justify-start font-normal",
          !value && "text-muted-foreground",
        )}
      >
        <MapPin className="h-4 w-4 mr-2 shrink-0" />
        {value ? (label || "Loading…") : countryId ? "Select a city…" : "Pick country first"}
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setLabel("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
                setLabel("");
              }
            }}
            className="ml-auto rounded p-0.5 hover:bg-muted"
            aria-label="Clear city"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </Button>
      <GeoPickerModal
        open={open}
        onOpenChange={setOpen}
        countryId={countryId || null}
        fieldLabel="City"
        initialSelections={initialSelections}
        onApply={(next) => {
          // Single-select: keep the most recently picked city.
          const cities = next.filter((s) => s.kind === "geo");
          const last = cities[cities.length - 1];
          if (last) {
            onChange(last.id);
            setLabel(last.label ?? "");
          } else {
            onChange("");
            setLabel("");
          }
        }}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Images section
// ─────────────────────────────────────────────────────────────────────────

function ImagesSection({
  tourId,
  initialImages,
}: {
  tourId: string;
  initialImages: TourImageRow[];
}) {
  const [images, setImages] = useState<TourImageRow[]>(initialImages);
  const [newUrl, setNewUrl] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const url = newUrl.trim();
    if (!url) return;
    setAdding(true);
    const res = await addTourImage(tourId, { url });
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to add image");
      setAdding(false);
      return;
    }
    setImages((prev) => [...prev, res.data!]);
    setNewUrl("");
    setShowInput(false);
    setAdding(false);
    toast.success("Image added");
  }

  async function handleDelete(imageId: string) {
    const res = await deleteTourImage(imageId);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setImages((prev) => prev.filter((i) => i.id !== imageId));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Images
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowInput(true)}
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
                handleAdd();
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
            onClick={handleAdd}
            disabled={!newUrl.trim() || adding}
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
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
        <p className="text-sm text-muted-foreground">No images added yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <div className="h-24 w-24 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <ImageIcon className="h-6 w-6 text-muted-foreground/40 absolute" />
              </div>
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
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
  );
}
