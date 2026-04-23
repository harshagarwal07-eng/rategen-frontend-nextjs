import { z } from "zod";

const emailSchema = z.string().email("Invalid email");

function normalizeEmailToken(token: string): string {
  const value = token.trim();
  if (!value) return "";

  const angleMatch = value.match(/<([^<>]+)>/);
  if (angleMatch?.[1]) {
    return angleMatch[1].trim().replace(/^"+|"+$/g, "");
  }

  return value.replace(/^"+|"+$/g, "");
}

function parseEmails(value: string): string[] {
  return value
    .split(/[,;]/)
    .map(normalizeEmailToken)
    .filter(Boolean);
}

function validEmails(val: string): boolean {
  const emails = parseEmails(val);
  return emails.length > 0 && emails.every((e) => emailSchema.safeParse(e).success);
}

function optionalValidEmails(val: string): boolean {
  if (!val.trim()) return true;
  const emails = parseEmails(val);
  return emails.every((e) => emailSchema.safeParse(e).success);
}

export const composeEmailSchema = z.object({
  to: z
    .string()
    .min(1, "Enter at least one recipient")
    .refine(validEmails, "Enter valid email address(es)"),
  cc: z.string().refine(optionalValidEmails, "Invalid email in Cc").optional(),
  bcc: z.string().refine(optionalValidEmails, "Invalid email in Bcc").optional(),
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(998, "Subject is too long"),
  bodyText: z.string().min(1, "Message body is required"),
});

export type ComposeEmailInput = z.infer<typeof composeEmailSchema>;

export function validateComposeEmail(data: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  bodyText: string;
}): { success: true; data: ComposeEmailInput } | { success: false; error: z.ZodError } {
  const result = composeEmailSchema.safeParse({
    to: data.to,
    cc: data.cc ?? "",
    bcc: data.bcc ?? "",
    subject: data.subject,
    bodyText: data.bodyText,
  });
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
