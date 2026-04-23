import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import TiptapEditor from "@/components/editor/TiptapEditor";
import { Doc } from "@/types/docs";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { baseDocFormSchema, createDocFormSchema, type DocFormData } from "@/components/forms/schemas/docs-form-schema";
import { IOption } from "@/types/common";
import { useRouter } from "next/navigation";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useTransition } from "react";
import { updateDoc } from "@/data-access/docs";
import { Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERVICE_TYPES } from "@/constants/data";
import { useStateOptions } from "@/hooks/use-country-city-options";

interface Props {
  allowMultiplePerCountry: boolean;
  docs: Doc[];
  title: string;
  showNights: boolean;
  countries: IOption[];
  doc: Doc;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function EditDocSheet({
  allowMultiplePerCountry,
  docs,
  title,
  showNights,
  countries,
  doc,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialContent = doc.content || "";
  const [internalOpen, setInternalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);

  const isControlled = controlledOpen !== undefined;
  const isEditSheetOpen = isControlled ? controlledOpen : internalOpen;
  const setIsEditSheetOpen = isControlled ? (v: boolean) => controlledOnOpenChange?.(v) : setInternalOpen;

  const countryCodeById = Object.fromEntries(countries.map((c) => [c.value, c.code!]));

  const editFormSchema = showNights ? baseDocFormSchema : baseDocFormSchema.omit({ nights: true });

  const editForm = useForm<DocFormData>({
    resolver: zodResolver(createDocFormSchema(countryCodeById, editFormSchema)),
    defaultValues: {
      is_active: true,
      country: "",
      state: "",
      nights: showNights ? 1 : undefined,
      content: "",
      service_type: undefined,
    },
  });

  const handleSaveEdit = async (values: DocFormData) => {
    if (!editingDoc) return;

    // Check for duplicate country + service_type combination (except for itineraries and if nothing changed)
    if (
      !allowMultiplePerCountry &&
      (values.country !== editingDoc.country || values.service_type !== editingDoc.service_type)
    ) {
      const existingDoc = docs.find(
        (doc) =>
          doc.country === values.country &&
          (!!values.state ? doc.state === values.state : true) &&
          doc.service_type === values.service_type &&
          doc.id !== editingDoc.id
      );
      if (existingDoc) {
        toast.error(
          `A ${title.toLowerCase()} entry already exists for this country${!!values.state ? ", state" : ""} and service type`
        );
        return;
      }
    }

    startTransition(async () => {
      // Separate content update from other fields
      const { content, ...otherFields } = values;

      // Update document properties
      if (Object.keys(otherFields).length > 0) {
        const { error: fieldsError } = await updateDoc(editingDoc.id, {
          ...otherFields,
          state: (otherFields.state as string) || null,
        });
        if (fieldsError) {
          toast.error(fieldsError);
          return;
        }
      }

      // Update content if provided
      if (content && content.trim()) {
        const { error: contentError } = await updateDoc(editingDoc.id, {
          content,
        });
        if (contentError) {
          toast.error(contentError);
          return;
        }
      }

      setIsEditSheetOpen(false);
      setEditingDoc(null);
      toast.success(`${title} updated successfully`);
      router.refresh();
    });
  };

  // Start editing
  const handleStartEdit = (doc: Doc) => {
    setEditingDoc(doc);
    editForm.reset({
      is_active: doc.is_active,
      country: doc.country,
      state: doc.state || "",
      nights: doc.nights,
      content: doc.content || "",
      service_type: doc.service_type as string,
    });
    setIsEditSheetOpen(true);
  };

  // When opened externally (controlled), initialize form
  useEffect(() => {
    if (isControlled && controlledOpen && !editingDoc) {
      handleStartEdit(doc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledOpen]);

  const country = editForm.watch("country");

  useEffect(() => {
    const countryCode = countryCodeById[country];

    if (countryCode !== "IN") {
      editForm.setValue("state", "", { shouldValidate: true });
    }
  }, [country, countryCodeById, editForm]);

  const { data: states } = useStateOptions(country);

  return (
    <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
      {!isControlled && (
        <SheetTrigger asChild>
          <Button size="sm" variant="ghost" onClick={() => handleStartEdit(doc)} className="h-8 w-8 p-0" title="Edit">
            <Edit />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="sm:max-w-screen-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit {title}</SheetTitle>
          <SheetDescription>Update the properties and content for this {title.toLowerCase()}.</SheetDescription>
        </SheetHeader>
        <div className="p-4">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleSaveEdit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                    control={editForm.control}
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
                    control={editForm.control}
                    name="service_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    control={editForm.control}
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
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={editForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <div className="border rounded-lg">
                        <TiptapEditor
                          onChange={field.onChange}
                          initialContent={initialContent}
                          placeholder="Edit your content here..."
                          key={`edit-${editingDoc?.id}`}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/10">
                        <Checkbox
                          id="edit-toggle-active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        />
                        <div className="grid gap-1.5 font-normal">
                          <p className="text-sm leading-none font-medium">Active</p>
                          <p className="text-muted-foreground text-xs">
                            If checked, this will be used by AI to generate content.
                          </p>
                        </div>
                      </Label>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditSheetOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} loading={isPending} loadingText={`Saving ${title}`}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
