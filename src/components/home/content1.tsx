"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function ContentSection1({
  isLoggedIn,
}: {
  isLoggedIn?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  const texts = [
    {
      heading: "Smart Rate Upload",
      text: "Effortlessly upload your rate sheets—AI organizes and updates pricing for your DMC in seconds.",
    },
    {
      heading: "AI Query Assistant",
      text: "Paste any travel query—AI fills the gaps, refines details, and generates accurate pricing instantly.",
    },
    {
      heading: "AI-Powered Quotation",
      text: "Generate complete, ready-to-send travel quotations in seconds—optimized for your DMC's pricing strategy.",
    },
  ];

  useGSAP(
    () => {
      const trigger = containerRef.current;

      if (!trigger) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger,
          start: "top top",
          end: "+=1000",
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
        defaults: { ease: "none" },
      });

      imgRefs.current.forEach((ref, index) => {
        if (ref && index > 0) {
          tl.add(
            [
              gsap.to(textRefs.current[index - 1], {
                y: "-100%",
                opacity: 0,
                duration: 4,
              }),
              gsap.fromTo(
                textRefs.current[index],
                { y: "100%", opacity: 0 },
                { y: "0%", opacity: 1, duration: 3 }
              ),
              gsap.fromTo(
                ref,
                { xPercent: 100, x: 0 },
                { xPercent: 0, duration: 4 }
              ),
            ],
            "+=4"
          );
        }
      });
    },
    { scope: containerRef }
  );

  return (
    <section className="space-y-10 sm:space-y-24">
      {/* Heading */}
      <div className="text-center space-y-3">
        <p className="text-3xl sm:text-6xl font-bold text-white leading-tight">
          Quote&nbsp;
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-100  bg-clip-text text-transparent">
            Smarter
          </span>
          , Sell&nbsp;
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-100  bg-clip-text text-transparent">
            Faster
          </span>
        </p>
        <p className="font-semibold text-white/70 text-[10px] sm:text-xl">
          Integrate AI into your pricing workflow
        </p>
      </div>

      {/* Content & Slider */}
      <div
        className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center"
        ref={containerRef}
      >
        {/* Text Contents */}
        <div className="relative h-[200px] md:h-[500px] md:col-span-2 md:col-start-2 overflow-hidden">
          {texts.map((t, index) => (
            <div
              key={index}
              ref={(el) => {
                textRefs.current[index] = el;
              }}
              className="absolute top-0 left-0 space-y-4 w-full mx-auto text-center md:text-left  md:pr-10 h-full flex flex-col justify-center transition-all"
            >
              <p className="text-white font-bold text-lg md:text-4xl">
                {t.heading}
              </p>
              <p className="font-semibold text-white/60 text-xs md:text-base">
                {t.text}
              </p>
              <Link
                href={isLoggedIn ? "/rates/hotels" : "/register"}
                prefetch
                className="text-base text-emerald-500 no-underline flex gap-x-2 justify-center md:justify-start items-center font-medium"
              >
                Try for Free <ArrowRight className="size-5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Carousel */}
        <div className="relative px-3 md:px-6 pr-0 backdrop-blur-2xl border-2 border-r-0 border-emerald-600/60 rounded-l-2xl md:col-span-4 md:col-start-4 w-full h-[400px] sm:h-[100vh] bg-gradient-to-b from-emerald-300/20 to-emerald-300/20">
          <div className="relative rounded-l-2xl flex w-full h-[96%] overflow-hidden z-20">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  `absolute top-3 sm:top-6 w-full border-l border-muted-foreground h-full rounded-l-2xl overflow-hidden z-[${
                    index + 20
                  }]`,
                  index > 0 && "transform translate-(100%,0px)"
                )}
                ref={(el) => {
                  imgRefs.current[index] = el;
                }}
              >
                <Image
                  src={`/home-images/slide-img-${index + 1}.png`}
                  alt="Rategen UI image"
                  fill
                  className="object-cover object-top-left"
                />
              </div>
            ))}
          </div>

          {/* Visual background effect */}
          <div className="absolute size-[300px] md:size-[500px] bg-radial from-emerald-700 to-emerald-700/20 blur-[150px] rounded-full -bottom-30 -left-36 z-10" />
        </div>
      </div>
    </section>
  );
}
