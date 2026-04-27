import ServiceMarkupDetailClient from "./client";
import type { ServiceType } from "@/types/markup";

type Params = Promise<{ serviceType: string }>;

export default async function ServiceMarkupDetailPage({ params }: { params: Params }) {
  const { serviceType } = await params;
  return <ServiceMarkupDetailClient serviceType={serviceType as ServiceType} />;
}
