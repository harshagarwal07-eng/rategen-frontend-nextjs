"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Meals1DetailClient({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rates/meals1");
  }, [router]);
  return null;
}
