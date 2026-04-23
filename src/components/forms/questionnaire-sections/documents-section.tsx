"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BorderedCard } from "@/components/ui/bordered-card";
import { uploadToS3, removeFromS3 } from "@/lib/s3-upload";
import {
  getQuestionnaire,
  updateQuestionnaireField,
  fetchQueryGuests,
} from "@/data-access/questionnaire";
import { DocumentsFormSchema } from "../schemas/questionnaire-schema";
import { DocumentFile, DocumentCategory } from "@/types/questionnaire";
import { toast } from "sonner";
import { DocumentsView } from "./documents-view";
import {
  FileText,
  FileImage,
  FileType,
  Trash2,
  Loader2,
  Upload,
  Download,
  Plus,
} from "lucide-react";
import { z } from "zod";
import Show from "@/components/ui/show";
import { Badge } from "@/components/ui/badge";

interface DocumentsSectionProps {
  queryId: string;
}

const DOCUMENT_CATEGORIES = [
  { value: "passport", label: "Passport Copy", perPerson: true },
  { value: "pan_card", label: "PAN Card Copy", perPerson: true },
  { value: "visa", label: "Visa Copy", perPerson: true },
  { value: "flight_ticket", label: "Flight Ticket", perPerson: false },
  { value: "insurance", label: "Travel Insurance", perPerson: true },
  { value: "wedding_cert", label: "Wedding Certificate", perPerson: false },
  { value: "medical_cert", label: "Medical Certificate", perPerson: true },
  { value: "other", label: "Other Document", perPerson: false },
];

interface NewDocumentForm {
  category: DocumentCategory | "";
  notes: string;
  passengerId?: string;
  file?: File;
}

