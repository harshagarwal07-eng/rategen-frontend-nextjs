"use client";

import { useEffect, useContext } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import * as z from "zod";
import Show from "@/components/ui/show";
import { MEAL_TYPES, MEAL_TYPES_ENUM } from "@/constants/meal-types";

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

const AgeRangeSchema = z
  .object({
    from: z.number().min(0, "Age must be at least 0").max(99, "Age must be at most 99"),
    to: z.number().min(0, "Age must be at least 0").max(99, "Age must be at most 99"),
  })
  .refine((data) => data.from <= data.to, {
    message: "From age must be less than or equal to To age",
  });

const AgeCategorySchema = z.object({
  rooms: AgeRangeSchema.optional(),
  meals: AgeRangeSchema.optional(),
});

const AgePolicySchema = z.object({
  adult: AgeCategorySchema,
  teenager: AgeCategorySchema.optional(),
  child: AgeCategorySchema.optional(),
  infant: AgeCategorySchema.optional(),
});

const MealPlanRatesSchema = z.object({
  adult: z.number().min(0, "Rate must be at least 0").nullable().optional(),
  teenager: z.number().min(0, "Rate must be at least 0").nullable().optional(),
  child: z.number().min(0, "Rate must be at least 0").nullable().optional(),
  infant: z.number().min(0, "Rate must be at least 0").nullable().optional(),
});

const MealPlanEntrySchema = z.object({
  meal_type: z.enum(MEAL_TYPES_ENUM),
  rates: MealPlanRatesSchema.optional(),
});

const MealPlansSchema = z.array(MealPlanEntrySchema).optional();

// Hotel Policies Schema
const HotelPoliciesSchema = z.object({
  id: z.string().optional(),
  cancellation_policy: z.string().optional(),
  payment_policy: z.string().optional(),
  remarks: z.string().optional(),
  age_policy: AgePolicySchema.optional(),
  meal_plan_rates: MealPlansSchema.optional(),
  group_policy: z.string().optional(),
});

export type IHotelPolicies = z.infer<typeof HotelPoliciesSchema>;

