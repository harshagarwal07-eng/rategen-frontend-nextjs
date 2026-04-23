"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import AddTeamForm from "../forms/add-team-form";
import { ITeam } from "@/types/user";
import EditTeamForm from "../forms/edit-team-form";
import Show from "../ui/show";
import ChangeMemberPasswordDialog from "./change-member-password-dialog";
import { Button } from "../ui/button";
import { Key } from "lucide-react";

type Props = {
  children: React.ReactNode;
  data?: ITeam;
};

export default function EditTeamDialog({ children, data }: Props) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, [isMounted]);

  if (!isMounted) return;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex justify-between items-center pr-6">
              <p>{!data ? "Add New" : "Update"} Member</p>
              <Show when={!!data?.id}>
                <ChangeMemberPasswordDialog userId={data?.id || ""}>
                  <Button type="button" size={"sm"} variant={"destructive"}>
                    <Key /> Update Password
                  </Button>
                </ChangeMemberPasswordDialog>
              </Show>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {!data ? "Add a new member to your team." : "Update Member Details"}
          </DialogDescription>
        </DialogHeader>
        {!data ? (
          <AddTeamForm setOpen={setOpen} />
        ) : (
          <EditTeamForm member={data} setOpen={setOpen} />
        )}
      </DialogContent>
    </Dialog>
  );
}
