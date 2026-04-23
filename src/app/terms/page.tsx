import HomeFooter from "@/components/home/footer";
import Navbar from "@/components/home/nav";
import { MoveLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
};

export default async function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-transparent dark:to-transparent">
      <Navbar />
      {/* Main Content */}
      <main className="container mx-auto px-6 py-10 max-w-4xl leading-relaxed space-y-8">
        <h1 className="text-3xl sm:text-4xl font-bold leading-normal w-fit mx-auto">
          Terms & Conditions
        </h1>

        <section>
          <p className="text-lg">
            By using RateGen, you agree to the following terms:
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">1. Use of Service</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              RateGen is designed for Destination Management Companies (DMCs)
              and travel suppliers.
            </li>
            <li>You are responsible for the accuracy of data you upload.</li>
            <li>
              Misuse of the platform may lead to suspension or termination.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Accounts</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Keep your login details secure.</li>
            <li>You are responsible for all activity under your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Pricing & Plans</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Free and paid plans are available.</li>
            <li>Subscriptions are billed as per selected plan.</li>
            <li>No refunds unless required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            4. Intellectual Property
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              RateGen owns all rights to the platform, design, and AI models.
            </li>
            <li>You retain rights to your uploaded data.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Limitations</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              RateGen provides AI-generated outputs for assistance—final
              responsibility for pricing, policies, and quotations lies with the
              DMC.
            </li>
            <li>
              We are not liable for indirect losses, missed business, or data
              errors.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Modifications</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>We may update these terms and policies periodically.</li>
            <li>Continued use of RateGen means you accept the changes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Governing Law</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>These terms are governed by the laws of India.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Shipping Policy</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              As a SaaS product, RateGen is delivered digitally and requires no
              physical shipping.
            </li>
            <li>
              Access credentials and onboarding details are provided
              electronically after purchase.
            </li>
          </ul>
        </section>

        <section className="flex justify-between pt-10">
          <Link
            href={"/"}
            prefetch
            className="flex gap-2 text-muted-foreground"
          >
            <MoveLeft className="size-5" /> Back to Home
          </Link>
          <p className="text-sm text-muted-foreground">
            Last Updated: August 27, 2025
          </p>
        </section>
      </main>
      <HomeFooter isDark />
    </div>
  );
}
