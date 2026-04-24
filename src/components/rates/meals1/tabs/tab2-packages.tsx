"use client";

import { useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertModal } from "@/components/ui/alert-modal";
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";
import {
  createPackage,
  updatePackage,
  deletePackage,
  replaceAgePolicies,
  replacePricing,
  replaceCancellationPolicies,
} from "@/data-access/meals1";
import { MealPackage, MealCuisine, MealProduct } from "@/types/meals1";

const AgeBandRowSchema = z.object({
  band_type: z.enum(["adult", "child", "infant"]),
  age_from: z.coerce.number().min(0),
  age_to: z.coerce.number().min(0),
  amount: z.coerce.number().min(0),
});

const CancellationPolicyRowSchema = z.object({
  days_before: z.coerce.number().min(0),
  penalty_type: z.enum(["percentage", "fixed"]),
  penalty_amount: z.coerce.number().min(0),
});

const PackageFormSchema = z.object({
  name: z.string().min(1, "Package name is required"),
  type: z.enum(["veg", "non-veg", "veg-non-veg"]),
  cuisine_id: z.string().nullable().optional(),
  venue_name: z.string().nullable().optional(),
  menu_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  inclusions: z.string().nullable().optional(),
  exclusions: z.string().nullable().optional(),
  is_preferred: z.boolean().optional(),
  age_bands: z.array(AgeBandRowSchema),
  cancellation_policies: z.array(CancellationPolicyRowSchema),
});

type PackageFormValues = z.infer<typeof PackageFormSchema>;

interface PackageCardProps {
  mealId: string;
  pkg: MealPackage;
  cuisines: MealCuisine[];
  onSaved: (updated: MealPackage) => void;
  onDeleted: () => void;
}

