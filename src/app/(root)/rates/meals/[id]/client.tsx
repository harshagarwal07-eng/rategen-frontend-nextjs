"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MealsDetailClient({ id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rates/meals");
  }, [router]);
  return null;
}
