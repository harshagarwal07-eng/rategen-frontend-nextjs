import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createDoc } from "@/data-access/docs";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import TiptapEditor from "@/components/editor/TiptapEditor";
import { Doc } from "@/types/docs";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDocFormSchema,
  type DocFormData,
} from "@/components/forms/schemas/docs-form-schema";
import { IOption } from "@/types/common";
import { useRouter } from "next/navigation";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERVICE_TYPES } from "@/constants/data";
import { useStateOptions } from "@/hooks/use-country-city-options";

interface Props {
  allowMultiplePerCountry: boolean;
  docs: Doc[];
  title: string;
  docType: string;
  showNights: boolean;
  countries: IOption[];
}

export default function AddDocSheet({
  allowMultiplePerCountry,
  docs,
  title,
  docType,
  showNights,
  countries,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const editorRef = useRef<any>(null);

  const [isAddingDoc, setIsAddingDoc] = useState(false);

  const countryCodeById = Object.fromEntries(
    countries.map((c) => [c.value, c.code!])
  );

  const form = useForm<DocFormData>({
    resolver: zodResolver(createDocFormSchema(countryCodeById)),
    defaultValues: {
      is_active: true,
      country: "",
      state: "",
      nights: showNights ? 1 : undefined,
      content: "",
      service_type: showNights ? undefined : "tours", // Default to tours for non-itinerary docs
    },
  });

  const handleAddDoc = async (values: DocFormData) => {
    // Check for duplicate country + service_type combination (except for itineraries)
    if (!allowMultiplePerCountry) {
      const existingDoc = docs.find(
        (doc) =>
          doc.country === values.country &&
          (!!values.state ? doc.state === values.state : true) &&
          doc.service_type === values.service_type
      );
      if (existingDoc) {
        toast.error(
          `A ${title.toLowerCase()} entry already exists for this country${!!values.state ? ", state" : ""} and service type`
        );
        return;
      }
    }

    startTransition(async () => {
      const { error } = await createDoc({
        type: docType,
        country: values.country,
        content: values.content,
        nights: values.nights,
        service_type: values.service_type,
        state: values.state,
      });

      if (error) {
        toast.error(error);
        return;
      }

      form.reset();
      setIsAddingDoc(false);
      toast.success(`${title} created successfully`);
      router.refresh();
    });
  };

  const country = form.watch("country");

  useEffect(() => {
    const countryCode = countryCodeById[country];

    if (countryCode !== "IN") {
      form.setValue("state", "", { shouldValidate: true });
    }
  }, [country, countryCodeById, form]);

  const { data: states } = useStateOptions(country);

  return (
    <Sheet open={isAddingDoc} onOpenChange={setIsAddingDoc}>
      <SheetTrigger asChild>
        <Button
          onClick={() => setIsAddingDoc(true)}
          size="sm"
          className="sm:min-w-40"
        >
          <Plus />
          Add New
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-screen-2xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Add New {title}</SheetTitle>
          <SheetDescription>
            Create a new {title.toLowerCase()} entry with content.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddDoc)}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Autocomplete
                        options={countries}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select country"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {countryCodeById[country] === "IN" && (
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Autocomplete
                          options={states || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select State"
                          // disabled={isStatesLoading}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {!showNights && (
                  <FormField
                    control={form.control}
                    name="service_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_TYPES.map((type) => (
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
                )}

                {showNights && (
                  <FormField
                    control={form.control}
                    name="nights"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Nights</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Enter number of nights"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <div className="border rounded-lg">
                        <TiptapEditor
                          onChange={field.onChange}
                          editorRef={editorRef}
                          placeholder="Write your content here..."
                          key={`add-${title}`}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/10">
                        <Checkbox
                          id="toggle-active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        />
                        <div className="grid gap-1.5 font-normal">
                          <p className="text-sm leading-none font-medium">
                            Active
                          </p>
                          <p className="text-muted-foreground text-xs">
                            If checked, this will be used by AI to generate
                            content.
                          </p>
                        </div>
                      </Label>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingDoc(false);
                    form.reset();
                  }}
                  disabled={isAddingDoc}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  loading={isPending}
                  loadingText={`Creating ${title}`}
                >
                  Create {title}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
