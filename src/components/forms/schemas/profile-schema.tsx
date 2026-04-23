import * as z from "zod";

export const ProfileSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(9, {
    message: "Please enter a valid phone number.",
  }),
});

export const companyProfileSchema = z.object({
  avatar_url: z.string().optional(),
  name: z.string().min(2, {
    message: "DMC name must be at least 2 characters.",
  }),
  streetAddress: z.string().min(2, {
    message: "Street Address must be at least 2 characters.",
  }),
  city: z.string().min(2, {
    message: "City required.",
  }),
  country: z.string().min(2, {
    message: "Country recuired.",
  }),
  website: z
    .string()
    .min(2, {
      message: "Website must be at least 2 characters.",
    })
    .refine(
      (value) => {
        if (value) {
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      },
      {
        message: "Please enter a valid URL.",
      }
    ),
});

export type IProfileForm = z.infer<typeof ProfileSchema>;
export type ICompanyProfile = z.infer<typeof companyProfileSchema>;
