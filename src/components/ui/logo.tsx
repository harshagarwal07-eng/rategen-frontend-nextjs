"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  className?: string;
  sm?: boolean;
  icon?: boolean;
};

export default function Logo({ className, sm, icon }: Props) {
  const { resolvedTheme } = useTheme();

  const [logoSrc, setLogoSrc] = useState<string>("/logo-white.svg");

  useEffect(() => {
    setLogoSrc(resolvedTheme === "dark" ? "/logo-dark.svg" : "/logo.svg");
  }, [resolvedTheme]);

  if (icon) {
    return (
      <Image
        src="/logo-square-white.png"
        alt="RateGen Logo"
        width={16}
        height={16}
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      alt="RateGen Logo"
      width={sm ? 100 : 160}
      height={sm ? 31 : 51}
      className={cn(className)}
    />
  );
}
