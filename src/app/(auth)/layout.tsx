import { getUser } from "@/data-access/auth";
import { redirect } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: Props) {
  const user = await getUser();

  // If user is logged in, redirect to home
  if (user) redirect("/rates/hotels");

  return <>{children}</>;
}
