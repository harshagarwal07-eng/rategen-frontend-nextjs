"use client";

import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MousePointer2 } from "lucide-react";
import Image from "next/image";
import gsap from "gsap";
import { cn } from "@/lib/utils";
import Link from "next/link";

type CardProps = {
  id: string;
  positionCalssName?: string;
  arrowClassName: string;
  move?: "x" | "y";
  content: {
    name: string;
    imageSrc: string;
  };
};

const CARD_DATA: CardProps[] = [
  {
    id: "card-1",
    positionCalssName: "left-1/3 top-[4%]",
    arrowClassName: "-bottom-2 -right-6 -rotate-180",
    move: "y",
    content: { name: "Harsh Agarwal", imageSrc: "/home-images/harsh.jpeg" },
  },
  {
    id: "card-2",
    positionCalssName: "top-3/12 left-[5%]",
    arrowClassName: "-bottom-2 -right-6 -rotate-180",
    content: { name: "Soham Dasgupta", imageSrc: "/home-images/soham.jpeg" },
  },
  {
    id: "card-3",
    positionCalssName: "top-1/4 right-32",
    arrowClassName: "-bottom-2 -left-6 -rotate-90",
    move: "x",
    content: { name: "Pankaj Yadav", imageSrc: "/home-images/pankaj.jpeg" },
  },
  {
    id: "card-4",
    positionCalssName: "bottom-[13%] right-1/3",
    arrowClassName: "-left-6 -top-2 rotate-0",
    move: "y",
    content: { name: "Aritra Paul", imageSrc: "/home-images/aritra.jpg" },
  },
  {
    id: "card-5",
    positionCalssName: "bottom-[12%] left-1/12",
    arrowClassName: "-right-6 -top-2 rotate-90",
    move: "x",
    content: { name: "Garima Pareek", imageSrc: "/home-images/garima.jpeg" },
  },
  // {
  //   id: "card-6",
  //   positionCalssName: "bottom-[40%] right-1/12",
  //   arrowClassName: "-left-6 -top-2 rotate-0",
  //   content: { name: "Hritika Anand", imageSrc: "/home-images/hritika.png" },
  // },
];

export default function OrbitingCards() {
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    CARD_DATA.forEach((card) => {
      const el = cardRefs.current[card.id];
      if (!el) return;

      if (card.move === "y") {
        gsap.to(el, {
          y: 30,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      } else {
        gsap.to(el, {
          x: 30,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "power1.inOut",
        });
      }
    });
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto mb-20 sm:p-4">
      <div
        className="p-1 sm:p-2.5 rounded-xl"
        style={{
          background:
            "linear-gradient(to right,#98cf74,#f3d663,#9d6edf,#5faff5,#6dca8d)",
        }}
      >
        <div
          className="relative bg-black rounded-xl sm:aspect-[16/9]"
          style={{ width: "100%" }}
        >
          <div className="text-center h-full flex flex-col justify-center gap-y-1.5 sm:gap-y-6 text-white p-10">
            <p className="text-xl sm:text-6xl font-bold">Our Story</p>
            <p className="text-sm sm:text-3xl font-semibold">
              From the House of ChatDMC
            </p>
            <p className="sm:max-w-4/5 mx-auto text-xs sm:text-xl">
              ChatDMC, along with its brands MICEChat, Start A Travel Agency,
              and RateGen, is on a mission to revolutionize B2B travel through
              AI-powered innovation and seamless technology.
            </p>

            <div className="flex justify-center gap-2 sm:gap-10 items-center">
              <Link
                href={"https://www.softwaresuggest.com/chatdmc"}
                target="_blank"
                className="relative w-16 sm:w-40 aspect-square shrink-0"
              >
                <Image
                  src={"/home-images/SoftwareSuggest.png"}
                  alt="Software Suggest User Angagement Award"
                  fill
                />
              </Link>
              <Link
                href={"https://slashdot.org/software/p/ChatDMC/"}
                target="_blank"
                className="relative w-12 sm:w-32 aspect-square shrink-0"
              >
                <Image
                  src={"/home-images/SlashDot.png"}
                  alt="Slashdot Top Performer Award"
                  fill
                />
              </Link>
              <Link
                href={"https://www.saashub.com/chatdmc-alternatives"}
                target="_blank"
                className="relative w-16 sm:w-40 h-5 sm:h-20 shrink-0"
              >
                <Image
                  src={"/home-images/SaasHub.png"}
                  alt="SaasHub Award"
                  fill
                  className="object-contain"
                />
              </Link>
              <Link
                href={"https://sourceforge.net/software/product/ChatDMC/"}
                target="_blank"
                className="relative w-16 sm:w-32 aspect-square"
              >
                <Image
                  src={"/home-images/sourceforge.png"}
                  alt="Sourceforge Top Performer Awaed"
                  fill
                />
              </Link>
            </div>
          </div>

          {/* Cards */}
          {CARD_DATA.map((card) => (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[card.id] = el;
              }}
              className={cn(
                "absolute bg-emerald-700 rounded-full shadow-md sm:flex items-center justify-center gap-1 [&_p]:text-sm shrink-0 text-white py-1.5 px-2 hidden transition-all",
                card.positionCalssName
              )}
            >
              <Avatar className="size-5 sm:size-8">
                <AvatarImage
                  src={card.content.imageSrc}
                  className="object-cover"
                />
                <AvatarFallback>
                  {card.content.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p>{card.content.name}</p>
              <MousePointer2
                className={cn(
                  "size-7 absolute rotate-90 fill-emerald-700 stroke-1",
                  card.arrowClassName
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
