"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface Child {
  age: string;
}

interface TravelDetailsFormProps {
  onSubmit: (details: {
    destination: string;
    numberOfTravelers: number;
    startDate: Date | undefined;
    endDate: Date | undefined;
    children: { age: number }[];
  }) => void;
  initialDestination?: string;
  disabled?: boolean;
  // New dynamic props
  hasDestination?: boolean;
  hasNumPeople?: boolean;
  hasDates?: boolean;
  duration?: number;
  numberOfTravelers?: number;
}

export default function TravelDetailsForm({
  onSubmit,
  initialDestination = "",
  disabled = true,
  hasDestination = false,
  hasNumPeople = false,
  hasDates = false,
  duration,
  numberOfTravelers: initialTravelers,
}: TravelDetailsFormProps) {
  const [destination, setDestination] = useState(initialDestination);
  const [numberOfTravelers, setNumberOfTravelers] = useState<string>(
    initialTravelers ? initialTravelers.toString() : ""
  );
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [children, setChildren] = useState<Child[]>([]);
  const [hasChildren, setHasChildren] = useState(false);

  // Auto-calculate end date when startDate and duration are available
  useEffect(() => {
    if (startDate && duration && !hasDates) {
      const calculatedEndDate = addDays(startDate, duration);
      setEndDate(calculatedEndDate);
    }
  }, [startDate, duration, hasDates]);

  const addChild = () => {
    setChildren([...children, { age: "" }]);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const updateChildAge = (index: number, age: string) => {
    const updated = [...children];
    updated[index].age = age;
    setChildren(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate only if the field is being shown (not already provided)
    if (!hasDestination && !destination.trim()) {
      return;
    }

    const travelers = parseInt(numberOfTravelers);
    if (!hasNumPeople && (isNaN(travelers) || travelers <= 0)) {
      return;
    }

    if (!hasDates && (!startDate || !endDate)) {
      return;
    }

    // Validate children ages if any
    const childrenData = children
      .map((child) => ({
        age: parseInt(child.age),
      }))
      .filter((child) => !isNaN(child.age) && child.age > 0);

    // Include ALL data - both user-provided and pre-filled from props
    onSubmit({
      destination: destination.trim() || initialDestination,
      numberOfTravelers: travelers || initialTravelers || 0,
      startDate: startDate,
      endDate: endDate,
      children: childrenData,
    });
  };

  const isValid =
    (hasDestination || destination.trim() || initialDestination) &&
    (hasNumPeople || (numberOfTravelers && parseInt(numberOfTravelers) > 0) || initialTravelers) &&
    (hasDates || (startDate && endDate)) &&
    (!hasChildren ||
      children.length === 0 ||
      children.every((child) => child.age && parseInt(child.age) > 0));

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Travel Details</h3>
          <p className="text-sm text-muted-foreground">
            {hasDestination || hasNumPeople || hasDates || duration
              ? "Please provide the missing information to get personalized recommendations"
              : "Analyzing your request..."}
          </p>
        </div>

        {/* Destination - only show if not already provided */}
        {!hasDestination && (
          <div className="space-y-2">
            <Label htmlFor="destination">
              Destination <span className="text-destructive">*</span>
            </Label>
            <Input
              id="destination"
              placeholder="e.g., Bali, Paris, Tokyo"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
        )}

        {/* Number of Travelers - only show if not already provided */}
        {!hasNumPeople && (
          <div className="space-y-2">
            <Label htmlFor="travelers">
              Number of Travelers <span className="text-destructive">*</span>
            </Label>
            <Input
              id="travelers"
              type="number"
              min="1"
              placeholder="How many people?"
              value={numberOfTravelers}
              onChange={(e) => setNumberOfTravelers(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
        )}

        {/* Date Range - only show if not already provided */}
        {!hasDates && (
          <div className={cn("grid gap-4", duration ? "grid-cols-1" : "grid-cols-2")}>
            <div className="space-y-2">
              <Label>
                Start Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    disabled={disabled}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    disabled={(date) => disabled || date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Only show end date picker if duration is not provided */}
            {!duration && (
              <div className="space-y-2">
                <Label>
                  End Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                      disabled={disabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) =>
                        disabled || date < new Date() || (startDate ? date <= startDate : false)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Show calculated end date if duration is provided */}
            {duration && endDate && (
              <div className="space-y-2">
                <Label>End Date (calculated)</Label>
                <div className="w-full px-3 py-2 border rounded-md bg-muted text-sm">
                  {format(endDate, "PPP")}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Children */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasChildren"
              checked={hasChildren}
              onChange={(e) => {
                setHasChildren(e.target.checked);
                if (!e.target.checked) {
                  setChildren([]);
                }
              }}
              className="h-4 w-4 rounded border-gray-300"
              disabled={disabled}
            />
            <Label htmlFor="hasChildren" className="cursor-pointer">
              Traveling with children?
            </Label>
          </div>

          {hasChildren && (
            <div className="space-y-2">
              {children.map((child, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="17"
                    placeholder="Child's age"
                    value={child.age}
                    onChange={(e) => updateChildAge(index, e.target.value)}
                    className="flex-1"
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChild(index)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChild}
                className="w-full"
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </Button>
            </div>
          )}
        </div>

        {/* Submit */}
        {!disabled && (
          <Button type="submit" className="w-full" disabled={!isValid}>
            Get Personalized Recommendations
          </Button>
        )}
      </form>
    </Card>
  );
}
