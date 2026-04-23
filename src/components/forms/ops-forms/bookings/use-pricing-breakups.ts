import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getServiceBreakupsByActivityId,
  createManualBreakup,
  updateServiceBreakup,
  deleteServiceBreakup,
  type ServiceBreakup,
  type ServiceType,
} from "@/data-access/service-breakups";
import { calculateTotalBaseCost, getBreakupCurrency, isTempBreakup } from "@/lib/pricing/breakup-utils";

interface UsePricingBreakupsOptions {
  activityId: string;
  queryId: string;
  serviceType: ServiceType;
  defaultServiceName?: string;
  defaultServiceId?: string;
  defaultDayNumber?: number;
  defaultCheckInDate?: string;
  defaultCurrency?: string;
  onTotalCostChange?: (totalCost: number, currency?: string) => void;
}

export function usePricingBreakups({
  activityId,
  queryId,
  serviceType,
  defaultServiceName = "",
  defaultServiceId = "",
  defaultDayNumber = 1,
  defaultCheckInDate = "",
  defaultCurrency = "USD",
  onTotalCostChange,
}: UsePricingBreakupsOptions) {
  const [breakups, setBreakups] = useState<ServiceBreakup[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing breakups on mount
  useEffect(() => {
    const loadBreakups = async () => {
      try {
        const existingBreakups = await getServiceBreakupsByActivityId(activityId);
        setBreakups(existingBreakups);
      } catch (error) {
        console.error("[usePricingBreakups] Error loading breakups:", error);
      }
    };

    loadBreakups();
  }, [activityId]);

  // Calculate total cost and notify parent component
  useEffect(() => {
    if (onTotalCostChange) {
      const totalBaseCost = calculateTotalBaseCost(breakups);
      const currency = getBreakupCurrency(breakups);
      onTotalCostChange(totalBaseCost > 0 ? totalBaseCost : 0, currency);
    }
  }, [breakups, onTotalCostChange]);

  /**
   * Update a specific field of a breakup
   */
  const updateBreakupField = (id: string, field: keyof ServiceBreakup, value: any) => {
    setBreakups((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return { ...b, [field]: value };
      })
    );
  };

  /**
   * Add a new breakup row
   */
  const addBreakup = () => {
    const currentCurrency = getBreakupCurrency(breakups) || defaultCurrency;

    const newBreakup: ServiceBreakup = {
      id: `temp-${Date.now()}`,
      chat_id: queryId,
      message_id: activityId,
      activity_id: activityId,
      day_number: defaultDayNumber,
      service_date: defaultCheckInDate || "",
      service_type: serviceType,
      service_name: defaultServiceName,
      service_id: defaultServiceId || "",
      quantity: 1,
      unit_type: serviceType === "hotel" ? "night" : "per_person",
      base_cost: 0,
      discount_amount: 0,
      markup_amount: 0,
      tax_amount: 0,
      final_cost: 0,
      currency: currentCurrency,
      created_at: new Date().toISOString(),
    };

    setBreakups((prev) => [...prev, newBreakup]);
  };

  /**
   * Delete a breakup row
   */
  const deleteBreakup = async (id: string) => {
    setIsDeleting(true);
    try {
      // If it's a temp ID (not saved yet), just remove from state
      if (isTempBreakup({ id } as ServiceBreakup)) {
        setBreakups((prev) => prev.filter((b) => b.id !== id));
        return;
      }

      // Otherwise delete from database
      const success = await deleteServiceBreakup(id);
      if (success) {
        setBreakups((prev) => prev.filter((b) => b.id !== id));
        toast.success("Breakup deleted successfully");
      } else {
        toast.error("Failed to delete breakup");
      }
    } catch (error) {
      console.error("[usePricingBreakups] Error deleting breakup:", error);
      toast.error("An error occurred while deleting breakup");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Save all breakups (create new ones and update existing ones)
   */
  const saveBreakups = async () => {
    setIsSaving(true);
    try {
      // Separate new and existing breakups
      const newBreakups = breakups.filter((b) => isTempBreakup(b));
      const existingBreakups = breakups.filter((b) => !isTempBreakup(b));

      // Create new breakups
      const createdBreakups = await Promise.all(
        newBreakups.map((b) =>
          createManualBreakup({
            chat_id: queryId,
            message_id: activityId,
            activity_id: activityId,
            day_number: b.day_number,
            service_date: b.service_date || null,
            service_type: b.service_type,
            service_name: b.service_name,
            service_id: b.service_id || null,
            quantity: b.quantity || 1,
            unit_type: (b.unit_type as any) || (serviceType === "hotel" ? "night" : "per_person"),
            base_cost: b.base_cost || 0,
            discount_amount: b.discount_amount || 0,
            markup_amount: b.markup_amount || 0,
            tax_amount: b.tax_amount || 0,
            final_cost: b.final_cost || 0,
            currency: b.currency || defaultCurrency,
            price_source: "individual",
          })
        )
      );

      // Update existing breakups
      await Promise.all(
        existingBreakups.map((b) =>
          updateServiceBreakup(b.id, {
            day_number: b.day_number,
            service_date: b.service_date || null,
            service_name: b.service_name,
            service_type: b.service_type,
            quantity: b.quantity,
            unit_type: (b.unit_type as any) || null,
            base_cost: b.base_cost,
            discount_amount: b.discount_amount,
            markup_amount: b.markup_amount,
            tax_amount: b.tax_amount,
            final_cost: b.final_cost,
          })
        )
      );

      // Replace temp IDs with real IDs
      const updatedBreakups = [...existingBreakups, ...createdBreakups.filter((b): b is ServiceBreakup => b !== null)];
      setBreakups(updatedBreakups);

      return true;
    } catch (error) {
      console.error("[usePricingBreakups] Error saving breakups:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    breakups,
    setBreakups,
    updateBreakupField,
    addBreakup,
    deleteBreakup,
    saveBreakups,
    isDeleting,
    isSaving,
  };
}