function PackageCard({ mealId, pkg, cuisines, onSaved, onDeleted }: PackageCardProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const defaultAgeBands: PackageFormValues["age_bands"] =
    pkg.meal_age_policies && pkg.meal_age_policies.length > 0
      ? pkg.meal_age_policies.map((ap) => {
          const pricing = pkg.meal_pricing?.find((p) => p.band_type === ap.band_type);
          return {
            band_type: ap.band_type as "adult" | "child" | "infant",
            age_from: ap.age_from,
            age_to: ap.age_to,
            amount: pricing?.amount ?? 0,
          };
        })
      : [{ band_type: "adult" as const, age_from: 12, age_to: 99, amount: 0 }];

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(PackageFormSchema),
    defaultValues: {
      name: pkg.name,
      type: (pkg.type as "veg" | "non-veg" | "veg-non-veg") || "veg",
      cuisine_id: pkg.cuisine_id || null,
      venue_name: pkg.venue_name || null,
      menu_url: pkg.menu_url || null,
      description: pkg.description || null,
      inclusions: pkg.inclusions || null,
      exclusions: pkg.exclusions || null,
      is_preferred: pkg.is_preferred || false,
      age_bands: defaultAgeBands,
      cancellation_policies: pkg.meal_cancellation_policies?.map((cp) => ({
        days_before: cp.days_before,
        penalty_type: cp.penalty_type as "percentage" | "fixed",
        penalty_amount: cp.penalty_amount,
      })) || [],
    },
  });

  const { fields: ageBandFields, append: appendBand, remove: removeBand } = useFieldArray({ control: form.control, name: "age_bands" });
  const { fields: cancellationFields, append: appendCancel, remove: removeCancel } = useFieldArray({ control: form.control, name: "cancellation_policies" });

  const onSave = async (values: PackageFormValues) => {
    setSaving(true);
    try {
      const { age_bands, cancellation_policies, ...meta } = values;
      const { data: updatedPkg, error: pkgError } = await updatePackage(mealId, pkg.id!, {
        name: meta.name, type: meta.type, cuisine_id: meta.cuisine_id || null,
        venue_name: meta.venue_name || null, menu_url: meta.menu_url || null,
        description: meta.description || null, inclusions: meta.inclusions || null,
        exclusions: meta.exclusions || null, is_preferred: meta.is_preferred,
      });
      if (pkgError) throw new Error(pkgError);

      const [ageR, pricingR, cancelR] = await Promise.all([
        replaceAgePolicies(mealId, pkg.id!, age_bands.map((b) => ({ band_type: b.band_type, age_from: b.age_from, age_to: b.age_to }))),
        replacePricing(mealId, pkg.id!, age_bands.map((b) => ({ band_type: b.band_type, amount: b.amount }))),
        replaceCancellationPolicies(mealId, pkg.id!, cancellation_policies),
      ]);
      if (ageR.error || pricingR.error || cancelR.error) throw new Error(ageR.error || pricingR.error || cancelR.error || "Save failed");

      toast.success("Package saved");
      onSaved(updatedPkg!);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await deletePackage(mealId, pkg.id!);
      if (error) throw new Error(error);
      toast.success("Package deleted");
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete package");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <AlertModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} loading={deleting} />
      <div className="border rounded-lg overflow-hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors">
              <div className="flex items-center gap-3">
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium">{pkg.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{pkg.type}</span>
                {pkg.is_preferred && (
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">Preferred</span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} className="p-4 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Name *</FormLabel>
                      <FormControl><Input placeholder="e.g. Premium Buffet" className="h-9" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="veg">Veg</SelectItem>
                          <SelectItem value="non-veg">Non-Veg</SelectItem>
                          <SelectItem value="veg-non-veg">Veg & Non-Veg</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cuisine_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisine</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "__none" ? null : v)} value={field.value || "__none"}>
                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select cuisine" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="__none">None</SelectItem>
                          {cuisines.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="venue_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Garden Restaurant" className="h-9" {...field} value={field.value || ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="menu_url" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menu URL</FormLabel>
                      <FormControl><Input placeholder="https://..." className="h-9" {...field} value={field.value || ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="is_preferred" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 pt-6">
                      <FormLabel className="mt-0">Preferred</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <span className="text-sm text-muted-foreground">{field.value ? "Yes" : "No"}</span>
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value || ""} /></FormControl></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="inclusions" render={({ field }) => (
                    <FormItem><FormLabel>Inclusions</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="exclusions" render={({ field }) => (
                    <FormItem><FormLabel>Exclusions</FormLabel><FormControl><Textarea rows={2} {...field} value={field.value || ""} /></FormControl></FormItem>
                  )} />
                </div>

                {/* Age Bands */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Age Bands & Pricing</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendBand({ band_type: "child", age_from: 3, age_to: 11, amount: 0 })}>
                      <Plus className="h-3 w-3 mr-1" />Add Band
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">At least one adult band required.</p>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader><TableRow><TableHead>Band</TableHead><TableHead>Age From</TableHead><TableHead>Age To</TableHead><TableHead>Amount</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                      <TableBody>
                        {ageBandFields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <FormField control={form.control} name={`age_bands.${index}.band_type`} render={({ field: f }) => (
                                <Select onValueChange={f.onChange} value={f.value}>
                                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="adult">Adult</SelectItem>
                                    <SelectItem value="child">Child</SelectItem>
                                    <SelectItem value="infant">Infant</SelectItem>
                                  </SelectContent>
                                </Select>
                              )} />
                            </TableCell>
                            <TableCell><FormField control={form.control} name={`age_bands.${index}.age_from`} render={({ field: f }) => <Input type="number" min={0} className="h-8 w-20" {...f} />} /></TableCell>
                            <TableCell><FormField control={form.control} name={`age_bands.${index}.age_to`} render={({ field: f }) => <Input type="number" min={0} className="h-8 w-20" {...f} />} /></TableCell>
                            <TableCell><FormField control={form.control} name={`age_bands.${index}.amount`} render={({ field: f }) => <Input type="number" min={0} step="0.01" className="h-8 w-24" {...f} />} /></TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeBand(index)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {ageBandFields.length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-4">Add at least one adult band.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Cancellation Policies */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Cancellation Policies</h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendCancel({ days_before: 7, penalty_type: "percentage", penalty_amount: 100 })}>
                      <Plus className="h-3 w-3 mr-1" />Add Policy
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader><TableRow><TableHead>Days Before</TableHead><TableHead>Penalty Type</TableHead><TableHead>Amount</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                      <TableBody>
                        {cancellationFields.map((field, index) => (
                          <TableRow key={field.id}>
                            <TableCell><FormField control={form.control} name={`cancellation_policies.${index}.days_before`} render={({ field: f }) => <Input type="number" min={0} className="h-8 w-24" {...f} />} /></TableCell>
                            <TableCell>
                              <FormField control={form.control} name={`cancellation_policies.${index}.penalty_type`} render={({ field: f }) => (
                                <Select onValueChange={f.onChange} value={f.value}>
                                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percentage">Percentage</SelectItem>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                  </SelectContent>
                                </Select>
                              )} />
                            </TableCell>
                            <TableCell><FormField control={form.control} name={`cancellation_policies.${index}.penalty_amount`} render={({ field: f }) => <Input type="number" min={0} step="0.01" className="h-8 w-24" {...f} />} /></TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeCancel(index)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {cancellationFields.length === 0 && (
                          <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">No cancellation policies.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Package</>}
                  </Button>
                </div>
              </form>
            </Form>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  );
}

interface NewPackageFormProps {
  mealId: string;
  cuisines: MealCuisine[];
  onCreated: (pkg: MealPackage) => void;
  onCancel: () => void;
}

function NewPackageForm({ mealId, cuisines, onCreated, onCancel }: NewPackageFormProps) {
  const [saving, setSaving] = useState(false);
  const form = useForm<PackageFormValues>({
    resolver: zodResolver(PackageFormSchema),
    defaultValues: {
      name: "", type: "veg", cuisine_id: null, venue_name: null, menu_url: null,
      description: null, inclusions: null, exclusions: null, is_preferred: false,
      age_bands: [{ band_type: "adult", age_from: 12, age_to: 99, amount: 0 }],
      cancellation_policies: [],
    },
  });
  const { fields: ageBandFields, append: appendBand, remove: removeBand } = useFieldArray({ control: form.control, name: "age_bands" });

  const onSave = async (values: PackageFormValues) => {
    setSaving(true);
    try {
      const { age_bands, cancellation_policies, ...meta } = values;
      const { data: newPkg, error: pkgError } = await createPackage(mealId, {
        name: meta.name, type: meta.type, cuisine_id: meta.cuisine_id || null,
        venue_name: meta.venue_name || null, menu_url: meta.menu_url || null,
        description: meta.description || null, inclusions: meta.inclusions || null,
        exclusions: meta.exclusions || null, is_preferred: meta.is_preferred,
      });
      if (pkgError || !newPkg?.id) throw new Error(pkgError || "No package ID");

      const [ageR, pricingR, cancelR] = await Promise.all([
        replaceAgePolicies(mealId, newPkg.id, age_bands.map((b) => ({ band_type: b.band_type, age_from: b.age_from, age_to: b.age_to }))),
        replacePricing(mealId, newPkg.id, age_bands.map((b) => ({ band_type: b.band_type, amount: b.amount }))),
        replaceCancellationPolicies(mealId, newPkg.id, cancellation_policies),
      ]);
      if (ageR.error || pricingR.error || cancelR.error) throw new Error("Sub-entity save failed");

      toast.success("Package created");
      onCreated(newPkg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
      <h4 className="font-semibold text-sm">New Package</h4>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Package Name *</FormLabel><FormControl><Input placeholder="e.g. Premium Buffet" className="h-9" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger className="h-9"><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non-veg">Non-Veg</SelectItem>
                    <SelectItem value="veg-non-veg">Veg & Non-Veg</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <FormField control={form.control} name="cuisine_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Cuisine</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "__none" ? null : v)} value={field.value || "__none"}>
                  <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select cuisine" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {cuisines.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
          </div>

          {/* Age Bands */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Age Bands & Pricing</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => appendBand({ band_type: "child", age_from: 3, age_to: 11, amount: 0 })}>
                <Plus className="h-3 w-3 mr-1" />Add Band
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Band</TableHead><TableHead>Age From</TableHead><TableHead>Age To</TableHead><TableHead>Amount</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                <TableBody>
                  {ageBandFields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <FormField control={form.control} name={`age_bands.${index}.band_type`} render={({ field: f }) => (
                          <Select onValueChange={f.onChange} value={f.value}>
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="adult">Adult</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="infant">Infant</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </TableCell>
                      <TableCell><FormField control={form.control} name={`age_bands.${index}.age_from`} render={({ field: f }) => <Input type="number" min={0} className="h-8 w-20" {...f} />} /></TableCell>
                      <TableCell><FormField control={form.control} name={`age_bands.${index}.age_to`} render={({ field: f }) => <Input type="number" min={0} className="h-8 w-20" {...f} />} /></TableCell>
                      <TableCell><FormField control={form.control} name={`age_bands.${index}.amount`} render={({ field: f }) => <Input type="number" min={0} step="0.01" className="h-8 w-24" {...f} />} /></TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeBand(index)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Package"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Thin wrapper form used by the fullscreen form's formRef/onNext pattern
const DoneFormSchema = z.object({});
type DoneFormValues = z.infer<typeof DoneFormSchema>;

interface Meal1PackagesFormProps {
  initialData: MealProduct;
  cuisines: MealCuisine[];
  onNext: (data: any) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

export default function Meal1PackagesForm({ initialData, cuisines, onNext, setIsLoading, formRef }: Meal1PackagesFormProps) {
  const [packages, setPackages] = useState<MealPackage[]>(initialData.meal_packages ?? []);
  const [showNewForm, setShowNewForm] = useState(false);
  const mealId = initialData.id!;

  // Invisible form hooked to formRef so footer "Save & Next" triggers onNext
  const form = useForm<DoneFormValues>({ resolver: zodResolver(DoneFormSchema) });
  const onSubmit = () => {
    setIsLoading?.(true);
    onNext({ packages });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Packages</h2>
        <p className="text-muted-foreground">Add packages with age bands, pricing, and cancellation policies</p>
      </div>

      {/* Hidden form tied to formRef */}
      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="hidden" />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {packages.length} package{packages.length !== 1 ? "s" : ""}
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowNewForm(true)} disabled={showNewForm}>
          <Plus className="h-4 w-4 mr-1" />Add Package
        </Button>
      </div>

      {showNewForm && (
        <NewPackageForm
          mealId={mealId}
          cuisines={cuisines}
          onCreated={(pkg) => { setPackages((prev) => [...prev, pkg]); setShowNewForm(false); }}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      <div className="space-y-3">
        {packages.map((pkg, index) => (
          <PackageCard
            key={pkg.id}
            mealId={mealId}
            pkg={pkg}
            cuisines={cuisines}
            onSaved={(updated) => setPackages((prev) => prev.map((p, i) => i === index ? { ...p, ...updated } : p))}
            onDeleted={() => setPackages((prev) => prev.filter((_, i) => i !== index))}
          />
        ))}
        {packages.length === 0 && !showNewForm && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p className="text-sm">No packages yet. Add your first package above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
