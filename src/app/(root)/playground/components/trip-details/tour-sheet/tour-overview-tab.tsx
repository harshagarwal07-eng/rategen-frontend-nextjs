"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LucideFerrisWheel, MapPin, Clock, FileText, ImageIcon, Car, Plus, Tag } from "lucide-react";
import type { TourSheetContextValue } from "./types";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import useUser from "@/hooks/use-user";
import { TOUR_TYPES, TOUR_CATEGORIES } from "./types";

interface TourOverviewTabProps {
  ctx: TourSheetContextValue;
}

export function TourOverviewTab({ ctx }: TourOverviewTabProps) {
  const { formData, tourDetails, saving, hasChanges, updateFormField, handleSave } = ctx;
  const { user } = useUser();

  // Format duration for display
  const formatDuration = (d: any) => {
    if (!d) return "Not specified";
    const parts = [];
    if (d.days) parts.push(`${d.days}d`);
    if (d.hours) parts.push(`${d.hours}h`);
    if (d.minutes) parts.push(`${d.minutes}m`);
    return parts.length > 0 ? parts.join(" ") : "Not specified";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 p-3">
        {/* Tour Info */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <LucideFerrisWheel className="h-3 w-3" /> Tour Info
          </h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Tour</Label>
              <p className="font-medium truncate">{formData.tour_name || tourDetails?.tour_name || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Package</Label>
              <p className="font-medium truncate">{formData.package_name || tourDetails?.package_name || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </Label>
              <p className="font-medium text-xs truncate">
                {[formData.tour_city || tourDetails?.city, formData.tour_country || tourDetails?.country]
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
              prefix="tour-images"
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
          <div className="grid grid-cols-2 gap-4">
            {/* Start */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <DatePicker
                    value={formData.start_date ? new Date(formData.start_date) : undefined}
                    onChange={(date) => updateFormField("start_date", date ? date.toISOString().split("T")[0] : "")}
                    placeholder="Date"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <TimePicker
                    value={formData.start_time || "09:00"}
                    onChange={(time) => updateFormField("start_time", time)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* End */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <DatePicker
                    value={formData.end_date ? new Date(formData.end_date) : undefined}
                    onChange={(date) => updateFormField("end_date", date ? date.toISOString().split("T")[0] : "")}
                    placeholder="Date"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <TimePicker
                    value={formData.end_time || "17:00"}
                    onChange={(time) => updateFormField("end_time", time)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Duration & Type */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <p className="text-sm font-medium">{formatDuration(formData.duration || tourDetails?.duration)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tour Type</Label>
              <Select
                value={formData.tour_type || tourDetails?.tour_type || "ticket_only"}
                onValueChange={(value) => updateFormField("tour_type", value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOUR_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex items-end">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includes_transfer"
                  checked={formData.includes_transfer || tourDetails?.includes_transfer || false}
                  onCheckedChange={(checked) => updateFormField("includes_transfer", checked as boolean)}
                />
                <Label htmlFor="includes_transfer" className="text-xs cursor-pointer flex items-center gap-1">
                  <Car className="h-3 w-3" /> Includes Transfers
                </Label>
              </div>
            </div>
          </div>

          {/* Points */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Meeting Point</Label>
              <Input
                value={formData.meeting_point || tourDetails?.meeting_point || ""}
                onChange={(e) => updateFormField("meeting_point", e.target.value)}
                placeholder="Meeting point"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pick-up Point</Label>
              <Input
                value={formData.pickup_point || tourDetails?.pickup_point || ""}
                onChange={(e) => updateFormField("pickup_point", e.target.value)}
                placeholder="Pick-up point"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Drop-off Point</Label>
              <Input
                value={formData.dropoff_point || tourDetails?.dropoff_point || ""}
                onChange={(e) => updateFormField("dropoff_point", e.target.value)}
                placeholder="Drop-off point"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Categories */}
        {(formData.categories || tourDetails?.categories) && (
          <>
            <section className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Categories
              </h3>
              <div className="flex flex-wrap gap-1">
                {(formData.categories || tourDetails?.categories || []).map((cat) => {
                  const catInfo = TOUR_CATEGORIES.find((c) => c.value === cat);
                  return (
                    <Badge key={cat} variant="secondary" className="text-[10px]">
                      {catInfo?.label || cat}
                    </Badge>
                  );
                })}
              </div>
            </section>
            <Separator />
          </>
        )}

        {/* Add-ons */}
        {(tourDetails?.add_ons && tourDetails.add_ons.length > 0) && (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Plus className="h-3 w-3" /> Available Add-ons
              </h3>
              <div className="space-y-1">
                {tourDetails.add_ons.map((addon, idx) => (
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
                      {addon.ticket_only_rate_adult && `Adult: ${addon.ticket_only_rate_adult}`}
                      {addon.ticket_only_rate_child && ` | Child: ${addon.ticket_only_rate_child}`}
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
