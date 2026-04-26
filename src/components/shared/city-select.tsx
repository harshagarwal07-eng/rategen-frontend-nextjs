"use client";

import { useEffect, useState } from "react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { fetchCountryTree } from "@/data-access/geo-picker-api";
import type { IOption } from "@/types/common";

interface CitySelectProps {
  value: string | null;
  onChange: (id: string | null) => void;
  countryId: string | null;
  disabled?: boolean;
  placeholder?: string;
}

export function CitySelect({
  value,
  onChange,
  countryId,
  disabled,
  placeholder = "Select city...",
}: CitySelectProps) {
  const [options, setOptions] = useState<IOption[]>([]);

  useEffect(() => {
    if (!countryId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    fetchCountryTree(countryId).then((res) => {
      if (cancelled || !res.data) return;
      setOptions(res.data.cities.map((c) => ({ value: c.id, label: c.name })));
    });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  return (
    <Autocomplete
      options={options}
      value={value ?? ""}
      onChange={(v) => onChange(v || null)}
      placeholder={!countryId ? "Pick country first" : placeholder}
      disabled={disabled || !countryId}
    />
  );
}
