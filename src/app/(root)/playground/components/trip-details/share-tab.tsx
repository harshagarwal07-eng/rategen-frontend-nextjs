"use client";

import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, Mail, FileDown, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Show from "@/components/ui/show";
import { useState, useEffect } from "react";
import { env } from "@/lib/env";

const BACKEND_URL = env.API_URL;

interface ShareTabProps {
  messageId?: string;
}

interface FormattedContent {
  whatsapp: string;
  email: string;
  pdf: string;
}

export default function ShareTab({ messageId }: ShareTabProps) {
  const [copiedType, setCopiedType] = useState<"whatsapp" | "email" | null>(null);
  const [shouldRegenerate, setShouldRegenerate] = useState(false);

  // Validate messageId is a proper UUID-like string
  const isValidMessageId = messageId && messageId.length > 10 && messageId !== "undefined";

  // Fetch formatted content using React Query
  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    formatted_content: FormattedContent;
    cached: boolean;
  }>({
    queryKey: ["formatted-message", messageId, shouldRegenerate],
    queryFn: async () => {
      console.log("[ShareTab] Fetching formatted content for messageId:", messageId, "regenerate:", shouldRegenerate);
      const response = await fetch(`${BACKEND_URL}/api/travel-agent/format-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, regenerate: shouldRegenerate }),
      });

      // Reset regenerate flag after request
      if (shouldRegenerate) {
        setShouldRegenerate(false);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[ShareTab] API error:", errorData);
        throw new Error(errorData.error || "Failed to format message");
      }

      return response.json();
    },
    enabled: isValidMessageId,
    staleTime: Infinity, // Never refetch once loaded
    retry: 1,
  });

  const formattedContent = data?.formatted_content;

  const handleCopyWhatsApp = async () => {
    if (!formattedContent) return;
    try {
      await navigator.clipboard.writeText(formattedContent.whatsapp);
      setCopiedType("whatsapp");
      toast.success("Copied for WhatsApp");
      setTimeout(() => setCopiedType(null), 2000);
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
      setCopiedType("email");
      toast.success("Copied for Email");
      setTimeout(() => setCopiedType(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback to simple text copy
      await navigator.clipboard.writeText(formattedContent.email);
      setCopiedType("email");
      toast.success("Copied for Email");
      setTimeout(() => setCopiedType(null), 2000);
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

    // Create an iframe to isolate from page styles
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

    // Write clean HTML with only basic CSS
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            color: #020817;
            background: #ffffff;
            padding: 5px;
            line-height: 1.4;
          }
          table { border-collapse: collapse; width: 100%; margin: 8px 0; }
          th, td { padding: 6px 8px; text-align: left; border: 1px solid #dddddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          h1 { font-size: 16px; color: #020817; margin: 14px 0 8px 0; }
          h2 { font-size: 14px; color: #020817; margin: 12px 0 6px 0; }
          h3 { font-size: 13px; color: #020817; margin: 10px 0 5px 0; }
          h4 { font-size: 12px; color: #020817; margin: 8px 0 4px 0; }
          p { margin: 5px 0; }
          ul, ol { margin: 5px 0; padding-left: 20px; }
          li { margin: 2px 0; }
          strong, b { font-weight: bold; }
          em, i { font-style: italic; }
          hr { border: none; border-top: 1px solid #dddddd; margin: 10px 0; }
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

  const handleRegenerate = () => {
    // Set regenerate flag - useEffect will trigger refetch
    setShouldRegenerate(true);
    toast.info("Regenerating formats...");
  };

  // Trigger refetch when shouldRegenerate changes to true
  useEffect(() => {
    if (shouldRegenerate) {
      refetch();
    }
  }, [shouldRegenerate, refetch]);

  if (!isValidMessageId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-muted-foreground text-sm">No message to share</p>
        <p className="text-muted-foreground text-xs mt-1">Send a message to generate share options</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-destructive text-sm">Failed to format content</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          <RefreshCw className="size-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      <Show when={isLoading || isFetching}>
        <div className="flex items-center gap-2 py-4 px-3 bg-muted/50 rounded-lg">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            {isFetching && !isLoading ? "Regenerating formats..." : "Generating formats... This may take a moment."}
          </p>
        </div>
      </Show>
      <Button
        onClick={handleCopyWhatsApp}
        disabled={isLoading || isFetching || !formattedContent}
        variant="outline"
        className="w-full justify-start h-auto py-3"
      >
        {copiedType === "whatsapp" ? (
          <Check className="size-5 mr-3 text-primary" />
        ) : (
          <MessageSquare className="size-5 mr-3" />
        )}
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm">Copy for WhatsApp</span>
          <span className="text-xs text-muted-foreground">Plain text format</span>
        </div>
      </Button>
      <Button
        onClick={handleCopyEmail}
        disabled={isLoading || isFetching || !formattedContent}
        variant="outline"
        className="w-full justify-start h-auto py-3"
      >
        {copiedType === "email" ? <Check className="size-5 mr-3 text-primary" /> : <Mail className="size-5 mr-3" />}
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm">Copy for Email</span>
          <span className="text-xs text-muted-foreground">HTML format with styling</span>
        </div>
      </Button>
      <Button
        onClick={handleDownloadPDF}
        disabled={isLoading || isFetching || !formattedContent}
        variant="outline"
        className="w-full justify-start h-auto py-3"
      >
        <FileDown className="size-5 mr-3" />
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm">Download PDF</span>
          <span className="text-xs text-muted-foreground">Professional document with tables</span>
        </div>
      </Button>
      {formattedContent && !isFetching && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={handleRegenerate}
        >
          <RefreshCw className="size-3.5 mr-2" />
          Regenerate formats
        </Button>
      )}
    </div>
  );
}
