"use client";

import { Card } from "@/components/ui/card";
import { Check, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

export default function PricingPlans({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const [showUsd, setShowUsd] = useState(false);
  return (
    <section className="space-y-20">
      <div className="text-center space-y-3 px-6">
        <p className="text-3xl sm:text-6xl font-bold text-white leading-tight">
          <span className="bg-gradient-to-r from-emerald-500 to-emerald-200  bg-clip-text text-transparent">
            Simple, Unified, One Plan
          </span>
          &nbsp;For All
        </p>
        <p className="font-semibold text-white/70 text-[10px] sm:text-xl max-w-5xl mx-auto">
          All features, one price — built to work for everyone.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-10">
        <Card className="py-0 overflow-hidden border-emerald-600/60 gap-0 bg-transparent">
          <div className="p-8 bg-gradient-to-r from-emerald-600 to-emerald-200 border-0 text-black">
            <div className="flex items-center gap-2 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="size-8 text-amber-400 stroke-1"
                fill="url(#starGradient)"
                stroke="currentColor"
              >
                <defs>
                  <linearGradient id="starGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#fde047" />
                    <stop offset="85%" stopColor="#ffff" />
                  </linearGradient>
                </defs>
                <path d="M12 2l2.39 7.26H22l-5.69 4.13 2.18 7.11L12 17.77l-6.49 4.73 2.18-7.11L2 9.26h7.61L12 2z" />
              </svg>
              <h2 className="text-3xl font-semibold">OneRate Plan</h2>
              <div className="flex gap-2 w-fit ml-auto items-center ">
                <Label
                  htmlFor="toggle"
                  className="cursor-pointer text-base font-semibold"
                >
                  USD($)
                </Label>
                <Switch
                  id="toggle"
                  className="cursor-pointer"
                  onCheckedChange={() => setShowUsd((prev) => !prev)}
                />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="opacity-70 font-medium mb-2">Starts from</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {showUsd ? "$100" : "₹10,000"}
                  </span>
                  <span className="">/100M tokens per month*</span>
                </div>
              </div>
              <div className="text-right">
                <p className="italic [&>span]:font-bold">
                  *One-Time Setup Extra
                </p>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-emerald-950/60 p-8 text-white">
            <h3 className="text-xl font-bold mb-6">
              No Limits, Just Features:
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <FeatureCard
                title="Token-based pricing"
                description="pay only for what you use"
              />
              <FeatureCard
                title="Transparent usage"
                description="see tokens spent on every query"
              />
              <FeatureCard
                title="Unlimited team members"
                description="add all your team members"
              />
              <FeatureCard
                title="Unlimited destinations"
                description="add multiple countries that you're a DMC of"
              />
              <FeatureCard
                title="Unlimited storage"
                description="add multiple rows of data, files, vouchers, etc"
              />
              <FeatureCard
                title="Unlimited agent partners"
                description="add all your travel agent clients you work with"
              />
              <FeatureCard
                title="Multi-currency & multi-lingual support"
                description="add all your source markets and send them quotes in their language"
              />
              <FeatureCard
                title="WhatsApp AI Chatbot"
                description="send AI quotes in seconds on WhatsApp 24x7"
              />
              <FeatureCard
                title="ChatDMC Integration"
                description="get travel agents leads and queries from across the globe for free"
              />
            </div>

            {/* Add-Ons Section */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Add-Ons:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AddOnCard
                  title="Additional Tokens"
                  description={`@${showUsd ? "$10" : "₹1000"} per 10M token`}
                />
                <AddOnCard
                  title="Custom Integrations"
                  description="integrate CRM, travel APIs, etc. within our platform"
                />
                <AddOnCard
                  title="Trade Fairs"
                  description="Exhibit at the biggest global trade fairs at a fraction of the cost"
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="size-6 stroke-1 stroke-amber-500 fill-yellow-300" />
          <p className="font-semibold text-white/70 text-[10px] sm:text-xl">
            Simple. Transparent. Unlimited. Powered by AI.
          </p>
        </div>
        <div className="button-wrapper w-[240px] h-12 sm:w-xs sm:h-16 p-1 mx-auto hover:before:animate-none hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer z-20">
          <Link
            href={isLoggedIn ? "/rates/hotels" : "/register"}
            prefetch
            className="button-content text-black/90 no-underline flex items-center justify-center "
          >
            <div className="text-center  flex gap-2 items-center sm:text-xl font-bold ">
              {isLoggedIn ? "Go To Dashboard" : "Get Free Trial"}
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
}

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-5 bg-emerald-800/40 rounded-lg">
      <Check className="size-5 bg-emerald-600 rounded-full p-0.5 text-white mt-0.5 flex-shrink-0" />
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-gray-300 italic pr-2">{description}</p>
      </div>
    </div>
  );
}

interface AddOnCardProps {
  title: string;
  description: string;
}

function AddOnCard({ title, description }: AddOnCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 border-2 border-emerald-600 rounded-lg">
      <Plus className="size-5 bg-emerald-600 rounded-full p-0.5 text-white mt-0.5 flex-shrink-0" />
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-gray-300 italic pr-2">{description}</p>
      </div>
    </div>
  );
}
