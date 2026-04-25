"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TransferDetailClient({ id: _id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rates/transfers");
  }, [router]);
  return null;
}
