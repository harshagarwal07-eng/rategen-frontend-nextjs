import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { useState } from "react";
import ImportRuleTable from "./import-rule-table";
import { copyDocDatastore } from "@/data-access/datastore";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  type: string;
};

export default function ImportRuleModal({ type }: Props) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddSelected = async () => {
    setIsLoading(true);

    const { error } = await copyDocDatastore(selectedIds);

    setIsLoading(false);

    if (error) return toast.error(error);

    setOpen(false);
    toast.success(`Rule(s) imported successfully`);
    invalidateQueries();
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllDocsByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={isLoading}
          loading={isLoading}
          loadingText="Importing..."
          size="sm"
          variant="secondary"
        >
          Import Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="capitalize">Import {type} Rules</DialogTitle>
          <DialogDescription>
            Select the rules you want to import and click the import button.
          </DialogDescription>
        </DialogHeader>

        <ImportRuleTable setSelectedIds={setSelectedIds} type={type} />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={selectedIds.length === 0 || isLoading}
            onClick={handleAddSelected}
            loading={isLoading}
            loadingText="Adding..."
          >
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
