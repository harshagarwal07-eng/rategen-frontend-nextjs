import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const dmcOpsCardValues = [
  {
    title: "Smart DMC Knowledgebase",
    tag: "Knowledge-Driven",
    desc: "Store policies, terms, and conditions—AI auto-applies them to every travel quote for consistency.",
    imgSrc: "dmc-ops-1.png",
  },
  {
    title: "Rule-Based Pricing Automation",
    tag: "Rule-Based Logic",
    desc: "Set custom rules for hotels, tours, and transfers—AI ensures accurate pricing for every DMC package.",
    imgSrc: "dmc-ops-2.png",
  },
  {
    title: "AI That Learns & Adapts",
    tag: "Adaptive Intelligence",
    desc: "The more you use it, the smarter it gets—AI refines pricing and quotations based on your DMC workflow.",
    imgSrc: "dmc-ops-3.png",
  },
];

export default function ContentSection2({
  isLoggedIn,
}: {
  isLoggedIn?: boolean;
}) {
  return (
    <section className="space-y-20">
      <div className="text-center space-y-3">
        <p className="text-3xl sm:text-6xl font-bold text-white leading-tight">
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-200  bg-clip-text text-transparent">
            AI-Powered
          </span>{" "}
          DMC Operations
        </p>
        <p className="font-semibold text-white/70 text-[10px] sm:text-xl  max-w-2xs sm:max-w-5xl mx-auto">
          Optimize every step of your workflow—from rate management to final
          quotations—with intelligent automation designed for DMCs.
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-none  w-full flex gap-x-6 justify-start xl:justify-center px-6">
        {dmcOpsCardValues.map((v, i) => (
          <Card
            key={i}
            className="bg-zinc-900/40 backdrop-blur-2xl border-2 border-zinc-700/70 rounded-xl "
          >
            <CardHeader className="text-white/50 text-xs space-y-2">
              <p className="text-sm ">{v.tag}</p>
              <CardTitle className="text-3xl text-white">{v.title}</CardTitle>
              <p className="leading-tight text-sm">{v.desc}</p>
            </CardHeader>
            <CardContent className="bg-transparent">
              <div className="relative min-w-xs aspect-square rounded-xl overflow-hidden">
                <Image
                  src={`/home-images/${v.imgSrc}`}
                  alt="DMC Operations Flow"
                  fill
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="button-wrapper w-[240px] h-12 sm:w-xs sm:h-16 p-1 mx-auto hover:before:animate-none hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer z-20">
        <Link
          href={isLoggedIn ? "/rates/hotels" : "/register"}
          prefetch
          className="button-content flex items-center justify-center no-underline"
        >
          <div className="text-black/90 text-center  flex gap-2 items-center sm:text-xl font-bold ">
            <span>Automate Now</span> <Settings className="w-5 h-5" />
          </div>
        </Link>
      </div>
    </section>
  );
}
