import * as z from "zod";

export const EditTeamSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  designation: z.string().min(2, {
    message: "Designation name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(9, {
    message: "Please enter a valid phone number.",
  }),
});

export type IEditTeam = z.infer<typeof EditTeamSchema>;
