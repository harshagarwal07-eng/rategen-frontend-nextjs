"use client";

import { useCallback, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Copy, Tag, ChevronDown, Hotel, GripVertical } from "lucide-react";
import { HotelRoomsSchema, IHotelRooms } from "../schemas/hotels-datastore-schema";
import BulkBookingOfferDialog from "./bulk-booking-offer-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MEAL_TYPES } from "@/constants/meal-types";
import IndicateLocked from "@/components/common/indicate-locked";
import ImportRoomsButton from "./import-room-datastore-dialog";

interface HotelRoomsFormProps {
  initialData?: Partial<
    IHotelRooms & {
      id?: string;
      hotel_datastore_id?: string | null;
      is_unlinked?: boolean;
    }
  >;
  syncedColumns: string[];
  onNext: (data: IHotelRooms & { id?: string }) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

interface SeasonSelection {
  roomIndex: number;
  seasonIndex: number;
  roomCategory: string;
  seasonDates: string;
  key: string;
}

// Helper function for numeric input handling
const handleNumericChange = (field: any, value: string) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    field.onChange(null);
    return;
  }
  // Allow numbers and decimal point
  if (/^\d*\.?\d*$/.test(trimmedValue)) {
    const numValue = parseFloat(trimmedValue);
    if (!isNaN(numValue)) {
      field.onChange(numValue);
    }
  }
};

// Sortable Room Component
interface SortableRoomProps {
  roomField: any;
  roomIndex: number;
  form: any;
  isLoading: boolean;
  sensors: any;
  getIsLocked: (roomIndex: any, name: string) => boolean;
  duplicateRoom: (roomIndex: number) => void;
  removeRoom: (roomIndex: number) => void;
  duplicateSeason: (roomIndex: number, seasonIndex: number) => void;
  removeSeason: (roomIndex: number, seasonIndex: number) => void;
  addSeason: (roomIndex: number) => void;
  addBookingOffer: (roomIndex: number, seasonIndex: number) => void;
  removeBookingOffer: (roomIndex: number, seasonIndex: number, offerIndex: number) => void;
  duplicateBookingOffer: (roomIndex: number, seasonIndex: number, offerIndex: number) => void;
  handleSeasonDragEnd: (roomIndex: number) => (event: DragEndEvent) => void;
  roomFieldsLength: number;
}

