import HeroSection from "../../components/home/hero";
import ContentSection1 from "../../components/home/content1";
import ContentSection2 from "../../components/home/content2";
import PricingPlans from "../../components/home/plans";
import DmcMessages from "../../components/home/dmc-messages";
import Questions from "../../components/home/questions";
import OurStory from "../../components/home/our-story";
import { Metadata } from "next";
import { getUser } from "@/data-access/auth";

export const metadata: Metadata = {
  title: "Home Page",
};
export default async function HomePage() {
  const user = await getUser();
  return (
    <div className="space-y-40 ">
      <HeroSection isLoggedIn={!!user} />
      <ContentSection1 isLoggedIn={!!user} />
      <ContentSection2 isLoggedIn={!!user} />
      <PricingPlans isLoggedIn={!!user} />
      <DmcMessages />
      <Questions />
      <OurStory />
    </div>
  );
}
