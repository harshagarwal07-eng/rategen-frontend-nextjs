"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BedDouble, Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomSelection, RoomPaxDistribution } from "@/data-access/itinerary-activities";

// Individual pax item
interface PaxItem {
  id: string;
  type: "adult" | "teen" | "child" | "infant";
  index: number;
  age?: number;
  roomIndex: number | null; // null = unassigned
}

interface PaxRoomDistributionProps {
  adults: number;
  teens: number;
  children: number;
  infants: number;
  childrenAges: number[];
  rooms: RoomSelection[];
  roomPaxDistribution: RoomPaxDistribution[];
  availableRooms: Array<{
    id: string;
    room_category: string;
    meal_plan?: string;
    max_occupancy?: string;
  }>;
  onRoomsChange: (rooms: RoomSelection[]) => void;
  onDistributionChange: (distribution: RoomPaxDistribution[]) => void;
}

// Draggable Pax Badge
function DraggablePax({ pax, isOverlay }: { pax: PaxItem; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pax.id,
    data: pax,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const label =
    pax.type === "child" && pax.age !== undefined
      ? `Child ${pax.index + 1} - ${pax.age}yr`
      : pax.type === "adult"
        ? `Adult ${pax.index + 1}`
        : pax.type === "teen"
          ? `Teen ${pax.index + 1}`
          : `Infant ${pax.index + 1}`;

  const colors = {
    adult: "bg-blue-100 text-blue-800 border-blue-200",
    teen: "bg-purple-100 text-purple-800 border-purple-200",
    child: "bg-green-100 text-green-800 border-green-200",
    infant: "bg-orange-100 text-orange-800 border-orange-200",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-grab select-none",
        colors[pax.type],
        isDragging && !isOverlay && "opacity-50",
        isOverlay && "shadow-lg cursor-grabbing"
      )}
    >
      <GripVertical className="h-3 w-3 opacity-50" />
      {label}
    </div>
  );
}

