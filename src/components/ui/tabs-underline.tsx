import React from "react";
import {
  TabsTrigger as BaseTabsTrigger,
  TabsList as BaseTabsList,
} from "./tabs";
import { cn } from "@/lib/utils";

type TabsTriggerProps = React.ComponentProps<typeof BaseTabsTrigger>;

export function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <BaseTabsTrigger
      className={cn(
        "data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground border-transparent border-b-4 rounded-none data-[state=active]:border-transparent data-[state=active]:border-b-primary data-[state=active]:font-medium font-normal data-[state=active]:shadow-none cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

type TabsListProps = React.ComponentProps<typeof BaseTabsList>;

export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <BaseTabsList
      className={cn(
        "bg-transparent p-0 backdrop-blur-none text-sm",
        className
      )}
      {...props}
    />
  );
}
