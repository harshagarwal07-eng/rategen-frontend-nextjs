import { Button } from "@/components/ui/button";
import { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Verify Account",
};

type Props = {
  searchParams: Promise<{ email: string }>;
};

export default async function VerifyAccount({ searchParams }: Props) {
  const { email } = await searchParams;
  return (
    <div className="flex justify-center items-center min-h-screen bg-primary/20 px-4">
      <div className="bg-card shadow-xl rounded-xl p-10 w-full max-w-xl text-center space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center mb-8">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Verify Your Account
          </h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a verification link to your email address.
            <br />
            <span className="font-medium text-primary">{email}</span>
          </p>
        </div>

        <div className="pt-6">
          <p className="text-sm text-muted-foreground mb-2">
            Once verified, you can log in to your account.
          </p>
          <Link href="/login">
            <Button size={"lg"}>Already Verified? Log In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
