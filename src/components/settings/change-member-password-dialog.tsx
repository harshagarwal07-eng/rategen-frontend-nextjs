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
import { ChangeMemberPasswordForm } from "../forms/change-member-password";

type Props = {
  userId: string;
  children: React.ReactNode;
};

export default function ChangeMemberPasswordDialog({
  children,
  userId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, [isMounted]);

  if (!isMounted) return;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="space-y-10 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Password</DialogTitle>
          <DialogDescription className="sr-only">
            Change Password.
          </DialogDescription>
        </DialogHeader>
        <ChangeMemberPasswordForm userId={userId} setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}
