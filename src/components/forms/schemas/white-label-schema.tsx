import * as z from "zod";
import { IServiceGroupPermissions } from "@/types/whitelabel-config";

const urlSchema = z
  .string()
  .optional()
  .refine((val) => !val || /^https?:\/\/.+/.test(val), {
    message: "Must be a valid URL starting with http:// or https://",
  });

export const whiteLabelSchema = z.object({
  // Branding section
  branding: z.object({
    logoLight: z.string().min(1, "Light theme logo is required"),
    logoDark: z.string().optional(),
    logoIcon: z.string().optional(),
    siteName: z
      .string()
      .min(2, "Site name must be at least 2 characters")
      .max(100, "Site name must be less than 100 characters"),
    tagline: z
      .string()
      .max(200, "Tagline must be less than 200 characters")
      .optional(),
    themeColor: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color")
      .optional(),
  }),

  // Support section
  support: z.object({
    supportEmail: z
      .string()
      .email("Invalid email address")
      .min(1, "Support email is required"),
    supportPhone: z.string().optional(),
    whatsappUrl: urlSchema,
  }),

  // SEO section
  seo: z.object({
    metaTitle: z
      .string()
      .max(60, "Meta title should be 60 characters or less")
      .optional(),
    metaDescription: z
      .string()
      .max(160, "Meta description should be 160 characters or less")
      .optional(),
    metaKeywords: z.string().optional(),
    ogImage: z.string().optional(),
  }),

  // Domain (top-level field, matches DB column)
  domain: z
    .string()
    .min(1, "Domain is required")
    .refine((val) => /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(val), {
      message: "Must be a valid domain (e.g., example.com)",
    }),

  // Permissions (optional nested object)
  permissions: z
    .object({
      bookings: z
        .object({
          hotel: z
            .object({
              features: z.array(
                z.enum(["search", "book", "cancel", "modify"])
              ),
              providers: z.array(z.string()),
            })
            .optional(),
          tour: z
            .object({
              features: z.array(
                z.enum(["search", "book", "cancel", "modify"])
              ),
              providers: z.array(z.string()),
            })
            .optional(),
          transfer: z
            .object({
              features: z.array(
                z.enum(["search", "book", "cancel", "modify"])
              ),
              providers: z.array(z.string()),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export type IWhiteLabelSettings = z.infer<typeof whiteLabelSchema>;

// Helper type for easier form handling
export interface IWhiteLabelFormData extends IWhiteLabelSettings {
  permissions: IServiceGroupPermissions;
}
