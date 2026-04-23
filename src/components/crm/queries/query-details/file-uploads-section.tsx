"use client";

import { useQuery } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getQueryFileAttachments } from "@/data-access/crm-queries";
import { FileAttachment } from "@/types/common";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

type Props = {
  queryId: string;
};

function FileSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-7 w-full rounded-md" />
      <Skeleton className="h-7 w-4/5 rounded-md" />
    </div>
  );
}

function renderFileList(files: FileAttachment[]) {
  if (files.length === 0) {
    return <p className="text-xs text-muted-foreground text-center">No files uploaded yet</p>;
  }

  return (
    <div className="space-y-1">
      {files.map((file, i) => (
        <a
          key={`${file.url}-${i}`}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-accent transition-colors"
        >
          <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
          <p className="text-xs font-medium truncate leading-tight">{file.name}</p>
        </a>
      ))}
    </div>
  );
}

export default function FileUploadsSection({ queryId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["query-file-attachments", queryId],
    queryFn: () => getQueryFileAttachments(queryId),
    enabled: !!queryId,
    staleTime: 0,
  });

  const agentFiles = data?.agentFiles ?? [];
  const dmcFiles = data?.dmcFiles ?? [];

  return (
    <div className="space-y-3 divide-y">
      {/* Agent File Uploads */}
      <Accordion type="single" collapsible>
        <AccordionItem value="agent-files" className="border-0">
          <AccordionTrigger className="hover:no-underline py-0 pb-2 cursor-pointer bg-transparent text-xs font-semibold">
            Agent File Uploads
          </AccordionTrigger>
          <AccordionContent className="text-foreground font-normal ">
            {isLoading ? <FileSkeleton /> : renderFileList(agentFiles)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* DMC File Uploads */}
      <Accordion type="single" collapsible>
        <AccordionItem value="dmc-files" className="border-0">
          <AccordionTrigger className="hover:no-underline py-0 pb-2 cursor-pointer bg-transparent text-xs font-semibold">
            DMC File Uploads
          </AccordionTrigger>
          <AccordionContent className="text-foreground font-normal">
            {isLoading ? <FileSkeleton /> : renderFileList(dmcFiles)}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
