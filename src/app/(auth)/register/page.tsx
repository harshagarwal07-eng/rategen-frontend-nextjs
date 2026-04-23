import SignupForm from "@/components/forms/signup-form";
import Logo from "@/components/ui/logo";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Register | RateGen",
  description: "Register for your free RateGen account",
};

export default async function RegisterPage() {

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Section - Login Form */}
      <div className="flex flex-1 flex-col px-4 sm:px-6 lg:px-16 bg-card h-full overflow-y-auto no-scrollbar space-y-14 max-w-lg">
        <div className="mx-auto text-center  w-full space-y-4 mt-20 ">
          <Logo className="mx-auto" />

          <h2 className="text-xl ">Power Up Your Pricing with AI ⚡</h2>
        </div>
        <SignupForm />
      </div>

      {/* Right Section - App Preview */}
      <div className="hidden flex-1 bg-black lg:flex flex-col justify-center text-center gap-y-10">
        <p className="text-4xl font-bold text-white [&>span]:text-primary">
          <span>AI-Powered</span> DMC Pricing
        </p>
        <div className="relative p-6 bg-primary/20 border-2 border-border/30  rounded-4xl backdrop-blur-2xl w-11/12 max-w-4xl mx-auto">
          <div className="relative w-full h-[70vh] z-20 rounded-2xl overflow-hidden">
            <Image
              src="/home-images/playground-chat.png"
              alt="playground image"
              fill
              priority
              className="object-cover object-top-left"
            />
          </div>
          <div className="w-[115%] h-[600px] bg-radial from-emerald-700 to-emerald-700/20 blur-3xl rounded-e-full absolute -bottom-24" />
        </div>
      </div>
    </div>
  );
}
