"use client";

import { useForm } from "react-hook-form";
import { IQueryForm, QueryFormSchema } from "./schemas/query-form-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { Input } from "../ui/input";
import TiptapEditor from "../editor/TiptapEditor";
import { useEffect, useRef, useState } from "react";
import { IOption } from "@/types/common";
import { fetchCountries } from "@/data-access/datastore";
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from "../ui/multi-select";
import { FlagComponent } from "../ui/phone-input";
import { Country } from "react-phone-number-input";
import { Autocomplete } from "../ui/autocomplete";
import PaxCounter from "../common/pax-counter";
import { createCrmQuery, updateCrmQuery } from "@/data-access/crm-queries";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import SourceSelector from "../common/source-selector";
import useUser from "@/hooks/use-user";
import Show from "../ui/show";
import { getCrmAgencyOptions } from "@/data-access/crm-agency";

type Props = {
  initialData: IQueryForm | null;
  onSuccess?: (queryId?: string) => void;
};

interface ITaOption extends IOption {
  email?: string;
  admin_name?: string;
  admin_phone?: string;
}

export default function QueryForm({ initialData, onSuccess }: Props) {
  const editorRef = useRef<any>(null);
  const router = useRouter();
  const { user } = useUser();

  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [taOptions, setTaOptions] = useState<ITaOption[]>([]);
  const [taInfo, setTaInfo] = useState<ITaOption | null>(null);

  const form = useForm<IQueryForm>({
    resolver: zodResolver(QueryFormSchema),
    defaultValues: {
      message: initialData?.message ?? "",
      travel_date: initialData?.travel_date ? new Date(initialData.travel_date) : new Date(),
      traveler_name: initialData?.traveler_name ?? "",
      travel_countries: initialData?.travel_countries ?? [],
      nationality: initialData?.nationality ?? undefined,
      pax_details: {
        adults: initialData?.pax_details?.adults ?? 1,
        children: initialData?.pax_details?.children ?? 0,
        children_ages: initialData?.pax_details?.children_ages ?? [],
      },
      source: initialData?.source ?? undefined,
      ta_id: initialData?.ta_id ?? undefined,
      query_type: initialData?.query_type ?? undefined,
      services: initialData?.services ?? [],
      duration: initialData?.duration ?? undefined,
    },
  });

  async function onSubmit(values: IQueryForm) {
    try {
      const result =
        initialData && initialData.id ? await updateCrmQuery(initialData.id, values) : await createCrmQuery(values);

      if (result.error) return toast.error(result.error);

      const isCreating = !initialData;
      toast.success(initialData ? "Query updated successfully" : "Query created successfully");

      // Call onSuccess with queryId for new queries, let parent handle navigation
      if (isCreating && result.data?.id) {
        onSuccess?.(result.data.id);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save query");
    }
  }

  useEffect(() => {
    fetchCountries().then((options) => {
      setCountryOptions(options);
    });
    if (user?.dmc.id) {
      getCrmAgencyOptions(user.dmc.id).then((data) => {
        setTaOptions(data);
      });  
    }
  }, [user?.dmc.id]);

  const selectedTa = form.watch("ta_id");

  useEffect(() => {
    if (selectedTa && taOptions.length > 0) {
      setTaInfo(taOptions.find((v) => v.value === selectedTa) ?? null);
    }
  }, [selectedTa, taOptions]);

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 border rounded-lg p-6">
          <h4 className="text-md font-semibold">Query Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="traveler_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Traveler Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter full name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationality</FormLabel>
                  <Autocomplete
                    options={countryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    showCountryFlag
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="travel_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Travel Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0 w-auto">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={{ before: new Date() }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nights</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      placeholder="e.g. 5"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="travel_countries"
              render={({ field }) => {
                const fieldValue = Array.isArray(field.value) ? field.value : [];

                return (
                  <FormItem>
                    <FormLabel>Travel Country(s)</FormLabel>
                    <FormControl className="space-y-0">
                      <MultiSelector values={fieldValue} onValuesChange={field.onChange} loop>
                        <MultiSelectorTrigger data={countryOptions} keyString={"label"} valueString={"value"}>
                          <MultiSelectorInput placeholder="Select countries(s)" />
                        </MultiSelectorTrigger>
                        <MultiSelectorContent>
                          <MultiSelectorList className="z-20 mt-1">
                            {countryOptions.map((country) => (
                              <MultiSelectorItem value={country.value} key={country.value}>
                                <span className="flex items-center gap-2">
                                  <FlagComponent country={country.code as Country} countryName={country.label} />
                                  {country.label}
                                </span>
                              </MultiSelectorItem>
                            ))}
                          </MultiSelectorList>
                        </MultiSelectorContent>
                      </MultiSelector>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pax_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PAX Details</FormLabel>
                  <FormControl>
                    <PaxCounter
                      value={field.value}
                      onChange={field.onChange}
                      showRooms={false}
                      heading="Travelers"
                      description="Add number of travelers"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <FormControl>
                    <SourceSelector dmcId={user?.dmc.id || ""} value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4 border rounded-lg p-6">
          <h4 className="text-md font-semibold">Travel Agency Details</h4>

          <div className="flex gap-4 items-end">
            <FormField
              control={form.control}
              name="ta_id"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Search Agency</FormLabel>
                  <FormControl>
                    <Autocomplete
                      options={taOptions}
                      onChange={field.onChange}
                      value={field.value}
                      placeholder="Search existing agency..."
                      disabled={!!initialData || isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Show when={!!selectedTa}>
            <>
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <Input value={taInfo?.label || ""} disabled />
              </FormItem>
              <FormItem>
                <FormLabel>Email</FormLabel>
                <Input value={taInfo?.email || ""} disabled />
              </FormItem>
              <div className="grid grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Admin Name</FormLabel>
                  <Input value={taInfo?.admin_name || ""} disabled />
                </FormItem>
                <FormItem>
                  <FormLabel>Admin Phone</FormLabel>
                  <Input value={taInfo?.admin_phone || ""} disabled />
                </FormItem>
              </div>
            </>
          </Show>
        </div>

        {!initialData && (
          <div className="space-y-4 border rounded-lg p-6">
            <h4 className="text-md font-semibold">Message</h4>

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="border rounded-lg">
                      <TiptapEditor
                        onChange={field.onChange}
                        editorRef={editorRef}
                        placeholder="Write your message here..."
                        key={form.getValues("id") || "new-query"}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onSuccess?.();
              form.reset();
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            loading={isLoading}
            loadingText={initialData ? "Updating Query" : "Creating Query"}
          >
            {initialData ? "Update Query" : "Create Query"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
