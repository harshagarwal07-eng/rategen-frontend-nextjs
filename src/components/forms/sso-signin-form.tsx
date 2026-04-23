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
import { ssoLogin } from "@/data-access/auth";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import {
  ISignin,
  SigninSchema,
} from "@/components/forms/schemas/signin-schema";

interface SSOSigninFormProps {
  clientName?: string;
}

export default function SSOSigninForm({ clientName }: SSOSigninFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  // Get OAuth params from URL
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");

  const form = useForm<ISignin>({
    resolver: zodResolver(SigninSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Build authorize URL path with query params (relative URL for server redirect)
  const getAuthorizeUrl = () => {
    const params = new URLSearchParams();
    if (clientId) params.set("client_id", clientId);
    if (redirectUri) params.set("redirect_uri", redirectUri);
    if (responseType) params.set("response_type", responseType);
    if (state) params.set("state", state);
    if (scope) params.set("scope", scope);
    if (codeChallenge) params.set("code_challenge", codeChallenge);
    if (codeChallengeMethod) params.set("code_challenge_method", codeChallengeMethod);
    return `/api/oauth/authorize?${params.toString()}`;
  };

  async function onSubmit(values: ISignin) {
    setIsLoading(true);

    // Build redirect URL BEFORE login
    const redirectUrl = getAuthorizeUrl();

    // Pass redirect URL to server action - it will handle the redirect
    // This prevents any client-side re-render that could flash the homepage
    const result = await ssoLogin(values, redirectUrl);

    // Only reaches here if there's an error (redirect throws)
    if (result?.error) {
      setIsLoading(false);
      return toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {clientName && (
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Sign in to continue to <span className="font-semibold">{clientName}</span>
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    {...field}
                  />
                  <Mail className="top-3 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          loading={isLoading}
          loadingText="Signing in..."
          className="w-full"
        >
          Continue
        </Button>
      </form>
    </Form>
  );
}
