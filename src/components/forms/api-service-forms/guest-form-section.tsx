"use client";

import { Control } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Show from "@/components/ui/show";
import { Card, CardContent } from "@/components/ui/card";
import { User, Shield, Mail } from "lucide-react";

interface GuestFormSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  index: number;
  guestType: "adult" | "child";
  isLeadGuest?: boolean;
  totalAdults?: number;
  onValidatePAN?: () => void;
  onSameForAll?: (checked: boolean) => void;
}

const titleOptions = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
];

export default function GuestFormSection({
  control,
  index,
  guestType,
  isLeadGuest = false,
  totalAdults = 0,
  onValidatePAN,
  onSameForAll,
}: GuestFormSectionProps) {
  const guestLabel =
    guestType === "adult"
      ? `Adult ${index + 1}`
      : `Child ${index + 1 - totalAdults}`;

  return (
    <Card className="shadow-none hover:shadow-none">
      <CardContent className="space-y-5">
        {/* Guest Header */}
        <div className="flex items-center gap-2 pb-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm">
            {guestLabel}
            {isLeadGuest && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (Lead Guest)
              </span>
            )}
          </h4>
        </div>

        {/* PAN Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <FormField
              control={control}
              name={`guests.${index}.pan`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-sm flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    PAN Number
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ABCDE1234F"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    <span className="text-destructive font-medium">Note:</span>{" "}
                    Enter valid PAN linked with Aadhar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Show when={isLeadGuest}>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={onValidatePAN}>
                  Validate
                </Button>
                <div className="flex items-center gap-2">
                  <Checkbox id="same-pan-no" onCheckedChange={onSameForAll} />
                  <Label
                    htmlFor="same-pan-no"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Same for all PAX
                  </Label>
                </div>
              </div>
            </Show>
          </div>
        </div>

        {/* Name Fields */}
        <div className="flex gap-4">
          <FormField
            control={control}
            name={`guests.${index}.title`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">Title</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent align="start">
                    {titleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`guests.${index}.firstName`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-sm">First Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`guests.${index}.lastName`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-sm">Last Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter last name"
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Child Age Field */}
        {guestType === "child" && (
          <FormField
            control={control}
            name={`guests.${index}.age`}
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel className="text-sm">Age</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter age"
                    min="1"
                    max="17"
                    className="h-10"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Contact Details for Lead Guest */}
        <Show when={isLeadGuest}>
          <div className="pt-4 border-t space-y-4">
            <div className="flex gap-2 items-center">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <h5 className="text-sm font-semibold">Contact Details</h5>
            </div>
            <FormField
              control={control}
              name={`guests.${index}.email`}
              render={({ field }) => (
                <FormItem className="max-w-md">
                  <FormLabel className="text-sm">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Show>
      </CardContent>
    </Card>
  );
}
