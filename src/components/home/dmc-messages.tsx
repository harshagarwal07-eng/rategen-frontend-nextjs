"use client";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

const messages = [
  {
    quote: "Game-Changer for Our Pricing Workflow!",
    dmcInfo: "Travel Experts DMC, Dubai",
    message:
      "RateGen has completely transformed how we manage pricing and quotations. AI-powered automation saves us hours on every query, allowing us to focus on delivering exceptional travel experiences. A must-have for any DMC!",
    rating: 5,
  },
  {
    quote: "Faster Quotes, More Bookings!",
    dmcInfo: "Wanderlust Journeys, Thailand",
    message:
      "We used to spend hours compiling rates and creating quotes. With RateGen, AI does it all in seconds, ensuring accurate pricing and faster turnaround times. Our agents love the speed!",
    rating: 5,
  },
  {
    quote: "Seamless Rate Management",
    dmcInfo: "Explore More DMC, Greece",
    message:
      "Uploading rate sheets used to be a nightmare. Now, RateGen organizes and updates everything automatically, saving us endless manual work. A lifesaver for DMCs!",
    rating: 5,
  },
  {
    quote: "AI That Actually Understands Travel",
    dmcInfo: "Nomad Routes, South Africa",
    message:
      "Unlike generic automation tools, RateGen's AI adapts to our business rules, policies, and pricing preferences, ensuring every quote is spot on. It's like having an expert pricing assistant 24/7!",
    rating: 5,
  },
  {
    quote: "Superb Customization & Accuracy",
    dmcInfo: "Elite Getaways, Spain",
    message:
      "RateGen lets us set custom pricing rules, integrate policies, and generate professional quotations—all with AI precision. Our efficiency has skyrocketed!",
    rating: 5,
  },
  {
    quote: "Perfect for Complex Itineraries",
    dmcInfo: "Infinity DMC, France",
    message:
      "For multi-destination packages, pricing used to be a headache. RateGen simplifies everything, auto-calculating rates and optimizing costs with AI-driven accuracy. Our clients love the seamless process!",
    rating: 5,
  },
  {
    quote: "A Must-Have for Every DMC!",
    dmcInfo: "Global Horizons, USA",
    message:
      "RateGen has eliminated pricing errors, reduced response time, and made our entire workflow smarter. We can't imagine going back to manual calculations!",
    rating: 5,
  },
];

export default function DmcMessages() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setReady(true); // wait for layout to be fully ready
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="space-y-20">
      <div className="text-center space-y-3">
        <p className="text-3xl sm:text-6xl font-bold text-white leading-tight">
          For&nbsp;
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-200  bg-clip-text text-transparent">
            DMCs
          </span>
          , by RateGen
        </p>
        <p className="font-semibold text-white/70 text-[10px] sm:text-xl max-w-5xl mx-auto">
          See what our partners say about RateGen&nbsp;
          <span className="text-sm sm:text-3xl text-white">🚀</span>
        </p>
      </div>

      <div
        className={`relative space-y-10 w-full overflow-hidden`}
        style={{
          maskImage:
            "linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 25%, rgb(0, 0, 0) 75%, rgba(0, 0, 0, 0) 100%)",
        }}
      >
        <div
          className={`flex gap-10 w-fit overflow-hidden -ml-44 hover:[animation-play-state:paused] ${
            ready ? "animate-marquee" : ""
          }`}
        >
          {[...messages, ...messages].map((m, i) => (
            <div
              key={i}
              className="w-xs sm:w-md bg-zinc-800/40 backdrop-blur-md text-white space-y-4 border-2 border-emerald-500 rounded-xl [&>p]:text-xs  sm:[&>p]:text-sm p-4 cursor-pointer"
            >
              <p>{m.message}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <p className="font-medium sm:font-semibold">
                    &quot;{m.quote}&quot;
                  </p>
                  <p className="text-xs text-white/60">-{m.dmcInfo}</p>
                </div>
                <div className="flex gap-1 items-end">
                  {[...Array(m.rating)].map((_, i) => (
                    <Star className="fill-amber-400 w-5 h-5 stroke-0" key={i} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          className={`flex gap-10 w-fit overflow-hidden hover:[animation-play-state:paused] ${
            ready ? "animate-marquee" : ""
          }`}
        >
          {[...messages.reverse(), ...messages.reverse()].map((m, i) => (
            <div
              key={i}
              className="w-xs sm:w-md bg-zinc-800/40 backdrop-blur-md text-white space-y-4 border-2 border-emerald-500 rounded-xl [&>p]:text-xs  sm:[&>p]:text-sm p-4 cursor-pointer"
            >
              <p>{m.message}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <p className="font-medium sm:font-semibold">
                    &quot;{m.quote}&quot;
                  </p>
                  <p className="text-xs text-white/60">-{m.dmcInfo}</p>
                </div>
                <div className="flex gap-1 items-end">
                  {[...Array(m.rating)].map((_, i) => (
                    <Star className="fill-amber-400 w-5 h-5 stroke-0" key={i} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div></div>
    </section>
  );
}
