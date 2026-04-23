import HomeFooter from "@/components/home/footer";
import Navbar from "@/components/home/nav";
import { MoveLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default async function PolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-transparent dark:to-transparent">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10 max-w-4xl leading-relaxed space-y-8">
        <h1 className="text-3xl sm:text-4xl font-bold leading-normal w-fit mx-auto">
          Privacy Policy
        </h1>
        <section>
          <p className="text-lg">
            RateGen values your privacy and is committed to protecting your
            data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            1. Information We Collect
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Business information (DMC details, contact info).</li>
            <li>Uploaded files (rate sheets, policies, data).</li>
            <li>Usage data (how you interact with the platform).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">
            2. How We Use Your Data
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide and improve RateGen services.</li>
            <li>To personalize pricing and itinerary generation.</li>
            <li>For customer support and product updates.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Data Sharing</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>We never sell your data.</li>
            <li>
              Data may be shared with trusted third-party services (e.g.,
              hosting, analytics).
            </li>
            <li>Legal compliance if required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Data Security</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Encryption and secure servers to protect sensitive data.</li>
            <li>Limited internal access to your information.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access, update, or delete your data on request.</li>
            <li>Opt-out of marketing communications anytime.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Contact</h2>
          <p>
            If you have any questions about this PrivacyPolicy, please contact
            us at:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Company: Urban Ventures</li>
            <li>
              Email:{" "}
              <Link href="mailto:privacy@rategen.com" className="text-primary">
                hello@rategen.ai
              </Link>
            </li>
            <li>
              Phone:{" "}
              <a href="tel:+919800240007" className="hover:underline">
                +91 98002 40007
              </a>
              {" • "}
              <a href="tel:+919144400522" className="hover:underline">
                +91 9144400522
              </a>
            </li>
            <li>
              Address: Space Town, 5th Floor, Sevoke Road, 2.5 Mile, Near Check
              Post, Siliguri, West Bengal, 734001
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
