import Link from "next/link";
import Show from "@/components/ui/show";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { cn } from "@/lib/utils";
import Logo from "../ui/logo";
import { getUser } from "@/data-access/auth";

export default async function Navbar({ isDark }: { isDark?: boolean }) {
  const user = await getUser();
  return (
    <div className="flex items-end justify-between py-6 px-4 sm:px-10 ">
      <Link
        href={"/"}
        className="relative w-[100px] h-[40px] sm:h-[60px] sm:w-[160px]"
      >
        {isDark ? (
          <Image
            src={"/logo-dark.svg"}
            alt="RateGen Logo"
            fill
            priority
            className="object-contain"
          />
        ) : (
          <Logo />
        )}
      </Link>

      <Link
        href={"https://chatdmc.com/"}
        target="_blank"
        className={cn(
          "hidden md:inline-flex items-center rounded-xl border border-zinc-700 bg-zinc-800/80 backdrop-blur-md p-1 px-5 py-3 text-sm shadow-sm text-white no-underline",
          !isDark && "bg-transparent text-foreground"
        )}
      >
        <span>From The Makers of</span>
        <span className="ml-1 font-semibold">ChatDMC</span>
        <span className="ml-1">✨</span>
      </Link>

      <Show when={!user}>
        <div className="flex gap-x-4">
          <Link href="/login" prefetch>
            <Button
              variant={"outline"}
              size={"lg"}
              className="border-emerald-600 bg-transparent cursor-pointer text-emerald-500 hover:scale-110 transition-all hover:bg-transparent hover:text-primary hidden md:inline-flex"
            >
              Login
            </Button>
          </Link>
          <Link href="/register" prefetch>
            <Button
              size={"lg"}
              className="border-emerald-600 bg-emerald-600 cursor-pointer text-white hover:scale-110 transition-all hover:bg-emerald-600 "
            >
              Join for Free
            </Button>
          </Link>
        </div>
      </Show>

      <Show when={!!user}>
        <Link href="/rates/hotels" prefetch>
          <Button
            size={"lg"}
            className="border-emerald-600 bg-emerald-600 cursor-pointer text-white hover:scale-110 transition-all hover:bg-emerald-600 "
          >
            Dashboard
          </Button>
        </Link>
      </Show>
    </div>
  );
}
