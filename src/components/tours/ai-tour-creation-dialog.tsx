"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Pencil, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AITourCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onManualEntry: () => void;
  onAICreation: () => void;
}

export function AITourCreationDialog({
  isOpen,
  onClose,
  onManualEntry,
  onAICreation,
}: AITourCreationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Tour</DialogTitle>
          <DialogDescription className="sr-only">
            Choose how you&apos;d like to create your tour
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {/* AI Creation Option */}
          <Card
            className="relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all cursor-pointer group"
            onClick={onAICreation}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 space-y-4">
              <div className="min-h-40">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Create with AI</h3>
                  <p className="text-sm text-muted-foreground">
                    Search for a place and we&qapos;ll automatically populate
                    tour details using Google Places
                  </p>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={onAICreation}>
                Continue with AI
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Manual Entry Option */}
          <Card
            className="relative overflow-hidden border-2 border-muted hover:border-muted-foreground/40 transition-all cursor-pointer group"
            onClick={onManualEntry}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-muted/5 to-muted/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 space-y-4">
              <div className="min-h-40">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Pencil className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Manual Entry</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your tour from scratch with complete control over all
                    details
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={onManualEntry}
              >
                Continue Manually
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
