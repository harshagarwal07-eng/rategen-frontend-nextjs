import { ReactNode } from "react";
import PlaygroundLayoutWrapper from "./layout-wrapper";

type Props = {
  children: ReactNode;
};

export default async function PlaygroundLayout({ children }: Props) {
  return <PlaygroundLayoutWrapper>{children}</PlaygroundLayoutWrapper>;
}
