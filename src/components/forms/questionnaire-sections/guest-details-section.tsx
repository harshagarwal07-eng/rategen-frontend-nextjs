"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addYears } from "date-fns";
import { Button } from "@/components/ui/button";
import { GuestDetailsView } from "./guest-details-view";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GuestDetailsFormSchema } from "../schemas/questionnaire-schema";
import {
  fetchQueryGuests,
  fetchGuestOptions,
  fetchGuestById,
  saveAllGuests,
} from "@/data-access/questionnaire";
import type { GuestDetail } from "@/types/questionnaire";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useCountryOptions } from "@/hooks/use-country-city-options";
import { DatePicker } from "@/components/ui/date-picker";
import Show from "@/components/ui/show";

interface GuestDetailsSectionProps {
  queryId: string;
  taId?: string;
  queryDetails?: {
    pax_details?: {
      adults?: number;
      children?: number;
      children_ages?: number[];
    };
    services?: string[];
  };
}

const TITLES = [
  { label: "Mr", value: "Mr" },
  { label: "Mrs", value: "Mrs" },
  { label: "Ms", value: "Ms" },
  { label: "Master", value: "Master" },
  { label: "Dr", value: "Dr" },
];

const GENDERS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const PASSENGER_TYPES = [
  { value: "adult", label: "Adult (12+)" },
  { value: "child", label: "Child (2-11)" },
  { value: "infant", label: "Infant (0-1)" },
];

