"use client";

import Link from "next/link";
import Logo from "@/components/ui/logo";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Gauge, Loader2, LogOut, Menu, Moon, Settings, Sun, User } from "lucide-react";
import { NavItem } from "@/types/common";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCallback, useState } from "react";
import { logout } from "@/data-access/auth";
import { toast } from "sonner";
import useUser from "@/hooks/use-user";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, setUser } = useUser();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      label: "Rates",
      href: "/rates/hotels",
      active: pathname.includes("/rates"),
    },
    {
      label: "CRM",
      active: pathname.includes("/crm"),
      href: "/crm/queries/all",
    },
    {
      label: "Playground",
      href: "/playground",
      active: pathname.includes("/playground"),
    },
    {
      label: "API",
      href: "/api-services/hotels/search",
      active: pathname.includes("/api-services"),
    },
    {
      label: "Docs",
      href: "/docs/library/vehicles",
      active: pathname.includes("/docs"),
    },
  ];

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await logout();
      if (error) return toast.error(error);

      toast.success("Logged out successfully");
      router.prefetch("/");
      router.refresh();
      setUser(null);
    } finally {
      setIsLoggingOut(false);
    }
  };
  const handleThemeToggle = useCallback(
    (e?: React.MouseEvent) => {
      const newMode = resolvedTheme === "dark" ? "light" : "dark";
      const root = document.documentElement;

      if (!document.startViewTransition) {
        setTheme(newMode);
        return;
      }

      // Set coordinates from the click event
      if (e) {
        root.style.setProperty("--x", `${e.clientX}px`);
        root.style.setProperty("--y", `${e.clientY}px`);
      }

      document.startViewTransition(() => {
        setTheme(newMode);
      });
    },
    [resolvedTheme, setTheme]
  );
  const menuItems = [
    {
      label: "Notifications",
      icon: Bell,
      onClick: () => toast.message("No new notifications"),
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings/my-profile",
    },
    {
      label: resolvedTheme === "dark" ? "Light Mode" : "Dark Mode",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      onClick: handleThemeToggle,
    },
    {
      label: "Logout",
      icon: isLoggingOut ? Loader2 : LogOut,
      className: "text-destructive",
      onClick: handleLogout,
      disabled: isLoggingOut,
      iconClassName: isLoggingOut ? "animate-spin" : "",
    },
  ];

  const renderMenuItem = (item: any, idx: number) => {
    if (item.href) {
      return (
        <Link key={idx} href={item.href} passHref prefetch className="text-foreground no-underline font-normal">
          <DropdownMenuItem className={cn(item.className)} onClick={item.onClick} disabled={item.disabled}>
            {item.icon && <item.icon className="mr-2" />}
            {item.label}
          </DropdownMenuItem>
        </Link>
      );
    } else if (item.onClick) {
      return (
        <DropdownMenuItem key={idx} className={cn(item.className)} onClick={item.onClick} disabled={item.disabled}>
          {item.icon && <item.icon className="mr-2" />}
          {item.label}
        </DropdownMenuItem>
      );
    }
    return null;
  };

  return (
    <header className="flex items-center justify-between border-b p-2 sticky top-0 z-50 bg-background">
      <Link href="/" prefetch>
        <Logo sm />
      </Link>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center justify-center gap-8">
        <nav className="flex items-center space-x-8">
          {navItems.map((item) => {
            // If item has dropdown items
            if (item.items) {
              return (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "hover:underline text-foreground/80 h-auto hover:bg-transparent px-0 focus-visible:ring-0",
                        item.active && "font-semibold text-primary"
                      )}
                    >
                      {item.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    // align="end"
                    sideOffset={16}
                    className="py-4 px-7 border bg-background"
                  >
                    <div className="flex items-center gap-8">
                      {item.items.map((subItem) => (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          passHref
                          prefetch
                          className={cn(
                            "transition-colors relative animated-underline text-foreground/80 hover:text-foreground ",
                            pathname === subItem.href && "font-semibold text-primary"
                          )}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            // Regular link item
            return (
              <Link
                key={item.label}
                href={item.href!}
                className={cn(
                  "transition-colors relative animated-underline text-foreground/80",
                  item.active && "font-semibold text-primary",
                  "hover:text-foreground"
                )}
                prefetch
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Button size={"sm"}>
          <Gauge size={18} />
          Usage
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size={"sm"} variant={"outline"}>
              <User size={20} className="text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={16} className="min-w-64 p-0">
            <div className="p-2">{menuItems.map(renderMenuItem)}</div>
            {user && (
              <>
                <DropdownMenuSeparator className="my-0 mx-4" />
                <div className="px-4 py-3 flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={user.dmc?.avatar_url} alt={user.dmc?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user.dmc?.name
                        ?.split(" ")
                        .slice(0, 2)
                        .map((word) => word.charAt(0).toUpperCase())
                        .join("") || "DM"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-normal">
                      {user.dmc?.name || "DMC Name"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-normal">{user.email}</p>
                  </div>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center gap-2">
        <Button size={"sm"} variant={"ghost"}>
          <Gauge size={18} />
        </Button>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button size={"sm"} variant={"ghost"}>
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <div className="flex flex-col gap-6 mt-8">
              {/* Mobile Nav Items */}
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => {
                  // If item has dropdown items
                  if (item.items) {
                    return (
                      <div key={item.label} className="flex flex-col gap-1">
                        <div
                          className={cn(
                            "transition-colors text-foreground/80 py-2 px-3 rounded-md font-medium",
                            item.active && "text-primary"
                          )}
                        >
                          {item.label}
                        </div>
                        <div className="flex flex-col gap-1 pl-3">
                          {item.items.map((subItem) => (
                            <Link
                              key={subItem.label}
                              href={subItem.href}
                              className={cn(
                                "transition-colors text-foreground/70 py-2 px-3 rounded-md hover:bg-muted text-sm",
                                pathname === subItem.href && "font-semibold text-primary bg-muted"
                              )}
                              prefetch
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Regular link item
                  return (
                    <Link
                      key={item.label}
                      href={item.href!}
                      className={cn(
                        "transition-colors text-foreground/80 py-2 px-3 rounded-md hover:bg-muted",
                        item.active && "font-semibold text-primary bg-muted"
                      )}
                      prefetch
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Menu Items */}
              <div className="border-t pt-4 flex flex-col gap-2">
                {menuItems.map((item, idx) => {
                  if (item.href) {
                    return (
                      <Link
                        key={idx}
                        href={item.href}
                        className="text-foreground no-underline"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn("w-full justify-start", item.className)}
                          disabled={item.disabled}
                        >
                          {item.icon && <item.icon className={cn("mr-2 h-4 w-4", item.iconClassName)} />}
                          {item.label}
                        </Button>
                      </Link>
                    );
                  } else if (item.onClick) {
                    return (
                      <Button
                        key={idx}
                        variant="ghost"
                        className={cn("w-full justify-start", item.className)}
                        onClick={(e) => {
                          item.onClick(e);
                          if (item.label !== "Logout") {
                            setIsMobileMenuOpen(false);
                          }
                        }}
                        disabled={item.disabled}
                      >
                        {item.icon && <item.icon className={cn("mr-2 h-4 w-4", item.iconClassName)} />}
                        {item.label}
                      </Button>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
