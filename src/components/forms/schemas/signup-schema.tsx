import * as z from "zod";

export const SignupSchema = z
  .object({
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
    adminName: z.string().min(2, {
      message: "Admin name must be at least 2 characters.",
    }),
    adminEmail: z.string().email({
      message: "Please enter a valid email address.",
    }),
    adminMobile: z.string().min(9, {
      message: "Please enter a valid phone number.",
    }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    termsAccepted: z.boolean().refine((value) => value === true, {
      message: "You have to accept the terms and conditions.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ISignup = z.infer<typeof SignupSchema>;
