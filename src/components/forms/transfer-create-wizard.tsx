"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TransferGeneralInfoForm, {
  TransferGeneralInfoValues,
} from "@/components/rates/transfers/tabs/tab1-general-info";
import Tab2Packages from "@/components/rates/transfers/tabs/tab2-packages";
import Tab3SeasonsRates from "@/components/rates/transfers/tabs/tab3-seasons-rates";
import Tab4Addons from "@/components/rates/transfers/tabs/tab4-addons";
import {
  createTransfer,
  updateTransfer,
  getTransferById,
  listTransferPackages,
} from "@/data-access/transfers-api";
import {
  TransferCountryOption,
  TransferCurrencyOption,
  TransferDetail,
  TransferListRow,
  TransferModeOfTransport,
} from "@/types/transfers";

interface TransferFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<TransferListRow> | null;
  countries: TransferCountryOption[];
  currencies: TransferCurrencyOption[];
  onSuccess?: () => void;
}

const FORM_STEPS = [
  { id: "general", title: "General Info" },
  { id: "packages", title: "Packages" },
  { id: "rates", title: "Seasons & Rates" },
  { id: "addons", title: "Add-ons" },
];

const MODE_LABELS: Record<string, string> = {
  vehicle_p2p: "Vehicle (P2P)",
  vehicle_disposal: "Vehicle on Disposal",
};

type FormState = Partial<TransferDetail>;

