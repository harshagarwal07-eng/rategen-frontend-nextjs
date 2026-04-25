"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import isEqual from "lodash/isEqual";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fdGetPackage, fdUpdatePackage } from "@/data-access/fixed-departures";
import type { FDPackageDetail } from "@/types/fixed-departures";
import type { FDTabHandle } from "@/components/forms/fd-fullscreen-form";

interface Props {
  mode: "create" | "edit";
  packageId: string | null;
  onSaved: () => void;
  onAdvance: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface FormValues {
  doc_file_url: string;
  pdf_file_url: string;
  remarks: string;
}

const EMPTY: FormValues = { doc_file_url: "", pdf_file_url: "", remarks: "" };

export const FDDocumentsRemarksTab = forwardRef<FDTabHandle, Props>(function FDDocumentsRemarksTab(
  { mode, packageId, onSaved, onAdvance, onDirtyChange },
  ref,
) {
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const { data: pkg } = useQuery<FDPackageDetail>({
    queryKey: ["fd-package", packageId, "for-docs"],
    queryFn: () => fdGetPackage(packageId as string),
    enabled: !!packageId,
  });

  const form = useForm<FormValues>({ defaultValues: EMPTY });
  const baselineRef = useRef<FormValues>(EMPTY);

  useEffect(() => {
    if (!pkg || hydrated) return;
    const next: FormValues = {
      doc_file_url: (pkg.doc_file_url as string | null) ?? "",
      pdf_file_url: (pkg.pdf_file_url as string | null) ?? "",
      remarks: (pkg.remarks as string | null) ?? "",
    };
    form.reset(next);
    baselineRef.current = next;
    setHydrated(true);
  }, [pkg, hydrated, form]);

  const watched = useWatch({ control: form.control });
  const isDirty = useMemo(
    () => hydrated && !isEqual(watched, baselineRef.current),
    [watched, hydrated],
  );

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
    return () => { onDirtyChangeRef.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitImpl = async (values: FormValues): Promise<boolean> => {
    if (!packageId) {
      toast.error("Save Tab 1 first");
      return false;
    }
    setIsSaving(true);
    try {
      await fdUpdatePackage(packageId, {
        doc_file_url: values.doc_file_url || null,
        pdf_file_url: values.pdf_file_url || null,
        remarks: values.remarks || null,
      });
      toast.success(mode === "create" ? "Documents saved" : "Documents updated");
      baselineRef.current = values;
      form.reset(values);
      onSaved();
      if (mode === "create") onAdvance();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: async () => submitImpl(form.getValues()),
  }));

  if (!packageId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground">
        <div className="text-lg font-medium">Save Tab 1 first</div>
        <div className="text-sm">Enter package details and click Save & Next</div>
      </div>
    );
  }

  if (!pkg) {
    return <div className="text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submitImpl(form.getValues()); }} className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Documents & Remarks</h2>
        <p className="text-muted-foreground">Attach package documents and internal notes</p>
      </div>

      <Accordion type="multiple" defaultValue={["docs", "remarks"]} className="flex flex-col gap-2">
        <AccordionItem value="docs" className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
            Documents
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-url">Doc File URL</Label>
              <Input
                id="doc-url"
                placeholder="https://... (.docx, .doc)"
                {...form.register("doc_file_url")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pdf-url">PDF File URL</Label>
              <Input
                id="pdf-url"
                placeholder="https://... (.pdf)"
                {...form.register("pdf_file_url")}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="remarks" className="rounded-lg border-2 border-muted bg-accent/30 overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/40 transition-colors">
            Remarks
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">Internal remarks — not visible to agents</p>
            <Textarea
              rows={6}
              placeholder="Internal notes, reminders, etc..."
              {...form.register("remarks")}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <button type="submit" className="hidden" disabled={isSaving} aria-hidden="true" tabIndex={-1} />
    </form>
  );
});

FDDocumentsRemarksTab.displayName = "FDDocumentsRemarksTab";
