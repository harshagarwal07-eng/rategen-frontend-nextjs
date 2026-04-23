"use client";

import { useState, useMemo } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  Plus,
  Users,
  MessageSquare,
  X,
  WifiOff,
  Loader,
  ArrowLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import GroupManagementPanel from "./GroupManagementPanel";
import WhatsAppGroupCard from "./WhatsAppGroupCard";
import CreateGroupSheet from "./CreateGroupSheet";
import ConnectPeriskope from "./ConnectPeriskope";
import {
  useWhatsAppGroups,
  usePeriskopeConnectionStatus,
} from "@/hooks/whatsapp/use-whatsapp";
import { useDebounce } from "@/hooks/use-debounce";

type StatusFilter = "all" | "active" | "completed" | "pending";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Done" },
  { id: "pending", label: "Pending" },
];

interface WhatsAppSectionProps {
  queryId?: string;
  queryDisplayId?: string;
  travelerName?: string;
  destination?: string;
  dmcId?: string;
}

export default function WhatsAppSection({
  queryId,
  queryDisplayId = "",
  travelerName = "",
  destination = "",
  dmcId,
}: WhatsAppSectionProps) {
  const { data: groups = [], isLoading, refetch } = useWhatsAppGroups(queryId);
  const {
    data: connStatus,
    isLoading: connLoading,
    dataUpdatedAt,
    refetch: refetchConnection,
  } = usePeriskopeConnectionStatus();

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showConnectSheet, setShowConnectSheet] = useState(false);

  const searchQuery = useDebounce(searchInput, 300);

  const filteredGroups = useMemo(() => {
    let list = groups;
    if (activeStatus !== "all") list = list.filter((g) => g.status === activeStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.group_name.toLowerCase().includes(q) ||
          g.periskope_chat_id.includes(q) ||
          g.label_ids?.some((l) => l.toLowerCase().includes(q))
      );
    }
    return list;
  }, [groups, activeStatus, searchQuery]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.periskope_chat_id === selectedChatId) ?? null,
    [groups, selectedChatId]
  );

  const statusCounts = useMemo(
    () => ({
      all: groups.length,
      active: groups.filter((g) => g.status === "active").length,
      completed: groups.filter((g) => g.status === "completed").length,
      pending: groups.filter((g) => g.status === "pending").length,
    }),
    [groups]
  );

  const queryHasNoGroup =
    !!queryId && !isLoading && groups.length === 0 && activeStatus === "all" && !searchQuery;

  const handleCreated = (chatId: string) => {
    refetch();
    if (chatId) {
      setSelectedChatId(chatId);
      setMobileView("chat");
    }
  };

  const handleSelectGroup = (chatId: string) => {
    setSelectedChatId(chatId);
    setMobileView("chat");
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1" id="whatsapp-panel-group">
          <ResizablePanel
            defaultSize={32}
            minSize={22}
            maxSize={45}
            className={cn(
              mobileView === "chat" ? "hidden md:flex" : "flex",
              "flex-col"
            )}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-sm font-semibold tracking-tight truncate">
                    {queryId ? "Query Groups" : "WhatsApp"}
                  </h2>
                  <ConnectionStatusBadge
                    loading={connLoading}
                    connected={connStatus?.connected ?? false}
                    phoneId={connStatus?.phoneId ?? null}
                    detail={connStatus?.detail}
                    lastCheckedAt={dataUpdatedAt}
                    onRefresh={() => refetchConnection()}
                  />
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        aria-label="Refresh"
                      >
                        <RefreshCw
                          className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-40"
                        onClick={() => connStatus?.connected ? setShowCreate(true) : setShowConnectSheet(true)}
                        aria-label="New group"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {connStatus?.connected ? "Create group" : "Connect WhatsApp first"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b shrink-0 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setActiveStatus(tab.id)}
                    className={cn(
                      "gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md h-7 shrink-0 transition-colors duration-150",
                      activeStatus === tab.id
                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {tab.label}
                    {statusCounts[tab.id] > 0 && (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full text-[9px] font-bold px-1 leading-none",
                          activeStatus === tab.id
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {statusCounts[tab.id]}
                      </span>
                    )}
                  </Button>
                ))}
              </div>

              <div className="px-2 py-1.5 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search groups…"
                    className="pl-8 pr-8 h-8 text-xs rounded-lg"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                  </div>
                ) : queryHasNoGroup ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <div className="rounded-xl bg-emerald-500/10 p-3 mb-2">
                      <MessageSquare className="h-5 w-5 text-emerald-500/50" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      No group for{" "}
                      <span className="font-mono font-semibold">
                        {queryDisplayId || "this query"}
                      </span>
                    </p>
                    {connStatus?.connected ? (
                      <Button
                        size="sm"
                        className="text-xs gap-1.5 h-7 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setShowCreate(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Create Group
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 h-7 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                        onClick={() => setShowConnectSheet(true)}
                      >
                        <WifiOff className="h-3 w-3" />
                        Connect WhatsApp
                      </Button>
                    )}
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="rounded-xl bg-muted/50 p-3 mb-2">
                      <Users className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {searchQuery
                        ? "No groups match your search"
                        : "No WhatsApp groups yet"}
                    </p>
                    {connStatus?.connected ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 mt-2 text-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => setShowCreate(true)}
                      >
                        <Plus className="h-3 w-3" />
                        Create first group
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1 mt-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                        onClick={() => setShowConnectSheet(true)}
                      >
                        <WifiOff className="h-3 w-3" />
                        Connect WhatsApp
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <WhatsAppGroupCard
                      key={group.id}
                      group={group}
                      isSelected={selectedChatId === group.periskope_chat_id}
                      onClick={() => handleSelectGroup(group.periskope_chat_id)}
                    />
                  ))
                )}
              </ScrollArea>

              <div className="flex items-center justify-between px-3 py-1.5 border-t text-[10px] text-muted-foreground shrink-0 bg-muted/20">
                <ConnectionStatusPill
                  loading={connLoading}
                  connected={connStatus?.connected ?? false}
                  phoneId={connStatus?.phoneId ?? null}
                  onConnectClick={() => setShowConnectSheet(true)}
                />
                <span className="tabular-nums">
                  {filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="hidden md:flex" />

          <ResizablePanel
            defaultSize={68}
            minSize={45}
            className={cn(
              mobileView === "list" ? "hidden md:flex" : "flex",
              "flex-col"
            )}
          >
            {selectedGroup && (
              <div className="flex items-center gap-2 px-3 py-2 border-b md:hidden shrink-0">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                  aria-label="Back to group list"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold truncate">{selectedGroup.group_name}</span>
              </div>
            )}
            {selectedGroup ? (
              <GroupManagementPanel group={selectedGroup} onRefresh={() => refetch()} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="rounded-2xl bg-emerald-500/10 p-5 mb-4">
                  <MessageSquare className="h-10 w-10 text-emerald-500/30" />
                </div>
                <p className="text-sm font-medium text-foreground/60 mb-1">
                  Select a group to view chat
                </p>
                <p className="text-xs text-muted-foreground/50 mb-4">
                  Choose a group from the list on the left
                </p>
                {connStatus?.connected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Group
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => setShowConnectSheet(true)}
                  >
                    <WifiOff className="h-3.5 w-3.5" />
                    Connect WhatsApp
                  </Button>
                )}
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <CreateGroupSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        queryId={queryId}
        queryDisplayId={queryDisplayId}
        travelerName={travelerName}
        destination={destination}
        dmcId={dmcId}
        onCreated={handleCreated}
      />

      <Sheet open={showConnectSheet} onOpenChange={setShowConnectSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <SheetTitle className="text-sm">Connect WhatsApp</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <ConnectPeriskope
              existingConnection={null}
              onConnectionChanged={() => {
                setShowConnectSheet(false);
                refetchConnection();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface ConnectionStatusBadgeProps {
  loading: boolean;
  connected: boolean;
  phoneId: string | null;
  detail?: string;
  lastCheckedAt?: number;
  onRefresh?: () => void;
}

function ConnectionStatusBadge({
  loading,
  connected,
  phoneId,
  detail,
  lastCheckedAt,
  onRefresh,
}: ConnectionStatusBadgeProps) {
  const lastChecked =
    lastCheckedAt != null
      ? new Date(lastCheckedAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : null;

  const badge = (
    <Badge
      variant={connected ? "default" : "secondary"}
      className={cn(
        "cursor-pointer shrink-0 font-normal text-[10px] gap-1 px-1.5 py-0 h-5 border",
        connected
          ? "bg-emerald-600/90 text-white border-emerald-500/50 hover:bg-emerald-600"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
      )}
    >
      {loading ? (
        <>
          <Loader className="h-2.5 w-2.5 animate-spin" />
          Checking…
        </>
      ) : connected ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          Connected
        </>
      ) : (
        <>
          <WifiOff className="h-2.5 w-2.5" />
          Disconnected
        </>
      )}
    </Badge>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 text-xs">
        <div className="space-y-2.5">
          <div className="font-semibold text-foreground">
            {loading
              ? "Checking connection…"
              : connected
                ? "WhatsApp connected"
                : "WhatsApp disconnected"}
          </div>
          {!loading && (
            <>
              {connected && phoneId && (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Phone:</span> +{phoneId}
                </p>
              )}
              {!connected && detail && (
                <p className="text-muted-foreground">{detail}</p>
              )}
              {lastChecked && (
                <p className="text-muted-foreground/80">
                  Last checked: {lastChecked}
                </p>
              )}
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onRefresh()}
                >
                  <RefreshCw className="h-3 w-3" />
                  Check again
                </Button>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ConnectionStatusPillProps {
  loading: boolean;
  connected: boolean;
  phoneId: string | null;
  onConnectClick: () => void;
}

function ConnectionStatusPill({ loading, connected, phoneId, onConnectClick }: ConnectionStatusPillProps) {
  if (loading) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground/60">
        <Loader className="h-3 w-3 animate-spin" />
        Checking…
      </span>
    );
  }

  if (connected) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1.5 text-emerald-600 cursor-default">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            WhatsApp
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Connected{phoneId ? ` · +${phoneId}` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={onConnectClick}
      className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 text-[10px] font-medium transition-colors"
    >
      <WifiOff className="h-3 w-3" />
      Connect WhatsApp
    </button>
  );
}
