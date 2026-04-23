"use client";

import { usePathname } from "next/navigation";
import ToursDatastoreForm from "@/components/forms/tours-datastore-form";
import TransfersDatastoreForm from "../forms/transfers-datastore-form";
import MealsDatastoreForm from "../forms/meals-datastore-form";
import GuidesDatastoreForm from "../forms/guides-datastore-form";
import HotelsDatastoreForm from "../forms/hotels-datastore-form";
import CarOnDisposalDatastoreForm from "../forms/car-on-disposal-datastore-form";

type Props = {
  onSuccess?: () => void;
};

export default function DatastoreForm({ onSuccess }: Props) {
  const pathname = usePathname();

  if (pathname.includes("hotels")) {
    return <HotelsDatastoreForm initialData={null} onSuccess={onSuccess} />;
  }

  if (pathname.includes("tours")) {
    return <ToursDatastoreForm initialData={null} onSuccess={onSuccess} />;
  }

  if (pathname.includes("transfers")) {
    return <TransfersDatastoreForm initialData={null} onSuccess={onSuccess} />;
  }

  if (pathname.includes("car-on-disposal")) {
    return (
      <CarOnDisposalDatastoreForm initialData={null} onSuccess={onSuccess} />
    );
  }

  if (pathname.includes("meals")) {
    return <MealsDatastoreForm initialData={null} onSuccess={onSuccess} />;
  }

  if (pathname.includes("guides")) {
    return <GuidesDatastoreForm initialData={null} onSuccess={onSuccess} />;
  }
  return null;
}
