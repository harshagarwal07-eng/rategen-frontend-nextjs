"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AITourCreation from "@/components/forms/ai-tour-creation";

interface GooglePlacesSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceSelected: (tourData: any) => void;
}

export function GooglePlacesSearchDialog({
  isOpen,
  onClose,
  onPlaceSelected,
}: GooglePlacesSearchDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Tour with AI</DialogTitle>
          <DialogDescription>
            Search for a place and we&apos;ll automatically populate tour
            details using Google Places
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AITourCreation
            onPlaceSelected={onPlaceSelected}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
