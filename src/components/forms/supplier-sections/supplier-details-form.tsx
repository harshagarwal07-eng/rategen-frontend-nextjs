"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Star } from "lucide-react";
import { ISupplierDetails, ISupplierTeamMember, SupplierFormSchema } from "../schemas/suppliers-schema";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Switch } from "@/components/ui/switch";
import { PhoneInput } from "@/components/ui/phone-input";
import { fetchCountries, fetchCitiesByCountryId } from "@/data-access/datastore";
import { VirtualizedAutocomplete } from "@/components/ui/virtualized-autocomplete";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { DEPARTMENT_OPTIONS, BOOKING_MODE_OPTIONS } from "@/constants/data";
import { IOption } from "@/types/common";
import { ISupplierTeamMemberData } from "@/types/suppliers";

interface SupplierDetailsFormProps {
  initialData?: Partial<ISupplierDetails> & { city_name?: string; country_name?: string };
  disableDelete?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  onValidationFail?: () => void;
  onNext: (data: {
    name: string;
    category?: string[];
    website?: string;
    is_active: boolean;
    address?: string;
    city?: string;
    country?: string;
    city_name?: string;
    country_name?: string;
    booking_mode?: string;
    team_members: ISupplierTeamMemberData[];
  }) => void;
}

export default function SupplierDetailsForm({ initialData, disableDelete, formRef, onValidationFail, onNext }: SupplierDetailsFormProps) {
  const [teamMembers, setTeamMembers] = useState<ISupplierTeamMemberData[]>([]);
  const [teamMemberErrors, setTeamMemberErrors] = useState<{
    [key: number]: { name?: string; email?: string };
  }>({});
  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [cityOptions, setCityOptions] = useState<IOption[]>([]);
  const [selectedCityName, setSelectedCityName] = useState<string | undefined>(undefined);
  const [selectedCountryName, setSelectedCountryName] = useState<string | undefined>(undefined);

  const form = useForm({
    resolver: zodResolver(SupplierFormSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      category: initialData?.category || [],
      website: initialData?.website || "",
      is_active: initialData?.is_active ?? true,
      address: initialData?.address || "",
      city: initialData?.city || "",
      country: initialData?.country || "",
      booking_mode: initialData?.booking_mode || undefined,
      team_members: initialData?.team_members || [],
    },
  });

  // Fetch countries on mount
  useEffect(() => {
    fetchCountries().then((options) => setCountryOptions(options));
  }, []);

  // Watch country to fetch cities
  const country = form.watch("country");
  useEffect(() => {
    if (!country) {
      setCityOptions([]);
      return;
    }
    fetchCitiesByCountryId(country).then((options) => setCityOptions(options));
  }, [country]);

  // Clear city when country changes
  useEffect(() => {
    const subscription = form.watch((_, { name }) => {
      if (name === "country") {
        setCityOptions([]);
        form.setValue("city", "");
        setSelectedCityName(undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Initialize team members only once on mount
  useEffect(() => {
    if (initialData?.team_members && initialData.team_members.length > 0) {
      const transformedMembers = initialData.team_members.map((member) => ({
        ...member,
        phone: member.phone ?? "",
        department: member.department ?? [],
      }));
      setTeamMembers(transformedMembers);
      form.setValue("team_members", transformedMembers);
    } else {
      const defaultMember = [{ id: crypto.randomUUID(), name: "", email: "", phone: "", department: [] }];
      setTeamMembers(defaultMember);
      form.setValue("team_members", defaultMember);
    }

    setSelectedCityName(initialData?.city_name);
    setSelectedCountryName(initialData?.country_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Team member management
  const addTeamMember = useCallback(() => {
    const newMember = {
      id: crypto.randomUUID(),
      name: "",
      email: "",
      phone: "",
      department: [] as string[],
      is_primary: false,
    };
    setTeamMembers((prev) => [...prev, newMember]);
    const currentMembers = form.getValues("team_members") || [];
    form.setValue("team_members", [...currentMembers, newMember]);
  }, [form]);

  const setPrimaryMember = useCallback(
    (memberId: string) => {
      setTeamMembers((prev) => {
        const updated = prev.map((m) => ({ ...m, is_primary: m.id === memberId }));
        form.setValue("team_members", updated);
        return updated;
      });
    },
    [form]
  );

  const removeTeamMember = useCallback(
    (index: number) => {
      setTeamMembers((prev) => prev.filter((_, i) => i !== index));
      const currentMembers = form.getValues("team_members") || [];
      form.setValue(
        "team_members",
        currentMembers.filter((_, i) => i !== index)
      );
    },
    [form]
  );

  const updateTeamMember = useCallback(
    (index: number, field: keyof ISupplierTeamMember, value: string | string[]) => {
      setTeamMembers((prev) => {
        const updatedMembers = prev.map((member, i) => (i === index ? { ...member, [field]: value } : member));
        form.setValue("team_members", updatedMembers);
        return updatedMembers;
      });
    },
    [form]
  );

  const onSubmit = (data: any) => {
    onNext({
      name: data.name,
      category: data.category,
      website: data.website || undefined,
      is_active: data.is_active,
      address: data.address || undefined,
      city: data.city || undefined,
      country: data.country || undefined,
      city_name: selectedCityName,
      country_name: selectedCountryName,
      booking_mode: data.booking_mode || undefined,
      team_members: teamMembers,
    });
  };

  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit, onValidationFail)} className="space-y-8">
        {/* General Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Supplier Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <VirtualizedAutocomplete
                      options={countryOptions}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        const selected = countryOptions.find((opt) => opt.value === value);
                        setSelectedCountryName(selected?.label);
                      }}
                      placeholder="Select country"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <VirtualizedAutocomplete
                      options={cityOptions}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        const selected = cityOptions.find((opt) => opt.value === value);
                        setSelectedCityName(selected?.label);
                      }}
                      placeholder="Select city"
                      emptyMessage={country ? "No cities found" : "Select country first"}
                      disabled={!country}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <MultiSelector values={field.value || []} onValuesChange={field.onChange}>
                      <MultiSelectorTrigger
                        data={[
                          { value: "hotel", label: "Hotel" },
                          { value: "tour", label: "Tour" },
                          { value: "transfer", label: "Transfer" },
                          { value: "meal", label: "Meal" },
                          { value: "guide", label: "Guide" },
                        ]}
                        keyString="label"
                        valueString="value"
                        className="my-auto"
                      >
                        <MultiSelectorInput placeholder="Select categories..." />
                      </MultiSelectorTrigger>
                      <MultiSelectorContent>
                        <MultiSelectorList>
                          <MultiSelectorItem value="hotel">Hotel</MultiSelectorItem>
                          <MultiSelectorItem value="tour">Tour</MultiSelectorItem>
                          <MultiSelectorItem value="transfer">Transfer</MultiSelectorItem>
                          <MultiSelectorItem value="meal">Meal</MultiSelectorItem>
                          <MultiSelectorItem value="guide">Guide</MultiSelectorItem>
                        </MultiSelectorList>
                      </MultiSelectorContent>
                    </MultiSelector>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...field}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value && !value.startsWith("http://") && !value.startsWith("https://")) {
                          value = "https://" + value;
                        }
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="booking_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select booking mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BOOKING_MODE_OPTIONS.map((opt: { value: string; label: string }) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
              name="is_active"
              render={({ field }) => (
                <FormItem className="min-w-64">
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <div className="flex items-center h-10 px-3">
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                      <span className="ml-3 text-sm text-muted-foreground">{field.value ? "Active" : "Inactive"}</span>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contacts Section */}
        <BorderedCard title="Contacts" collapsible>
          <div className="space-y-4">
            {form.formState.errors.team_members && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.team_members.message}</p>
            )}
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 border-2 rounded-lg bg-card ${
                  member.is_primary ? "border-primary/50" : "border-border"
                }`}
              >
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Contact name"
                        value={member.name}
                        onChange={(e) => {
                          updateTeamMember(index, "name", e.target.value);
                          if (teamMemberErrors[index]?.name) {
                            setTeamMemberErrors((prev) => {
                              const newErrors = { ...prev };
                              if (newErrors[index]) {
                                delete newErrors[index].name;
                                if (Object.keys(newErrors[index]).length === 0) {
                                  delete newErrors[index];
                                }
                              }
                              return newErrors;
                            });
                          }
                        }}
                      />
                    </FormControl>
                    {teamMemberErrors[index]?.name && (
                      <p className="text-sm font-medium text-destructive">{teamMemberErrors[index].name}</p>
                    )}
                  </FormItem>

                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={member.email}
                        onChange={(e) => {
                          updateTeamMember(index, "email", e.target.value);
                          if (teamMemberErrors[index]?.email) {
                            setTeamMemberErrors((prev) => {
                              const newErrors = { ...prev };
                              if (newErrors[index]) {
                                delete newErrors[index].email;
                                if (Object.keys(newErrors[index]).length === 0) {
                                  delete newErrors[index];
                                }
                              }
                              return newErrors;
                            });
                          }
                        }}
                      />
                    </FormControl>
                    {teamMemberErrors[index]?.email && (
                      <p className="text-sm font-medium text-destructive">{teamMemberErrors[index].email}</p>
                    )}
                  </FormItem>

                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder="Enter phone number"
                        value={member.phone}
                        defaultCountry="IN"
                        onChange={(value) => updateTeamMember(index, "phone", value)}
                      />
                    </FormControl>
                  </FormItem>

                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <MultiSelector
                        values={member.department || []}
                        onValuesChange={(values) => updateTeamMember(index, "department", values)}
                      >
                        <MultiSelectorTrigger
                          data={DEPARTMENT_OPTIONS}
                          keyString="label"
                          valueString="value"
                          className="my-auto"
                        >
                          <MultiSelectorInput placeholder="Select departments..." />
                        </MultiSelectorTrigger>
                        <MultiSelectorContent>
                          <MultiSelectorList>
                            {DEPARTMENT_OPTIONS.map((opt: { value: string; label: string }) => (
                              <MultiSelectorItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MultiSelectorItem>
                            ))}
                          </MultiSelectorList>
                        </MultiSelectorContent>
                      </MultiSelector>
                    </FormControl>
                  </FormItem>
                </div>
                <div className="flex flex-col gap-1 mt-6 shrink-0">
                  <Button
                    type="button"
                    variant={member.is_primary ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPrimaryMember(member.id!)}
                    className="h-7 px-2 text-xs gap-1"
                    title={member.is_primary ? "Primary contact" : "Set as primary contact"}
                  >
                    <Star className={`h-3 w-3 ${member.is_primary ? "fill-current" : ""}`} />
                    {member.is_primary ? "Primary" : "Set Primary"}
                  </Button>
                  {teamMembers.length > 1 && !disableDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTeamMember(index)}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-center mt-4">
              <Button type="button" variant="dashed" onClick={addTeamMember} className="w-full max-w-md">
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </BorderedCard>
      </form>
    </Form>
  );
}
