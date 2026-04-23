"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { BankDetail } from "@/types/dmc-settings";
import { BankDetailsDialog } from "./bank-details-dialog";
import { updateDmcSettings } from "@/data-access/dmc-settings";
import { toast } from "sonner";
import { AlertModal } from "@/components/ui/alert-modal";

interface BankDetailsSectionProps {
  initialBankDetails: BankDetail[];
}

export function BankDetailsSection({ initialBankDetails }: BankDetailsSectionProps) {
  const [bankDetails, setBankDetails] = useState<BankDetail[]>(initialBankDetails);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDetail | null>(null);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveBank = async (bankDetail: BankDetail) => {
    setIsUpdating(true);

    let updatedBankDetails: BankDetail[];
    if (editingBank) {
      // Update existing
      updatedBankDetails = bankDetails.map((b) => (b.id === bankDetail.id ? bankDetail : b));
    } else {
      // Add new
      updatedBankDetails = [...bankDetails, bankDetail];
    }

    // If this is set as primary, unset others
    if (bankDetail.is_primary) {
      updatedBankDetails = updatedBankDetails.map((b) => ({
        ...b,
        is_primary: b.id === bankDetail.id,
      }));
    }

    const result = await updateDmcSettings({ bank_details: updatedBankDetails });
    setIsUpdating(false);

    if (result.error) {
      toast.error("Failed to save bank details");
    } else {
      setBankDetails(updatedBankDetails);
      toast.success(editingBank ? "Bank details updated" : "Bank details added");
      setDialogOpen(false);
      setEditingBank(null);
    }
  };

  const handleDeleteBank = async (id: string) => {
    setIsUpdating(true);
    const updatedBankDetails = bankDetails.filter((b) => b.id !== id);

    const result = await updateDmcSettings({ bank_details: updatedBankDetails });
    setIsUpdating(false);

    if (result.error) {
      toast.error("Failed to delete bank details");
    } else {
      setBankDetails(updatedBankDetails);
      toast.success("Bank details deleted");
      setDeletingBankId(null);
    }
  };

  const handleEdit = (bank: BankDetail) => {
    setEditingBank(bank);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingBank(null);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Bank Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add and manage your bank account information for payments
              </p>
            </div>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bankDetails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bank details added yet</p>
              <p className="text-sm">Add your first bank account to receive payments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bankDetails.map((bank) => (
                <div
                  key={bank.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{bank.bank_name}</h4>
                      {bank.is_primary && (
                        <Badge variant="default" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {bank.currency}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Account Holder:</span>{" "}
                        <span className="font-medium">{bank.account_holder_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Account Number:</span>{" "}
                        <span className="font-mono font-medium">
                          {bank.account_number.slice(0, 4)}****{bank.account_number.slice(-4)}
                        </span>
                      </div>
                      {bank.ifsc_code && (
                        <div>
                          <span className="text-muted-foreground">IFSC:</span>{" "}
                          <span className="font-mono">{bank.ifsc_code}</span>
                        </div>
                      )}
                      {bank.swift_code && (
                        <div>
                          <span className="text-muted-foreground">SWIFT:</span>{" "}
                          <span className="font-mono">{bank.swift_code}</span>
                        </div>
                      )}
                      {bank.iban && (
                        <div>
                          <span className="text-muted-foreground">IBAN:</span>{" "}
                          <span className="font-mono">{bank.iban}</span>
                        </div>
                      )}
                      {bank.routing_number && (
                        <div>
                          <span className="text-muted-foreground">Routing:</span>{" "}
                          <span className="font-mono">{bank.routing_number}</span>
                        </div>
                      )}
                      {bank.branch_name && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Branch:</span>{" "}
                          <span>{bank.branch_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(bank)}
                      disabled={isUpdating}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingBankId(bank.id)}
                      disabled={isUpdating}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BankDetailsDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingBank(null);
        }}
        bankDetail={editingBank}
        onSave={handleSaveBank}
        isUpdating={isUpdating}
      />

      <AlertModal
        isOpen={!!deletingBankId}
        onClose={() => setDeletingBankId(null)}
        onConfirm={() => deletingBankId && handleDeleteBank(deletingBankId)}
        loading={isUpdating}
        title="Delete Bank Details?"
        description="This will permanently remove this bank account from your settings. This action cannot be undone."
      />
    </>
  );
}
