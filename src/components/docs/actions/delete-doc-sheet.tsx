import { AlertModal } from "@/components/ui/alert-modal";
import { Button } from "@/components/ui/button";
import { deleteDoc } from "@/data-access/docs";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface Props {
  title: string;
  docId: number;
}

export default function DeleteDocSheet({ title, docId }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<number | null>(null);

  const confirmDelete = async () => {
    if (!docToDelete) return;

    startTransition(async () => {
      const { error } = await deleteDoc(docToDelete);

      if (error) {
        toast.error(error);
        return;
      }

      setDeleteModalOpen(false);
      setDocToDelete(null);
      toast.success(`${title} deleted successfully`);
      router.refresh();
    });
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setDocToDelete(null);
  };

  const handleDeleteDoc = (docId: number) => {
    setDocToDelete(docId);
    setDeleteModalOpen(true);
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleDeleteDoc(docId)}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        title="Delete"
      >
        <Trash2 />
      </Button>
      <AlertModal
        isOpen={deleteModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        loading={isPending}
      />
    </>
  );
}
