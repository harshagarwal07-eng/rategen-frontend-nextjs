import { redirect } from "next/navigation";

// Force dynamic rendering to avoid prerender errors
export const dynamic = 'force-dynamic';

export default function AgentsPage() {
  redirect("/crm/agents/all");
}
