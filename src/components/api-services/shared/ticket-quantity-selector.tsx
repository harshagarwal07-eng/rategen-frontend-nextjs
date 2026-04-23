"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { TicketType } from "@/types/tour-bookings";

interface TicketQuantitySelectorProps {
  ticketTypes: TicketType[];
  values: Record<string, number>;
  onChange: (values: Record<string, number>) => void;
  disabled?: boolean;
}

export function TicketQuantitySelector({
  ticketTypes,
  values,
  onChange,
  disabled = false,
}: TicketQuantitySelectorProps) {
  const handleIncrement = (ticketId: string, max: number) => {
    const currentValue = values[ticketId] || 0;
    if (currentValue < max) {
      onChange({
        ...values,
        [ticketId]: currentValue + 1,
      });
    }
  };

  const handleDecrement = (ticketId: string, min: number) => {
    const currentValue = values[ticketId] || 0;
    if (currentValue > min) {
      onChange({
        ...values,
        [ticketId]: currentValue - 1,
      });
    }
  };

  const getTotalQuantity = () => {
    return Object.values(values).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return ticketTypes.reduce((total, ticket) => {
      const quantity = values[ticket.id] || 0;
      return total + ticket.price * quantity;
    }, 0);
  };

  const formatPrice = (amount: number, currency: string) => {
    return `${currency}${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {ticketTypes.map((ticket) => {
          const quantity = values[ticket.id] || 0;
          const isMinReached = quantity <= ticket.minimum;
          const isMaxReached = quantity >= ticket.maximum;
          const subtotal = ticket.price * quantity;

          return (
            <div
              key={ticket.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50"
            >
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <Label className="text-sm font-medium">
                    {ticket.label}
                    {ticket.ageRange && (
                      <span className="text-muted-foreground font-normal ml-1">
                        {ticket.ageRange}
                      </span>
                    )}
                  </Label>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(ticket.price, ticket.currency)} x participant
                  </p>
                  {ticket.description && (
                    <p className="text-xs text-muted-foreground">
                      • {ticket.description}
                    </p>
                  )}
                </div>
                {quantity > 0 && (
                  <p className="text-sm font-semibold text-primary mt-1">
                    Subtotal: {formatPrice(subtotal, ticket.currency)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleDecrement(ticket.id, ticket.minimum)}
                  disabled={disabled || isMinReached}
                  className="rounded-full"
                >
                  <Minus className="h-3 w-3" />
                </Button>

                <div className="min-w-12 text-center">
                  <span className="text-lg font-semibold">{quantity}</span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleIncrement(ticket.id, ticket.maximum)}
                  disabled={disabled || isMaxReached}
                  className="rounded-full"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {ticketTypes.length > 0 && getTotalQuantity() > 0 && (
        <div className="flex justify-between items-center p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div>
            <p className="text-sm font-medium">Total</p>
            <p className="text-xs text-muted-foreground">
              {getTotalQuantity()}{" "}
              {getTotalQuantity() === 1 ? "ticket" : "tickets"}
            </p>
          </div>
          <p className="text-xl font-bold text-primary">
            {formatPrice(getTotalPrice(), ticketTypes[0]?.currency || "₹")}
          </p>
        </div>
      )}
    </div>
  );
}
