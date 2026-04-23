"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IOption } from "@/types/common";
import { createDoc, updateDoc } from "@/data-access/docs";
import DayCard from "./day-card";
import {
  type BuilderFormState,
  type EditableDay,
  type EditableActivity,
  type ItineraryData,
  generateDefaultDays,
  builderStateToItineraryData,
  calculateDayDate,
  convertPopoverActivityToEditable,
  itineraryDataToBuilderState,
} from "./types";

const ITINERARY_THEMES = [
  { value: "all", label: "All" },
  { value: "honeymoon", label: "Honeymoon / Romantic" },
  { value: "family", label: "Family" },
  { value: "adventure", label: "Adventure" },
  { value: "cultural", label: "Cultural / Heritage" },
  { value: "beach", label: "Beach & Relaxation" },
  { value: "luxury", label: "Luxury" },
  { value: "wildlife", label: "Wildlife / Safari" },
  { value: "wellness", label: "Wellness & Spa" },
] as const;

interface ItineraryBuilderProps {
  countries: IOption[];
  editDocId?: number;
  initialItinerary?: ItineraryData;
  initialCountryId?: string;
}

export default function ItineraryBuilder({
  countries,
  editDocId,
  initialItinerary,
  initialCountryId,
}: ItineraryBuilderProps) {
  const router = useRouter();
  const isEditing = !!editDocId;

  // Initialize from existing data or defaults
  const initialState = initialItinerary
    ? itineraryDataToBuilderState(initialItinerary)
    : null;

  const [form, setForm] = useState<BuilderFormState>(
    initialState?.form ?? {
      destination: "",
      destinationCode: "",
      checkIn: new Date().toISOString().split("T")[0],
      nights: 3,
      travelers: { adults: 2, children: 0 },
      notes: "",
      theme: "",
    }
  );

  const [days, setDays] = useState<EditableDay[]>(initialState?.days ?? []);
  const [selectedCountry, setSelectedCountry] = useState(initialCountryId || "");
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragActivity, setActiveDragActivity] = useState<EditableActivity | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const countryCodeById = Object.fromEntries(countries.map((c) => [c.value, c.code!]));
  const countryNameById = Object.fromEntries(countries.map((c) => [c.value, c.label]));

  useEffect(() => {
    if (form.nights > 0) {
      setDays((prevDays) => {
        const newTotalDays = form.nights + 1;
        const currentLength = prevDays.length;

        if (currentLength === 0) {
          return generateDefaultDays(form.nights, form.checkIn);
        } else if (newTotalDays > currentLength) {
          const additionalDays = Array.from(
            { length: newTotalDays - currentLength },
            (_, i) => ({
              day: currentLength + i + 1,
              date: calculateDayDate(form.checkIn, currentLength + i),
              title: currentLength + i + 1 === newTotalDays ? "Departure Day" : `Day ${currentLength + i + 1}`,
              activities: [],
              overnight: "",
              notes: "",
              tempId: `day-${currentLength + i}-${Date.now()}`,
              isExpanded: false,
            })
          );
          return [...prevDays, ...additionalDays].map((day, idx) => ({
            ...day,
            day: idx + 1,
            date: calculateDayDate(form.checkIn, idx),
          }));
        } else if (newTotalDays < currentLength) {
          return prevDays.slice(0, newTotalDays).map((day, idx) => ({
            ...day,
            day: idx + 1,
            date: calculateDayDate(form.checkIn, idx),
          }));
        } else {
          return prevDays.map((day, idx) => ({
            ...day,
            day: idx + 1,
            date: calculateDayDate(form.checkIn, idx),
          }));
        }
      });
    }
  }, [form.nights, form.checkIn]);

  const handleCountryChange = (countryId: string) => {
    setSelectedCountry(countryId);
    setForm((prev) => ({
      ...prev,
      destination: countryNameById[countryId] || "",
      destinationCode: countryCodeById[countryId] || "",
    }));
  };

  const updateDay = useCallback((dayIndex: number, updates: Partial<EditableDay>) => {
    setDays((prev) => prev.map((day, idx) => (idx === dayIndex ? { ...day, ...updates } : day)));
  }, []);

  const toggleDayExpansion = useCallback((dayIndex: number) => {
    setDays((prev) =>
      prev.map((day, idx) => (idx === dayIndex ? { ...day, isExpanded: !day.isExpanded } : day))
    );
  }, []);

  const addActivityToDay = useCallback((dayIndex: number, activity: EditableActivity) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex ? { ...day, activities: [...day.activities, activity], isExpanded: true } : day
      )
    );
  }, []);

  const updateActivity = useCallback(
    (dayIndex: number, activityIndex: number, updates: Partial<EditableActivity>) => {
      setDays((prev) =>
        prev.map((day, idx) =>
          idx === dayIndex
            ? {
                ...day,
                activities: day.activities.map((act, actIdx) =>
                  actIdx === activityIndex ? { ...act, ...updates } : act
                ),
              }
            : day
        )
      );
    },
    []
  );

  const deleteActivity = useCallback((dayIndex: number, activityIndex: number) => {
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex
          ? { ...day, activities: day.activities.filter((_, actIdx) => actIdx !== activityIndex) }
          : day
      )
    );
  }, []);

  const moveActivity = useCallback((dayIndex: number, fromIndex: number, toIndex: number) => {
    setDays((prev) =>
      prev.map((day, idx) => {
        if (idx !== dayIndex) return day;
        const newActivities = [...day.activities];
        const [movedItem] = newActivities.splice(fromIndex, 1);
        newActivities.splice(toIndex, 0, movedItem);
        return { ...day, activities: newActivities };
      })
    );
  }, []);

  const moveActivityBetweenDays = useCallback(
    (fromDayIdx: number, toDayIdx: number, activityTempId: string, targetPosition: number) => {
      setDays((prev) => {
        const sourceDay = prev[fromDayIdx];
        const activityIdx = sourceDay.activities.findIndex((a) => a.tempId === activityTempId);
        if (activityIdx === -1) return prev;

        const activity = sourceDay.activities[activityIdx];
        return prev.map((day, idx) => {
          if (idx === fromDayIdx) {
            return { ...day, activities: day.activities.filter((a) => a.tempId !== activityTempId) };
          }
          if (idx === toDayIdx) {
            const newActivities = [...day.activities];
            newActivities.splice(targetPosition, 0, activity);
            return { ...day, activities: newActivities, isExpanded: true };
          }
          return day;
        });
      });
    },
    []
  );

  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExpandedDayRef = useRef<number | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveDragActivity(active.data.current?.activity ?? null);
    lastExpandedDayRef.current = null;
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveDragActivity(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;
      if (!activeData) return;

      const sourceDayIdx: number = activeData.dayIndex;
      const activeTempId = active.id as string;

      // Dropped onto a day droppable (empty day zone)
      if (overData?.type === "day") {
        const targetDayIdx: number = overData.dayIndex;
        if (sourceDayIdx === targetDayIdx) return;
        const targetDay = days[targetDayIdx];
        moveActivityBetweenDays(sourceDayIdx, targetDayIdx, activeTempId, targetDay?.activities.length ?? 0);
        return;
      }

      // Dropped onto another activity
      if (overData?.type === "activity") {
        const targetDayIdx: number = overData.dayIndex;
        const overTempId = over.id as string;

        if (sourceDayIdx === targetDayIdx) {
          // Same day reorder
          const dayActivities = days[sourceDayIdx].activities;
          const fromIdx = dayActivities.findIndex((a) => a.tempId === activeTempId);
          const toIdx = dayActivities.findIndex((a) => a.tempId === overTempId);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
            moveActivity(sourceDayIdx, fromIdx, toIdx);
          }
        } else {
          // Cross-day move
          const targetDay = days[targetDayIdx];
          const targetPos = targetDay.activities.findIndex((a) => a.tempId === overTempId);
          moveActivityBetweenDays(sourceDayIdx, targetDayIdx, activeTempId, targetPos !== -1 ? targetPos : targetDay.activities.length);
        }
        return;
      }
    },
    [days, moveActivity, moveActivityBetweenDays]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        if (expandTimeoutRef.current) {
          clearTimeout(expandTimeoutRef.current);
          expandTimeoutRef.current = null;
        }
        lastExpandedDayRef.current = null;
        return;
      }

      const overData = over.data.current;
      const targetDayIdx =
        overData?.type === "day"
          ? (overData.dayIndex as number)
          : overData?.type === "activity"
            ? (overData.dayIndex as number)
            : null;

      if (targetDayIdx === null || targetDayIdx === lastExpandedDayRef.current) return;

      // Clear previous timeout
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }

      // Auto-expand collapsed day after a short delay
      expandTimeoutRef.current = setTimeout(() => {
        setDays((prev) => {
          if (prev[targetDayIdx] && !prev[targetDayIdx].isExpanded) {
            lastExpandedDayRef.current = targetDayIdx;
            return prev.map((day, idx) => (idx === targetDayIdx ? { ...day, isExpanded: true } : day));
          }
          return prev;
        });
      }, 400);
    },
    []
  );

  const copyDayActivities = useCallback((fromDayIdx: number, toDayIndices: number[]) => {
    setDays((prev) => {
      const sourceActivities = prev[fromDayIdx].activities;
      if (sourceActivities.length === 0) return prev;

      const targetSet = new Set(toDayIndices);
      return prev.map((day, idx) => {
        if (!targetSet.has(idx)) return day;
        const copiedActivities = sourceActivities.map((act) => ({
          ...act,
          tempId: `act-${Date.now()}-${Math.random().toString(36).slice(2)}-${idx}`,
        }));
        return { ...day, activities: [...day.activities, ...copiedActivities], isExpanded: true };
      });
    });
    const dayLabels = toDayIndices.map((i) => `Day ${i + 1}`).join(", ");
    toast.success(`Copied activities from Day ${fromDayIdx + 1} to ${dayLabels}`);
  }, []);

  // Handle raw popover activity — distributes hotels across consecutive days
  const handleRawActivityAdd = useCallback((dayIndex: number, popoverActivity: any) => {
    const editableActivity = convertPopoverActivityToEditable(popoverActivity);

    if (popoverActivity.package_type === "hotel" && popoverActivity.nights > 1) {
      setDays((prev) => {
        const nights = Math.min(popoverActivity.nights, prev.length - dayIndex);
        return prev.map((day, idx) => {
          if (idx >= dayIndex && idx < dayIndex + nights) {
            const dayActivity: EditableActivity = {
              ...editableActivity,
              tempId: `act-${Date.now()}-${Math.random().toString(36).slice(2)}-d${idx}`,
            };
            return {
              ...day,
              activities: [...day.activities, dayActivity],
              isExpanded: idx === dayIndex ? true : day.isExpanded,
            };
          }
          return day;
        });
      });
    } else {
      addActivityToDay(dayIndex, editableActivity);
    }
  }, [addActivityToDay]);

  const handleSave = async () => {
    if (!selectedCountry) {
      toast.error("Please select a destination");
      return;
    }
    if (form.nights < 1) {
      toast.error("Please enter number of nights");
      return;
    }

    setIsSaving(true);
    try {
      const itineraryData = builderStateToItineraryData(form, days);
      const content = JSON.stringify(itineraryData, null, 2);

      if (isEditing && editDocId) {
        // Update existing doc
        const { error } = await updateDoc(editDocId, {
          content,
          country: selectedCountry,
          nights: form.nights,
        });

        if (error) {
          toast.error(error);
          return;
        }

        toast.success("Sample itinerary updated!");
      } else {
        // Create new doc
        const { error } = await createDoc({
          type: "itineraries",
          country: selectedCountry,
          content,
          nights: form.nights,
        });

        if (error) {
          toast.error(error);
          return;
        }

        toast.success("Sample itinerary saved!");
      }

      router.refresh();
      router.push("/docs/itineraries");
    } catch (error) {
      console.error("[ItineraryBuilder] Save error:", error);
      toast.error("Failed to save itinerary");
      setIsSaving(false);
    }
  };

  const totalActivities = days.reduce((sum, day) => sum + day.activities.length, 0);
  const totalDays = days.length;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <header className="shrink-0 border-b bg-background px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/docs/itineraries")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">
              {isEditing ? "Edit Sample Itinerary" : "Sample Itinerary Builder"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEditing ? "Update this itinerary template" : "Create AI reference templates"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-xs">
              {form.nights}N / {totalDays}D
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalActivities} {totalActivities === 1 ? "activity" : "activities"}
            </Badge>
          </div>
          <Button onClick={handleSave} disabled={isSaving || !selectedCountry} size="sm">
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </header>

      {/* Config Strip */}
      <div className="shrink-0 border-b bg-muted/30 px-6 py-3">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1 w-52">
            <Label className="text-[11px] text-muted-foreground font-medium">Destination</Label>
            <Autocomplete
              options={countries}
              value={selectedCountry}
              onChange={handleCountryChange}
              placeholder="Select country"
            />
          </div>

          <div className="space-y-1 w-20">
            <Label className="text-[11px] text-muted-foreground font-medium">Nights</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={form.nights}
              onChange={(e) => setForm((prev) => ({ ...prev, nights: Math.max(1, parseInt(e.target.value) || 1) }))}
            />
          </div>

          <div className="space-y-1 w-48">
            <Label className="text-[11px] text-muted-foreground font-medium">Theme</Label>
            <Select
              value={form.theme}
              onValueChange={(value) => setForm((prev) => ({ ...prev, theme: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                {ITINERARY_THEMES.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Day Timeline */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <main className="flex-1 min-h-0 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-6 space-y-3">
            {days.map((day, index) => (
              <DayCard
                key={day.tempId}
                day={day}
                dayIndex={index}
                totalDays={totalDays}
                itineraryNights={form.nights}
                travelers={form.travelers}
                onUpdateDay={(updates) => updateDay(index, updates)}
                onToggleExpand={() => toggleDayExpansion(index)}
                onAddActivity={(activity) => addActivityToDay(index, activity)}
                onAddRawActivity={(popoverActivity) => handleRawActivityAdd(index, popoverActivity)}
                onUpdateActivity={(actIndex, updates) => updateActivity(index, actIndex, updates)}
                onDeleteActivity={(actIndex) => deleteActivity(index, actIndex)}
                onCopyToDays={(toDayIndices) => copyDayActivities(index, toDayIndices)}
              />
            ))}
          </div>
        </main>

        <DragOverlay>
          {activeId && activeDragActivity ? (
            <div className="opacity-90 bg-card rounded-lg shadow-lg border p-3 max-w-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{activeDragActivity.name}</span>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                  {activeDragActivity.type}
                </Badge>
              </div>
              {activeDragActivity.subtitle && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{activeDragActivity.subtitle}</p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
