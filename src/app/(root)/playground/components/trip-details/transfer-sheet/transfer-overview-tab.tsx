"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Car, MapPin, Clock, FileText, ImageIcon, Plus } from "lucide-react";
import type { TransferSheetContextValue } from "./types";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import useUser from "@/hooks/use-user";
import { TRANSFER_MODES, TRANSFER_TYPE_GROUPS } from "./types";
import { TRANSFER_TYPE_OPTIONS } from "@/types/transfers";

interface TransferOverviewTabProps {
  ctx: TransferSheetContextValue;
}

export function TransferOverviewTab({ ctx }: TransferOverviewTabProps) {
  const { formData, transferDetails, saving, hasChanges, updateFormField, handleSave } = ctx;
  const { user } = useUser();

  const details = transferDetails || formData;
  const isVehicleDisposal = (formData.transfer_mode || details?.transfer_mode) === "vehicle_disposal";

  // Get transfer mode label
  const getModeLabelById = (mode?: string) => {
    if (!mode) return "Vehicle";
    const modeInfo = TRANSFER_MODES.find((m) => m.value === mode);
    return modeInfo?.label || mode;
  };

  // Get transfer type labels
  const getTypeLabels = (types?: string[]) => {
    if (!types || types.length === 0) return null;
    return types.map((t) => {
      const typeInfo = TRANSFER_TYPE_OPTIONS.find((opt) => opt.value === t);
      return typeInfo?.label || t;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 p-3">
        {/* Transfer Info */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Car className="h-3 w-3" /> Transfer Info
          </h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Transfer</Label>
              <p className="font-medium truncate">{formData.transfer_name || details?.transfer_name || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mode</Label>
              <Badge variant="outline" className="text-xs">
                {getModeLabelById(formData.transfer_mode || details?.transfer_mode)}
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </Label>
              <p className="font-medium text-xs truncate">
                {[formData.transfer_city || details?.city, formData.transfer_country || details?.country]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Images */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Images
          </h3>
          {user?.id ? (
            <S3ImageUpload
              images={formData.images || []}
              onChange={(images) => updateFormField("images", images)}
              userId={user.id}
              maxImages={10}
              prefix="transfer-images"
            />
          ) : (
            <p className="text-xs text-muted-foreground">Please log in to upload images</p>
          )}
        </section>

        <Separator />

        {/* Booking Details */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Booking Details
          </h3>

          {/* Pickup */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pickup Date</Label>
              <DatePicker
                value={formData.pickup_date ? new Date(formData.pickup_date) : undefined}
                onChange={(date) => updateFormField("pickup_date", date ? date.toISOString().split("T")[0] : "")}
                placeholder="Date"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pickup Time</Label>
              <TimePicker
                value={formData.pickup_time || "09:00"}
                onChange={(time) => updateFormField("pickup_time", time)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pickup Point</Label>
              <Input
                value={formData.pickup_point || details?.pickup_point || ""}
                onChange={(e) => updateFormField("pickup_point", e.target.value)}
                placeholder="Pickup location"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Drop */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Drop Date</Label>
              <DatePicker
                value={formData.drop_date ? new Date(formData.drop_date) : undefined}
                onChange={(date) => updateFormField("drop_date", date ? date.toISOString().split("T")[0] : "")}
                placeholder="Date"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Drop Time</Label>
              <TimePicker
                value={formData.drop_time || "17:00"}
                onChange={(time) => updateFormField("drop_time", time)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Drop Point</Label>
              <Input
                value={formData.drop_point || details?.drop_point || ""}
                onChange={(e) => updateFormField("drop_point", e.target.value)}
                placeholder="Drop-off location"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Meeting Point & Duration */}
          <div className={`grid gap-2 ${isVehicleDisposal ? "grid-cols-4" : "grid-cols-3"}`}>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Meeting Point</Label>
              <Input
                value={formData.meeting_point || details?.meeting_point || ""}
                onChange={(e) => updateFormField("meeting_point", e.target.value)}
                placeholder="Meeting location"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Duration (Hours)</Label>
              <Input
                type="number"
                min={0}
                value={formData.duration_hours || details?.duration_hours || ""}
                onChange={(e) => updateFormField("duration_hours", e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
            {isVehicleDisposal && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration (Days)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.duration_days || details?.duration_days || ""}
                    onChange={(e) => updateFormField("duration_days", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Distance (KMs)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.distance_km || details?.distance_km || ""}
                    onChange={(e) => updateFormField("distance_km", e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}
          </div>

          {/* SIC Checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="is_sic"
              checked={formData.is_sic || details?.is_sic || false}
              onCheckedChange={(checked) => updateFormField("is_sic", checked as boolean)}
            />
            <Label htmlFor="is_sic" className="text-xs cursor-pointer">
              SIC (Seat-in-Coach) Transfer
            </Label>
          </div>
        </section>

        <Separator />

        {/* Transfer Types */}
        {(formData.transfer_type || details?.transfer_type) && (formData.transfer_type || details?.transfer_type || []).length > 0 && (
          <>
            <section className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground">Transfer Type</h3>
              <div className="flex flex-wrap gap-1">
                {getTypeLabels(formData.transfer_type || details?.transfer_type)?.map((label, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px]">
                    {label}
                  </Badge>
                ))}
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* Add-ons */}
        {(details?.add_ons && details.add_ons.length > 0) && (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" /> Available Add-ons
              </h3>
              <div className="space-y-1">
                {details.add_ons.map((addon, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{addon.name}</span>
                      {addon.is_mandatory && (
                        <Badge variant="destructive" className="text-[10px]">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {addon.rate_adult && `Adult: ${addon.rate_adult}`}
                      {addon.rate_child && ` | Child: ${addon.rate_child}`}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* Remarks */}
        <section className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" /> Remarks
          </h3>
          <Textarea
            value={formData.remarks || formData.notes || ""}
            onChange={(e) => updateFormField("remarks", e.target.value)}
            className="min-h-[50px] text-xs"
            placeholder="Add remarks..."
          />
        </section>
      </div>

      {/* Sticky Save Button */}
      {hasChanges && (
        <div className="sticky bottom-0 p-2 bg-background border-t justify-end flex">
          <Button size="sm" onClick={handleSave} disabled={saving} loading={saving}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
