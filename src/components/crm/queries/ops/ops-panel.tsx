"use client";

import { useQueryState } from "nuqs";
import { opsTabParam, type OpsTab } from "../query-detail-searchparams";
import {
  SidebarProvider,
  SidebarInset,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  ChevronsRight,
  ListTodo,
  Mail,
  NotepadText,
  Wallet,
  Calendar,
  MapPin,
  Moon,
  Users,
  User,
  ArrowRightToLine,
  MessageSquare,
} from "lucide-react";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import AccountsSection from "./accounts-section";
import EmailsSection from "./emails-section";
import TasksSection from "./tasks-section";
import BookingsSection from "./bookings-section";
import WhatsAppSection from "@/components/whatsapp/WhatsAppSection";
import Show from "@/components/ui/show";
import { IQueryDetails } from "@/types/crm-query";

const sidebarNavItems = [
  { id: "bookings", label: "Bookings", icon: NotepadText },
  { id: "accounts", label: "Accounts", icon: Wallet },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon },
];

interface OpsPanelProps {
  queryId: string;
  chatId: string;
  dmcId: string;
  queryDetails?: IQueryDetails;
  onClose?: () => void;
}

function resolveDestination(query?: IQueryDetails): string {
  return query?.travel_country_names?.join(", ") || "";
}

function OpsSidebar({ activeTab, onTabChange }: { activeTab: OpsTab; onTabChange: (tab: OpsTab) => void }) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="!h-full !static border-r bg-background">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {sidebarNavItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      onClick={() => onTabChange(item.id as OpsTab)}
                      className={cn(
                        "h-9 hover:bg-muted cursor-pointer",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 pb-0 border-t">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 mx-auto">
          <ChevronsRight className={cn("h-4 w-4 transition-transform", state === "expanded" && "rotate-180")} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function OpsPanel({ queryId, chatId, dmcId, queryDetails, onClose }: OpsPanelProps) {
  const [activeTab, setActiveTab] = useQueryState("ops_tab", opsTabParam);

  const getSectionName = (tab: string) => {
    switch (tab) {
      case "bookings":
        return "Bookings";
      case "accounts":
        return "Accounts";
      case "emails":
        return "Emails";
      case "tasks":
        return "Tasks";
      case "whatsapp":
        return "WhatsApp";
      default:
        return "";
    }
  };

  // Calculate travel details
  const calculateNights = () => {
    if (!queryDetails?.travel_date || !queryDetails?.duration) return 0;
    return queryDetails.duration;
  };

  const formatTravelDates = () => {
    if (!queryDetails?.travel_date || !queryDetails?.duration) return "Not specified";
    try {
      const startDate = new Date(queryDetails.travel_date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + queryDetails.duration);
      return `${format(startDate, "MMM dd")} → ${format(endDate, "MMM dd, yyyy")}`;
    } catch {
      return "Not specified";
    }
  };

  const getPaxSummary = () => {
    if (!queryDetails?.pax_details) return "Not specified";
    const { adults = 0, children = 0, children_ages = [] } = queryDetails.pax_details;

    // Calculate teens (13-17), children (2-12), infants (0-1)
    let teens = 0;
    let actualChildren = 0;
    let infants = 0;

    children_ages.forEach((age) => {
      if (age >= 13 && age <= 17) teens++;
      else if (age >= 2 && age <= 12) actualChildren++;
      else if (age >= 0 && age <= 1) infants++;
    });

    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? "s" : ""}`);
    if (teens > 0) parts.push(`${teens} Teen${teens > 1 ? "s" : ""}`);
    if (actualChildren > 0) parts.push(`${actualChildren} Child${actualChildren > 1 ? "ren" : ""}`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? "s" : ""}`);

    return parts.length > 0 ? parts.join(" , ") : "Not specified";
  };

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Header with Query Info */}
      <div className="shrink-0 border-b bg-muted/30 flex justify-between items-center py-2.5 px-4">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-base font-medium text-muted-foreground">Operations</p>
          <span className="text-muted-foreground/50">/</span>
          <p className="text-base font-semibold leading-normal truncate">{getSectionName(activeTab)}</p>
        </div>

        {/* Query Summary and Close Button */}
        <div className="flex items-center gap-4">
          {queryDetails && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">ID:</span>
                <span className="font-mono font-semibold">{queryDetails.query_id || "N/A"}</span>
              </div>
              {queryDetails.traveler_name && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{queryDetails.traveler_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{queryDetails.travel_country_names?.join(", ") || "Not specified"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formatTravelDates()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">
                  {calculateNights()} Night{calculateNights() !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{getPaxSummary()}</span>
              </div>
            </div>
          )}

          {/* Chat Button */}
          {onClose && (
            <Button onClick={onClose} size={"sm"}>
              <ArrowRightToLine className="h-4 w-4" />
              <span className="text-sm font-medium">Chat</span>
            </Button>
          )}
        </div>
      </div>

      <SidebarProvider className={cn("!min-h-0 flex-1 h-full")}>
        <OpsSidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); }} />
        <SidebarInset className="flex flex-col overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 min-h-0 mt-2 overflow-hidden">
            <Show when={activeTab === "bookings"}>
              <div className="h-full overflow-y-auto">
                <BookingsSection queryId={queryId} chatId={chatId} />
              </div>
            </Show>

            <Show when={activeTab === "accounts"}>
              <div className="h-full overflow-y-auto">
                <AccountsSection queryId={queryId} />
              </div>
            </Show>

            <Show when={activeTab === "emails"}>
              <div className="h-full overflow-y-auto">
                <EmailsSection key={queryDetails?.query_id} queryId={queryDetails?.query_id?.toLowerCase()} queryUuid={queryId} dmcId={dmcId} />
              </div>
            </Show>

            <Show when={activeTab === "tasks"}>
              <div className="h-full overflow-y-auto">
                <TasksSection queryId={queryId} />
              </div>
            </Show>

            <Show when={activeTab === "whatsapp"}>
              <div className="h-full overflow-hidden">
                <WhatsAppSection
                  queryId={queryId}
                  queryDisplayId={queryDetails?.query_id}
                  travelerName={queryDetails?.traveler_name}
                  destination={resolveDestination(queryDetails)}
                  dmcId={dmcId}
                />
              </div>
            </Show>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
