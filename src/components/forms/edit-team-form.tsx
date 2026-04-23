"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Mail, Phone } from "lucide-react";
import { PhoneInput } from "../ui/phone-input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditTeamSchema, IEditTeam } from "./schemas/edit-team-schema";
import { DESIGNATION_OPTIONS } from "@/constants/dmc";
import { updateMember } from "@/data-access/dmc";
import { ITeam } from "@/types/user";

type Props = {
  member: ITeam;
  setOpen: (open: boolean) => void;
};

export default function EditTeamForm({ member, setOpen }: Props) {
  const form = useForm<IEditTeam>({
    resolver: zodResolver(EditTeamSchema),
    defaultValues: {
      name: member.name,
      designation: member.designation,
      phone: `+${member.phone}`,
      email: member.email,
    },
  });

  async function onSubmit(values: IEditTeam) {
    const { error } = await updateMember(values, member.id);

    if (error) return toast.error(error);

    toast.success("Details saved successfully.");
    setOpen(false);
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 m-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DESIGNATION_OPTIONS.map((option, index) => (
                      <SelectItem key={index} value={option.value}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email ID</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type="email" placeholder="Enter email" {...field} />
                    <Mail className="top-2.5 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                  </div>
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
                      placeholder="Enter phone number"
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

        <div className="space-y-2 text-center">
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
