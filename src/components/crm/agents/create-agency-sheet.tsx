"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/components/ui/phone-input";
import { VirtualizedAutocomplete } from "@/components/ui/virtualized-autocomplete";
import { toast } from "sonner";
import { fetchCountries, fetchCitiesByCountryId } from "@/data-access/datastore";
import { createAgency } from "@/data-access/crm-agency";
import { NewAgentSchema, type INewAgentForm } from "@/components/forms/schemas/new-agent-schema";
import type { IOption } from "@/types/common";
import { Building2, User } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  dmc_id: string;
  mode: "create";
  prefillEmail: string;
};

export default function CreateAgencySheet({ isOpen, onClose, dmc_id, prefillEmail }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [cityOptions, setCityOptions] = useState<IOption[]>([]);

  const form = useForm<INewAgentForm>({
    resolver: zodResolver(NewAgentSchema),
    defaultValues: {
      name: "",
      website: "",
      streetAddress: "",
      city_id: "",
      country_id: "",
      adminName: "",
      adminEmail: prefillEmail,
      adminPhone: "",
      password: "",
    },
  });

  const selectedCountry = form.watch("country_id");

  useEffect(() => {
    fetchCountries().then(setCountryOptions);
  }, []);

  useEffect(() => {
    if (!selectedCountry) {
      setCityOptions([]);
      form.setValue("city_id", "");
      return;
    }
    fetchCitiesByCountryId(selectedCountry).then(setCityOptions);
  }, [selectedCountry]);

  // Reset form email when prefill changes (sheet reopened with new email)
  useEffect(() => {
    form.setValue("adminEmail", prefillEmail);
  }, [prefillEmail]);

  const handleCreate = async (data: INewAgentForm) => {
    setSaving(true);
    try {
      const result = await createAgency(data, dmc_id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Agency created successfully");
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Create New Agency</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form id="create-agency-form" onSubmit={form.handleSubmit(handleCreate)} className="space-y-6">
              {/* Agency Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Agency Details
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Agency Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter agency name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Website <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full website address e.g. https://rategen.ai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="streetAddress"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>
                          Street Address <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <VirtualizedAutocomplete
                            options={countryOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select country"
                            searchPlaceholder="Search country..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <VirtualizedAutocomplete
                            options={cityOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select city"
                            searchPlaceholder="Search city..."
                            disabled={!selectedCountry}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Admin Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Admin Account
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="adminName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter admin name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <PhoneInput
                            placeholder="Enter a phone number"
                            value={field.value}
                            onChange={field.onChange}
                            defaultCountry="IN"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-agency-form" loading={saving} loadingText="Creating...">
            Create Agency
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
