import Navbar from "@/components/common/navbar";
import UserContextProvider, { IUser } from "@/components/common/user-context";
import { getCurrentUser } from "@/data-access/auth";
import { redirect } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

// Force dynamic rendering to avoid serialization issues during build
export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: Props) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user?.role?.startsWith("ta_")) redirect("/");

  return (
    <UserContextProvider userData={user as IUser}>
      <div className="relative flex w-full h-full flex-1 flex-col overflow-hidden">
        <Navbar />
        <div className="flex w-full flex-1 flex-col overflow-auto">{children}</div>
      </div>
    </UserContextProvider>
  );
}
