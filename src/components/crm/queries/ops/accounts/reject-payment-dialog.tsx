"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RejectPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionReason: string;
  onRejectionReasonChange: (reason: string) => void;
  onConfirm: () => void;
  paymentAmount?: number;
  paymentDate?: string;
}

export default function RejectPaymentDialog({
  open,
  onOpenChange,
  rejectionReason,
  onRejectionReasonChange,
  onConfirm,
  paymentAmount,
  paymentDate,
}: RejectPaymentDialogProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey && rejectionReason.trim()) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Payment</AlertDialogTitle>
          <AlertDialogDescription>
            {paymentAmount && paymentDate ? (
              <>
                Payment of <span className="font-semibold">{paymentAmount.toFixed(2)}</span> on{" "}
                <span className="font-semibold">{paymentDate}</span> will be rejected.
              </>
            ) : (
              "This payment will be rejected. Please provide a reason."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label htmlFor="rejection-reason" className="text-sm">
            Rejection Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => onRejectionReasonChange(e.target.value)}
            placeholder="Enter reason for rejection..."
            className="mt-2 min-h-[100px]"
            onKeyDown={handleKeyDown}
          />
          <p className="text-xs text-muted-foreground mt-1">Press Ctrl+Enter to submit</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onRejectionReasonChange("")}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!rejectionReason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Reject Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
