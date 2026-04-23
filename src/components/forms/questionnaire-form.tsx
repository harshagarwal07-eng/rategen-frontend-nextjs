"use client";

import { useState, useCallback } from "react";
import {
  User,
  Plane,
  Heart,
  FileText,
  Calendar,
  MapPin,
  Users,
  Moon,
  ChevronsRight,
  ArrowRightToLine,
} from "lucide-react";
import { format } from "date-fns";
import { IQueryDetails } from "@/types/crm-query";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

// Import section components
import { GuestDetailsSection } from "./questionnaire-sections/guest-details-section";
import { ArrivalDepartureSection } from "./questionnaire-sections/arrival-departure-section";
import { PreferencesSection } from "./questionnaire-sections/preferences-section";
import { DocumentsSection } from "./questionnaire-sections/documents-section";

interface QuestionnaireFormProps {
  queryId: string;
  queryDetails?: IQueryDetails;
  onClose?: () => void;
}

const navigationItems = [
  { id: "guest-details", label: "Guest Details", icon: User },
  { id: "arrival-departure", label: "Arrival & Departure", icon: Plane },
  { id: "preferences", label: "Preferences", icon: Heart },
  { id: "documents", label: "Documents", icon: FileText },
];

// Sidebar component that uses useSidebar hook
function QuestionnaireSidebar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="!h-full !static border-r bg-background">
      <SidebarContent className="py-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {navigationItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      onClick={() => onTabChange(item.id)}
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

export function QuestionnaireForm({ queryId, queryDetails, onClose }: QuestionnaireFormProps) {
  const [activeTab, setActiveTab] = useState("guest-details");

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

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
    <div className="h-full flex flex-col">
      {/* Header with Query Info */}
      <div className="shrink-0 border-b bg-muted/30 flex justify-between items-center py-2.5 px-4">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-base">Agent Questionnaire</h3>
        </div>

        {/* Query Summary and Close Button */}
        <div className="flex items-center gap-4">
          {queryDetails && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-muted-foreground">ID:</span>
                <span className="font-mono font-semibold">{queryDetails.query_id || "N/A"}</span>
              </div>
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

      {/* Main Content Area with Sidebar Navigation */}
      <SidebarProvider defaultOpen={false} className={cn("!min-h-0 flex-1 h-full")}>
        <QuestionnaireSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <SidebarInset className="flex flex-col overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 min-h-0 mt-3 overflow-hidden">
            {activeTab === "guest-details" && (
              <div className="h-full overflow-y-auto">
                <GuestDetailsSection queryId={queryId} taId={queryDetails?.tas_ta_id} queryDetails={queryDetails} />
              </div>
            )}
            {activeTab === "arrival-departure" && (
              <div className="h-full overflow-y-auto">
                <ArrivalDepartureSection queryId={queryId} queryDetails={queryDetails} />
              </div>
            )}
            {activeTab === "preferences" && (
              <div className="h-full overflow-y-auto">
                <PreferencesSection queryId={queryId} queryDetails={queryDetails} />
              </div>
            )}
            {activeTab === "documents" && (
              <div className="h-full overflow-y-auto">
                <DocumentsSection queryId={queryId} />
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
