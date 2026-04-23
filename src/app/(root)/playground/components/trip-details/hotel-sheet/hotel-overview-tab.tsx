"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Phone, Mail, UtensilsCrossed, Tag, FileText, ImageIcon } from "lucide-react";
import type { HotelSheetContextValue } from "./types";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { PaxRoomDistribution } from "./pax-room-distribution";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import useUser from "@/hooks/use-user";
import { MEAL_TYPES } from "@/constants/meal-types";

interface HotelOverviewTabProps {
  ctx: HotelSheetContextValue;
}

export function HotelOverviewTab({ ctx }: HotelOverviewTabProps) {
  const { formData, hotelDetails, availableRooms, saving, hasChanges, updateFormField, handleSave } = ctx;
  const { user } = useUser();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-4 p-3">
        {/* Hotel Info */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Hotel Info
          </h3>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Hotel</Label>
              <p className="font-medium truncate">{formData.hotel_name || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              <p className="font-medium">{formData.hotel_city || hotelDetails?.city_name || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
              </Label>
              <p className="font-medium text-xs">{formData.hotel_phone || hotelDetails?.hotel_phone || "-"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
              </Label>
              <p className="font-medium text-xs truncate">{formData.hotel_email || hotelDetails?.hotel_email || "-"}</p>
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
              prefix="hotel-images"
            />
          ) : (
            <p className="text-xs text-muted-foreground">Please log in to upload images</p>
          )}
        </section>

        <Separator />

        {/* Stay Details */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Stay Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Check-in */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Check-in</Label>
                  <DatePicker
                    value={formData.check_in_date ? new Date(formData.check_in_date) : undefined}
                    onChange={(date) => updateFormField("check_in_date", date ? date.toISOString().split("T")[0] : "")}
                    placeholder="Date"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <TimePicker
                    value={formData.check_in_time || "15:00"}
                    onChange={(time) => updateFormField("check_in_time", time)}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="early_checkin"
                  checked={formData.early_checkin || false}
                  onCheckedChange={(checked) => updateFormField("early_checkin", checked as boolean)}
                />
                <Label htmlFor="early_checkin" className="text-xs cursor-pointer">
                  Early Check-in
                </Label>
              </div>
            </div>

            {/* Check-out */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Check-out</Label>
                  <DatePicker
                    value={formData.check_out_date ? new Date(formData.check_out_date) : undefined}
                    onChange={(date) => updateFormField("check_out_date", date ? date.toISOString().split("T")[0] : "")}
                    placeholder="Date"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Time</Label>
                  <TimePicker
                    value={formData.check_out_time || "11:00"}
                    onChange={(time) => updateFormField("check_out_time", time)}
                    className="h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="late_checkout"
                  checked={formData.late_checkout || false}
                  onCheckedChange={(checked) => updateFormField("late_checkout", checked as boolean)}
                />
                <Label htmlFor="late_checkout" className="text-xs cursor-pointer">
                  Late Checkout
                </Label>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Pax & Rooms - Drag and Drop Distribution */}
        <PaxRoomDistribution
          adults={formData.adults || 0}
          teens={formData.teens || 0}
          children={formData.children || 0}
          infants={formData.infants || 0}
          childrenAges={formData.children_ages || []}
          rooms={formData.rooms || []}
          roomPaxDistribution={formData.room_pax_distribution || []}
          availableRooms={availableRooms}
          onRoomsChange={(rooms) => updateFormField("rooms", rooms)}
          onDistributionChange={(dist) => updateFormField("room_pax_distribution", dist)}
        />

        <Separator />

        {/* Meal Plan */}
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <UtensilsCrossed className="h-3 w-3" /> Meal Plan
          </h3>
          <div className="flex items-center gap-4">
            <Select value={formData.meal_plan || ""} onValueChange={(value) => updateFormField("meal_plan", value)}>
              <SelectTrigger className="w-40 text-xs" size="sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((meal) => (
                  <SelectItem key={meal.short} value={meal.short}>
                    {meal.short} - {meal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="meal_complimentary"
                checked={formData.meal_complimentary || false}
                onCheckedChange={(checked) => updateFormField("meal_complimentary", checked as boolean)}
              />
              <Label htmlFor="meal_complimentary" className="text-xs cursor-pointer">
                Complimentary
              </Label>
            </div>
          </div>
        </section>

        <Separator />

        {/* Offers */}
        <section className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Tag className="h-3 w-3" /> Offers
          </h3>
          <div>
            <RategenMarkdown content={formData.offers || hotelDetails?.offers || "No offers"} className="text-xs" />
          </div>
        </section>

        {/* Remarks */}
        <section className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <FileText className="h-3 w-3" /> Remarks
          </h3>
          <Textarea
            value={formData.remarks || ""}
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
