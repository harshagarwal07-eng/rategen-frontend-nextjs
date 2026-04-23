"use client";

import { BorderedCard } from "@/components/ui/bordered-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { openS3File } from "@/lib/s3-upload";
import { DocumentFile, DocumentCategory } from "@/types/questionnaire";
import {
  FileText,
  FileImage,
  FileType,
  ExternalLink,
  Edit,
} from "lucide-react";
import Show from "@/components/ui/show";

interface DocumentsViewProps {
  documents: DocumentFile[];
  guests: Array<{ id: string; name: string }>;
  onEdit: () => void;
}

const DOCUMENT_CATEGORIES = [
  { value: "passport", label: "Passport Copy", perPerson: true },
  { value: "visa", label: "Visa Copy", perPerson: true },
  { value: "flight_ticket", label: "Flight Ticket", perPerson: false },
  { value: "insurance", label: "Travel Insurance", perPerson: true },
  { value: "wedding_cert", label: "Wedding Certificate", perPerson: false },
  { value: "medical_cert", label: "Medical Certificate", perPerson: true },
  { value: "other", label: "Other Document", perPerson: false },
];

const getFileIcon = (type: string) => {
  if (type.startsWith("image/"))
    return <FileImage className="h-6 w-6 text-info" />;
  if (type === "application/pdf")
    return <FileType className="h-6 w-6 text-destructive" />;
  return <FileText className="h-6 w-6 text-muted-foreground" />;
};

const getCategoryLabel = (category?: DocumentCategory) => {
  const cat = DOCUMENT_CATEGORIES.find((c) => c.value === category);
  return cat?.label || "Other Document";
};

interface DocumentCardProps {
  document: DocumentFile;
}

const DocumentCard = ({ document }: DocumentCardProps) => {
  const handleOpen = async () => {
    try {
      await openS3File(document.url);
    } catch (error) {
      console.error("Failed to open document:", error);
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-background">
      <div className="flex items-center gap-3">
        {getFileIcon(document.type)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{document.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {document.type.split("/")[1]?.toUpperCase()}
            {" | "}
            {getCategoryLabel(document.category)}
          </p>
          <Show when={!!document.notes}>
            <p className="text-xs text-muted-foreground mt-1 leading-tight">
              {document.notes}
            </p>
          </Show>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={handleOpen}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export function DocumentsView({
  documents,
  guests,
  onEdit,
}: DocumentsViewProps) {
  // Group documents by passenger
  const documentsByPerson = new Map<string, DocumentFile[]>();
  const generalDocuments: DocumentFile[] = [];

  documents.forEach((doc) => {
    if (doc.passenger_id) {
      const existing = documentsByPerson.get(doc.passenger_id) || [];
      documentsByPerson.set(doc.passenger_id, [...existing, doc]);
    } else {
      generalDocuments.push(doc);
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-background flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            Uploaded travel documents
          </p>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
          <Edit className="h-3.5 w-3.5" />
          Edit Documents
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="space-y-6 py-5 px-4">
          {/* No documents state */}
          <Show when={documents.length === 0}>
            <BorderedCard
              title="No Documents Uploaded"
              variant="dashed"
              collapsible
              defaultOpen
            >
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No documents have been uploaded yet</p>
              </div>
            </BorderedCard>
          </Show>

          {/* Documents grouped by person */}
          <Show when={documentsByPerson.size > 0}>
            {Array.from(documentsByPerson.entries()).map(
              ([passengerId, docs]) => {
                const guest = guests.find((g) => g.id === passengerId);
                const guestName = guest?.name || "Unknown Guest";

                return (
                  <BorderedCard
                    key={passengerId}
                    title={guestName}
                    variant="dashed"
                    collapsible
                    defaultOpen
                  >
                    <div className="space-y-3 mt-4">
                      {docs.map((doc, index) => (
                        <DocumentCard key={index} document={doc} />
                      ))}
                    </div>
                  </BorderedCard>
                );
              }
            )}
          </Show>

          {/* General documents (not assigned to anyone) */}
          <Show when={generalDocuments.length > 0}>
            <BorderedCard
              title="General Documents"
              variant="dashed"
              collapsible
              defaultOpen
            >
              <div className="space-y-3 mt-4">
                {generalDocuments.map((doc, index) => (
                  <DocumentCard key={index} document={doc} />
                ))}
              </div>
            </BorderedCard>
          </Show>
        </div>
      </ScrollArea>
    </div>
  );
}
