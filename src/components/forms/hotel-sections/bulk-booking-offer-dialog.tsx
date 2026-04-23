"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag } from "lucide-react";
import { IHotelRoom } from "../schemas/hotels-datastore-schema";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const BulkOfferSchema = z.object({
  offer_dates: z.string().min(1, "Offer dates are required"),
  discount_percentage: z
    .number()
    .min(0, "Discount must be at least 0")
    .max(100, "Discount cannot exceed 100"),
  selected_seasons: z
    .array(z.string())
    .min(1, "Select at least one season to apply the offer"),
});

type BulkOfferFormData = z.infer<typeof BulkOfferSchema>;

interface SeasonSelection {
  roomIndex: number;
  seasonIndex: number;
  roomCategory: string;
  seasonDates: string;
  key: string;
}

interface BulkBookingOfferDialogProps {
  rooms: IHotelRoom[];
  onApplyBulkOffer: (
    discountPercentage: number,
    offerDates: string,
    selectedSeasons: SeasonSelection[]
  ) => void;
}

export default function BulkBookingOfferDialog({
  rooms,
  onApplyBulkOffer,
}: BulkBookingOfferDialogProps) {
  const [open, setOpen] = useState(false);

  // Create season selections grouped by room
  const seasonSelections: SeasonSelection[] = [];
  rooms.forEach((room, roomIndex) => {
    room.seasons?.forEach((season, seasonIndex) => {
      seasonSelections.push({
        roomIndex,
        seasonIndex,
        roomCategory: room.room_category,
        seasonDates: season.dates,
        key: `${roomIndex}-${seasonIndex}`,
      });
    });
  });

  const form = useForm<BulkOfferFormData>({
    resolver: zodResolver(BulkOfferSchema),
    defaultValues: {
      offer_dates: "",
      discount_percentage: 0,
      selected_seasons: [],
    },
  });

  const onSubmit = (data: BulkOfferFormData) => {
    const selectedSeasons = seasonSelections.filter((season) =>
      data.selected_seasons.includes(season.key)
    );

    if (selectedSeasons.length === 0) {
      toast.error("Please select at least one season");
      return;
    }

    onApplyBulkOffer(
      data.discount_percentage,
      data.offer_dates,
      selectedSeasons
    );
    toast.success(
      `Booking offer applied to ${selectedSeasons.length} season(s)`
    );
    form.reset();
    setOpen(false);
  };

  // Group seasons by room for display
  const groupedSeasons = rooms.reduce(
    (acc, room, roomIndex) => {
      if (!acc[roomIndex]) {
        acc[roomIndex] = {
          roomCategory: room.room_category,
          seasons: [],
        };
      }
      room.seasons?.forEach((season, seasonIndex) => {
        acc[roomIndex].seasons.push({
          roomIndex,
          seasonIndex,
          seasonDates: season.dates,
          key: `${roomIndex}-${seasonIndex}`,
        });
      });
      return acc;
    },
    {} as Record<
      number,
      {
        roomCategory: string;
        seasons: {
          roomIndex: number;
          seasonIndex: number;
          seasonDates: string;
          key: string;
        }[];
      }
    >
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Tag className="h-4 w-4 mr-2" />
          Add Booking Offer (Bulk)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Booking Offer to Multiple Seasons</DialogTitle>
          <DialogDescription>
            Enter discount percentage and select seasons where this offer will
            be applied. The offer will be calculated based on the discount.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="offer_dates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Dates</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dec 1-15, 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter discount % (e.g., 10)"
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : 0
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="selected_seasons"
              render={() => (
                <FormItem>
                  <FormLabel>Select Seasons (Grouped by Room)</FormLabel>
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    <div className="space-y-4">
                      {Object.entries(groupedSeasons).map(
                        ([roomIndex, { roomCategory, seasons }]) => (
                          <div key={roomIndex} className="space-y-2">
                            <div className="font-semibold text-sm text-primary">
                              {roomCategory ||
                                `Room ${parseInt(roomIndex) + 1}`}
                            </div>
                            <div className="space-y-2">
                              {seasons.map((season) => (
                                <FormField
                                  key={season.key}
                                  control={form.control}
                                  name="selected_seasons"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(
                                            season.key
                                          )}
                                          onCheckedChange={(checked) => {
                                            const currentValue =
                                              field.value || [];
                                            if (checked) {
                                              field.onChange([
                                                ...currentValue,
                                                season.key,
                                              ]);
                                            } else {
                                              field.onChange(
                                                currentValue.filter(
                                                  (value) =>
                                                    value !== season.key
                                                )
                                              );
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal cursor-pointer">
                                        {season.seasonDates ||
                                          `Season ${season.seasonIndex + 1}`}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Apply Offer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