// Droppable Room Card
function DroppableRoom({
  roomIndex,
  room,
  paxInRoom,
  availableRooms,
  onRoomChange,
  onRemove,
}: {
  roomIndex: number;
  room: RoomSelection;
  paxInRoom: PaxItem[];
  availableRooms: Array<{
    id: string;
    room_category: string;
    meal_plan?: string;
    max_occupancy?: string;
  }>;
  onRoomChange: (room: RoomSelection) => void;
  onRemove: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `room-${roomIndex}`,
    data: { roomIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-3 border rounded-lg transition-colors",
        isOver ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">Room {roomIndex + 1}</span>
        <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Room Category + Quantity */}
      <div className="flex items-end gap-2 mb-2">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px] text-muted-foreground">Room Category</Label>
          <Select value={room.room_category} onValueChange={(value) => onRoomChange({ ...room, room_category: value })}>
            <SelectTrigger className="text-xs" size="sm">
              <SelectValue placeholder="Select room" />
            </SelectTrigger>
            <SelectContent>
              {availableRooms.length > 0 ? (
                availableRooms.map((r) => (
                  <SelectItem key={r.id} value={r.room_category}>
                    {[r.room_category, r.meal_plan, r.max_occupancy].filter(Boolean).join(" · ")}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-rooms" disabled>
                  No rooms
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="w-16 space-y-1">
          <Label className="text-[10px] text-muted-foreground">Quantity</Label>
          <Input
            type="number"
            min={1}
            value={room.quantity}
            onChange={(e) => onRoomChange({ ...room, quantity: parseInt(e.target.value) || 1 })}
            className="h-8 text-xs text-center"
          />
        </div>
      </div>

      {/* Drop zone for pax badges */}
      <div
        className={cn(
          "min-h-[36px] p-2 rounded border-2 border-dashed flex flex-wrap gap-1",
          isOver ? "border-primary bg-primary/10" : "border-muted",
          paxInRoom.length === 0 && "items-center justify-center"
        )}
      >
        {paxInRoom.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">Drop pax here</span>
        ) : (
          paxInRoom.map((pax) => <DraggablePax key={pax.id} pax={pax} />)
        )}
      </div>
    </div>
  );
}

// Combined Pax Summary + Unassigned Pool
function PaxSummaryWithPool({
  adults,
  teens,
  children,
  infants,
  totalPax,
  unassignedPax,
  isOver,
}: {
  adults: number;
  teens: number;
  children: number;
  infants: number;
  totalPax: number;
  unassignedPax: PaxItem[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: "unassigned",
    data: { roomIndex: null },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("p-3 border rounded-lg", isOver ? "border-primary bg-primary/5" : "border-border")}
    >
      {/* Header with counts */}
      <div className="flex items-center gap-4 mb-2">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" /> Pax: <span className="text-foreground">{totalPax}</span>
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Adults: <span className="font-medium text-foreground">{adults}</span>
          </span>
          <span className="text-muted-foreground">
            Teens: <span className="font-medium text-foreground">{teens}</span>
          </span>
          <span className="text-muted-foreground">
            Children: <span className="font-medium text-foreground">{children}</span>
          </span>
          <span className="text-muted-foreground">
            Infants: <span className="font-medium text-foreground">{infants}</span>
          </span>
        </div>
      </div>

      {/* Unassigned pax badges */}
      <div
        className={cn("min-h-[36px] flex flex-wrap gap-1 items-center", unassignedPax.length === 0 && "justify-center")}
      >
        {unassignedPax.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">All pax assigned to rooms</span>
        ) : (
          unassignedPax.map((pax) => <DraggablePax key={pax.id} pax={pax} />)
        )}
      </div>
    </div>
  );
}

export function PaxRoomDistribution({
  adults,
  teens,
  children,
  infants,
  childrenAges,
  rooms,
  roomPaxDistribution,
  availableRooms,
  onRoomsChange,
  onDistributionChange,
}: PaxRoomDistributionProps) {
  const [activePax, setActivePax] = useState<PaxItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Generate all pax items with their current room assignments
  const allPaxItems = useMemo(() => {
    const items: PaxItem[] = [];

    // Adults
    for (let i = 0; i < adults; i++) {
      items.push({ id: `adult-${i}`, type: "adult", index: i, roomIndex: null });
    }
    // Teens
    for (let i = 0; i < teens; i++) {
      items.push({ id: `teen-${i}`, type: "teen", index: i, roomIndex: null });
    }
    // Children with ages
    for (let i = 0; i < children; i++) {
      items.push({
        id: `child-${i}`,
        type: "child",
        index: i,
        age: childrenAges[i],
        roomIndex: null,
      });
    }
    // Infants
    for (let i = 0; i < infants; i++) {
      items.push({ id: `infant-${i}`, type: "infant", index: i, roomIndex: null });
    }

    // Assign pax to rooms based on distribution
    let adultIdx = 0,
      teenIdx = 0,
      childIdx = 0,
      infantIdx = 0;
    roomPaxDistribution.forEach((dist, roomIdx) => {
      for (let i = 0; i < (dist.adults || 0) && adultIdx < adults; i++, adultIdx++) {
        const pax = items.find((p) => p.id === `adult-${adultIdx}`);
        if (pax) pax.roomIndex = roomIdx;
      }
      for (let i = 0; i < (dist.teens || 0) && teenIdx < teens; i++, teenIdx++) {
        const pax = items.find((p) => p.id === `teen-${teenIdx}`);
        if (pax) pax.roomIndex = roomIdx;
      }
      for (let i = 0; i < (dist.children || 0) && childIdx < children; i++, childIdx++) {
        const pax = items.find((p) => p.id === `child-${childIdx}`);
        if (pax) pax.roomIndex = roomIdx;
      }
      for (let i = 0; i < (dist.infants || 0) && infantIdx < infants; i++, infantIdx++) {
        const pax = items.find((p) => p.id === `infant-${infantIdx}`);
        if (pax) pax.roomIndex = roomIdx;
      }
    });

    return items;
  }, [adults, teens, children, infants, childrenAges, roomPaxDistribution]);

  const unassignedPax = allPaxItems.filter((p) => p.roomIndex === null);
  const totalPax = adults + teens + children + infants;

  const handleDragStart = (event: DragStartEvent) => {
    const pax = event.active.data.current as PaxItem;
    setActivePax(pax);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePax(null);

    const { active, over } = event;
    if (!over) return;

    const pax = active.data.current as PaxItem;
    const targetRoomIndex = over.data.current?.roomIndex as number | null;

    if (pax.roomIndex === targetRoomIndex) return;

    // Update distribution
    const newDist = [...roomPaxDistribution];

    // Remove from old room
    if (pax.roomIndex !== null && newDist[pax.roomIndex]) {
      const oldDist = { ...newDist[pax.roomIndex] };
      if (pax.type === "adult") oldDist.adults = Math.max(0, (oldDist.adults || 0) - 1);
      if (pax.type === "teen") oldDist.teens = Math.max(0, (oldDist.teens || 0) - 1);
      if (pax.type === "child") {
        oldDist.children = Math.max(0, (oldDist.children || 0) - 1);
        if (pax.age !== undefined) {
          oldDist.children_ages = (oldDist.children_ages || []).filter((_, i) => i !== pax.index);
        }
      }
      if (pax.type === "infant") oldDist.infants = Math.max(0, (oldDist.infants || 0) - 1);
      newDist[pax.roomIndex] = oldDist;
    }

    // Add to new room
    if (targetRoomIndex !== null && newDist[targetRoomIndex]) {
      const newRoom = { ...newDist[targetRoomIndex] };
      if (pax.type === "adult") newRoom.adults = (newRoom.adults || 0) + 1;
      if (pax.type === "teen") newRoom.teens = (newRoom.teens || 0) + 1;
      if (pax.type === "child") {
        newRoom.children = (newRoom.children || 0) + 1;
        if (pax.age !== undefined) {
          newRoom.children_ages = [...(newRoom.children_ages || []), pax.age];
        }
      }
      if (pax.type === "infant") newRoom.infants = (newRoom.infants || 0) + 1;
      newDist[targetRoomIndex] = newRoom;
    }

    onDistributionChange(newDist);
  };

  const addRoom = () => {
    const isFirstRoom = rooms.length === 0;
    const newRooms = [...rooms, { room_category: "", quantity: 1 }];
    const newDist = [
      ...roomPaxDistribution,
      {
        room_number: rooms.length + 1,
        // If first room, assign all pax to it
        adults: isFirstRoom ? adults : 0,
        teens: isFirstRoom ? teens : 0,
        children: isFirstRoom ? children : 0,
        infants: isFirstRoom ? infants : 0,
        children_ages: isFirstRoom ? [...childrenAges] : [],
      },
    ];
    onRoomsChange(newRooms);
    onDistributionChange(newDist);
  };

  const removeRoom = (index: number) => {
    const newRooms = rooms.filter((_, i) => i !== index);
    const newDist = roomPaxDistribution.filter((_, i) => i !== index);
    onRoomsChange(newRooms);
    onDistributionChange(newDist);
  };

  const updateRoom = (index: number, room: RoomSelection) => {
    const newRooms = [...rooms];
    newRooms[index] = room;
    onRoomsChange(newRooms);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* Combined Pax Summary + Unassigned Pool */}
        <PaxSummaryWithPool
          adults={adults}
          teens={teens}
          children={children}
          infants={infants}
          totalPax={totalPax}
          unassignedPax={unassignedPax}
          isOver={activePax !== null && activePax.roomIndex !== null}
        />

        {/* Rooms Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <BedDouble className="h-3 w-3" /> Rooms ({rooms.length})
          </h3>
          <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2" onClick={addRoom}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>

        {/* Room Cards */}
        <div className="grid grid-cols-2 gap-2">
          {rooms.map((room, idx) => (
            <DroppableRoom
              key={idx}
              roomIndex={idx}
              room={room}
              paxInRoom={allPaxItems.filter((p) => p.roomIndex === idx)}
              availableRooms={availableRooms}
              onRoomChange={(r) => updateRoom(idx, r)}
              onRemove={() => removeRoom(idx)}
            />
          ))}
        </div>

        <DragOverlay>{activePax && <DraggablePax pax={activePax} isOverlay />}</DragOverlay>
      </div>
    </DndContext>
  );
}
