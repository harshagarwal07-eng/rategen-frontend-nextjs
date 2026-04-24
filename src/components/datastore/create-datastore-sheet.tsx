import { useLayoutEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DatastoreForm from "@/components/datastore/datastore-form";
import HotelFullscreenForm from "@/components/forms/hotel-fullscreen-form";
import TourFullscreenForm from "@/components/forms/tour-fullscreen-form";
import TransferFullscreenForm from "@/components/forms/transfer-fullscreen-form";
import ComboFullscreenForm from "@/components/forms/combo-fullscreen-form";
import MealFullscreenForm from "@/components/forms/meal-fullscreen-form";
import { DocumentType } from "@/types/common";
import Show from "../ui/show";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AITourCreationDialog } from "@/components/tours/ai-tour-creation-dialog";
import { GooglePlacesSearchDialog } from "@/components/tours/google-places-search-dialog";

export default function CreateDatastoreSheet() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<DocumentType | null>(null);

  useLayoutEffect(() => {
    if (pathname.includes("hotels")) {
      return setActiveTab(DocumentType.HOTELS);
    }

    if (pathname.includes("tours")) {
      return setActiveTab(DocumentType.TOURS);
    }

    if (pathname.includes("transfers")) {
      return setActiveTab(DocumentType.TRANSFERS);
    }

    if (pathname.includes("combos")) {
      return setActiveTab(DocumentType.COMBOS);
    }

    if (pathname.includes("car-on-disposal")) {
      return setActiveTab(DocumentType.CAR_ON_DISPOSAL);
    }

    if (pathname.includes("meals")) {
      return setActiveTab(DocumentType.MEALS);
    }
  }, [pathname]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [hotelFormOpen, setHotelFormOpen] = useState(false);
  const [tourFormOpen, setTourFormOpen] = useState(false);
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [comboFormOpen, setComboFormOpen] = useState(false);
  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [tourChoiceDialogOpen, setTourChoiceDialogOpen] = useState(false);
  const [aiSearchDialogOpen, setAISearchDialogOpen] = useState(false);
  const [tourInitialData, setTourInitialData] = useState<any>(null);

  const handleFormSuccess = () => {
    setSheetOpen(false);
    setHotelFormOpen(false);
    setTourFormOpen(false);
    setTransferFormOpen(false);
    setComboFormOpen(false);
    setMealFormOpen(false);
    setTourChoiceDialogOpen(false);
    setAISearchDialogOpen(false);
    setTourInitialData(null);
    invalidateQueries();
  };

  const handleAddClick = () => {
    if (activeTab === DocumentType.HOTELS) {
      setHotelFormOpen(true);
    } else if (activeTab === DocumentType.TOURS) {
      setTourChoiceDialogOpen(true);
    } else if (activeTab === DocumentType.TRANSFERS) {
      setTransferFormOpen(true);
    } else if (activeTab === DocumentType.COMBOS) {
      setComboFormOpen(true);
    } else if (activeTab === DocumentType.MEALS) {
      setMealFormOpen(true);
    } else {
      setSheetOpen(true);
    }
  };

  const handleManualEntry = () => {
    setTourChoiceDialogOpen(false);
    setTourFormOpen(true);
  };

  const handleAICreation = () => {
    setTourChoiceDialogOpen(false);
    setAISearchDialogOpen(true);
  };

  const handlePlaceSelected = (tourData: any) => {
    setAISearchDialogOpen(false);
    setTourInitialData(tourData);
    setTourFormOpen(true);
  };

  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["getAllHotelsByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllToursByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllTransfersByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["meals"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllCarOnDisposalsByUser"],
      exact: false,
      type: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["getAllCombosByUser"],
      exact: false,
      type: "active",
    });
  };

  return (
    <>
      <Button size="sm" onClick={handleAddClick}>
        <Plus />
        Add New
      </Button>

      {/* Hotel Full-screen Form */}
      <HotelFullscreenForm
        isOpen={hotelFormOpen}
        onClose={() => setHotelFormOpen(false)}
        onSuccess={handleFormSuccess}
        syncedColumns={[]} // No synced columns for creation
      />

      {/* AI Tour Creation Choice Dialog */}
      <AITourCreationDialog
        isOpen={tourChoiceDialogOpen}
        onClose={() => setTourChoiceDialogOpen(false)}
        onManualEntry={handleManualEntry}
        onAICreation={handleAICreation}
      />

      {/* Google Places Search Dialog */}
      <GooglePlacesSearchDialog
        isOpen={aiSearchDialogOpen}
        onClose={() => setAISearchDialogOpen(false)}
        onPlaceSelected={handlePlaceSelected}
      />

      {/* Tour Full-screen Form */}
      <TourFullscreenForm
        isOpen={tourFormOpen}
        onClose={() => {
          setTourFormOpen(false);
          setTourInitialData(null);
        }}
        initialData={tourInitialData}
        onSuccess={handleFormSuccess}
        syncedColumns={[]} // No synced columns for creation
      />

      {/* Transfer Full-screen Form */}
      <TransferFullscreenForm
        isOpen={transferFormOpen}
        onClose={() => setTransferFormOpen(false)}
        onSuccess={handleFormSuccess}
        syncedColumns={[]} // No synced columns for creation
      />

      {/* Combo Full-screen Form */}
      <ComboFullscreenForm
        isOpen={comboFormOpen}
        onClose={() => setComboFormOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Meal Full-screen Form */}
      <MealFullscreenForm isOpen={mealFormOpen} onClose={() => setMealFormOpen(false)} onSuccess={handleFormSuccess} />

      {/* Other Services Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              <Show when={activeTab === DocumentType.CAR_ON_DISPOSAL}>Create New Car On Disposal</Show>
            </SheetTitle>
            <SheetDescription>
              <Show when={activeTab === DocumentType.CAR_ON_DISPOSAL}>Add a new car on disposal to your datastore</Show>
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <DatastoreForm onSuccess={handleFormSuccess} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
