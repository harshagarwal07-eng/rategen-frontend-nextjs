"use client";

import { useState, useEffect, useRef, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Hotel } from "@/types/hotels";
import HotelGeneralInfoForm from "./hotel-sections/hotel-general-info-form";
import HotelPoliciesForm from "./hotel-sections/hotel-policies-form";
import HotelRoomsForm from "./hotel-sections/hotel-rooms-form";
import HotelSuppliersForm from "./hotel-sections/hotel-suppliers-form";
import { saveHotelGeneralInfo, saveHotelPolicies, saveHotelRooms } from "@/data-access/hotels";
import { syncSupplierAssociations } from "@/data-access/suppliers";
import { toast } from "sonner";

// Context for accordion state management
interface AccordionContextType {
  openAccordions: string[];
  setOpenAccordions: (value: string[] | ((prev: string[]) => string[])) => void;
  expandAll: () => void;
  collapseAll: () => void;
  registerAccordionIds: (ids: string[]) => void;
}

export const AccordionContext = createContext<AccordionContextType | null>(null);

export function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("useAccordionContext must be used within AccordionContext.Provider");
  }
  return context;
}

interface HotelFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Hotel | null;
  syncedColumns: string[];
  onSuccess?: () => void;
}

const FORM_STEPS = [
  { id: "general", title: "General Info", component: HotelGeneralInfoForm },
  { id: "policies", title: "Policies", component: HotelPoliciesForm },
  { id: "rooms", title: "Rooms", component: HotelRoomsForm },
  { id: "suppliers", title: "Suppliers", component: HotelSuppliersForm },
];

export default function HotelFullscreenForm({
  isOpen,
  onClose,
  initialData,
  syncedColumns,
  onSuccess,
}: HotelFullscreenFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Hotel>>({});
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form state when dialog opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setFormData(initialData || {});
    } else {
      setCurrentStep(0);
      setFormData({});
    }
  }, [isOpen, initialData]);

  const currentFormComponent = FORM_STEPS[currentStep].component;

  const handleNext = async (data: any) => {
    setIsLoading(true);
    try {
      let result: any;

      // Save based on current step
      switch (currentStep) {
        case 0: // General Info
          result = await saveHotelGeneralInfo(formData.id, data);
          if ("error" in result && result.error) throw new Error(result.error);
          // Update formData with saved data including ID for new hotels
          setFormData({ ...formData, ...data, id: result.data.id });
          break;

        case 1: // Policies
          if (!formData.id) throw new Error("Hotel ID not found");
          result = await saveHotelPolicies(formData.id, data);
          if ("error" in result && result.error) throw new Error(result.error);
          setFormData({ ...formData, ...data });
          break;

        case 2: // Rooms
          if (!formData.id) throw new Error("Hotel ID not found");
          result = await saveHotelRooms(formData.id, data.rooms);
          if ("error" in result && result.error) throw new Error(result.error);
          setFormData({ ...formData, rooms: data.rooms });
          break;

        case 3: // Suppliers
          if (!formData.id) throw new Error("Hotel ID not found");
          result = await syncSupplierAssociations({ itemType: "hotel", serviceId: formData.id, associations: data.associations });
          if (result.error) throw new Error(result.error);
          break;

        default:
          throw new Error("Invalid step");
      }

      if (currentStep < FORM_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
        toast.success("Progress saved successfully!");
      } else {
        // Final step completed
        toast.success("Hotel configuration completed successfully!");
        router.refresh();
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Error processing step:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save hotel data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleClose = () => {
    onClose();
  };

  const CurrentFormComponent = currentFormComponent;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Hotel Configuration</DialogTitle>
        {/* Fixed Header */}
        <div className="sticky top-0">
          <DialogHeader className="space-y-4 border-b bg-muted">
            {/* <DialogTitle className="text-2xl font-bold">
              {initialData ? "Edit Hotel" : "Add New Hotel"}
            </DialogTitle> */}
            {/* Tabs Navigation */}
            <div className="flex justify-center">
              <div className="flex bg-muted rounded-lg p-1">
                {FORM_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                      index === currentStep
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        index === currentStep
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <span>{step.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <div className="mx-auto max-w-full px-4">
              <CurrentFormComponent
                initialData={formData}
                syncedColumns={syncedColumns || []}
                onNext={handleNext}
                formRef={formRef as React.RefObject<HTMLFormElement>}
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="sticky bottom-0 border-t px-4 py-2 bg-muted">
            <div className="flex items-center justify-between">
              <div>
                {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              <Button
                onClick={() => {
                  formRef.current?.requestSubmit();
                }}
                className="min-w-32"
                loading={isLoading}
                loadingText="Saving..."
                disabled={isLoading}
              >
                {currentStep === FORM_STEPS.length - 1 ? (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Hotel
                  </>
                ) : (
                  <>
                    Save & Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
