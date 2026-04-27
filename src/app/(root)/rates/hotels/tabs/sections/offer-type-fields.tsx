"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { OfferDiscountBasis, OfferDiscountType, OfferType } from "@/types/contract-offers";

export interface TypeData {
  discount_value: number | null;
  discount_type: OfferDiscountType | null;
  discount_basis: OfferDiscountBasis | null;
  minimum_stay: number | null;
  book_before_days: number | null;
  minimum_nights: number | null;
  stay_nights: number | null;
  pay_nights: number | null;
  minimum_adults: number | null;
  minimum_children: number | null;
  description: string | null;
}

interface Props {
  offerType: OfferType;
  data: TypeData;
  onChange: (patch: Partial<TypeData>) => void;
}

function NumField({
  label,
  required,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <Input
        type="number"
        className="h-8 text-sm"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : parseFloat(e.target.value))
        }
      />
    </div>
  );
}

function DiscountTypeToggle({
  value,
  onChange,
}: {
  value: OfferDiscountType | null;
  onChange: (v: OfferDiscountType) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Discount Type
      </label>
      <div className="flex h-8 rounded-md border p-0.5">
        {(["fixed", "percentage"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              "flex-1 rounded px-2 text-xs font-medium transition-colors",
              value === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/40"
            )}
          >
            {t === "fixed" ? "Fixed" : "%"}
          </button>
        ))}
      </div>
    </div>
  );
}

function DiscountBasisField({
  value,
  onChange,
}: {
  value: OfferDiscountBasis | null;
  onChange: (v: OfferDiscountBasis) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Discount Basis
      </label>
      <Select value={value ?? "per_stay"} onValueChange={(v) => onChange(v as OfferDiscountBasis)}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="per_stay">Per Stay</SelectItem>
          <SelectItem value="per_person">Per Person</SelectItem>
          <SelectItem value="per_room">Per Room</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function DiscountRow({
  data,
  onChange,
}: {
  data: TypeData;
  onChange: (p: Partial<TypeData>) => void;
}) {
  return (
    <>
      <NumField
        label="Discount Value"
        value={data.discount_value}
        onChange={(v) => onChange({ discount_value: v })}
      />
      <DiscountTypeToggle
        value={data.discount_type}
        onChange={(v) => onChange({ discount_type: v })}
      />
      {data.discount_type === "fixed" && (
        <DiscountBasisField
          value={data.discount_basis}
          onChange={(v) => onChange({ discount_basis: v })}
        />
      )}
    </>
  );
}

export function OfferTypeFields({ offerType, data, onChange }: Props) {
  switch (offerType) {
    case "early_bird":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumField
            label="Book Before Days"
            required
            placeholder="e.g. 60"
            value={data.book_before_days}
            onChange={(v) => onChange({ book_before_days: v })}
          />
          <NumField
            label="Minimum Stay"
            value={data.minimum_stay}
            onChange={(v) => onChange({ minimum_stay: v })}
          />
          <DiscountRow data={data} onChange={onChange} />
        </div>
      );
    case "long_stay":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumField
            label="Minimum Nights"
            required
            value={data.minimum_nights}
            onChange={(v) => onChange({ minimum_nights: v })}
          />
          <DiscountRow data={data} onChange={onChange} />
        </div>
      );
    case "free_night":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumField
              label="Stay Nights"
              required
              placeholder="e.g. 7"
              value={data.stay_nights}
              onChange={(v) => onChange({ stay_nights: v })}
            />
            <NumField
              label="Pay Nights"
              required
              placeholder="e.g. 6"
              value={data.pay_nights}
              onChange={(v) => onChange({ pay_nights: v })}
            />
            <NumField
              label="Minimum Stay"
              value={data.minimum_stay}
              onChange={(v) => onChange({ minimum_stay: v })}
            />
          </div>
          {data.stay_nights != null && data.pay_nights != null && (
            <p className="text-xs text-muted-foreground">
              Stay {data.stay_nights} Pay {data.pay_nights} ={" "}
              {data.stay_nights - data.pay_nights} night
              {data.stay_nights - data.pay_nights !== 1 ? "s" : ""} free
            </p>
          )}
        </div>
      );
    case "honeymoon":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumField
            label="Discount Value"
            placeholder="Leave blank if freebies only"
            value={data.discount_value}
            onChange={(v) => onChange({ discount_value: v })}
          />
          {data.discount_value != null && data.discount_value > 0 && (
            <>
              <DiscountTypeToggle
                value={data.discount_type}
                onChange={(v) => onChange({ discount_type: v })}
              />
              {data.discount_type === "fixed" && (
                <DiscountBasisField
                  value={data.discount_basis}
                  onChange={(v) => onChange({ discount_basis: v })}
                />
              )}
            </>
          )}
          <NumField
            label="Minimum Stay"
            value={data.minimum_stay}
            onChange={(v) => onChange({ minimum_stay: v })}
          />
        </div>
      );
    case "family":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DiscountRow data={data} onChange={onChange} />
          <NumField
            label="Minimum Adults"
            value={data.minimum_adults}
            onChange={(v) => onChange({ minimum_adults: v })}
          />
          <NumField
            label="Minimum Children"
            value={data.minimum_children}
            onChange={(v) => onChange({ minimum_children: v })}
          />
          <NumField
            label="Minimum Stay"
            value={data.minimum_stay}
            onChange={(v) => onChange({ minimum_stay: v })}
          />
        </div>
      );
    case "repeater":
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DiscountRow data={data} onChange={onChange} />
          <NumField
            label="Minimum Stay"
            value={data.minimum_stay}
            onChange={(v) => onChange({ minimum_stay: v })}
          />
        </div>
      );
    case "custom":
      return (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Description <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={3}
              value={data.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe the custom offer terms…"
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumField
              label="Discount Value"
              placeholder="Optional"
              value={data.discount_value}
              onChange={(v) => onChange({ discount_value: v })}
            />
            {data.discount_value != null && data.discount_value > 0 && (
              <>
                <DiscountTypeToggle
                  value={data.discount_type}
                  onChange={(v) => onChange({ discount_type: v })}
                />
                {data.discount_type === "fixed" && (
                  <DiscountBasisField
                    value={data.discount_basis}
                    onChange={(v) => onChange({ discount_basis: v })}
                  />
                )}
              </>
            )}
            <NumField
              label="Minimum Stay"
              value={data.minimum_stay}
              onChange={(v) => onChange({ minimum_stay: v })}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}
