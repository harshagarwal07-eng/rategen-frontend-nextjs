"use client";

import { useRef } from "react";
import { Zap } from "lucide-react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

const dmcLogos = [
  "/dmc-logo-1.jpg",
  "/dmc-logo-2.jpg",
  "/dmc-logo-3.jpg",
  "/dmc-logo-4.jpg",
  "/dmc-logo-5.jpg",
];

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function HeroSection({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const containerRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const logosRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        defaults: { duration: 1, ease: "power3.out" },
      });

      // Fade in the container itself first
      tl.to(containerRef.current, { opacity: 1, duration: 0.1 });

      // Then animate parts one by one
      tl.from(textRef.current, { opacity: 0, y: 50 })
        .from(imageRef.current, { opacity: 0, y: 50 })
        .from(logosRef.current, { opacity: 0, y: 50 }, "+=0.2");
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="opacity-0 space-y-6 w-full grid grid-cols-1 sm:grid-cols-7 gap-4 px-2 "
    >
      <div
        ref={textRef}
        className="text-center sm:col-span-7 pt-28 relative z-20"
      >
        <div className="text-white max-w-5xl mx-auto space-y-3 mb-10">
          <p className="text-3xl sm:text-6xl font-bold ">
            Super Fast Pricing Automation For DMCs&nbsp;
            <span className="text-3xl sm:text-6xl font-extrabold bg-gradient-to-r from-emerald-500 to-emerald-200  bg-clip-text text-transparent leading-tight">
              Powered by AI
            </span>
          </p>
          <p className="font-semibold text-white/70 text-[10px] sm:text-xl">
            Quote in seconds what used to take hours
          </p>
        </div>

        <div className="button-wrapper w-[240px] h-12 sm:w-xs sm:h-16 p-1 mx-auto hover:before:animate-none hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer">
          <Link
            href={!isLoggedIn ? "/register" : "/rates/hotels"}
            prefetch
            className="button-content flex items-center justify-center  no-underline"
          >
            <div className="text-black/90 text-center flex gap-2 items-center sm:text-xl font-bold">
              <span>
                {isLoggedIn ? "Go To Dashboard" : "Join The AI Revolution"}
              </span>
              <Zap className="size-6 stroke-1 stroke-amber-500 fill-yellow-300" />
            </div>
          </Link>
        </div>
      </div>

      {/* Image Section */}
      <div
        ref={imageRef}
        className="sm:col-span-5 sm:col-start-2 p-3 sm:p-6 bg-gradient-to-l from-emerald-500/20 to-lime-300/30 border-2 border-border/30  rounded-4xl backdrop-blur-2xl relative sm:my-16"
      >
        <div className="relative w-full h-[400px] sm:h-[calc(100dvh-60px)] z-20 rounded-2xl overflow-hidden">
          <Image
            src="/home-images/playground-chat.png"
            alt="playground image"
            fill
            priority
            className="object-cover object-top-left"
          />
        </div>
        <div className="w-[115%] h-[600px] sm:h-[680px] bg-radial from-emerald-700 to-emerald-700/20 blur-3xl rounded-e-full absolute -bottom-24 -left-24 z-10" />
      </div>

      {/* DMC Logos Section */}
      <div
        ref={logosRef}
        className="relative space-y-6 sm:col-start-2 sm:col-span-5 z-10"
      >
        <p className="text-white font-semibold text-xl text-center">
          Trusted by <span className="text-emerald-500">400+</span> world&quot;s
          leading <span className="text-emerald-500">DMCs</span>
        </p>

        <div
          className="w-full overflow-hidden z-5"
          style={{
            maskImage:
              "linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 25%, rgb(0, 0, 0) 75%, rgba(0, 0, 0, 0) 100%)",
          }}
        >
          <div className="flex gap-10 w-fit overflow-hidden animate-marquee">
            {[...dmcLogos, ...dmcLogos].map((l, i) => (
              <div
                key={i}
                className="relative w-32 h-16 sm:w-56 sm:h-20 rounded-xl overflow-hidden"
              >
                <Image
                  src={`/home-images${l}`}
                  alt={`DMC Logo ${i}`}
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
