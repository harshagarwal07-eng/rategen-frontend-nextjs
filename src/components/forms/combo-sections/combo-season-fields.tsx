"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Copy } from "lucide-react";
import { IComboSeason, IAgePolicy } from "../schemas/combos-datastore-schema";

interface ComboSeasonFieldsProps {
  season: IComboSeason;
  seasonIndex: number;
  updateSeasonField: (index: number, field: keyof IComboSeason, value: any) => void;
  agePolicy?: IAgePolicy;
}

export default function ComboSeasonFields({
  season,
  seasonIndex,
  updateSeasonField,
  agePolicy,
}: ComboSeasonFieldsProps) {
  // Determine which age brackets are enabled
  const hasAdult = !!agePolicy?.adult;
  const hasTeenager = !!agePolicy?.teenager;
  const hasChild = !!agePolicy?.child;
  const hasInfant = !!agePolicy?.infant;
  const hasAnyBracket = hasAdult || hasTeenager || hasChild || hasInfant;
  const handleNumericChange = (field: keyof IComboSeason, value: string) => {
    const numValue = value === "" ? undefined : parseFloat(value);
    updateSeasonField(seasonIndex, field, numValue);
  };

  // PVT Rate management
  const addPvtRate = () => {
    const currentPvtRate = season.pvt_rate || {};
    const nextPaxNumber = Object.keys(currentPvtRate).length + 1;
    updateSeasonField(seasonIndex, "pvt_rate", { ...currentPvtRate, [`${nextPaxNumber}pax`]: 0 });
  };

  const removePvtRate = (key: string) => {
    const currentPvtRate = { ...season.pvt_rate };
    delete currentPvtRate[key];
    updateSeasonField(seasonIndex, "pvt_rate", currentPvtRate);
  };

  const updatePvtRate = (key: string, rate: number) => {
    const currentPvtRate = { ...season.pvt_rate };
    currentPvtRate[key] = rate;
    updateSeasonField(seasonIndex, "pvt_rate", currentPvtRate);
  };

  // Per Vehicle Rate management
  const addPerVehicleRate = () => {
    const currentRates = season.per_vehicle_rate || [];
    updateSeasonField(seasonIndex, "per_vehicle_rate", [
      ...currentRates,
      { vehicle_type: "", brand: "", capacity: "", rate: 0 },
    ]);
  };

  const removePerVehicleRate = (index: number) => {
    const currentRates = [...(season.per_vehicle_rate || [])];
    currentRates.splice(index, 1);
    updateSeasonField(seasonIndex, "per_vehicle_rate", currentRates);
  };

  const updatePerVehicleRate = (
    vehicleIndex: number,
    field: "rate" | "brand" | "capacity" | "vehicle_type",
    value: string | number,
  ) => {
    const currentRates = [...(season.per_vehicle_rate || [])];
    currentRates[vehicleIndex] = {
      ...currentRates[vehicleIndex],
      [field]: field === "rate" ? (value === "" ? 0 : parseFloat(String(value))) : value,
    };
    updateSeasonField(seasonIndex, "per_vehicle_rate", currentRates);
  };

  const duplicatePerVehicleRate = (index: number) => {
    const currentRates = [...(season.per_vehicle_rate || [])];
    const vehicle = currentRates[index];
    currentRates.push({
      ...vehicle,
      vehicle_type: `${vehicle.vehicle_type} (Copy)`,
    });
    updateSeasonField(seasonIndex, "per_vehicle_rate", currentRates);
  };

  return (
    <div className="space-y-3 pt-2">
      {/* Season Dates */}
      <div className="space-y-1 mb-10">
        <Label className="text-sm font-medium">Season Dates *</Label>
        <DateRangePicker
          value={season.dates || ""}
          onChange={(value) => updateSeasonField(seasonIndex, "dates", value)}
          placeholder="e.g., Jan 1 - Mar 31"
          className="h-9"
        />
      </div>

      {/* Ticket Only Rates - only show if age policy has at least one bracket */}
      {hasAnyBracket && (
        <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Ticket Only Rates
          </div>
          <div className="grid grid-cols-4 gap-3">
            {hasAdult && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Adult</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.ticket_only_rate_adult || ""}
                  onChange={(e) => handleNumericChange("ticket_only_rate_adult", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
            {hasTeenager && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Teenager</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.ticket_only_rate_teenager || ""}
                  onChange={(e) => handleNumericChange("ticket_only_rate_teenager", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
            {hasChild && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Child</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.ticket_only_rate_child || ""}
                  onChange={(e) => handleNumericChange("ticket_only_rate_child", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
            {hasInfant && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Infant</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.ticket_only_rate_infant || ""}
                  onChange={(e) => handleNumericChange("ticket_only_rate_infant", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIC Rates - only show if age policy has at least one bracket */}
      {hasAnyBracket && (
        <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">SIC Rates</div>
          <div className="grid grid-cols-4 gap-3">
            {hasAdult && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Adult</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.sic_rate_adult || ""}
                  onChange={(e) => handleNumericChange("sic_rate_adult", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
            {hasTeenager && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Teenager</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.sic_rate_teenager || ""}
                  onChange={(e) => handleNumericChange("sic_rate_teenager", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
            {hasChild && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Child</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.sic_rate_child || ""}
                  onChange={(e) => handleNumericChange("sic_rate_child", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
            {hasInfant && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Infant</Label>
                <Input
                  type="text"
                  placeholder="-"
                  value={season.sic_rate_infant || ""}
                  onChange={(e) => handleNumericChange("sic_rate_infant", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Private Rates Section */}
      <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Private Rates</div>
          <div className="grid grid-cols-12 gap-2 items-end">
            {Object.entries(season.pvt_rate || {}).map(([groupSize, rate]) => (
              <div key={groupSize}>
                <div className="flex items-center justify-between px-0.5">
                  <Label className="font-medium text-xs">{groupSize}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removePvtRate(groupSize)}
                    className="opacity-50 hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="-"
                  value={rate || ""}
                  onChange={(e) => updatePvtRate(groupSize, parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            <div className="col-span-2">
              <Button type="button" size="sm" variant="dashed" onClick={addPvtRate}>
                <Plus className="h-3 w-3 mr-1" /> Add Pax
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Per Vehicle Rates Section */}
      <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Per Vehicle Rates</div>
            <Button type="button" size="sm" variant="dashed" onClick={addPerVehicleRate}>
              <Plus className="h-3 w-3 mr-1" /> Add Vehicle
            </Button>
          </div>

          {season.per_vehicle_rate && season.per_vehicle_rate.length > 0 && (
            <div className="space-y-2">
              {season.per_vehicle_rate.map((vehicle, vehicleIndex) => (
                <div key={vehicleIndex} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Vehicle Type</Label>
                    <Input
                      placeholder="e.g., Sedan"
                      value={vehicle.vehicle_type || ""}
                      onChange={(e) => updatePerVehicleRate(vehicleIndex, "vehicle_type", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Brand</Label>
                    <Input
                      placeholder="e.g., Toyota"
                      value={vehicle.brand || ""}
                      onChange={(e) => updatePerVehicleRate(vehicleIndex, "brand", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Capacity</Label>
                    <Input
                      placeholder="e.g., 4 seater"
                      value={vehicle.capacity || ""}
                      onChange={(e) => updatePerVehicleRate(vehicleIndex, "capacity", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="-"
                      value={vehicle.rate || ""}
                      onChange={(e) => updatePerVehicleRate(vehicleIndex, "rate", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => duplicatePerVehicleRate(vehicleIndex)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => removePerVehicleRate(vehicleIndex)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Total Rate */}
      <div className="border-2 border-border/50 rounded-lg p-3 bg-accent/15">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Total Rate</Label>
          <Input
            type="text"
            placeholder="Enter total rate for this season"
            value={season.total_rate || ""}
            onChange={(e) => handleNumericChange("total_rate", e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Exception Rules & Blackout Dates */}
      <div className="grid gap-4 grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Exception Rules</Label>
          <Textarea
            placeholder="e.g., No tours on public holidays"
            value={season.exception_rules || ""}
            onChange={(e) => updateSeasonField(seasonIndex, "exception_rules", e.target.value)}
            className="text-sm min-h-[60px]"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Blackout Dates</Label>
          <Textarea
            placeholder="e.g., Dec 25-26, Jan 1, or specific date ranges"
            value={season.blackout_dates || ""}
            onChange={(e) => updateSeasonField(seasonIndex, "blackout_dates", e.target.value)}
            className="text-sm min-h-[60px]"
          />
        </div>
      </div>
    </div>
  );
}
