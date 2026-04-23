import Navbar from "../../components/home/nav";
import HomeFooter from "../../components/home/footer";

export default async function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className=" bg-black h-fit" id="scroll-container">
      <Navbar isDark />
      <main className="container mx-auto px-4 sm:px-0">{children}</main>
      <HomeFooter />
    </div>
  );
}