export function GuestDetailsSection({ queryId, taId, queryDetails }: GuestDetailsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasData, setHasData] = useState(false);

  const form = useForm({
    resolver: zodResolver(GuestDetailsFormSchema),
    defaultValues: {
      lead_guest: {
        guest_id: "temp-guest-0",
        type: "adult" as const,
        title: "Mr",
        first_name: "",
        last_name: "",
        gender: "male",
        date_of_birth: "",
        nationality: "",
        nationality_name: "",
        passport_number: "",
        passport_issue_date: "",
        passport_expiry: "",
        contact_mobile: "",
        room_assignment: undefined,
        dietary_preference: "none",
        dietary_custom: "",
        food_allergies: "",
        medical_restrictions: "",
        bed_type: undefined,
        smoking: false,
        medical_conditions: "",
        mobility_assistance: "",
      },
      passengers: [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "passengers",
  });

  const { data: countryOptions = [], isLoading: isLoadingCountries } = useCountryOptions();

  const leadGuestId = useWatch({ control: form.control, name: "lead_guest.guest_id" });
  const passengerIds = useWatch({ control: form.control, name: "passengers" })?.map((p: any) => p.guest_id) ?? [];

  const selectedGuestIds = [leadGuestId, ...passengerIds].filter(
    (id): id is string => !!id && !id.startsWith("temp-")
  );

  const handleGuestSearch = useCallback(
    async (query: string) => {
      if (!taId) return [];
      const results = await fetchGuestOptions(taId, query);
      return selectedGuestIds.length ? results.filter((r) => !selectedGuestIds.includes(r.value)) : results;
    },
    [taId, selectedGuestIds.join(",")]
  );

  const handleFetchGuestById = async (id: string) => {
    const guest = await fetchGuestById(id);
    if (!guest) return null;
    const fullName = `${guest.first_name} ${guest.last_name}`.trim();
    const passport = guest.passport_number ?? "";
    return {
      value: guest.guest_id ?? id,
      label: passport ? `${fullName} | Passport No. - ${passport}` : fullName,
      code: guest.nationality_code ?? undefined,
    };
  };

  const populateGuestSlot = (slot: "lead_guest" | `passengers.${number}`, guest: GuestDetail) => {
    form.setValue(`${slot}.type` as any, guest.type);
    form.setValue(`${slot}.title` as any, guest.title);
    form.setValue(`${slot}.first_name` as any, guest.first_name);
    form.setValue(`${slot}.last_name` as any, guest.last_name);
    form.setValue(`${slot}.gender` as any, guest.gender);
    form.setValue(`${slot}.date_of_birth` as any, guest.date_of_birth);
    form.setValue(`${slot}.nationality` as any, guest.nationality);
    form.setValue(`${slot}.nationality_name` as any, guest.nationality_name ?? "");
    form.setValue(`${slot}.passport_number` as any, guest.passport_number);
    form.setValue(`${slot}.passport_issue_date` as any, guest.passport_issue_date);
    form.setValue(`${slot}.passport_expiry` as any, guest.passport_expiry);
    form.setValue(`${slot}.contact_mobile` as any, guest.contact_mobile ?? "");
    form.setValue(`${slot}.medical_conditions` as any, guest.medical_conditions ?? "");
    form.setValue(`${slot}.mobility_assistance` as any, guest.mobility_assistance ?? "");
    form.setValue(`${slot}.guest_id` as any, guest.guest_id ?? "");
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const { leadGuest, passengers: savedPassengers } = await fetchQueryGuests(queryId);

      if (!queryDetails?.pax_details) {
        setIsLoading(false);
        return;
      }

      const { adults = 0, children = 0, children_ages = [] } = queryDetails.pax_details;
      const totalPassengers = adults + children - 1;

      // Build template passenger slots from pax_details
      const newPassengers: any[] = [];

      for (let i = 0; i < adults - 1; i++) {
        newPassengers.push({
          guest_id: `temp-guest-${i + 1}`,
          type: "adult",
          title: "Mr",
          first_name: "",
          last_name: "",
          gender: "male",
          date_of_birth: "",
          nationality: "",
          nationality_name: "",
          passport_number: "",
          passport_issue_date: "",
          passport_expiry: "",
          room_assignment: undefined,
          smoking: false,
          medical_conditions: "",
          mobility_assistance: "",
        });
      }

      for (let i = 0; i < children; i++) {
        const childAge = children_ages[i];
        const childType = childAge !== undefined && childAge < 2 ? "infant" : "child";
        newPassengers.push({
          guest_id: `temp-guest-${(adults - 1) + i + 1}`,
          type: childType,
          title: "Mr",
          first_name: "",
          last_name: "",
          gender: "male",
          date_of_birth: "",
          nationality: "",
          nationality_name: "",
          passport_number: "",
          passport_issue_date: "",
          passport_expiry: "",
          room_assignment: undefined,
          smoking: false,
          medical_conditions: "",
          mobility_assistance: "",
        });
      }

      if (leadGuest) {
        form.setValue("lead_guest", leadGuest as any);
        setHasData(true);

        // Merge saved passengers into template slots
        for (let i = 0; i < newPassengers.length; i++) {
          if (savedPassengers[i]) {
            newPassengers[i] = savedPassengers[i];
          }
        }
      } else {
        setIsEditMode(true);
      }

      if (totalPassengers > 0) {
        form.setValue("passengers", newPassengers as any);
      }

      setIsLoading(false);
    };

    loadData();
  }, [queryId, form, queryDetails]);

  const onSubmit = async (data: any) => {
    setIsSaving(true);

    if (!taId) {
      toast.error("Cannot save guest details without a travel agent ID");
      setIsSaving(false);
      return;
    }

    const guestEntries: Array<{ guest: GuestDetail; order: number; isLead: boolean }> = [
      { guest: data.lead_guest as GuestDetail, order: 0, isLead: true },
      ...(data.passengers as GuestDetail[]).map((p, i) => ({ guest: p, order: i + 1, isLead: false })),
    ];

    const { results, error } = await saveAllGuests(queryId, taId, guestEntries);
    if (error) {
      toast.error("Failed to save guest details", { description: error });
      setIsSaving(false);
      return;
    }

    // Patch in real DB ids so re-saves do UPDATE instead of INSERT
    results.forEach(({ order, guestId }) => {
      if (order === 0) {
        form.setValue("lead_guest.guest_id" as any, guestId);
      } else {
        form.setValue(`passengers.${order - 1}.guest_id` as any, guestId);
      }
    });

    toast.success("Guest details saved successfully");
    setHasData(true);
    setIsEditMode(false);
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show view mode if data exists and not in edit mode
  if (hasData && !isEditMode) {
    const leadGuest = form.getValues("lead_guest");
    const passengers = form.getValues("passengers");

    return <GuestDetailsView leadGuest={leadGuest} passengers={passengers} onEdit={() => setIsEditMode(true)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* <div className="flex-shrink-0 my-4 pl-4">
        <h2 className="text-2xl font-bold">Guest Details</h2>
        <p className="text-muted-foreground">
          Provide complete information for all passengers traveling on this
          booking.
        </p>
      </div> */}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1 h-0">
            <div className="space-y-6 py-5 px-4">
              {/* Lead Guest Section */}
              <BorderedCard title="Lead Guest - Primary Contact" variant="dashed" collapsible defaultOpen>
                <div className="space-y-5 mt-4 ">
                  {taId && (
                    <Autocomplete
                      mode="server"
                      placeholder="Search existing guest..."
                      searchPlaceholder="Name or passport..."
                      onSearch={handleGuestSearch}
                      fetchByValue={handleFetchGuestById}
                      showCountryFlag
                      onChange={async (id) => {
                        const guest = await fetchGuestById(id);
                        if (guest) populateGuestSlot("lead_guest", guest);
                      }}
                    />
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <FormField
                      control={form.control}
                      name="lead_guest.title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select title" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TITLES.map((title) => (
                                <SelectItem key={title.value} value={title.value}>
                                  {title.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter first name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {GENDERS.map((gender) => (
                                <SelectItem key={gender.value} value={gender.value}>
                                  {gender.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              placeholder="Select date of birth"
                              maxDate={new Date()}
                              captionLayout="dropdown"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.nationality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nationality *</FormLabel>
                          <Autocomplete
                            options={countryOptions}
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              // Store the country name for display
                              const country = countryOptions.find((c) => c.value === value);
                              if (country) {
                                form.setValue("lead_guest.nationality_name", country.label);
                              }
                            }}
                            placeholder="Select country"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.passport_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter passport number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.passport_issue_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Issue Date *</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                if (date && !form.getValues("lead_guest.passport_expiry")) {
                                  form.setValue("lead_guest.passport_expiry", format(addYears(date, 10), "yyyy-MM-dd"));
                                }
                              }}
                              placeholder="Select passport issue date"
                              minDate={new Date(new Date().getFullYear() - 15, 0, 1)}
                              maxDate={new Date()}
                              captionLayout="dropdown"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.passport_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Passport Expiry *</FormLabel>
                          <FormControl>
                            <DatePicker
                              value={field.value ? new Date(field.value) : undefined}
                              onChange={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                if (date && !form.getValues("lead_guest.passport_issue_date")) {
                                  form.setValue("lead_guest.passport_issue_date", format(addYears(date, -10), "yyyy-MM-dd"));
                                }
                              }}
                              placeholder="Select passport expiry"
                              minDate={new Date()}
                              maxDate={new Date(new Date().getFullYear() + 15, 11, 31)}
                              captionLayout="dropdown"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.contact_mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Mobile *</FormLabel>
                          <FormControl>
                            <PhoneInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Enter phone number"
                              defaultCountry="IN"
                              international
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Medical & Mobility Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <FormField
                      control={form.control}
                      name="lead_guest.medical_conditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Conditions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any medical conditions we should be aware of" rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lead_guest.mobility_assistance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobility Assistance</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Any mobility assistance required" rows={3} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </BorderedCard>

              {/* Other Passengers Section */}
              {fields.length > 0 && (
              <BorderedCard title={`Other Passengers (${fields.length})`} variant="dashed" collapsible defaultOpen>
                <div className="space-y-5 mt-4">
                    {fields.map((field, index) => {
                      const firstName = form.watch(`passengers.${index}.first_name`);
                      const lastName = form.watch(`passengers.${index}.last_name`);
                      const displayName = firstName ? `${firstName} ${lastName}`.trim() : `Passenger ${index + 2}`;

                      return (
                        <BorderedCard key={field.id} title={displayName}>
                          <div className="space-y-4">
                            {taId && (
                              <Autocomplete
                                mode="server"
                                placeholder="Search existing guest..."
                                searchPlaceholder="Name or passport..."
                                onSearch={handleGuestSearch}
                                fetchByValue={handleFetchGuestById}
                                showCountryFlag
                                onChange={async (id) => {
                                  const guest = await fetchGuestById(id);
                                  if (guest) populateGuestSlot(`passengers.${index}`, guest);
                                }}
                              />
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                              <FormField
                                control={form.control}
                                name={`passengers.${index}.type`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Passenger Type *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {PASSENGER_TYPES.map((type) => (
                                          <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select title" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {TITLES.map((title) => (
                                          <SelectItem key={title.value} value={title.value}>
                                            {title.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.first_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>First Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter first name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.last_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Last Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter last name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.gender`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Gender *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="w-full">
                                          <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {GENDERS.map((gender) => (
                                          <SelectItem key={gender.value} value={gender.value}>
                                            {gender.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.date_of_birth`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Date of Birth *</FormLabel>
                                    <FormControl>
                                      <DatePicker
                                        value={field.value ? new Date(field.value) : undefined}
                                        onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                                        placeholder="Select date of birth"
                                        maxDate={new Date()}
                                        captionLayout="dropdown"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.nationality`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nationality *</FormLabel>
                                    <Autocomplete
                                      options={countryOptions}
                                      value={field.value}
                                      onChange={(value) => {
                                        field.onChange(value);
                                        // Store the country name for display
                                        const country = countryOptions.find((c) => c.value === value);
                                        if (country) {
                                          form.setValue(`passengers.${index}.nationality_name`, country.label);
                                        }
                                      }}
                                      placeholder="Select country"
                                    />
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.passport_number`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Passport Number *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Enter passport number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.passport_issue_date`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Passport Issue Date *</FormLabel>
                                    <FormControl>
                                      <DatePicker
                                        value={field.value ? new Date(field.value) : undefined}
                                        onChange={(date) => {
                                          field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                          if (date && !form.getValues(`passengers.${index}.passport_expiry`)) {
                                            form.setValue(`passengers.${index}.passport_expiry`, format(addYears(date, 10), "yyyy-MM-dd"));
                                          }
                                        }}
                                        placeholder="Select passport issue date"
                                        minDate={new Date(new Date().getFullYear() - 15, 0, 1)}
                                        maxDate={new Date()}
                                        captionLayout="dropdown"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.passport_expiry`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Passport Expiry *</FormLabel>
                                    <FormControl>
                                      <DatePicker
                                        value={field.value ? new Date(field.value) : undefined}
                                        onChange={(date) => {
                                          field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                          if (date && !form.getValues(`passengers.${index}.passport_issue_date`)) {
                                            form.setValue(`passengers.${index}.passport_issue_date`, format(addYears(date, -10), "yyyy-MM-dd"));
                                          }
                                        }}
                                        placeholder="Select passport expiry"
                                        minDate={new Date()}
                                        maxDate={new Date(new Date().getFullYear() + 15, 11, 31)}
                                        captionLayout="dropdown"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Medical & Mobility Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                              <FormField
                                control={form.control}
                                name={`passengers.${index}.medical_conditions`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Medical Conditions</FormLabel>
                                    <FormControl>
                                      <Textarea placeholder="Any medical conditions" rows={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`passengers.${index}.mobility_assistance`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Mobility Assistance</FormLabel>
                                    <FormControl>
                                      <Textarea placeholder="Any mobility assistance required" rows={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </BorderedCard>
                      );
                    })}
                </div>
              </BorderedCard>
              )}
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
