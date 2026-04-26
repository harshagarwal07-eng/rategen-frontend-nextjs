"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fdParserCreateSession } from "@/data-access/fd-parser";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ACCEPTED_EXTS = [".pdf", ".docx"] as const;

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  tour_code: z.string().trim().min(1, "Tour code is required."),
  duration_nights: z
    .number({ invalid_type_error: "Whole number ≥ 1." })
    .int()
    .min(1, "Whole number ≥ 1."),
  duration_days: z
    .number({ invalid_type_error: "Whole number ≥ 1." })
    .int()
    .min(1, "Whole number ≥ 1."),
  document_instructions: z.string().optional(),
  ai_remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ParserUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Track whether the user has manually edited the days field. Until they
  // do, days auto-syncs to nights + 1.
  const daysOverridden = useRef(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      tour_code: "",
      duration_nights: 7,
      duration_days: 8,
      document_instructions: "",
      ai_remarks: "",
    },
  });

  const nights = watch("duration_nights");

  useEffect(() => {
    if (daysOverridden.current) return;
    if (Number.isFinite(nights) && nights >= 1) {
      setValue("duration_days", nights + 1, { shouldValidate: false });
    }
  }, [nights, setValue]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFileError(validateFile(f));
  }

  function validateFile(f: File | null): string | null {
    if (!f) return "PDF or DOCX is required.";
    if (f.size > MAX_UPLOAD_BYTES) return "File exceeds 20 MB limit.";
    const lower = f.name.toLowerCase();
    const extOk = ACCEPTED_EXTS.some((ext) => lower.endsWith(ext));
    const mimeOk = ACCEPTED_MIMES.has(f.type);
    if (!extOk && !mimeOk) return "Only PDF or DOCX files are accepted.";
    return null;
  }

  async function onSubmit(values: FormValues) {
    const fErr = validateFile(file);
    if (fErr) {
      setFileError(fErr);
      return;
    }
    if (!file) return;
    setSubmitting(true);
    try {
      const { session_id } = await fdParserCreateSession({
        file,
        title: values.title.trim(),
        tour_code: values.tour_code.trim(),
        duration_nights: values.duration_nights,
        duration_days: values.duration_days,
        document_instructions: values.document_instructions?.trim() || undefined,
        ai_remarks: values.ai_remarks?.trim() || undefined,
      });
      router.push(`/rates/fixed-departures/parser/${session_id}`);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? // axios error
            (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : err instanceof Error
            ? err.message
            : "Upload failed";
      toast.error(msg ?? "Upload failed");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm">
          Package Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g. USA Highlights — East Coast 7N/8D"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tour_code" className="text-sm">
          Tour Code <span className="text-destructive">*</span>
        </Label>
        <Input
          id="tour_code"
          placeholder="e.g. USA-EC-0725"
          aria-invalid={!!errors.tour_code}
          {...register("tour_code")}
        />
        {errors.tour_code && (
          <p className="text-xs text-destructive">{errors.tour_code.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration_nights" className="text-sm">
            Nights <span className="text-destructive">*</span>
          </Label>
          <Input
            id="duration_nights"
            type="number"
            min={1}
            step={1}
            aria-invalid={!!errors.duration_nights}
            {...register("duration_nights", { valueAsNumber: true })}
          />
          {errors.duration_nights && (
            <p className="text-xs text-destructive">
              {errors.duration_nights.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_days" className="text-sm">
            Days <span className="text-destructive">*</span>
          </Label>
          <Input
            id="duration_days"
            type="number"
            min={1}
            step={1}
            aria-invalid={!!errors.duration_days}
            {...register("duration_days", {
              valueAsNumber: true,
              onChange: () => {
                daysOverridden.current = true;
              },
            })}
          />
          <p className="text-xs text-muted-foreground">
            Defaulted to nights + 1. Edit if different.
          </p>
          {errors.duration_days && (
            <p className="text-xs text-destructive">
              {errors.duration_days.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="document_instructions" className="text-sm">
          Document Instructions
        </Label>
        <Textarea
          id="document_instructions"
          rows={3}
          placeholder="e.g. Ignore pages 10-14 (generic T&Cs). Prices on p. 6 are per person twin sharing."
          {...register("document_instructions")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai_remarks" className="text-sm">
          AI Remarks
        </Label>
        <Textarea
          id="ai_remarks"
          rows={3}
          placeholder="Internal notes for parser preferences."
          {...register("ai_remarks")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file" className="text-sm">
          PDF or DOCX <span className="text-destructive">*</span>
        </Label>
        <input
          id="file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          aria-invalid={!!fileError}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
        />
        {file && (
          <p className="text-xs text-muted-foreground">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          PDF or DOCX. Max 20 MB.
        </p>
        {fileError && <p className="text-xs text-destructive">{fileError}</p>}
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-1.5">
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {submitting ? "Uploading…" : "Start Parsing"}
      </Button>
    </form>
  );
}
