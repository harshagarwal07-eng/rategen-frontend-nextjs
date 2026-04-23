import { ExternalLink } from "lucide-react";
import Link from "next/link";

type Props = {
  id: string;
  href: string;
};

export default function IdColumn({ id, href }: Props) {
  return (
    <Link
      href={href}
      target="_blank"
      prefetch
      className="flex items-center hover:text-primary"
    >
      {id.slice(0, 4)}... <ExternalLink className="ms-1 w-4 h-4" />
    </Link>
  );
}
