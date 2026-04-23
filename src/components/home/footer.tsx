import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { FaLinkedinIn, FaRegEnvelope, FaWhatsapp } from "react-icons/fa6";

export default function HomeFooter({ isDark }: { isDark?: boolean }) {
  return (
    <div
      className={cn(
        " bg-neutral-900/80 w-full grid sm:grid-cols-7 gap-4 px-2 py-20",
        isDark && "bg-neutral-900"
      )}
    >
      <div className="sm:col-span-5 sm:col-start-2">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-6 border-b">
          <Link href={"/"} className="relative h-[60px] w-[160px]">
            <Image
              src={"/logo-dark.svg"}
              alt="RateGen Logo"
              fill
              className="object-contain"
            />
          </Link>
          <div className="col-span-2 flex justify-between sm:justify-evenly items-center">
            <Link
              href={"https://www.chatdmc.com/"}
              target="_blank"
              className="relative w-28 h-10"
            >
              <Image
                src={"/home-images/chatdmc-logo.png"}
                alt="ChatDMC Logo"
                fill
                className="object-contain"
              />
            </Link>
            <Link
              href={"https://www.startatravelagency.in/"}
              target="_blank"
              className="relative w-16 aspect-square"
            >
              <Image
                src={"/home-images/sata-logo.png"}
                alt="Start A Travel Agency Logo"
                fill
                className="object-contain"
              />
            </Link>
            <Link
              href={"https://www.micechat.in/"}
              target="_blank"
              className="relative w-24 h-10"
            >
              <Image
                src={"/home-images/micechat-logo.png"}
                alt="MiceChat Logo"
                fill
                className="object-contain"
              />
            </Link>
          </div>
          <div className="w-fit sm:ml-auto flex gap-2 sm:gap-4 items-center text-white [&_svg]:size-10 [&_svg]:rounded [&_svg]:bg-white [&_svg]:fill-black [&_svg]:p-2">
            <Link
              href={"https://www.linkedin.com/company/chatdmc"}
              target="_blank"
            >
              <FaLinkedinIn />
            </Link>
            <Link href={"mailto:hello@rategen.ai"} target="_blank">
              <FaRegEnvelope />
            </Link>
            <Link href={"https://wa.me/919144400522 "}>
              <FaWhatsapp />
            </Link>
          </div>
        </div>
        <div className="text-primary-foreground dark:text-foreground py-5 flex justify-between [&_p]:sm:text-xl">
          <p>&copy; Urban Ventures </p>
          <div className="flex gap-4">
            <Link
              href={"/policy"}
              prefetch
              className="decoration-0 text-primary-foreground dark:text-foreground underline underline-offset-4 sm:text-xl"
            >
              Policy
            </Link>
            <Link
              href={"/terms"}
              className="decoration-0 text-primary-foreground dark:text-foreground underline underline-offset-4 sm:text-xl"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
