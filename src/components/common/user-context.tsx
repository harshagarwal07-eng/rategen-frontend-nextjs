"use client";

import { User } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useState } from "react";

export interface IUser extends User {
  dmc: { name: string; id: string; avatar_url?: string };
}

export interface IUserContext {
  user: IUser | null;
  setUser: (user: IUser | null) => void;
}

export const UserContext = createContext<IUserContext>({
  user: null,
  setUser: () => {},
});

type Props = {
  children: React.ReactNode;
  userData: IUser;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});

export default function UserContextProvider({ userData, children }: Props) {
  const [user, setUser] = useState<IUser | null>(userData ?? null);

  return (
    <QueryClientProvider client={queryClient}>
      <UserContext.Provider
        value={{
          user,
          setUser,
        }}
      >
        {children}
      </UserContext.Provider>
    </QueryClientProvider>
  );
}