interface HotelPoliciesFormProps {
  initialData?: Partial<IHotelPolicies & { id?: string }>;
  syncedColumns: string[];
  onNext: (data: IHotelPolicies & { id?: string }) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

interface AgeRangeFieldProps {
  form: any;
  category: "adult" | "teenager" | "child" | "infant";
  type: "rooms" | "meals";
  onRemove: () => void;
}

function AgeRangeField({ form, category, type, onRemove }: AgeRangeFieldProps) {
  const fieldName = `age_policy.${category}.${type}` as const;

  const handleAgeChange = (field: any, value: string) => {
    const trimmedValue = value.trim();

    // Allow empty
    if (trimmedValue === "") {
      field.onChange(null);
      return;
    }

    // Only allow integers 0-99
    if (/^\d{1,2}$/.test(trimmedValue)) {
      const numValue = parseInt(trimmedValue, 10);
      if (numValue >= 0 && numValue <= 99) {
        field.onChange(numValue);
      }
    }
  };

  const handleBlur = (field: any) => {
    // On blur, if empty, set to 0
    if (field.value === null || field.value === undefined) {
      field.onChange(0);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm capitalize">For {type}</Label>
        <Show when={category !== "adult"}>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="text-destructive" />
          </Button>
        </Show>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`${fieldName}.from` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">From</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="-"
                  value={field.value != null ? String(field.value) : ""}
                  onChange={(e) => handleAgeChange(field, e.target.value)}
                  onBlur={() => handleBlur(field)}
                  disabled={false}
                  className="h-9"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`${fieldName}.to` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">To</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="-"
                  value={field.value != null ? String(field.value) : ""}
                  onChange={(e) => handleAgeChange(field, e.target.value)}
                  onBlur={() => handleBlur(field)}
                  disabled={false}
                  className="h-9"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

export default function HotelPoliciesForm({ initialData, onNext, formRef }: HotelPoliciesFormProps) {
  const form = useForm<IHotelPolicies>({
    resolver: zodResolver(HotelPoliciesSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      cancellation_policy: initialData?.cancellation_policy || "",
      payment_policy: initialData?.payment_policy || "",
      group_policy: initialData?.group_policy || "",
      remarks: initialData?.remarks || "",
      age_policy: initialData?.age_policy || {
        adult: {
          rooms: { from: 17, to: 99 },
          meals: { from: 17, to: 99 },
        },
        child: {
          rooms: { from: 2, to: 17 },
          meals: { from: 2, to: 17 },
        },
        infant: {
          rooms: { from: 0, to: 2 },
          meals: { from: 0, to: 2 },
        },
        teenager: {},
      },
      meal_plan_rates: initialData?.meal_plan_rates || [
        { meal_type: "Breakfast", rates: {} },
        { meal_type: "Half Board", rates: {} },
        { meal_type: "Full Board", rates: {} },
        { meal_type: "All Inclusive", rates: {} },
      ],
    },
  });

  // Reset form when initialData changes (for duplicate functionality)
  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData?.id || undefined,
        cancellation_policy: initialData?.cancellation_policy || "",
        payment_policy: initialData?.payment_policy || "",
        group_policy: initialData?.group_policy || "",
        remarks: initialData?.remarks || "",
        age_policy: initialData?.age_policy || {
          adult: {
            rooms: { from: 17, to: 99 },
            meals: { from: 17, to: 99 },
          },
          child: {
            rooms: { from: 2, to: 17 },
            meals: { from: 2, to: 17 },
          },
          infant: {
            rooms: { from: 0, to: 2 },
            meals: { from: 0, to: 2 },
          },
          teenager: {},
        },
        meal_plan_rates: initialData?.meal_plan_rates || [
          { meal_type: "Breakfast", rates: {} },
          { meal_type: "Half Board", rates: {} },
          { meal_type: "Full Board", rates: {} },
          { meal_type: "All Inclusive", rates: {} },
        ],
      });
    }
  }, [initialData, form]);

  const {
    fields: mealPlanFields,
    append: appendMealPlan,
    remove: removeMealPlan,
  } = useFieldArray({
    control: form.control,
    name: "meal_plan_rates",
  });

  const onSubmit = async (data: IHotelPolicies) => {
    onNext({ ...data, id: initialData?.id });
  };

  const addAgeRange = (category: "adult" | "teenager" | "child" | "infant", type: "rooms" | "meals") => {
    const defaultValues = {
      adult: { from: 17, to: 99 },
      child: { from: 2, to: 17 },
      infant: { from: 0, to: 2 },
      teenager: { from: 13, to: 16 },
    };

    form.setValue(`age_policy.${category}.${type}`, defaultValues[category]);
  };

  const removeAgeRange = (category: "adult" | "teenager" | "child" | "infant", type: "rooms" | "meals") => {
    form.setValue(`age_policy.${category}.${type}`, undefined);
  };

  const hasAgeRange = (category: "adult" | "teenager" | "child" | "infant", type: "rooms" | "meals") => {
    const policy = form.watch(`age_policy.${category}.${type}`);
    return policy !== undefined && policy !== null;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Hotel Policies</h2>
        <p className="text-muted-foreground">
          Define the hotel&apos;s cancellation, payment policies and additional remarks
        </p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            {/* Cancellation Policy */}
            <FormField
              control={form.control}
              name="cancellation_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter cancellation policy details"
                      className="min-h-[100px]"
                      {...field}
                      disabled={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Policy */}
            <FormField
              control={form.control}
              name="payment_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Policy</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter payment policy details"
                      className="min-h-[100px]"
                      {...field}
                      disabled={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Group Policy */}
            <FormField
              control={form.control}
              name="group_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Policy</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter group booking policy details"
                      className="min-h-[100px]"
                      {...field}
                      disabled={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remarks */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional remarks or notes"
                      className="min-h-[100px]"
                      {...field}
                      disabled={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Age Policy */}
            <BorderedCard title="Age Policy" variant="dashed">
              <div className="space-y-4 mt-4">
                {/* Adult Age */}
                <BorderedCard title="Adult Age" collapsible defaultOpen>
                  <div className="grid grid-cols-2 gap-4">
                    {hasAgeRange("adult", "rooms") && (
                      <AgeRangeField
                        form={form}
                        category="adult"
                        type="rooms"
                        onRemove={() => removeAgeRange("adult", "rooms")}
                      />
                    )}
                    {hasAgeRange("adult", "meals") && (
                      <AgeRangeField
                        form={form}
                        category="adult"
                        type="meals"
                        onRemove={() => removeAgeRange("adult", "meals")}
                      />
                    )}
                  </div>
                </BorderedCard>

                {/* Teenager */}
                <BorderedCard title="Teenager" collapsible defaultOpen>
                  <div className="grid grid-cols-2 gap-4">
                    {hasAgeRange("teenager", "rooms") ? (
                      <AgeRangeField
                        form={form}
                        category="teenager"
                        type="rooms"
                        onRemove={() => removeAgeRange("teenager", "rooms")}
                      />
                    ) : (
                      <Button type="button" variant="dashed" onClick={() => addAgeRange("teenager", "rooms")}>
                        <Plus />
                        Add Rooms
                      </Button>
                    )}
                    {hasAgeRange("teenager", "meals") ? (
                      <AgeRangeField
                        form={form}
                        category="teenager"
                        type="meals"
                        onRemove={() => removeAgeRange("teenager", "meals")}
                      />
                    ) : (
                      <Button type="button" variant="dashed" onClick={() => addAgeRange("teenager", "meals")}>
                        <Plus />
                        Add Meals
                      </Button>
                    )}
                  </div>
                </BorderedCard>

                {/* Child Age */}
                <BorderedCard title="Child Age" collapsible defaultOpen>
                  <div className="grid grid-cols-2 gap-4">
                    {hasAgeRange("child", "rooms") ? (
                      <AgeRangeField
                        form={form}
                        category="child"
                        type="rooms"
                        onRemove={() => removeAgeRange("child", "rooms")}
                      />
                    ) : (
                      <Button type="button" variant="dashed" onClick={() => addAgeRange("child", "rooms")}>
                        <Plus />
                        Add Rooms
                      </Button>
                    )}
                    {hasAgeRange("child", "meals") ? (
                      <AgeRangeField
                        form={form}
                        category="child"
                        type="meals"
                        onRemove={() => removeAgeRange("child", "meals")}
                      />
                    ) : (
                      <Button type="button" variant="dashed" onClick={() => addAgeRange("child", "meals")}>
                        <Plus />
                        Add Meals
                      </Button>
                    )}
                  </div>
                </BorderedCard>

                {/* Infant Age */}
                <BorderedCard title="Infant Age" collapsible defaultOpen>
                  <div className="grid grid-cols-2 gap-4">
                    {hasAgeRange("infant", "rooms") ? (
                      <AgeRangeField
                        form={form}
                        category="infant"
                        type="rooms"
                        onRemove={() => removeAgeRange("infant", "rooms")}
                      />
                    ) : (
                      <Button type="button" variant="dashed" onClick={() => addAgeRange("infant", "rooms")}>
                        <Plus />
                        Add Rooms
                      </Button>
                    )}
                    {hasAgeRange("infant", "meals") ? (
                      <AgeRangeField
                        form={form}
                        category="infant"
                        type="meals"
                        onRemove={() => removeAgeRange("infant", "meals")}
                      />
                    ) : (
                      <Button type="button" variant="dashed" onClick={() => addAgeRange("infant", "meals")}>
                        <Plus />
                        Add Meals
                      </Button>
                    )}
                  </div>
                </BorderedCard>
              </div>
            </BorderedCard>

            {/* Meal Plan Rates */}
            <BorderedCard title="Meal Plan Rates" variant="dashed">
              <div className="space-y-4">
                {(() => {
                  const agePolicy = form.watch("age_policy");
                  const ageCategories: Array<{
                    key: "adult" | "teenager" | "child" | "infant";
                    label: string;
                    range: string;
                  }> = [];

                  // Adult is always present
                  if (agePolicy?.adult?.meals) {
                    ageCategories.push({
                      key: "adult",
                      label: "Adults",
                      range: `${agePolicy.adult.meals.from}-${agePolicy.adult.meals.to}`,
                    });
                  }

                  // Check for optional categories
                  if (agePolicy?.teenager?.meals) {
                    ageCategories.push({
                      key: "teenager",
                      label: "Teenagers",
                      range: `${agePolicy.teenager.meals.from}-${agePolicy.teenager.meals.to}`,
                    });
                  }

                  if (agePolicy?.child?.meals) {
                    ageCategories.push({
                      key: "child",
                      label: "Children",
                      range: `${agePolicy.child.meals.from}-${agePolicy.child.meals.to}`,
                    });
                  }

                  if (agePolicy?.infant?.meals) {
                    ageCategories.push({
                      key: "infant",
                      label: "Infants",
                      range: `${agePolicy.infant.meals.from}-${agePolicy.infant.meals.to}`,
                    });
                  }

                  return (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-left bg-muted/50 font-medium text-sm">Meal Type</TableHead>
                              {ageCategories.map((cat) => (
                                <TableHead key={cat.key} className="text-center bg-muted/50 font-medium text-sm">
                                  <div>{cat.label}</div>
                                  <div className="text-xs font-normal text-muted-foreground">({cat.range})</div>
                                </TableHead>
                              ))}
                              <TableHead className="text-center bg-muted/50 font-medium text-sm w-[80px]">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mealPlanFields.map((field, index) => (
                              <TableRow key={field.id}>
                                <TableCell className="font-medium text-sm">
                                  {form.watch(`meal_plan_rates.${index}.meal_type`)}
                                </TableCell>
                                {ageCategories.map((cat) => (
                                  <TableCell key={cat.key}>
                                    <FormField
                                      control={form.control}
                                      name={`meal_plan_rates.${index}.rates.${cat.key}` as any}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="-"
                                              value={field.value != null ? String(field.value) : ""}
                                              onChange={(e) => handleNumericChange(field, e.target.value)}
                                              className="h-8 text-sm text-center"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </TableCell>
                                ))}
                                <TableCell className="text-center">
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeMealPlan(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {(() => {
                        const currentMealTypes = mealPlanFields.map((f) =>
                          form.watch(`meal_plan_rates.${mealPlanFields.indexOf(f)}.meal_type`)
                        );
                        const availableMealTypes = MEAL_TYPES.filter((mt) => !currentMealTypes.includes(mt.value));

                        return availableMealTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {availableMealTypes.map((mealType) => (
                              <Button
                                key={mealType.value}
                                type="button"
                                variant="dashed"
                                onClick={() =>
                                  appendMealPlan({
                                    meal_type: mealType.value as any,
                                    rates: {},
                                  })
                                }
                              >
                                <Plus />
                                Add {mealType.label}
                              </Button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </>
                  );
                })()}
              </div>
            </BorderedCard>
          </div>
        </form>
      </Form>
    </div>
  );
}
