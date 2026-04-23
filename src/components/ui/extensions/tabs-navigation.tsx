"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { getAllHotelsByUser } from "@/data-access/hotels";
import { getAllToursByUser } from "@/data-access/tours";
import { getAllTransfersByUser } from "@/data-access/transfers";
import { getAllCarOnDisposalsByUser } from "@/data-access/car-on-disposal";
import { getAllMealsByUser } from "@/data-access/meals";
import { getAllGuidesByUser } from "@/data-access/guides";
import { DatastoreSearchParams } from "@/types/datastore";

type Tab = {
  label: string;
  href: string;
};

type Props = {
  tabs: Tab[];
  carryQuery?: boolean;
  prefetchOtherTabs?: boolean;
};

export default function TabNavigation({
  tabs,
  carryQuery,
  prefetchOtherTabs = true,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Prefetch data for other tabs on hover
  const prefetchTabData = (href: string) => {
    if (!prefetchOtherTabs) return;

    const defaultParams = { page: 1, perPage: 25 };
    const queryParams = Object.fromEntries(searchParams.entries());
    const params = {
      ...defaultParams,
      ...queryParams,
    } as DatastoreSearchParams;

    switch (href) {
      case "/rates/hotels":
        queryClient.prefetchQuery({
          queryKey: ["getAllHotelsByUser", params],
          queryFn: () => getAllHotelsByUser(params),
          staleTime: 2 * 60 * 1000, // 2 minutes
        });
        break;
      case "/rates/tours":
        queryClient.prefetchQuery({
          queryKey: ["getAllToursByUser", params],
          queryFn: () => getAllToursByUser(params),
          staleTime: 2 * 60 * 1000,
        });
        break;
      case "/rates/transfers":
        queryClient.prefetchQuery({
          queryKey: ["getAllTransfersByUser", params],
          queryFn: () => getAllTransfersByUser(params),
          staleTime: 2 * 60 * 1000,
        });
        break;
      case "/rates/car-on-disposal":
        queryClient.prefetchQuery({
          queryKey: ["getAllCarOnDisposalsByUser", params],
          queryFn: () => getAllCarOnDisposalsByUser(params),
          staleTime: 2 * 60 * 1000,
        });
        break;
      case "/rates/meals":
        queryClient.prefetchQuery({
          queryKey: ["getAllMealsByUser", params],
          queryFn: () => getAllMealsByUser(params),
          staleTime: 2 * 60 * 1000,
        });
        break;
      case "/rates/guides":
        queryClient.prefetchQuery({
          queryKey: ["getAllGuidesByUser", params],
          queryFn: () => getAllGuidesByUser(params),
          staleTime: 2 * 60 * 1000,
        });
        break;
    }
  };

  return (
    <Card className="py-0">
      <nav className="flex items-center mx-4">
        {tabs.map((tab) => {
          const isActive = pathname.includes(tab.href);
          return (
            <Link
              key={tab.label}
              href={`${tab.href}${
                carryQuery ? `?${searchParams.toString()}` : ""
              }`}
              prefetch
              onMouseEnter={() => !isActive && prefetchTabData(tab.href)}
              className={cn(
                "px-6 py-4 font-medium transition-colors border-b-4 relative -mb-[2px] border-transparent text-foreground/70",
                isActive && "border-primary text-foreground",
                "hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </Card>
  );
}
