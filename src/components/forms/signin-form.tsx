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
import { useState } from "react";
import { EyeIcon, EyeOffIcon, Mail } from "lucide-react";
import Link from "next/link";
import { login } from "@/data-access/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ISignin,
  SigninSchema,
} from "@/components/forms/schemas/signin-schema";

export default function SigninForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const form = useForm<ISignin>({
    resolver: zodResolver(SigninSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: ISignin) {
    setIsLoading(true);
    const { error } = await login(values);

    if (error) {
      setIsLoading(false);
      return toast.error(error);
    }

    router.push("/rates/hotels");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                    placeholder="Enter registered email"
                    {...field}
                  />
                  <Mail className="top-3 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
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
                        <EyeIcon className="w-4 h-4" aria-hidden="true" />
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

          <div className="text-right">
            <Link href={"/forgot-password"}>Forgot Password?</Link>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <Button
            type="submit"
            size={"lg"}
            disabled={isLoading}
            loading={isLoading}
            loadingText="Signing in..."
            className="w-full"
          >
            Sign in
          </Button>
          <p className="font-light text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href={"/register"}
              prefetch
              className="font-bold text-primary hover:underline"
            >
              Register for Free
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
}
