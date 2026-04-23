"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  createManualBreakup,
  updateServiceBreakup,
  type ServiceType,
  type UnitType,
  type ServiceBreakup,
} from "@/data-access/service-breakups";

interface DayActivity {
  service_type: "hotel" | "tour" | "transfer";
  name: string;
  id?: string;
}

interface DayData {
  day_number: number;
  date: string;
  activities: DayActivity[];
}

interface AddBreakupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  messageId: string;
  optionNumber?: number;
  dayDates?: string[]; // Array of dates for each day (index 0 = day 1)
  days?: DayData[]; // Full days data with activities
  defaultServiceType?: ServiceType | "total";
  currency?: string;
  editingBreakup?: ServiceBreakup | null;
  onSuccess?: () => void;
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "tour", label: "Tour" },
  { value: "transfer", label: "Transfer" },
  { value: "combo", label: "Combo" },
  { value: "meal", label: "Meal" },
  { value: "other", label: "Other" },
];

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "teen", label: "Teen" },
  { value: "infant", label: "Infant" },
  { value: "vehicle", label: "Vehicle" },
  { value: "room", label: "Room" },
  { value: "tour", label: "Tour" },
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
  { value: "package", label: "Package" },
];

interface FormData {
  day_number: string;
  service_date: string;
  service_name: string;
  service_type: ServiceType;
  unit_type: UnitType | "";
  quantity: string;
  base_cost: string;
  discount_amount: string;
  discount_name: string;
  markup_amount: string;
  tax_amount: string;
  calculation_notes: string[];
  activity_id: string;
}

const initialFormData: FormData = {
  day_number: "",
  service_date: "",
  service_name: "",
  service_type: "hotel",
  unit_type: "",
  quantity: "1",
  base_cost: "",
  discount_amount: "",
  discount_name: "",
  markup_amount: "",
  tax_amount: "",
  calculation_notes: [],
  activity_id: "",
};