const SortableRoom = ({
  roomIndex,
  form,
  isLoading,
  sensors,
  getIsLocked,
  duplicateRoom,
  removeRoom,
  duplicateSeason,
  removeSeason,
  addSeason,
  addBookingOffer,
  removeBookingOffer,
  duplicateBookingOffer,
  handleSeasonDragEnd,
  roomFieldsLength,
}: SortableRoomProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `room-${roomIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem
        value={`room-${roomIndex}`}
        className="border-2 border-muted bg-accent/30 rounded-lg overflow-hidden"
      >
        <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-accent/40 transition-colors [&>svg]:hidden group">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <ChevronDown className="h-6 w-6 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              <Hotel className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-base">Room {roomIndex + 1}</span>
              {form.watch(`rooms.${roomIndex}.room_category`) && (
                <span className="text-sm text-muted-foreground">
                  - {form.watch(`rooms.${roomIndex}.room_category`)}
                </span>
              )}
              <Badge variant="secondary" className="ml-2">
                {form.watch(`rooms.${roomIndex}.seasons`)?.length || 0} Season
                {form.watch(`rooms.${roomIndex}.seasons`)?.length !== 1 ? "s" : ""}
              </Badge>
              {getIsLocked(roomIndex, "hotel_room.room_category") && (
                <IndicateLocked tooltip="This room is linked to datastore" />
              )}
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateRoom(roomIndex);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    duplicateRoom(roomIndex);
                  }
                }}
                role="button"
                tabIndex={0}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer"
              >
                <Copy className="h-3 w-3 mr-1" />
                Duplicate
              </div>
              {roomFieldsLength > 1 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRoom(roomIndex);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      removeRoom(roomIndex);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 px-3 cursor-pointer"
                  }
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-3 pb-3">
          <div className="space-y-3 pt-2">
            {/* Room Basic Info */}
            <div className="grid grid-cols-16 gap-2 items-end">
              <div className="col-span-4">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.room_category`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Room Category *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Deluxe"
                          {...field}
                          className="h-8 text-sm"
                          disabled={isLoading || getIsLocked(roomIndex, "hotel_room.room_category")}
                          rightIcon={getIsLocked(roomIndex, "hotel_room.room_category") && <IndicateLocked />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.max_occupancy`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Max Occupancy</FormLabel>
                      <FormControl>
                        <Input placeholder="2A+1C" {...field} disabled={isLoading} className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.meal_plan`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Meal Plan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="!h-8 text-sm w-full">
                            <SelectValue placeholder="Select meal plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Room Only">Room Only</SelectItem>
                          {MEAL_TYPES.map((mt) => (
                            <SelectItem value={mt.value} key={mt.value}>
                              {mt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-6">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.other_details`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">Other Details</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional notes" {...field} disabled={isLoading} className="h-8 text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Extra Bed Policy & Stop Sale */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name={`rooms.${roomIndex}.extra_bed_policy`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Extra Bed Policy</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter extra bed policy details..."
                        {...field}
                        disabled={isLoading}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`rooms.${roomIndex}.stop_sale`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">Stop Sale</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 01 Dec 24 - 15 Dec 24"
                        {...field}
                        disabled={isLoading}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seasons Section */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Seasonal Pricing
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSeasonDragEnd(roomIndex)}
              >
                <SortableContext
                  items={
                    form
                      .watch(`rooms.${roomIndex}.seasons`)
                      ?.map((_: any, idx: number) => `season-${roomIndex}-${idx}`) || []
                  }
                  strategy={verticalListSortingStrategy}
                >
                  <Accordion type="multiple" className="space-y-3">
                    {form.watch(`rooms.${roomIndex}.seasons`)?.map((season: any, seasonIndex: number) => (
                      <SortableSeason
                        key={seasonIndex}
                        season={season}
                        roomIndex={roomIndex}
                        seasonIndex={seasonIndex}
                        form={form}
                        isLoading={isLoading}
                        duplicateSeason={duplicateSeason}
                        removeSeason={removeSeason}
                        addBookingOffer={addBookingOffer}
                        removeBookingOffer={removeBookingOffer}
                        duplicateBookingOffer={duplicateBookingOffer}
                        seasonsLength={form.watch(`rooms.${roomIndex}.seasons`)?.length || 0}
                      />
                    ))}
                  </Accordion>
                </SortableContext>
              </DndContext>

              {/* Add Season Button */}
              <div className="flex justify-center mt-4">
                <Button
                  type="button"
                  variant="dashed"
                  onClick={() => addSeason(roomIndex)}
                  className="w-full max-w-md border-dashed border-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Season
                </Button>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

// Sortable Season Component
interface SortableSeasonProps {
  season: any;
  roomIndex: number;
  seasonIndex: number;
  form: any;
  isLoading: boolean;
  duplicateSeason: (roomIndex: number, seasonIndex: number) => void;
  removeSeason: (roomIndex: number, seasonIndex: number) => void;
  addBookingOffer: (roomIndex: number, seasonIndex: number) => void;
  removeBookingOffer: (roomIndex: number, seasonIndex: number, offerIndex: number) => void;
  duplicateBookingOffer: (roomIndex: number, seasonIndex: number, offerIndex: number) => void;
  seasonsLength: number;
}

const SortableSeason = ({
  season,
  roomIndex,
  seasonIndex,
  form,
  isLoading,
  duplicateSeason,
  removeSeason,
  addBookingOffer,
  removeBookingOffer,
  duplicateBookingOffer,
  seasonsLength,
}: SortableSeasonProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `season-${roomIndex}-${seasonIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem
        value={`season-${roomIndex}-${seasonIndex}`}
        className="border-2 border-primary/20 bg-card rounded-lg overflow-hidden"
      >
        <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-accent/20 transition-colors [&>svg]:hidden group">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 flex-1">
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              <span className="text-sm font-semibold">{season.dates || "Unnamed Season"}</span>
              {season.rate_per_night && (
                <span className="text-xs text-muted-foreground">Rate: {season.rate_per_night}/night</span>
              )}
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSeason(roomIndex, seasonIndex);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    duplicateSeason(roomIndex, seasonIndex);
                  }
                }}
                role="button"
                tabIndex={0}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2 cursor-pointer"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </div>
              {seasonsLength > 1 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSeason(roomIndex, seasonIndex);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      removeSeason(roomIndex, seasonIndex);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-7 px-3 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </div>
              )}
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-3 pb-3">
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-9 gap-2 items-end">
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.seasons.${seasonIndex}.dates`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Season Dates *</FormLabel>
                      <FormControl>
                        <DateRangePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select season dates"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.seasons.${seasonIndex}.rate_per_night`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Rate/Night</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => handleNumericChange(field, e.target.value)}
                          disabled={isLoading}
                          className="h-8 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.seasons.${seasonIndex}.single_pp`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Single PP</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => handleNumericChange(field, e.target.value)}
                          disabled={isLoading}
                          className="h-8 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.seasons.${seasonIndex}.double_pp`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Double PP</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => handleNumericChange(field, e.target.value)}
                          disabled={isLoading}
                          className="h-8 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.seasons.${seasonIndex}.extra_bed_pp`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Extra Bed PP</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => handleNumericChange(field, e.target.value)}
                          disabled={isLoading}
                          className="h-8 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <FormField
                  control={form.control}
                  name={`rooms.${roomIndex}.seasons.${seasonIndex}.child_no_bed`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Child No Bed</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="-"
                          value={field.value != null ? String(field.value) : ""}
                          onChange={(e) => handleNumericChange(field, e.target.value)}
                          disabled={isLoading}
                          className="h-8 text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Booking Offers Section */}
            {(form.watch(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`)?.length ?? 0) > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Tag className="h-3 w-3" />
                  Booking Offers
                </div>
                {form
                  .watch(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`)
                  ?.map((offer: any, offerIndex: number) => (
                    <div key={offerIndex} className="grid grid-cols-9 gap-2 items-end">
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers.${offerIndex}.offer_dates`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Offer Dates</FormLabel>
                              <FormControl>
                                <DateRangePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select offer dates"
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers.${offerIndex}.rate_per_night`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Rate/Night</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="-"
                                  value={field.value != null ? String(field.value) : ""}
                                  onChange={(e) => handleNumericChange(field, e.target.value)}
                                  disabled={isLoading}
                                  className="h-8 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers.${offerIndex}.single_pp`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Single PP</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="-"
                                  value={field.value != null ? String(field.value) : ""}
                                  onChange={(e) => handleNumericChange(field, e.target.value)}
                                  disabled={isLoading}
                                  className="h-8 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers.${offerIndex}.double_pp`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Double PP</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="-"
                                  value={field.value != null ? String(field.value) : ""}
                                  onChange={(e) => handleNumericChange(field, e.target.value)}
                                  disabled={isLoading}
                                  className="h-8 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers.${offerIndex}.extra_bed_pp`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Extra Bed PP</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="-"
                                  value={field.value != null ? String(field.value) : ""}
                                  onChange={(e) => handleNumericChange(field, e.target.value)}
                                  disabled={isLoading}
                                  className="h-8 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers.${offerIndex}.child_no_bed`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Child No Bed</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="-"
                                  value={field.value != null ? String(field.value) : ""}
                                  onChange={(e) => handleNumericChange(field, e.target.value)}
                                  disabled={isLoading}
                                  className="h-8 text-sm"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1 flex justify-end items-center h-8 gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => duplicateBookingOffer(roomIndex, seasonIndex, offerIndex)}
                        >
                          <Copy />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => removeBookingOffer(roomIndex, seasonIndex, offerIndex)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Add Booking Offer Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="dashed"
                size="sm"
                onClick={() => addBookingOffer(roomIndex, seasonIndex)}
                className="w-full max-w-md border-dashed border-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Booking Offer
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

export default function HotelRoomsForm({ initialData, syncedColumns, onNext, formRef }: HotelRoomsFormProps) {
  const isLoading = false; // Form submission loading handled by parent

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<IHotelRooms>({
    resolver: zodResolver(HotelRoomsSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      rooms: initialData?.rooms?.map((room) => room) || [
        {
          room_category: "",
          max_occupancy: "",
          meal_plan: "",
          other_details: "",
          extra_bed_policy: "",
          stop_sale: "",
          seasons: [
            {
              dates: "",
              rate_per_night: null,
              single_pp: null,
              double_pp: null,
              extra_bed_pp: null,
              child_no_bed: null,
              booking_offers: [],
            },
          ],
          hotel_room_datastore_id: null,
          is_unlinked: false,
        },
      ],
    },
  });

  // Reset form when initialData changes (for duplicate functionality)
  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData?.id || undefined,
        rooms: initialData?.rooms?.map((room) => room) || [
          {
            room_category: "",
            max_occupancy: "",
            meal_plan: "",
            other_details: "",
            extra_bed_policy: "",
            stop_sale: "",
            seasons: [
              {
                dates: "",
                rate_per_night: null,
                single_pp: null,
                double_pp: null,
                extra_bed_pp: null,
                child_no_bed: null,
                booking_offers: [],
              },
            ],
            hotel_room_datastore_id: null,
            is_unlinked: false,
          },
        ],
      });
    }
  }, [initialData, form]);

  const {
    fields: roomFields,
    append: appendRoom,
    remove: removeRoom,
    move: moveRoom,
  } = useFieldArray({
    control: form.control,
    name: "rooms",
  });

  const addRoom = useCallback(() => {
    appendRoom({
      room_category: "",
      max_occupancy: "",
      meal_plan: "",
      other_details: "",
      extra_bed_policy: "",
      stop_sale: "",
      seasons: [
        {
          dates: "",
          rate_per_night: null,
          single_pp: null,
          double_pp: null,
          extra_bed_pp: null,
          child_no_bed: null,
          booking_offers: [],
        },
      ],
    });
  }, [appendRoom]);

  const addSeason = useCallback(
    (roomIndex: number) => {
      const currentSeasons = form.getValues(`rooms.${roomIndex}.seasons`);
      form.setValue(`rooms.${roomIndex}.seasons`, [
        ...currentSeasons,
        {
          dates: "",
          rate_per_night: null,
          single_pp: null,
          double_pp: null,
          extra_bed_pp: null,
          child_no_bed: null,
          booking_offers: [],
        },
      ]);
    },
    [form]
  );

  const addBookingOffer = useCallback(
    (roomIndex: number, seasonIndex: number) => {
      const currentOffers = form.getValues(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`) || [];
      form.setValue(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`, [
        ...currentOffers,
        {
          offer_dates: "",
          rate_per_night: null,
          single_pp: null,
          double_pp: null,
          extra_bed_pp: null,
          child_no_bed: null,
        },
      ]);
    },
    [form]
  );

  const removeBookingOffer = useCallback(
    (roomIndex: number, seasonIndex: number, offerIndex: number) => {
      const currentOffers = form.getValues(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`) || [];
      const newOffers = currentOffers.filter((_, index) => index !== offerIndex);
      form.setValue(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`, newOffers);
    },
    [form]
  );

  const duplicateBookingOffer = useCallback(
    (roomIndex: number, seasonIndex: number, offerIndex: number) => {
      const currentOffers = form.getValues(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`) || [];
      const offerToDuplicate = currentOffers[offerIndex];
      form.setValue(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`, [
        ...currentOffers,
        {
          ...offerToDuplicate,
          offer_dates: offerToDuplicate.offer_dates ? `${offerToDuplicate.offer_dates} (Copy)` : "",
        },
      ]);
    },
    [form]
  );

  const duplicateRoom = useCallback(
    (roomIndex: number) => {
      const roomToDuplicate = form.getValues(`rooms.${roomIndex}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...roomWithoutId } = roomToDuplicate; // ✅ Exclude ID to generate new one
      appendRoom({
        ...roomWithoutId,
        room_category: `${roomToDuplicate.room_category} (Copy)`,
      });
    },
    [form, appendRoom]
  );

  const duplicateSeason = useCallback(
    (roomIndex: number, seasonIndex: number) => {
      const currentSeasons = form.getValues(`rooms.${roomIndex}.seasons`);
      const seasonToDuplicate = currentSeasons[seasonIndex];
      form.setValue(`rooms.${roomIndex}.seasons`, [
        ...currentSeasons,
        {
          ...seasonToDuplicate,
          dates: `${seasonToDuplicate.dates} (Copy)`,
        },
      ]);
    },
    [form]
  );

  const removeSeason = useCallback(
    (roomIndex: number, seasonIndex: number) => {
      const currentSeasons = form.getValues(`rooms.${roomIndex}.seasons`);
      if (currentSeasons.length > 1) {
        const newSeasons = currentSeasons.filter((_, index) => index !== seasonIndex);
        form.setValue(`rooms.${roomIndex}.seasons`, newSeasons);
      }
    },
    [form]
  );

  const handleBulkOffer = useCallback(
    (discountPercentage: number, offerDates: string, selectedSeasons: SeasonSelection[]) => {
      selectedSeasons.forEach(({ roomIndex, seasonIndex }) => {
        const season = form.getValues(`rooms.${roomIndex}.seasons.${seasonIndex}`);

        // Calculate discounted prices
        const calculateDiscount = (value?: number) => {
          if (!value) return undefined;
          return Number((value * (1 - discountPercentage / 100)).toFixed(2));
        };

        // Add booking offer with discounted prices
        const currentOffers = form.getValues(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`) || [];

        form.setValue(`rooms.${roomIndex}.seasons.${seasonIndex}.booking_offers`, [
          ...currentOffers,
          {
            offer_dates: offerDates,
            rate_per_night: calculateDiscount(season.rate_per_night ?? 0),
            single_pp: calculateDiscount(season.single_pp ?? 0),
            double_pp: calculateDiscount(season.double_pp ?? 0),
            extra_bed_pp: calculateDiscount(season.extra_bed_pp ?? 0),
            child_no_bed: calculateDiscount(season.child_no_bed ?? 0),
          },
        ]);
      });
    },
    [form]
  );

  const onSubmit = (data: IHotelRooms) => {
    onNext(data);
  };

  // Drag handlers
  const handleRoomDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const activeIndex = parseInt(active.id.toString().replace("room-", ""));
        const overIndex = parseInt(over.id.toString().replace("room-", ""));
        moveRoom(activeIndex, overIndex);
      }
    },
    [moveRoom]
  );

  const handleSeasonDragEnd = useCallback(
    (roomIndex: number) => (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const activeIndex = parseInt(active.id.toString().split("-").pop() || "0");
        const overIndex = parseInt(over.id.toString().split("-").pop() || "0");

        const currentSeasons = form.getValues(`rooms.${roomIndex}.seasons`);
        const reorderedSeasons = arrayMove(currentSeasons, activeIndex, overIndex);
        form.setValue(`rooms.${roomIndex}.seasons`, reorderedSeasons);
      }
    },
    [form]
  );

  const getIsLocked = (roomIndex: number, name: string) => {
    const room: any = Array.isArray(roomFields) ? roomFields[roomIndex] : {};

    const isLinked = !!room?.hotel_room_datastore_id && !room.is_unlinked;

    return isLinked && syncedColumns.includes(name);
  };

  const handleImportRooms = useCallback(
    (selectedRooms: any[]) => {
      selectedRooms.forEach((datastoreRoom) => {
        // Check if room already exists
        const existingRoom = form.watch("rooms")?.find((r: any) => r.hotel_room_datastore_id === datastoreRoom.id);

        if (!existingRoom) {
          // Convert datastore room to form room format
          const newRoom = {
            room_category: datastoreRoom.room_category || "",
            max_occupancy: datastoreRoom.max_occupancy || "",
            meal_plan: datastoreRoom.meal_plan || "",
            other_details: datastoreRoom.other_details || "",
            extra_bed_policy: datastoreRoom.extra_bed_policy || "",
            stop_sale: datastoreRoom.stop_sale || "",
            hotel_room_datastore_id: datastoreRoom.id,
            is_unlinked: false,
            seasons: datastoreRoom.seasons,
          };

          appendRoom(newRoom);
        }
      });
    },
    [form, appendRoom]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Room Configuration</h2>
          <p className="text-muted-foreground">Configure room categories and their seasonal pricing</p>
        </div>
        <div className="flex items-center gap-3">
          {/* <Button variant="outline" size="sm">
            Import Rooms
          </Button> */}
          {!!initialData?.hotel_datastore_id && !initialData.is_unlinked && (
            <ImportRoomsButton
              hotelDatastoreId={initialData.hotel_datastore_id}
              currRooms={roomFields || []}
              onImport={handleImportRooms}
            />
          )}
          <BulkBookingOfferDialog rooms={form.watch("rooms") || []} onApplyBulkOffer={handleBulkOffer} />
        </div>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRoomDragEnd}>
            <SortableContext items={roomFields.map((_, idx) => `room-${idx}`)} strategy={verticalListSortingStrategy}>
              <Accordion type="multiple" className="space-y-3">
                {roomFields.map((roomField, roomIndex) => (
                  <SortableRoom
                    key={roomField.id}
                    roomField={roomField}
                    roomIndex={roomIndex}
                    form={form}
                    isLoading={isLoading}
                    sensors={sensors}
                    getIsLocked={getIsLocked}
                    duplicateRoom={duplicateRoom}
                    removeRoom={removeRoom}
                    duplicateSeason={duplicateSeason}
                    removeSeason={removeSeason}
                    addSeason={addSeason}
                    addBookingOffer={addBookingOffer}
                    removeBookingOffer={removeBookingOffer}
                    duplicateBookingOffer={duplicateBookingOffer}
                    handleSeasonDragEnd={handleSeasonDragEnd}
                    roomFieldsLength={roomFields.length}
                  />
                ))}
              </Accordion>
            </SortableContext>
          </DndContext>

          {/* Add Room Button */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <Button
                type="button"
                variant="dashed"
                onClick={addRoom}
                className="w-full max-w-md border-dashed border-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Room Category
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
