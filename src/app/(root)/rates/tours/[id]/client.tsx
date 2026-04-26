"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TourDetailClient({ id: _id }: { id: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace("/rates/tours");
  }, [router]);
  return null;
}