export default function AddBreakupSheet({
  open,
  onOpenChange,
  chatId,
  messageId,
  optionNumber = 1,
  dayDates = [],
  days = [],
  defaultServiceType,
  currency = "USD",
  editingBreakup,
  onSuccess,
}: AddBreakupSheetProps) {
  const totalDays = dayDates.length;
  const isEditing = !!editingBreakup;
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<string>("");

  // Get activities for selected day
  const activitiesForDay = formData.day_number
    ? days.find((d) => d.day_number === parseInt(formData.day_number))?.activities || []
    : [];

  // Reset form when sheet opens or populate with editing data
  useEffect(() => {
    if (open) {
      if (editingBreakup) {
        // Populate form with existing breakup data
        setFormData({
          day_number: editingBreakup.day_number?.toString() || "",
          service_date: editingBreakup.service_date || "",
          service_name: editingBreakup.service_name || "",
          service_type: editingBreakup.service_type || "hotel",
          unit_type: (editingBreakup.unit_type as UnitType) || "",
          quantity: (editingBreakup.quantity || editingBreakup.quantity_value || 1).toString(),
          base_cost: (editingBreakup.rate_per_unit || 0).toString(),
          discount_amount: (editingBreakup.discount_amount || 0).toString(),
          discount_name: editingBreakup.discount_name || "",
          markup_amount: (editingBreakup.markup_amount || 0).toString(),
          tax_amount: (editingBreakup.tax_amount || 0).toString(),
          calculation_notes: editingBreakup.calculation_notes || [],
          activity_id: editingBreakup.activity_id || "",
        });
        setSelectedActivityIndex(""); // Will be set by separate effect
      } else {
        // Reset for new breakup
        const serviceType = defaultServiceType && defaultServiceType !== "total" ? defaultServiceType : "hotel";
        setFormData({ ...initialFormData, service_type: serviceType });
        setSelectedActivityIndex("");
      }
      setNewNote("");
    }
  }, [open, defaultServiceType, editingBreakup]);

  // Auto-select activity dropdown when editing and activity_id exists
  useEffect(() => {
    if (open && formData.activity_id && activitiesForDay.length > 0) {
      const idx = activitiesForDay.findIndex((a) => a.id === formData.activity_id);
      if (idx >= 0) {
        setSelectedActivityIndex(String(idx));
      }
    }
  }, [open, formData.activity_id, activitiesForDay]);

  // Calculate final cost
  const calculateFinalCost = () => {
    const base = parseFloat(formData.base_cost) || 0;
    const qty = parseInt(formData.quantity) || 1;
    const discount = parseFloat(formData.discount_amount) || 0;
    const markup = parseFloat(formData.markup_amount) || 0;
    const tax = parseFloat(formData.tax_amount) || 0;
    return base * qty - discount + markup + tax;
  };

  const finalCost = calculateFinalCost();

  const handleChange = (field: keyof FormData, value: string) => {
    if (field === "day_number") {
      // Auto-update date when day is selected and reset activity selection
      const dayIndex = parseInt(value) - 1;
      const date = dayDates[dayIndex] || "";
      setFormData((prev) => ({ ...prev, day_number: value, service_date: date }));
      setSelectedActivityIndex("");
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Handle activity selection - auto-fill service name, type, and activity_id
  const handleActivitySelect = (indexStr: string) => {
    setSelectedActivityIndex(indexStr);
    if (indexStr === "") {
      // Clear activity_id when deselected
      setFormData((prev) => ({ ...prev, activity_id: "" }));
      return;
    }

    const idx = parseInt(indexStr);
    const activity = activitiesForDay[idx];
    if (activity) {
      // Map service_type from activity to form service_type
      const serviceType: ServiceType =
        activity.service_type === "hotel"
          ? "hotel"
          : activity.service_type === "tour"
            ? "tour"
            : activity.service_type === "transfer"
              ? "transfer"
              : "other";

      setFormData((prev) => ({
        ...prev,
        service_name: activity.name,
        service_type: serviceType,
        activity_id: activity.id || "",
      }));
    }
  };

  const addNote = () => {
    if (newNote.trim()) {
      setFormData((prev) => ({
        ...prev,
        calculation_notes: [...prev.calculation_notes, newNote.trim()],
      }));
      setNewNote("");
    }
  };

  const removeNote = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      calculation_notes: prev.calculation_notes.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service_name.trim()) {
      toast.error("Service name is required");
      return;
    }

    if (!formData.base_cost || parseFloat(formData.base_cost) < 0) {
      toast.error("Base cost is required");
      return;
    }

    setSubmitting(true);

    try {
      const breakupData = {
        chat_id: chatId,
        message_id: messageId,
        day_number: formData.day_number ? parseInt(formData.day_number) : null,
        service_date: formData.service_date || null,
        service_name: formData.service_name,
        service_type: formData.service_type,
        unit_type: formData.unit_type || null,
        quantity: parseInt(formData.quantity) || 1,
        rate_per_unit: parseFloat(formData.base_cost) || 0,
        base_cost: (parseFloat(formData.base_cost) || 0) * (parseInt(formData.quantity) || 1),
        discount_amount: parseFloat(formData.discount_amount) || 0,
        discount_name: formData.discount_name || null,
        markup_amount: parseFloat(formData.markup_amount) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        final_cost: finalCost,
        currency,
        calculation_notes: formData.calculation_notes.length > 0 ? formData.calculation_notes : null,
        option_number: optionNumber,
        activity_id: formData.activity_id || null,
      };

      let result;
      if (isEditing && editingBreakup) {
        result = await updateServiceBreakup(editingBreakup.id, breakupData);
      } else {
        result = await createManualBreakup(breakupData);
      }

      if (result) {
        toast.success(isEditing ? "Breakup updated successfully" : "Breakup added successfully");
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(isEditing ? "Failed to update breakup" : "Failed to add breakup");
      }
    } catch (error) {
      console.error("[AddBreakupSheet] Error:", error);
      toast.error(isEditing ? "Failed to update breakup" : "Failed to add breakup");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Service Breakup" : "Add Service Breakup"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the service breakup details." : "Add a new line item to the service breakups."} Option
            #{optionNumber}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          {/* Day & Date Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={formData.day_number} onValueChange={(v) => handleChange("day_number", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.max(totalDays, 1) }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                value={
                  formData.service_date
                    ? new Date(formData.service_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "Select a day"
                }
                readOnly
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Link Activity (optional) - only show when day is selected and has activities */}
          {formData.day_number && activitiesForDay.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                Link Activity <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              <Select value={selectedActivityIndex} onValueChange={handleActivitySelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an activity to auto-fill" />
                </SelectTrigger>
                <SelectContent>
                  {activitiesForDay.map((activity, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      <span className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs capitalize">[{activity.service_type}]</span>
                        {activity.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Service Name */}
          <div className="space-y-1.5">
            <Label htmlFor="service_name">
              Service Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="service_name"
              placeholder="e.g. Hard Rock Bali - Standard Room"
              value={formData.service_name}
              onChange={(e) => handleChange("service_name", e.target.value)}
            />
          </div>

          {/* Type & Unit Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={formData.service_type}
                onValueChange={(v) => handleChange("service_type", v as ServiceType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={formData.unit_type} onValueChange={(v) => handleChange("unit_type", v as UnitType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity & Base Cost Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Qty</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="base_cost">
                Base ({currency}) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="base_cost"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.base_cost}
                onChange={(e) => handleChange("base_cost", e.target.value)}
              />
            </div>
          </div>

          {/* Discount Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discount_amount">Discount ({currency})</Label>
              <Input
                id="discount_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.discount_amount}
                onChange={(e) => handleChange("discount_amount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount_name">Discount Name</Label>
              <Input
                id="discount_name"
                placeholder="e.g. Early Bird"
                value={formData.discount_name}
                onChange={(e) => handleChange("discount_name", e.target.value)}
              />
            </div>
          </div>

          {/* Markup & Tax Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="markup_amount">Markup ({currency})</Label>
              <Input
                id="markup_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.markup_amount}
                onChange={(e) => handleChange("markup_amount", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_amount">Tax ({currency})</Label>
              <Input
                id="tax_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.tax_amount}
                onChange={(e) => handleChange("tax_amount", e.target.value)}
              />
            </div>
          </div>

          {/* Total (calculated) */}
          <div className="rounded-lg bg-muted/50 p-3 border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-semibold tabular-nums">
                {currency} {finalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">(Base × Qty) - Discount + Markup + Tax</p>
          </div>

          {/* Calculation Notes */}
          <div className="space-y-1.5">
            <Label>Calculation Notes</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNote();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addNote}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.calculation_notes.length > 0 && (
              <ul className="space-y-1 mt-2">
                {formData.calculation_notes.map((note, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                    <span className="flex-1">• {note}</span>
                    <button
                      type="button"
                      onClick={() => removeNote(idx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isEditing ? (
                <Pencil className="h-4 w-4 mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Update Breakup" : "Add Breakup"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
