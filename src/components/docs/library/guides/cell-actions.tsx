"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash } from "lucide-react";
import { AlertModal } from "@/components/ui/alert-modal";
import { IGuide } from "@/types/docs";
import { deleteLibraryItem } from "@/data-access/docs";
import { toast } from "sonner";

interface CellActionProps {
  data: IGuide;
  onEdit?: (guide: IGuide) => void;
}

export const CellAction: React.FC<CellActionProps> = ({
  data,
  onEdit,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const onConfirmDelete = async () => {
    try {
      setLoading(true);
      const result = await deleteLibraryItem("guides", data.id);

      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Guide deleted successfully");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete guide");
    } finally {
      setOpen(false);
      setLoading(false);
    }
  };

  const handleEdit = () => {
    onEdit?.(data);
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirmDelete}
        loading={loading}
      />

      <div className="flex items-center gap-2">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>

            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};
