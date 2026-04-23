import { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/logo";
import SSOSigninForm from "@/components/forms/sso-signin-form";
import { createClient } from "@/utils/supabase/server";
import { getOAuthClient, validateRedirectUri, generateAuthCode } from "@/lib/oauth";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign in with RateGen",
  description: "Sign in to continue to the application",
};

type Props = {
  searchParams: Promise<{
    client_id?: string;
    redirect_uri?: string;
    response_type?: string;
    state?: string;
    scope?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  }>;
};

export default async function SSOPage({ searchParams }: Props) {
  const params = await searchParams;
  const {
    client_id,
    redirect_uri,
    response_type,
    state,
    scope,
    code_challenge,
    code_challenge_method,
  } = params;

  // Validate required OAuth parameters
  if (!client_id || !redirect_uri || response_type !== "code") {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-destructive">Invalid Request</h1>
          <p className="text-muted-foreground">
            Missing required OAuth parameters. Please try again from the application.
          </p>
        </Card>
      </div>
    );
  }

  // Validate client (client_id is dmc_id UUID)
  const client = await getOAuthClient(client_id);
  if (!client) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-destructive">Unknown Application</h1>
          <p className="text-muted-foreground">
            The application requesting access is not recognized.
          </p>
        </Card>
      </div>
    );
  }

  // Validate redirect URI against whitelabel_site_settings
  const isValidRedirect = await validateRedirectUri(client_id, redirect_uri);
  if (!isValidRedirect) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold text-destructive">Invalid Redirect</h1>
          <p className="text-muted-foreground">
            The redirect URL is not authorized for this application.
          </p>
        </Card>
      </div>
    );
  }

  // Check if user is already authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // User is already logged in - generate code and redirect
    const code = generateAuthCode({
      userId: user.id,
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: scope || "openid profile email",
      state,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
    });

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    if (state) callbackUrl.searchParams.set("state", state);

    redirect(callbackUrl.toString());
  }

  // Show login form
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Section - SSO Login Form */}
      <div className="flex flex-1 flex-col px-4 sm:px-6 lg:px-16 bg-card h-full overflow-y-auto no-scrollbar">
        <div className="w-full max-w-md mx-auto my-auto space-y-8">
          <div className="text-center space-y-4">
            <Logo className="mx-auto" />
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Secure Sign-In</span>
            </div>
          </div>

          <Card className="p-6">
            <SSOSigninForm clientName={client.name} />
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            By continuing, you agree to share your profile information with{" "}
            <span className="font-medium">{client.name}</span>.
          </p>
        </div>
      </div>

      {/* Right Section - Branding */}
      <div className="hidden flex-1 bg-gradient-to-br from-primary/20 to-primary/5 lg:flex flex-col justify-center items-center text-center gap-y-6 p-8">
        <div className="max-w-lg space-y-4">
          <h2 className="text-3xl font-bold">
            Sign in with <span className="text-primary">RateGen</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Use your RateGen account to securely access partner applications.
          </p>
        </div>
      </div>
    </div>
  );
}
