import BundleMarkupDetailClient from "./client";

type Params = Promise<{ bundleId: string }>;

export default async function BundleMarkupDetailPage({ params }: { params: Params }) {
  const { bundleId } = await params;
  return <BundleMarkupDetailClient bundleId={bundleId} />;
}
