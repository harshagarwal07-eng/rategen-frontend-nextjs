import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ country?: string }>;
};

export default async function DocsRoot({ searchParams }: Props) {
  redirect("/docs/knowledgebase" + (await searchParams).toString());
}