export default function TransferFullscreenForm({
  isOpen,
  onClose,
  initialData,
  countries,
  currencies,
  onSuccess,
}: TransferFullscreenFormProps) {
  const qc = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState({ name: "", countryName: "" });
  const [tab1Dirty, setTab1Dirty] = useState(false);
  const [tab2Dirty, setTab2Dirty] = useState(false);
  const [tab3Dirty, setTab3Dirty] = useState(false);
  const [tab4Dirty, setTab4Dirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [hasPackages, setHasPackages] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const anyDirty = tab1Dirty || tab2Dirty || tab3Dirty || tab4Dirty;

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setFormData({});
      setContextInfo({ name: "", countryName: "" });
      setTab1Dirty(false);
      setTab2Dirty(false);
      setTab3Dirty(false);
      setTab4Dirty(false);
      setHasPackages(false);
      return;
    }
    setCurrentStep(0);
    setTab1Dirty(false);
    setTab2Dirty(false);
    setTab3Dirty(false);
    setTab4Dirty(false);
    const seed: FormState = (initialData as FormState) ?? {};
    setFormData(seed);
    setContextInfo({
      name: seed.name ?? "",
      countryName:
        countries.find((c) => c.id === seed.country_id)?.country_name ?? "",
    });
    if (!seed.id) {
      setHasPackages(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [full, pkgs] = await Promise.all([
        getTransferById(seed.id!),
        listTransferPackages(seed.id!),
      ]);
      if (cancelled) return;
      if (full.data) {
        setFormData(full.data);
        setContextInfo({
          name: full.data.name ?? "",
          countryName:
            countries.find((c) => c.id === full.data!.country_id)?.country_name ?? "",
        });
      }
      setHasPackages(Array.isArray(pkgs.data) && pkgs.data.length > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialData, countries]);

  const handleContextChange = useCallback((name: string, countryName: string) => {
    setContextInfo((prev) => {
      if (prev.name === name && prev.countryName === countryName) return prev;
      return { name, countryName };
    });
  }, []);

  const forceClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleNext = useCallback(
    async (data: TransferGeneralInfoValues) => {
      setIsLoading(true);
      try {
        const payload = {
          name: data.name,
          mode_of_transport: data.mode_of_transport as TransferModeOfTransport,
          country_id: data.country_id || null,
          currency_id: data.currency_id || null,
          description: (data.description ?? "").trim() || null,
          status: data.status,
          is_preferred: Boolean(data.is_preferred),
        };

        let savedId: string;
        if (formData.id) {
          const result = await updateTransfer(formData.id, payload);
          if (result.error) throw new Error(result.error);
          savedId = formData.id;
        } else {
          const result = await createTransfer(payload);
          if (result.error || !result.data?.id) {
            throw new Error(result.error ?? "Create failed");
          }
          savedId = result.data.id;
        }

        const full = await getTransferById(savedId);
        if (full.data) {
          setFormData(full.data);
          setContextInfo({
            name: full.data.name ?? "",
            countryName:
              countries.find((c) => c.id === full.data!.country_id)?.country_name ?? "",
          });
        } else {
          setFormData((prev) => ({ ...prev, ...payload, id: savedId }));
        }

        setTab1Dirty(false);
        toast.success(formData.id ? "Saved." : "Transfer created.");
        qc.invalidateQueries({ queryKey: ["transfers"] });
        onSuccess?.();
        setCurrentStep(1);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save transfer");
      } finally {
        setIsLoading(false);
      }
    },
    [formData.id, qc, onSuccess, countries],
  );

  const handleClose = () => {
    if (anyDirty) {
      setShowDiscardDialog(true);
    } else {
      forceClose();
    }
  };

  const handleSaveClick = () => {
    formRef.current?.requestSubmit();
  };

  const displayName = contextInfo.name || formData.name || "";
  const displayCountry = contextInfo.countryName || "";
  const displayMode = formData.mode_of_transport
    ? MODE_LABELS[formData.mode_of_transport as string] ?? String(formData.mode_of_transport)
    : "";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Transfer Configuration</DialogTitle>
          <DialogDescription className="sr-only">
            {formData.id ? "Edit transfer" : "Create a transfer product"}
          </DialogDescription>

          <div className="sticky top-0 z-10">
            <div className="border-b bg-background px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {displayName ? (
                  <span className="font-semibold text-base">{displayName}</span>
                ) : (
                  <span className="text-muted-foreground italic">New Transfer</span>
                )}
                {displayCountry && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">{displayCountry}</span>
                  </>
                )}
                {displayMode && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">{displayMode}</span>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <div className="border-b bg-muted px-4 py-1">
              <div className="flex justify-center">
                <div className="flex bg-muted rounded-lg p-1">
                  {FORM_STEPS.map((step, index) => {
                    const stepDirty =
                      index === 0
                        ? tab1Dirty
                        : index === 1
                          ? tab2Dirty
                          : index === 2
                            ? tab3Dirty
                            : index === 3
                              ? tab4Dirty
                              : false;
                    const stepLocked = index > 0 && !formData.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          if (stepLocked) return;
                          setCurrentStep(index);
                        }}
                        className={cn(
                          "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                          index === currentStep
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                          stepLocked && "opacity-40 cursor-not-allowed",
                        )}
                        title={
                          stepLocked
                            ? "Save the General Info tab first to unlock"
                            : undefined
                        }
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                            index === currentStep
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted-foreground/20 text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <span>{step.title}</span>
                        {stepDirty && (
                          <span
                            className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"
                            aria-label="Unsaved changes"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 pb-20">
              <div className="mx-auto max-w-full px-4">
                {currentStep === 0 && (
                  <TransferGeneralInfoForm
                    initialData={formData.id ? formData : null}
                    countries={countries}
                    currencies={currencies}
                    lockModeOfTransport={Boolean(formData.id) && hasPackages}
                    onNext={handleNext}
                    setIsLoading={setIsLoading}
                    formRef={formRef as React.RefObject<HTMLFormElement>}
                    onContextChange={handleContextChange}
                    onDirtyChange={setTab1Dirty}
                  />
                )}
                {currentStep === 1 && (
                  <Tab2Packages
                    initialData={formData.id ? formData : null}
                    modeOfTransport={formData.mode_of_transport as string | null}
                    countryId={(formData.country_id as string | null) ?? null}
                    onNext={async () => {
                      setCurrentStep(2);
                      qc.invalidateQueries({ queryKey: ["transfers"] });
                    }}
                    setIsLoading={setIsLoading}
                    formRef={formRef as React.RefObject<HTMLFormElement>}
                    onDirtyChange={setTab2Dirty}
                  />
                )}
                {currentStep === 2 && (
                  <Tab3SeasonsRates
                    initialData={formData.id ? formData : null}
                    modeOfTransport={formData.mode_of_transport as string | null}
                    onDirtyChange={setTab3Dirty}
                  />
                )}
                {currentStep === 3 && (
                  <Tab4Addons
                    initialData={formData.id ? formData : null}
                    setIsLoading={setIsLoading}
                    formRef={formRef as React.RefObject<HTMLFormElement>}
                    onDirtyChange={setTab4Dirty}
                  />
                )}
              </div>
            </div>

            <div className="sticky bottom-0 border-t px-4 py-2 bg-muted">
              <div className="flex items-center justify-between">
                <div />
                <div className="flex items-center gap-3">
                  {anyDirty && !isLoading && (
                    <span className="text-xs text-yellow-600 font-medium">
                      Unsaved changes
                    </span>
                  )}
                  {(currentStep === 0 || currentStep === 1) && (
                    <Button onClick={handleSaveClick} className="min-w-32" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {formData.id ? "Saving..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save & Continue
                        </>
                      )}
                    </Button>
                  )}
                  {currentStep === 2 && (
                    <Button
                      onClick={() => {
                        setCurrentStep(3);
                        qc.invalidateQueries({ queryKey: ["transfers"] });
                      }}
                      disabled={tab3Dirty}
                      className="min-w-32"
                      title={tab3Dirty ? "Save package changes first" : undefined}
                    >
                      Continue to Add-ons
                    </Button>
                  )}
                  {currentStep === 3 && (
                    <Button
                      onClick={() => {
                        qc.invalidateQueries({ queryKey: ["transfers"] });
                        forceClose();
                      }}
                      disabled={tab4Dirty}
                      className="min-w-32"
                      title={tab4Dirty ? "Save changes first" : undefined}
                    >
                      Done
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDiscardDialog}
        onOpenChange={(open) => !open && setShowDiscardDialog(false)}
      >
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>You have unsaved changes. Discard?</DialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDiscardDialog(false);
                forceClose();
              }}
            >
              Discard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

