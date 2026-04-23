import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "../ui/badge";

type RoomData = {
  adults: number;
  children: number;
  children_ages?: number[];
  infants?: number;
};

type RoomCounterProps = {
  value: RoomData[] | RoomData;
  showRooms?: boolean;
  heading?: string;
  description?: string;
  enableInfant?: boolean;
  onChange: (value: RoomData[] | RoomData) => void;
};

export default function PaxCounter({
  value,
  showRooms,
  heading = "People",
  enableInfant = false,
  description = "Add number of People",
  onChange,
}: RoomCounterProps) {
  const isArray = Array.isArray(value);
  const rooms = isArray ? value : [value];

  const handleAdultChange = (roomIndex: number, delta: number) => {
    const updatedRooms = [...rooms];
    const current = updatedRooms[roomIndex].adults;
    updatedRooms[roomIndex].adults = Math.max(1, current + delta);
    onChange(isArray ? updatedRooms : updatedRooms[0]);
  };

  const handleChildrenChange = (roomIndex: number, delta: number) => {
    const updatedRooms = [...rooms];
    const room = updatedRooms[roomIndex];
    const newCount = Math.max(0, (room.children ?? 0) + delta);
    room.children = newCount;

    if (!enableInfant) {
      const ages = (room.children_ages || []).slice(0, newCount);
      while (ages.length < newCount) ages.push(0);
      room.children_ages = ages;
    }

    onChange(isArray ? updatedRooms : updatedRooms[0]);
  };

  const handleInfantChange = (roomIndex: number, delta: number) => {
    const updatedRooms = [...rooms];
    const room = updatedRooms[roomIndex];
    const newCount = Math.max(0, (room.infants ?? 0) + delta);
    room.infants = newCount;
    onChange(isArray ? updatedRooms : updatedRooms[0]);
  };

  const handleChildAgeChange = (
    roomIndex: number,
    childIndex: number,
    age: number
  ) => {
    const updatedRooms = [...rooms];
    const existingAges = updatedRooms[roomIndex].children_ages || [];
    const updatedAges = [...existingAges];
    updatedAges[childIndex] = Math.max(0, Math.min(17, age));
    updatedRooms[roomIndex].children_ages = updatedAges;
    onChange(isArray ? updatedRooms : updatedRooms[0]);
  };

  const addRoom = () => {
    const updated = [...rooms, { adults: 2, children: 0, children_ages: [] }];
    onChange(updated);
  };

  const removeRoom = (roomIndex: number) => {
    if (rooms.length <= 1) return;
    const updated = rooms.filter((_, i) => i !== roomIndex);
    onChange(updated);
  };

  const getSummary = () => {
    const total = rooms.reduce(
      (acc: { adults: number; children: number; infants: number }, r) => {
        acc.adults += r.adults;
        acc.children += r.children;
        acc.infants += r.infants ?? 0;
        return acc;
      },
      { adults: 0, children: 0, infants: 0 }
    );

    let summary = `${total.adults} Adult${total.adults > 1 ? "s" : ""}`;
    if (total.children > 0)
      summary += `, ${total.children} Child${total.children > 1 ? "ren" : ""}`;
    if (enableInfant && total.infants > 0)
      summary += `, ${total.infants} Infant${total.infants > 1 ? "s" : ""}`;
    if (isArray)
      summary += ` • ${rooms.length} Room${rooms.length > 1 ? "s" : ""}`;

    return summary;
  };

  const getRoomSummary = (room: RoomData) => {
    const parts = [
      `${room.adults} Adult${room.adults > 1 ? "s" : ""}`,
      room.children > 0
        ? `${room.children} Child${room.children > 1 ? "ren" : ""}`
        : null,
      room.infants && room.infants > 0
        ? `${room.infants} Infant${room.infants > 1 ? "s" : ""}`
        : null,
    ];

    return parts.filter(Boolean).join(", ");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start bg-background border border-border/60 font-normal h-10 rounded-lg focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20 px-3.5 py-2.5 hover:border-border hover:shadow text-foreground shadow-xs overflow-x-auto no-scrollbar transition-all"
        >
          {getSummary()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-4 no-scrollbar max-h-[500px] overflow-y-auto"
        align="start"
      >
        <div className="gap-4 grid">
          <div>
            <p className="font-medium leading-none">{heading}</p>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>

          <div className="space-y-4">
            {showRooms ? (
              <>
                <Accordion
                  type="single"
                  defaultValue="room-0"
                  collapsible
                  className="w-full space-y-1"
                >
                  {rooms.map((room, roomIndex) => (
                    <AccordionItem
                      key={roomIndex}
                      value={`room-${roomIndex}`}
                      className="rounded-md overflow-hidden"
                    >
                      <AccordionTrigger className="justify-between px-2 bg-input ">
                        <p>
                          <span className="font-bold text-base mr-2">
                            Room {roomIndex + 1}
                          </span>
                          <Badge variant={"outline"}>
                            {getRoomSummary(room)}
                          </Badge>
                        </p>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 space-y-3 bg-input px-2">
                        <div className="flex items-center gap-4 pl-2">
                          <Label className="w-20 capitalize text-sm">
                            Adults
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 bg-transparent"
                            onClick={() => handleAdultChange(roomIndex, -1)}
                            disabled={room.adults <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">
                            {room.adults}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 bg-transparent"
                            onClick={() => handleAdultChange(roomIndex, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-4 pl-2">
                          <Label className="w-20 capitalize text-sm">
                            Children
                            {enableInfant && (
                              <span className="text-xs text-muted-foreground">
                                (Between 2 and 12)
                              </span>
                            )}
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 bg-transparent"
                            onClick={() => handleChildrenChange(roomIndex, -1)}
                            disabled={room.children <= 0}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">
                            {room.children}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 bg-transparent"
                            onClick={() => handleChildrenChange(roomIndex, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {enableInfant && (
                          <div className="flex items-center gap-4 pl-2">
                            <Label className="w-20 text-sm">
                              Infants{" "}
                              <span className="text-xs text-muted-foreground">
                                (Under 2)
                              </span>
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="w-7 h-7 bg-transparent"
                              onClick={() => handleInfantChange(roomIndex, -1)}
                              disabled={(room.infants ?? 0) <= 0}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">
                              {room.infants ?? 0}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="w-7 h-7 bg-transparent"
                              onClick={() => handleInfantChange(roomIndex, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {!enableInfant && room.children > 0 && (
                          <div className="pl-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Child Ages (0-17 years)
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {(room.children_ages || []).map(
                                (age: number, childIndex: number) => (
                                  <div
                                    key={childIndex}
                                    className="flex flex-col gap-1"
                                  >
                                    <Label className="text-xs">
                                      Child {childIndex + 1}
                                    </Label>
                                    <Input
                                      type="number"
                                      value={age}
                                      onChange={(e) =>
                                        handleChildAgeChange(
                                          roomIndex,
                                          childIndex,
                                          Number(e.target.value)
                                        )
                                      }
                                      placeholder="Age"
                                      min={0}
                                      max={17}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {rooms.length > 1 && (
                          <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => removeRoom(roomIndex)}
                          >
                            Remove Room
                          </Button>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRoom}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Room
                </Button>
              </>
            ) : (
              // Simple mode (no rooms)
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="w-20 capitalize">Adults</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-transparent"
                    onClick={() => handleAdultChange(0, -1)}
                    disabled={rooms[0].adults <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center">{rooms[0].adults}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-transparent"
                    onClick={() => handleAdultChange(0, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="w-20 capitalize flex flex-wrap gap-y-0">
                    Children{" "}
                    {enableInfant && (
                      <span className="text-xs text-muted-foreground font-normal">
                        (Between 2 and 12)
                      </span>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-transparent"
                    onClick={() => handleChildrenChange(0, -1)}
                    disabled={rooms[0].children <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center">{rooms[0].children}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 bg-transparent"
                    onClick={() => handleChildrenChange(0, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {enableInfant && (
                  <div className="flex items-center gap-4">
                    <Label className="w-20 text-sm flex flex-wrap gap-y-0">
                      Infants{" "}
                      <span className="text-xs text-muted-foreground font-normal">
                        (Under 2)
                      </span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="w-8 h-8 bg-transparent"
                      onClick={() => handleInfantChange(0, -1)}
                      disabled={(rooms[0].infants ?? 0) <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">
                      {rooms[0].infants ?? 0}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="w-8 h-8 bg-transparent"
                      onClick={() => handleInfantChange(0, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                {!enableInfant && rooms[0].children > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm text-muted-foreground">
                      Child Ages (0-17 years)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(rooms[0].children_ages || []).map(
                        (age: number, childIndex: number) => (
                          <div key={childIndex} className="flex flex-col gap-1">
                            <Label className="text-xs">
                              Child {childIndex + 1}
                            </Label>
                            <Input
                              type="number"
                              value={age}
                              onChange={(e) =>
                                handleChildAgeChange(
                                  0,
                                  childIndex,
                                  Number(e.target.value)
                                )
                              }
                              placeholder="Age"
                              min={0}
                              max={17}
                              className="h-9 text-sm"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
