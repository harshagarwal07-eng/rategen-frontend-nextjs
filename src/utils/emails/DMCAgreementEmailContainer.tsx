import { DMCAgreementEmailProps } from "@/types/common";
import { Heading, Link, Section, Text } from "@react-email/components";

export default function DMCAgreementEmailContainer({
  date = "[DATE]",
  month = "[MONTH]",
  year = "[YEAR]",
  dmcName = "[DMC NAME]",
  dmcAddress = "[ADDRESS]",
  adminEmail = "[DMC Email]",
  adminMobile = "[DMC Mobile Number]",
  dmcCountry = "[India]",
}: DMCAgreementEmailProps) {
  return (
    <>
      <Section>
        <Text>
          This SERVICE AGREEMENT (hereinafter referred to as the
          &quot;Agreement&quot;) is made on this {date} day of {month}, {year}
        </Text>

        <Text className="font-semibold">BY AND BETWEEN</Text>

        <Text>
          RateGen (Legal Name: Urban Ventures) a partnership firm registered
          under the laws of India, having its registered office at Space Town,
          5th Floor, Sevoke Road, Siliguri, West Bengal - 734001, India
          (hereinafter referred to as &quot;RateGen&quot; which expression
          shall, unless repugnant to the context or meaning thereof, be deemed
          to include its successors and permitted assigns) of the{" "}
          <b>FIRST PART</b>
        </Text>

        <Text className="font-semibold">AND</Text>

        <Text>
          {dmcName}, a Destination Management Company registered under the laws
          of {dmcCountry}, having its registered office at {dmcAddress}{" "}
          (hereinafter referred to as the <b>&quot;DMC&quot;</b>, which
          expression shall, unless repugnant to the context or meaning thereof,
          be deemed to include its successors and permitted assigns) of the{" "}
          <b>SECOND PART.</b>
        </Text>

        <Text>
          RateGen and DMC are hereinafter individually referred to as
          &quot;Party&quot; and collectively as &quot;Parties&quot;.
        </Text>

        <Text>WHEREAS:</Text>

        <ul className="text-sm list-disc list-inside">
          <li>
            <b>RateGen</b> provides a software-as-a-service (SaaS) platform that
            enables Destination Management Companies (DMCs) to generate travel
            quotes using their own rate sheets and pricing rules, powered by
            artificial intelligence.
          </li>
          <li>
            The DMC wishes to offer its services through the ChatDMC platform.
          </li>
          <li>
            The Parties wish to enter into this Agreement to set forth the terms
            and conditions of their business relationship.
          </li>
        </ul>

        <Text>
          NOW THEREFORE, in consideration of the mutual covenants and agreements
          hereinafter set forth, the Parties agree as follows:
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">
          1. Platform Usage and Fees
        </Heading>

        <Text>
          1.1. RateGen will provide the DMC with access to its AI-powered quote
          generation platform under a <b>subscription-based model.</b>
        </Text>

        <Text>
          1.2. The DMC agrees to pay the applicable <b>subscription fees</b>{" "}
          based on the selected plan as described on{" "}
          <a
            href="https://www.rategen.ai"
            className="text-blue-600 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.rategen.ai
          </a>{" "}
          or in a separately agreed pricing proposal.
        </Text>

        <Text>
          1.3. Subscription fees are <b>payable in advance</b> on a monthly,
          annual, or enterprise basis depending on the selected plan.
        </Text>

        <Text>
          1.4. There are <b>no commissions</b> charged on quotes or bookings
          made through the RateGen platform.
        </Text>

        <Text>
          1.5. Failure to make timely payments may result in{" "}
          <b>account suspension or restricted access</b> until dues are cleared.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">
          2. Service Delivery and Liability
        </Heading>

        <Text>
          2.1. The DMC is solely responsible for the accuracy, completeness, and
          configuration of all <b>rate sheets, pricing rules, and inputs</b>{" "}
          uploaded to the RateGen platform.
        </Text>

        <Text>
          2.2. RateGen provides software tools to assist with quote generation
          but <b>does not participate</b> in the delivery, booking, or execution
          of travel services.
        </Text>

        <Text>
          2.3. RateGen shall not be held liable for any errors, omissions, or
          discrepancies in quotes <b>generated using the DMC&apos;s data</b>,
          nor for any disputes arising from such outputs.
        </Text>

        <Text>
          2.4. The DMC agrees to review and verify the output generated through
          the platform before <b>sharing it with clients or third parties</b>.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">3. DMC Obligations</Heading>

        <Text>3.1. The DMC agrees to fulfill the following obligations:</Text>

        <ul className="text-sm list-disc list-inside">
          <li>
            Provide accurate and regularly updated{" "}
            <b>rate sheets and pricing rules</b> for use in quote generation.
          </li>
          <li>
            Ensure all uploaded data complies with{" "}
            <b>local laws, tax requirements, and industry standards</b>.
          </li>
          <li>
            Review AI-generated quotes for <b>accuracy and completeness</b>{" "}
            before using or sharing externally.
          </li>
          <li>
            Maintain <b>valid subscription status</b> and make timely payments
            as per the selected plan.
          </li>
          <li>
            Avoid any misuse of the platform, including{" "}
            <b>unauthorized access, scraping, or reverse engineering</b>.
          </li>
          <li>
            Report any bugs, inconsistencies, or system issues that may affect
            quote generation or platform performance.
          </li>
          <li>
            Maintain adequate <b>internal processes</b> to validate final quotes
            before sending them to clients.
          </li>
          <li>
            Cooperate with RateGen for{" "}
            <b>onboarding, support, and compliance verifications</b> when
            requested.
          </li>
        </ul>

        <Text>
          3.2. Failure to meet these obligations may result in{" "}
          <b>suspension or termination</b> of access to the RateGen platform.
        </Text>
      </Section>
      <Section>
        <Heading className="font-bold text-xl">
          4. Payments and Subscription
        </Heading>

        <Text>
          4.1. The DMC agrees to pay for the RateGen platform access according
          to the selected subscription plan, which may be billed monthly or
          annually.
        </Text>

        <Text>
          4.2. RateGen does not charge any commission on quotes generated or
          services booked using the platform.
        </Text>

        <Text>
          4.3. Subscription fees are non-refundable and subject to the terms
          outlined in the subscription agreement.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">5. Termination</Heading>

        <Text>
          5.1. RateGen reserves the right to suspend or terminate access to the
          platform if the DMC breaches any terms of this Agreement, including
          misuse of the platform or non-payment of subscription fees.
        </Text>

        <Text>
          5.2. The DMC may terminate their subscription by providing prior
          written notice as specified in their subscription plan.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">6. Dispute Resolution</Heading>

        <Text>
          6.1. Any disputes arising out of or related to this Agreement shall be
          governed by and resolved in accordance with the laws of India.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">
          7. Amendments and Modifications
        </Heading>

        <Text>
          7.1. RateGen reserves the right to amend or modify these terms and
          conditions at any time. Changes will be communicated to the DMC via
          the platform or email.
        </Text>

        <Text>
          7.2. Continued use of the platform after such changes constitutes
          acceptance of the updated terms.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">
          8. Intellectual Property
        </Heading>

        <Text>
          8.1. Each party retains ownership of its intellectual property. The
          DMC grants RateGen a limited license to use their uploaded content
          solely to provide the quote generation services.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">9. Force Majeure</Heading>

        <Text>
          9.1. Neither party shall be liable for failure or delay in performance
          due to circumstances beyond their reasonable control, including
          natural disasters, pandemics, or government actions.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">10. Severability</Heading>

        <Text>
          10.1. If any provision of this Agreement is found invalid or
          unenforceable, the remaining provisions shall continue in full force
          and effect.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">11. Entire Agreement</Heading>

        <Text>
          11.1. This Agreement constitutes the entire understanding between the
          parties and supersedes all prior agreements relating to the subject
          matter herein.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">
          12. Agreement Acceptance and Effectiveness
        </Heading>

        <Text>
          12.1. By registering on the RateGen platform, the DMC acknowledges
          that they have read, understood, and agree to be bound by the terms of
          this Agreement.
        </Text>

        <Text>
          12.2. This Agreement becomes effective upon registration and remains
          in effect until terminated per the terms outlined in this Agreement.
        </Text>

        <Text>
          12.3. Electronic acceptance through registration shall be legally
          binding.
        </Text>
      </Section>

      <Section>
        <Heading className="font-bold text-xl">13. Contact Information</Heading>

        <Text>13.1. To communicate with RateGen, please use:</Text>

        <ul className="text-sm list-disc list-inside">
          <li>
            <b>Email:</b>{" "}
            <Link
              className="text-blue-600 underline"
              href="mailto:hello@rategen.ai"
            >
              hello@rategen.ai
            </Link>
          </li>
          <li>
            <b>Phone:</b>{" "}
            <Link className="text-blue-600 underline" href="tel:+919144400311">
              +919144400522
            </Link>
          </li>
        </ul>

        <Text>
          13.2. To communicate with the DMC, the following contact information
          will be used:
        </Text>

        <ul className="text-sm list-disc list-inside">
          <li>
            <b>Email:</b>{" "}
            <Link
              className="text-blue-600 underline"
              href={`mailto:${adminEmail}`}
            >
              {adminEmail}
            </Link>
          </li>
          <li>
            <b>Phone:</b>{" "}
            <Link
              className="text-blue-600 underline"
              href={`tel:${adminMobile}`}
            >
              {adminMobile}
            </Link>
          </li>
        </ul>

        <br />
      </Section>

      <Section>
        <Text>
          IN WITNESS WHEREOF, the Parties hereto have executed this Agreement as
          of the date first above written.
        </Text>

        <table className="border-collapse w-full text-sm">
          <thead className="text-left">
            <tr>
              <th className="border-gray-300 p-2 border">
                Authorised Signatory
              </th>
              <th className="border-gray-300 p-2 border">
                Authorised Signatory
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-gray-300 p-2 border font-bold">RateGen</td>
              <td className="border-gray-300 p-2 border">{dmcName}</td>
            </tr>
          </tbody>
        </table>
      </Section>
    </>
  );
}
