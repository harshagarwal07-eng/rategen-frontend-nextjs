"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QueryChatView } from "@/components/crm/queries/query-chat-view";
import { toast } from "sonner";
import { IQueryDetails } from "@/types/crm-query";
import QueryFormSheet from "@/components/crm/queries/query-form-sheet";
import DeleteQueryDialog from "@/components/crm/queries/delete-query-dialog";
import { deleteCrmQuery } from "@/data-access/crm-queries";

interface QueryDetailClientProps {
  query: IQueryDetails;
  dmcId?: string;
}

export default function QueryDetailClient({ query, dmcId }: QueryDetailClientProps) {
  const router = useRouter();
  const [currentQuery, setCurrentQuery] = useState<IQueryDetails>(query);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    setCurrentQuery(query);
  }, [query]);

  const handleQueryUpdate = (updatedFields: Partial<IQueryDetails>) => {
    setCurrentQuery((prev) => ({ ...prev, ...updatedFields }));
    router.refresh();
  };

  const handleEditQuery = () => {
    setIsEditSheetOpen(true);
  };

  const handleDeleteQuery = () => {
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const confirmDeleteQuery = async () => {
    if (deleteConfirmText !== "delete") {
      toast.error("Please type 'delete' to confirm");
      return;
    }

    const result = await deleteCrmQuery(currentQuery.id);

    if (result.error) {
      toast.error("Failed to delete query");
      return;
    }

    toast.success("Query deleted successfully");
    setDeleteDialogOpen(false);
    setDeleteConfirmText("");

    // Hard navigate so the shared layout re-fetches and sidebar removes the deleted query
    window.location.replace("/crm/queries/all");
  };

  const handleEditSuccess = () => {
    setIsEditSheetOpen(false);
    router.refresh();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <QueryChatView
        query={currentQuery}
        onQueryUpdate={handleQueryUpdate}
        onEdit={handleEditQuery}
        onDelete={handleDeleteQuery}
        dmcId={dmcId}
      />

      {/* Edit Query Sheet */}
      <QueryFormSheet
        initialData={currentQuery}
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        onSuccess={handleEditSuccess}
      >
        <div />
      </QueryFormSheet>

      {/* Delete Query Dialog */}
      <DeleteQueryDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        query={currentQuery}
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
        onConfirm={confirmDeleteQuery}
      />
    </div>
  );
}
