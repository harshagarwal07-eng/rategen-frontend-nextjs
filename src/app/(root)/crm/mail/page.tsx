import { getCurrentUser } from "@/data-access/auth";
import EmailsSection from "@/components/crm/queries/ops/emails-section";

export default async function MailPage() {
  const user = await getCurrentUser();

  return (
    <div className="h-full flex flex-col">
      <EmailsSection dmcId={user?.dmc?.id} />
    </div>
  );
}
