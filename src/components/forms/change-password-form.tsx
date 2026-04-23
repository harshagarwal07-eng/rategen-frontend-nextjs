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
import { updatePassword } from "@/data-access/auth";

export function ChangePasswordForm() {
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
    if (!user?.id) return toast.error("User not found");

    const { error, success } = await updatePassword(values.password, user.id);

    if (error) return toast.error(error);

    toast.success(success);
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-2 gap-4">
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
                        {showConfirmPassword
                          ? "Hide password"
                          : "Show password"}
                      </span>
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
