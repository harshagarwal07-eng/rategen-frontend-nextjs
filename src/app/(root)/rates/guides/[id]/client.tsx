"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GuidesDetailClient({ id: _id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rates/guides");
  }, [router]);
  return null;
}