export function DocumentsSection({ queryId }: DocumentsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [guests, setGuests] = useState<Array<{ id: string; name: string }>>([]);
  const [newDoc, setNewDoc] = useState<NewDocumentForm>({
    category: "",
    notes: "",
    passengerId: undefined,
    file: undefined,
  });

  const form = useForm<z.infer<typeof DocumentsFormSchema>>({
    resolver: zodResolver(DocumentsFormSchema),
    defaultValues: {
      documents: [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const result = await getQuestionnaire(queryId);

      const { leadGuest, passengers } = await fetchQueryGuests(queryId);
      const allGuests = [leadGuest, ...passengers].filter(Boolean) as { first_name: string; last_name: string }[];
      setGuests(
        allGuests.map((guest, index) => ({
          id: `guest-${index}`,
          name: `${guest.first_name} ${guest.last_name}${index === 0 ? " (Lead)" : ""}`,
        }))
      );

      if (result.data) {
        const documents = result.data.documents || [];
        form.reset({ documents });

        if (documents.length > 0) {
          setHasData(true);
          setIsEditMode(false);
        } else {
          setIsEditMode(true);
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [queryId, form]);

  const resetNewDocForm = () => {
    setNewDoc({
      category: "",
      notes: "",
      passengerId: undefined,
      file: undefined,
    });
    setShowAddForm(false);
  };

  const handleAddDocument = async () => {
    if (!newDoc.category || !newDoc.file) {
      toast.error("Please select document type and file");
      return;
    }

    const selectedCategory = DOCUMENT_CATEGORIES.find(
      (c) => c.value === newDoc.category
    );
    if (selectedCategory?.perPerson && !newDoc.passengerId) {
      toast.error("Please select a person for this document type");
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadToS3({
        file: newDoc.file,
        userId: queryId,
        prefix: `documents/${queryId}`,
      });

      if (result.error) throw new Error(result.error);

      const uploadedDoc: DocumentFile = {
        url: result.url!,
        name: newDoc.file.name,
        type: newDoc.file.type,
        category: newDoc.category as DocumentCategory,
        passenger_id: newDoc.passengerId,
        notes: newDoc.notes || undefined,
      };

      const currentDocs = form.getValues("documents") || [];
      form.setValue("documents", [...currentDocs, uploadedDoc]);

      toast.success("Document uploaded successfully");
      resetNewDocForm();
    } catch (error) {
      toast.error("Failed to upload document");
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (index: number) => {
    const documents = form.getValues("documents");
    const doc = documents[index];

    try {
      await removeFromS3(doc.url);
      const updatedDocs = documents.filter((_, i) => i !== index);
      form.setValue("documents", updatedDocs);
      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <FileImage className="h-8 w-8" />;
    if (type === "application/pdf")
      return <FileType className="h-8 w-8 text-destructive" />;
    return <FileText className="h-8 w-8" />;
  };

  const onSubmit = async (data: z.infer<typeof DocumentsFormSchema>) => {
    setIsSaving(true);

    const result = await updateQuestionnaireField(
      queryId,
      "documents",
      data.documents as DocumentFile[]
    );

    if (result.error) {
      toast.error("Failed to save documents", {
        description: result.error,
      });
    } else {
      toast.success("Documents saved successfully");
      setHasData(true);
      setIsEditMode(false);
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show view mode if data exists and not in edit mode
  if (hasData && !isEditMode) {
    const documents = form.getValues("documents") as DocumentFile[];

    return (
      <DocumentsView
        documents={documents}
        guests={guests}
        onEdit={() => setIsEditMode(true)}
      />
    );
  }

  const selectedCategory = DOCUMENT_CATEGORIES.find(
    (c) => c.value === newDoc.category
  );
  const showPersonField = selectedCategory?.perPerson && newDoc.category;

  const documents = form.watch("documents");
  const hasDocuments = documents.length > 0;

  return (
    <div className="flex flex-col h-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="flex-1 h-0">
            <div className="space-y-6 py-5 px-4">
              <BorderedCard
                title="Documents"
                variant="dashed"
                collapsible
                defaultOpen
              >
                <div className="space-y-5 mt-4">
                  {/* Add Document Form */}
                  <Show when={showAddForm}>
                    <BorderedCard title="New Document">
                      <div className="text-sm text-muted-foreground mb-4">
                        Upload travel documents such as passports, visas, flight
                        tickets, etc. Supported formats: Images (JPG, PNG), PDF,
                        DOC, DOCX. Maximum file size: 15MB.
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-4 items-start">
                          {/* Document Type */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Document Type *
                            </label>
                            <Select
                              value={newDoc.category}
                              onValueChange={(value) =>
                                setNewDoc({
                                  ...newDoc,
                                  category: value as DocumentCategory,
                                  passengerId: undefined,
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Related To (Conditional) */}
                          <Show when={!!showPersonField}>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Related To *
                              </label>
                              <Select
                                value={newDoc.passengerId}
                                onValueChange={(value) =>
                                  setNewDoc({ ...newDoc, passengerId: value })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select person" />
                                </SelectTrigger>
                                <SelectContent>
                                  {guests.length === 0 ? (
                                    <SelectItem value="no-guests" disabled>
                                      No guests added yet
                                    </SelectItem>
                                  ) : (
                                    guests.map((guest) => (
                                      <SelectItem
                                        key={guest.id}
                                        value={guest.id}
                                      >
                                        {guest.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </Show>

                          {/* File Upload */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Choose File *
                            </label>
                            <div className="flex gap-2">
                              <Input
                                id="doc-upload"
                                type="file"
                                accept="image/*,application/pdf,.doc,.docx"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    setNewDoc({
                                      ...newDoc,
                                      file: e.target.files[0],
                                    });
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 border-2 h-10"
                                onClick={() =>
                                  document.getElementById("doc-upload")?.click()
                                }
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {newDoc.file ? "Change File" : "Choose File"}
                              </Button>
                            </div>
                            <Show when={!!newDoc.file}>
                              <p className="text-xs text-muted-foreground truncate">
                                {newDoc.file?.name}
                              </p>
                            </Show>
                          </div>

                          {/* Notes */}
                          <div className="space-y-2 lg:col-span-3">
                            <label className="text-sm font-medium">
                              Notes (Optional)
                            </label>
                            <Textarea
                              placeholder="Add any additional notes..."
                              value={newDoc.notes}
                              onChange={(e) =>
                                setNewDoc({ ...newDoc, notes: e.target.value })
                              }
                              rows={3}
                              className="resize-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={resetNewDocForm}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleAddDocument}
                            disabled={
                              isUploading || !newDoc.category || !newDoc.file
                            }
                          >
                            <Show when={isUploading}>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            </Show>
                            {isUploading ? "Uploading..." : "Add Document"}
                          </Button>
                        </div>
                      </div>
                    </BorderedCard>
                  </Show>

                  {/* Empty State & Add Button */}
                  <Show when={!showAddForm}>
                    <Show when={!hasDocuments}>
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No documents uploaded yet</p>
                        <p className="text-sm mt-1">
                          Click the button below to add documents
                        </p>
                      </div>
                    </Show>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(true)}
                      className="w-full border-dashed border-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add {hasDocuments ? "Another" : ""} Document
                    </Button>
                  </Show>

                  {/* Uploaded Documents List */}
                  <Show when={hasDocuments}>
                    <div className="space-y-3">
                      {documents.map((doc, index) => {
                        const category = DOCUMENT_CATEGORIES.find(
                          (c) => c.value === doc.category
                        );
                        const relatedGuest = guests.find(
                          (g) => g.id === doc.passenger_id
                        );

                        return (
                          <div
                            key={index}
                            className="border rounded-lg p-4 bg-background"
                          >
                            <div className="flex items-center gap-3">
                              {getFileIcon(doc.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium truncate">
                                    {doc.name}
                                  </p>
                                  <Show when={!!relatedGuest}>
                                    <Badge variant={"outline"}>
                                      {relatedGuest?.name}
                                    </Badge>
                                  </Show>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {doc.type.split("/")[1]?.toUpperCase()}
                                  {category?.label
                                    ? ` | ${category?.label}`
                                    : "Other"}
                                </p>
                                <Show when={!!doc.notes}>
                                  <p className="text-sm leading-tight text-muted-foreground">
                                    {doc.notes}
                                  </p>
                                </Show>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => window.open(doc.url, "_blank")}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDocument(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Show>
                </div>
              </BorderedCard>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-4 pt-2 px-4 border-t flex-shrink-0">
            <Show when={isEditMode}>
              <Button
                type="button"
                disabled={isSaving}
                size="lg"
                variant={"outline"}
                onClick={() => setIsEditMode(false)}
              >
                Cancel
              </Button>
            </Show>
            <Button type="submit" disabled={isSaving} size="lg">
              <Show when={isSaving}>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              </Show>
              Save Details
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
