"use client";

import useUser from "@/hooks/use-user";
import { useForm } from "react-hook-form";
import { IProfileForm, ProfileSchema } from "./schemas/profile-schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { PhoneInput } from "../ui/phone-input";
import { Mail, Phone } from "lucide-react";
import { Button } from "../ui/button";
import { updateUserProfile } from "@/data-access/auth";
import { toast } from "sonner";
import { DESIGNATION_OPTIONS } from "@/constants/dmc";

export default function MyProfileForm() {
  const { user } = useUser();
  const role = DESIGNATION_OPTIONS.find((v) => v.value === user?.role)?.name;
  const form = useForm<IProfileForm>({
    resolver: zodResolver(ProfileSchema),
    values: {
      name: user?.user_metadata.userName ?? "",
      email: user?.email ?? "",
      phone: `+${user?.user_metadata?.phone}`,
    },
  });

  async function onSubmit(values: IProfileForm) {
    if (!user) return;
    const { error } = await updateUserProfile(values, user.id);

    if (error) {
      console.error("Error submitting form:", error);
      return toast.error("Failed to update profile");
    }

    toast.success("Profile Updated Successfully");
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 relative text-left"
        autoComplete="off"
      >
        <div className="gap-4 grid grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name </FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Number</FormLabel>
                <FormControl>
                  <div className="relative">
                    <PhoneInput
                      {...field}
                      value={field.value}
                      defaultCountry="IN"
                      placeholder="Enter a phone number"
                      international
                    />
                    <Phone className="top-2.5 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="gap-4 grid grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email id</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="Enter admin email"
                      disabled
                      {...field}
                    />
                    <Mail className="top-2.5 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Role</FormLabel>
            <Input value={role} disabled />
          </div>
        </div>

        <div className="text-center">
          <Button
            type="submit"
            size={"lg"}
            disabled={isLoading}
            loading={isLoading}
            loadingText="Updating..."
          >
            Update
          </Button>
        </div>
      </form>
    </Form>
  );
}
