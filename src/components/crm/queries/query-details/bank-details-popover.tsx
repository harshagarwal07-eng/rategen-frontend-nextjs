"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TooltipButton } from "@/components/ui/tooltip-button";
import { Building2, Loader2, ExternalLink } from "lucide-react";
import { BankDetail } from "@/types/dmc-settings";
import { getDmcBankDetails } from "@/data-access/dmc-settings";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DetailDataList,
  DetailDataListItem,
} from "@/components/crm/shared/detail-data-list";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";

function getBankDetailItems(bank: BankDetail): DetailDataListItem[] {
  return [
    {
      id: "account-holder",
      label: "Account Holder",
      value: (
        <span className="font-medium">{bank.account_holder_name || "-"}</span>
      ),
    },
    {
      id: "account-number",
      label: "Account Number",
      value: (
        <span className="font-mono font-medium">
          {bank.account_number || "-"}
        </span>
      ),
    },
    {
      id: "ifsc-code",
      label: "IFSC Code",
      value: <span className="font-mono">{bank.ifsc_code || "-"}</span>,
    },
    {
      id: "swift-code",
      label: "SWIFT Code",
      value: <span className="font-mono">{bank.swift_code || "-"}</span>,
    },
    {
      id: "iban",
      label: "IBAN",
      value: <span className="font-mono break-all">{bank.iban || "-"}</span>,
    },
    {
      id: "routing-number",
      label: "Routing Number",
      value: <span className="font-mono">{bank.routing_number || "-"}</span>,
    },
    {
      id: "branch",
      label: "Branch",
      value: bank.branch_name || "-",
    },
    {
      id: "branch-address",
      label: "Branch Address",
      value: (
        <span className="leading-relaxed">{bank.branch_address || "-"}</span>
      ),
    },
  ];
}

type BankDetailsPopoverProps = {
  variant?: "default" | "compact";
};

export function BankDetailsPopover({
  variant = "default",
}: BankDetailsPopoverProps) {
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && bankDetails.length === 0) {
      loadBankDetails();
    }
  }, [open]);

  const loadBankDetails = async () => {
    setLoading(true);
    try {
      const details = await getDmcBankDetails();
      setBankDetails(details);
    } catch (error) {
      console.error("Failed to load bank details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "compact" ? (
          <TooltipButton
            variant="outline"
            size="icon-sm"
            className="bg-background"
            tooltip="Bank Details"
          >
            <Building2 />
          </TooltipButton>
        ) : (
          <Button variant="outline">Bank Details</Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="end">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Bank Account Details</h3>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings/dmc-settings"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-7 w-7 p-0"
                >
                  <ExternalLink className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Edit bank details in settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bankDetails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No bank details configured</p>
              <p className="text-xs mt-1">Configure bank details in settings</p>
            </div>
          ) : (
            <Accordion
              type="single"
              collapsible
              className="w-full"
              defaultValue={bankDetails[0]?.id}
            >
              {bankDetails.map((bank) => (
                <AccordionItem
                  key={bank.id}
                  value={bank.id}
                  className="border-0 mb-2"
                >
                  <AccordionTrigger className="px-3 py-3 hover:no-underline">
                    <div className="flex items-center justify-between gap-2 flex-1 pr-2">
                      <h4 className="font-semibold text-sm text-left">
                        {bank.bank_name}
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {bank.is_primary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                        <Badge variant="outline">{bank.currency}</Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 border-b">
                    <DetailDataList
                      items={getBankDetailItems(bank)}
                      className="pt-2"
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
