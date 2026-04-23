"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Mail, FileDown } from "lucide-react";
import { toast } from "sonner";
import type { TravelAgentMessage } from "@/types/chat";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useQuery } from "@tanstack/react-query";
import Show from "@/components/ui/show";
import { env } from "@/lib/env";

const BACKEND_URL = env.API_URL;

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: TravelAgentMessage;
}

interface FormattedContent {
  whatsapp: string;
  email: string;
  pdf: string;
}

export default function ShareDialog({ open, onOpenChange, message }: ShareDialogProps) {
  // Fetch formatted content using React Query
  const { data, isLoading, error } = useQuery<{
    formatted_content: FormattedContent;
  }>({
    queryKey: ["formatted-message", message.id],
    queryFn: async () => {
      const response = await fetch(`${BACKEND_URL}/api/travel-agent/format-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to format message");
      }

      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
    staleTime: Infinity, // Never refetch once loaded
    retry: 1,
  });

  const formattedContent = data?.formatted_content;

  const handleCopyWhatsApp = async () => {
    if (!formattedContent) return;
    try {
      await navigator.clipboard.writeText(formattedContent.whatsapp);
      toast.success("Copied for WhatsApp");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy");
    }
  };

  const handleCopyEmail = async () => {
    if (!formattedContent) return;
    try {
      const htmlContent = formattedContent.email;
      const htmlBlob = new Blob([htmlContent], { type: "text/html" });
      const textBlob = new Blob([htmlContent], { type: "text/plain" });

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
      toast.success("Copied for Email");
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback to simple text copy
      await navigator.clipboard.writeText(formattedContent.email);
      toast.success("Copied for Email");
    }
  };

  const handleDownloadPDF = async () => {
    if (!formattedContent) return;

    // Use the email HTML content - it already has proper tables and formatting
    let htmlContent = formattedContent.email;

    // Strip out modern CSS color functions that html2canvas doesn't support
    htmlContent = htmlContent
      .replace(/lab\([^)]+\)/gi, "#333333")
      .replace(/lch\([^)]+\)/gi, "#333333")
      .replace(/oklch\([^)]+\)/gi, "#333333")
      .replace(/oklab\([^)]+\)/gi, "#333333")
      .replace(/color\([^)]+\)/gi, "#333333");

    // Create an iframe to isolate from page styles (avoids inheriting lab() colors from Tailwind)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "800px";
    iframe.style.height = "3000px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error("Failed to generate PDF");
      document.body.removeChild(iframe);
      return;
    }

    // Write clean HTML with only basic CSS - completely isolated from page styles
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #333333;
            background: #ffffff;
            padding: 5px;
            line-height: 1.4;
          }
          table { border-collapse: collapse; width: 100%; margin: 8px 0; }
          th, td { padding: 6px 8px; text-align: left; border: 1px solid #dddddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          h1 { font-size: 16px; color: #222222; margin: 14px 0 8px 0; }
          h2 { font-size: 14px; color: #222222; margin: 12px 0 6px 0; }
          h3 { font-size: 13px; color: #222222; margin: 10px 0 5px 0; }
          h4 { font-size: 12px; color: #333333; margin: 8px 0 4px 0; }
          p { margin: 5px 0; }
          ul, ol { margin: 5px 0; padding-left: 20px; }
          li { margin: 2px 0; }
          strong, b { font-weight: bold; }
          em, i { font-style: italic; }
          hr { border: none; border-top: 1px solid #dddddd; margin: 10px 0; }
          /* Remove any outer borders from container divs */
          body > div { border: none !important; box-shadow: none !important; }
        </style>
      </head>
      <body>${htmlContent}</body>
      </html>
    `);
    iframeDoc.close();

    // Wait for iframe to render
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      // Render iframe body to canvas
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Create PDF from canvas
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      // Calculate image dimensions
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      // Handle multi-page if content is too long
      let heightLeft = imgHeight;
      let position = margin;

      // First page
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      // Add more pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`travel-quote-${Date.now()}.pdf`);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      document.body.removeChild(iframe);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Message</DialogTitle>
          <DialogDescription>Choose how you&apos;d like to share this message</DialogDescription>
        </DialogHeader>

        <Show when={isLoading}>
          <p className="text-xs text-muted-foreground font-semibold inline-flex items-center">
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            Generating... This may take a few moments. Please don&apos;t close this window.
          </p>
        </Show>

        {error ? (
          <div className="text-center text-destructive py-8">Failed to format content. Please try again.</div>
        ) : (
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={handleCopyWhatsApp}
              disabled={isLoading || !formattedContent}
              variant="outline"
              className="w-full justify-start h-auto py-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <MessageSquare className="w-5 h-5 mr-3" />
              )}
              <div className="flex flex-col items-start">
                <span className="font-medium">Copy for WhatsApp</span>
                <span className="text-xs text-muted-foreground">Plain text format</span>
              </div>
            </Button>

            <Button
              onClick={handleCopyEmail}
              disabled={isLoading || !formattedContent}
              variant="outline"
              className="w-full justify-start h-auto py-4"
            >
              {isLoading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <Mail className="w-5 h-5 mr-3" />}
              <div className="flex flex-col items-start">
                <span className="font-medium">Copy for Email</span>
                <span className="text-xs text-muted-foreground">HTML format with styling</span>
              </div>
            </Button>

            <Button
              onClick={handleDownloadPDF}
              disabled={isLoading || !formattedContent}
              variant="outline"
              className="w-full justify-start h-auto py-4"
            >
              {isLoading ? <Loader2 className="w-5 h-5 mr-3 animate-spin" /> : <FileDown className="w-5 h-5 mr-3" />}
              <div className="flex flex-col items-start">
                <span className="font-medium">Download PDF</span>
                <span className="text-xs text-muted-foreground">Professional document with tables</span>
              </div>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
