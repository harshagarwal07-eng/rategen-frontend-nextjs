import * as z from "zod";

const SupplierTeamMemberSchema = z.object({
  id: z.string().optional(),
  supplier_id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  department: z.array(z.string()).optional(),
  is_primary: z.boolean().optional(),
});

// Details-section schema — covers only the fields managed by SupplierDetailsForm
const SupplierDetailsSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Supplier name is required"),
  category: z.array(z.enum(["hotel", "tour", "transfer", "meal", "guide"])).optional(),
  website: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid website URL" }
    ),
  is_active: z.boolean().optional(),
  address: z.string().optional(),
  city: z.string().uuid().optional(),
  country: z.string().uuid().optional(),
  city_name: z.string().optional(),
  country_name: z.string().optional(),
  booking_mode: z.enum(["online", "offline", "online_or_offline"]).optional(),
  team_members: z.array(SupplierTeamMemberSchema).optional(),
});

// Form-specific schema with validation for minimum contacts
export const SupplierFormSchema = SupplierDetailsSchema.refine(
  (data) => {
    const validContacts =
      data.team_members?.filter((member) => {
        const hasName = member.name?.trim();
        const hasEmail = member.email?.trim();
        const isValidEmail = hasEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email || "");
        return hasName && isValidEmail;
      }) || [];
    return validContacts.length >= 1;
  },
  {
    message: "A supplier must have at least 1 contact with valid name and email",
    path: ["team_members"],
  }
);

export type ISupplierTeamMember = z.infer<typeof SupplierTeamMemberSchema>;
export type ISupplierDetails = z.infer<typeof SupplierDetailsSchema>;

export { SupplierTeamMemberSchema };
