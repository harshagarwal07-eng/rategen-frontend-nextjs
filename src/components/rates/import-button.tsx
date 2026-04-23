"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import http from "@/lib/api";
import { createClient } from "@/utils/supabase/client";
import useUser from "@/hooks/use-user";
import { DocumentType } from "@/types/common";
import { RateProgress } from "@/types/rates";
import Show from "@/components/ui/show";
import { useQuery } from "@tanstack/react-query";
import { getRateProgress } from "@/data-access/rates";
import { usePathname } from "next/navigation";
import DatastoreSelector from "./datastore-selector";

interface ImportButtonProps {
  onImportStart?: () => void;
}

export default function ImportButton({ onImportStart }: ImportButtonProps) {
  const supabase = createClient();

  const { user } = useUser();
  const pathname = usePathname();

  const documentType = pathname.split("/")[2] as DocumentType;

  const [rateProgress, setRateProgress] = useState<RateProgress | null>(null);
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("rate_progress")
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "rate_progress",
          event: "*",
          filter: `created_by=eq.${user.id}`,
        },
        (data) => {
          toast.dismiss();
          setRateProgress(data.new as RateProgress);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, setRateProgress]);

  const { isLoading } = useQuery({
    queryKey: ["rate-progress"],
    queryFn: async () => {
      const data = await getRateProgress();

      if (data) setRateProgress(data);
      return data ?? null;
    },
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file extension
    const allowedExtensions = [
      ".xlsx",
      ".xls",
      ".csv",
      ".pdf",
      ".doc",
      ".docx",
      ".md",
    ];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return toast.error("Invalid file type", {
        description: "Please upload a valid Excel, CSV, PDF, or Word document.",
      });
    }

    toast.loading("Uploading file");

    setIsUploading(true);
    setOpen(false);
    onImportStart?.();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);

    const response = await http.upload("rates/process", formData);

    toast.dismiss();
    setIsUploading(false);

    if (response.error)
      return toast.error("Processing failed", {
        description: response.error,
      });

    toast.loading("Processing file", {
      description:
        "Processing uploaded file. This may take a several minutes depending on the size of the file. Extracted data will automatically appear in the table above.",
    });
  };

  const isProcessing = rateProgress?.status === "processing";

  return (
    <>
      <Show when={isProcessing}>
        <div className="fixed bottom-0 left-0 right-0 bg-secondary text-secondary-foreground rounded-t-xl p-4 z-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin" />
              <p>
                Processing uploaded file. This may take a several minutes
                depending on the size of the file. Extracted data will
                automatically appear in the table above.
              </p>
            </div>
          </div>
        </div>
      </Show>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            disabled={isProcessing || isUploading || isLoading}
            loading={isUploading}
            loadingText="Processing..."
            size="sm"
          >
            <Upload /> Import
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import {documentType.replace(/-/g, " ")}</DialogTitle>
            <DialogDescription>
              Upload a CSV, Excel, or PDF file with your rate data.
            </DialogDescription>
          </DialogHeader>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your file here or click to browse
            </p>
            <input
              type="file"
              className="hidden"
              id="rate-file"
              accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.md"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="rate-file"
              className="bg-primary text-primary-foreground hover:bg-primary/80 px-4 py-2 rounded-md text-sm font-medium cursor-pointer inline-block transition-colors"
            >
              Browse Files
            </label>
          </div>

          <p className="text-xs text-muted-foreground text-center">OR</p>

          <DatastoreSelector
            documentType={documentType}
            setImportOpen={setOpen}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
