"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ChangePasswordSchema,
  IChangePassword,
} from "./schemas/change-password-schema";
import { toast } from "sonner";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import useUser from "@/hooks/use-user";
import { updateMemberPassword } from "@/data-access/dmc";

type Props = {
  userId: string;
  setOpen: (open: boolean) => void;
};

export function ChangeMemberPasswordForm({ userId, setOpen }: Props) {
  const { user } = useUser();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<IChangePassword>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: IChangePassword) {
    if (!user?.id) return toast.error("User not found!");
    if (user.role !== "dmc_admin")
      return toast.error("You are not authorized to perform this action.");

    const { error, success } = await updateMemberPassword(
      values.password,
      userId,
      user.dmc.id
    );

    if (error) return toast.error(error);

    toast.success(success);
    setOpen(false);
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="top-0 right-0 absolute hover:bg-transparent px-3 py-2 h-full"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <EyeOffIcon className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="top-0 right-0 absolute hover:bg-transparent px-3 py-2 h-full"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeIcon className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <EyeOffIcon className="w-4 h-4" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2 text-center">
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            size={"lg"}
            disabled={isLoading}
            loading={isLoading}
          >
            Update Password
          </Button>
        </div>
      </form>
    </Form>
  );
}
