import { SERVICE_TYPES } from "@/constants/data";
import { z } from "zod";

const SERVICE_TYPES_ENUM = SERVICE_TYPES.map((type) => type.value);

export const baseDocFormSchema = z.object({
  is_active: z.boolean(),
  country: z.string().uuid({ message: "Country is required" }),
  state: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().uuid({ message: "State is required" }).optional()
  ) as z.ZodType<string | undefined>,
  nights: z.number().optional(),
  content: z.string().min(1, "Content is required"),
  service_type: z.enum(SERVICE_TYPES_ENUM as [string, ...string[]]).optional(),
});

export const createDocFormSchema = (
  countryCodeById: Record<string, string>,
  baseSchema: z.AnyZodObject = baseDocFormSchema
) =>
  baseSchema.superRefine((data, ctx) => {
    const countryId = data.country as string;
    const stateId = data.state as string | undefined;

    const countryCode = countryCodeById[countryId];

    if (countryCode === "IN" && !stateId) {
      ctx.addIssue({
        path: ["state"],
        message: "State is required for India",
        code: z.ZodIssueCode.custom,
      });
    }
  });

export type DocFormData = z.infer<ReturnType<typeof createDocFormSchema>>;
