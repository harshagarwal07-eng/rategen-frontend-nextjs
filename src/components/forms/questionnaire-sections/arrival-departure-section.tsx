"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ArrivalDepartureView } from "./arrival-departure-view";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Loader2, Trash2, Plane, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { ArrivalDepartureFormSchema } from "../schemas/questionnaire-schema";
import {
  getQuestionnaire,
  updateQuestionnaireField,
  fetchQueryGuests,
} from "@/data-access/questionnaire";
import type { ArrivalDeparture } from "@/types/questionnaire";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import Show from "@/components/ui/show";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { format } from "date-fns";

interface ArrivalDepartureSectionProps {
  queryId: string;
  queryDetails?: {
    services?: string[];
  };
}

interface FlightFieldsProps {
  form: any;
  basePath: string;
  guestOptions: Array<{ value: string; label: string }>;
  hasGuests: boolean;
}

function FlightFields({
  form,
  basePath,
  guestOptions,
  hasGuests,
}: FlightFieldsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <FormField
        control={form.control}
        name={`${basePath}.from`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>From *</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Mumbai" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.to`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>To *</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Delhi" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.arrival_date`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Arrival Date *</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) =>
                  field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                }
                placeholder="Select arrival date"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.arrival_time`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Arrival Time *</FormLabel>
            <FormControl>
              <TimePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select arrival time"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.dept_date`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Departure Date *</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(date) =>
                  field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                }
                placeholder="Select departure date"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.dept_time`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Departure Time *</FormLabel>
            <FormControl>
              <TimePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Select departure time"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.airline`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Airline *</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Air India" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.flight_no`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Flight Number *</FormLabel>
            <FormControl>
              <Input placeholder="e.g., AI101" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${basePath}.passenger_ids`}
        render={({ field }) => (
          <FormItem className="lg:col-span-2">
            <FormLabel>Passengers</FormLabel>
            <FormControl>
              <MultiSelector
                values={field.value || []}
                onValuesChange={field.onChange}
                loop={false}
              >
                <MultiSelectorTrigger data={guestOptions}>
                  <MultiSelectorInput
                    placeholder={
                      hasGuests
                        ? "Select passengers..."
                        : "Add passenger details first to enable this field"
                    }
                    disabled={!hasGuests}
                  />
                </MultiSelectorTrigger>
                <MultiSelectorContent>
                  <MultiSelectorList>
                    {guestOptions.map((option) => (
                      <MultiSelectorItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MultiSelectorItem>
                    ))}
                  </MultiSelectorList>
                </MultiSelectorContent>
              </MultiSelector>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function ArrivalDepartureSection({
  queryId,
  queryDetails,
}: ArrivalDepartureSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [guests, setGuests] = useState<Array<{ id: string; name: string }>>([]);

  const hasTransferService = true; //queryDetails?.services?.includes("transfer");

  const form = useForm({
    resolver: zodResolver(ArrivalDepartureFormSchema),
    defaultValues: {
      arrivals: [
        {
          type: "arrival",
          from: "",
          to: "",
          arrival_date: "",
          arrival_time: "",
          dept_date: "",
          dept_time: "",
          airline: "",
          flight_no: "",
          passenger_ids: [],
        },
      ],
      departures: [
        {
          type: "departure",
          from: "",
          to: "",
          arrival_date: "",
          arrival_time: "",
          dept_date: "",
          dept_time: "",
          airline: "",
          flight_no: "",
          passenger_ids: [],
        },
      ],
      internal_flights: [],
    },
  });

  const {
    fields: arrivalFields,
    append: appendArrival,
    remove: removeArrival,
  } = useFieldArray({
    control: form.control,
    name: "arrivals",
  });

  const {
    fields: departureFields,
    append: appendDeparture,
    remove: removeDeparture,
  } = useFieldArray({
    control: form.control,
    name: "departures",
  });

  const {
    fields: internalFields,
    append: appendInternal,
    remove: removeInternal,
  } = useFieldArray({
    control: form.control,
    name: "internal_flights",
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const { leadGuest, passengers } = await fetchQueryGuests(queryId);
      const allGuests = [leadGuest, ...passengers].filter(Boolean) as { first_name: string; last_name: string }[];
      setGuests(
        allGuests.map((guest, index) => ({
          id: `guest-${index}`,
          name: `${guest.first_name} ${guest.last_name}${index === 0 ? " (Lead)" : ""}`,
        }))
      );

      const result = await getQuestionnaire(queryId);

      if (result.data) {
        // Load arrival/departure data
        if (
          result.data?.arrival_and_departure &&
          result.data.arrival_and_departure.length > 0
        ) {
          const arrivalDeparture = result.data
            .arrival_and_departure as ArrivalDeparture[];
          const arrivals = arrivalDeparture.filter(
            (item) => item.type === "arrival",
          );
          const departures = arrivalDeparture.filter(
            (item) => item.type === "departure",
          );
          const internalFlights = arrivalDeparture.filter(
            (item) => item.type === "internal",
          );

          // Load saved arrivals or keep default single entry
          if (arrivals.length > 0) {
            form.setValue("arrivals", arrivals as any);
            setHasData(true);
          }

          // Load saved departures or keep default single entry
          if (departures.length > 0) {
            form.setValue("departures", departures as any);
          }

          // Load saved internal flights (no default for these)
          if (internalFlights.length > 0) {
            form.setValue("internal_flights", internalFlights as any);
          }
        } else {
          // No saved data, go to edit mode (default entries already set in form defaultValues)
          setIsEditMode(true);
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [queryId]);

  const onSubmit = async (data: any) => {
    setIsSaving(true);

    const allFlights: ArrivalDeparture[] = [];

    if (data.arrivals && data.arrivals.length > 0) {
      allFlights.push(...data.arrivals.filter((a: any) => a.from && a.to));
    }
    if (data.departures && data.departures.length > 0) {
      allFlights.push(...data.departures.filter((d: any) => d.from && d.to));
    }
    if (data.internal_flights && data.internal_flights.length > 0) {
      allFlights.push(
        ...data.internal_flights.filter((f: any) => f.from && f.to),
      );
    }

    const result = await updateQuestionnaireField(
      queryId,
      "arrival_and_departure",
      allFlights,
    );

    if (result.error) {
      toast.error("Failed to save arrival & departure details", {
        description: result.error,
      });
    } else {
      toast.success("Arrival & departure details saved successfully");
      setHasData(true);
      setIsEditMode(false);
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasTransferService) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">
            Not applicable - no transfer services included in this booking.
          </p>
        </div>
      </div>
    );
  }

  // Show view mode if data exists and not in edit mode
  if (hasData && !isEditMode) {
    const arrivals = form.getValues("arrivals");
    const departures = form.getValues("departures");
    const internalFlights = form.getValues("internal_flights");

    return (
      <ArrivalDepartureView
        arrivals={arrivals}
        departures={departures}
        internalFlights={internalFlights}
        guests={guests}
        onEdit={() => setIsEditMode(true)}
      />
    );
  }

  const guestOptions = guests.map((g) => ({ value: g.id, label: g.name }));
  const hasGuests = guests.length > 0;

  return (
    <div className="flex flex-col h-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="flex-1 h-0">
            <div className="space-y-6 py-5 px-4">
              {/* Arrival Details Section */}
              <BorderedCard
                title={`Arrival Details (${arrivalFields.length})`}
                variant="dashed"
                collapsible
                defaultOpen
              >
                <div className="space-y-5 mt-4">
                  {arrivalFields.map((field, index) => {
                    const from = form.watch(`arrivals.${index}.from`);
                    const to = form.watch(`arrivals.${index}.to`);
                    const displayName =
                      from && to ? `${from} → ${to}` : `Arrival ${index + 1}`;

                    return (
                      <BorderedCard key={field.id} title={displayName}>
                        <div className="space-y-4">
                          <Show when={arrivalFields.length > 1}>
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeArrival(index)}
                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </Show>
                          <FlightFields
                            form={form}
                            basePath={`arrivals.${index}`}
                            guestOptions={guestOptions}
                            hasGuests={hasGuests}
                          />
                        </div>
                      </BorderedCard>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendArrival({
                        type: "arrival",
                        from: "",
                        to: "",
                        arrival_date: "",
                        arrival_time: "",
                        dept_date: "",
                        dept_time: "",
                        airline: "",
                        flight_no: "",
                        passenger_ids: [],
                      } as any)
                    }
                    className="w-full border-dashed border-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Arrival
                  </Button>
                </div>
              </BorderedCard>

              {/* Departure Details Section */}
              <BorderedCard
                title={`Departure Details (${departureFields.length})`}
                variant="dashed"
                collapsible
                defaultOpen
              >
                <div className="space-y-5 mt-4">
                  {departureFields.map((field, index) => {
                    const from = form.watch(`departures.${index}.from`);
                    const to = form.watch(`departures.${index}.to`);
                    const displayName =
                      from && to ? `${from} → ${to}` : `Departure ${index + 1}`;

                    return (
                      <BorderedCard key={field.id} title={displayName}>
                        <div className="space-y-4">
                          <Show when={departureFields.length > 1}>
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDeparture(index)}
                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                          </Show>
                          <FlightFields
                            form={form}
                            basePath={`departures.${index}`}
                            guestOptions={guestOptions}
                            hasGuests={hasGuests}
                          />
                        </div>
                      </BorderedCard>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendDeparture({
                        type: "departure",
                        from: "",
                        to: "",
                        arrival_date: "",
                        arrival_time: "",
                        dept_date: "",
                        dept_time: "",
                        airline: "",
                        flight_no: "",
                        passenger_ids: [],
                      } as any)
                    }
                    className="w-full border-dashed border-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Another Departure
                  </Button>
                </div>
              </BorderedCard>

              {/* Internal Flights Section */}
              <BorderedCard
                title={`Internal/Domestic Flights (${internalFields.length})`}
                variant="dashed"
                collapsible
                defaultOpen
              >
                <div className="space-y-5 mt-4">
                  {internalFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Plane className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No internal flights added yet</p>
                      <p className="text-sm mt-1">
                        Click the button below to add internal flights
                      </p>
                    </div>
                  ) : (
                    internalFields.map((field, index) => {
                      const from = form.watch(`internal_flights.${index}.from`);
                      const to = form.watch(`internal_flights.${index}.to`);
                      const displayName =
                        from && to
                          ? `${from} → ${to}`
                          : `Internal Flight ${index + 1}`;

                      return (
                        <BorderedCard key={field.id} title={displayName}>
                          <div className="space-y-4">
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeInternal(index)}
                                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            </div>
                            <FlightFields
                              form={form}
                              basePath={`internal_flights.${index}`}
                              guestOptions={guestOptions}
                              hasGuests={hasGuests}
                            />
                          </div>
                        </BorderedCard>
                      );
                    })
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendInternal({
                        type: "internal",
                        from: "",
                        to: "",
                        arrival_date: "",
                        arrival_time: "",
                        dept_date: "",
                        dept_time: "",
                        airline: "",
                        flight_no: "",
                        passenger_ids: [],
                      } as any)
                    }
                    className="w-full border-dashed border-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {internalFields.length > 0 ? "Another" : ""} Internal
                    Flight
                  </Button>
                </div>
              </BorderedCard>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-4 pt-2 px-4 border-t flex-shrink-0">
            <Show when={isEditMode}>
              <Button
                type="button"
                disabled={isSaving}
                size="lg"
                variant={"outline"}
                onClick={() => setIsEditMode(false)}
              >
                Cancel
              </Button>
            </Show>
            <Button type="submit" disabled={isSaving} size="lg">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Details
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
