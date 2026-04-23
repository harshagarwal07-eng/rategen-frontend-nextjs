import type { ReactNode } from "react";

export interface ShowProps {
  when: boolean;
  children: ReactNode;
}

export default function Show({ children, when }: ShowProps) {
  return when ? <>{children}</> : null;
} 