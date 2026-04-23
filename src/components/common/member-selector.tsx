"use client";

import { useEffect, useState } from "react";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { fetchMemberOptions } from "@/data-access/dmc";
import useUser from "@/hooks/use-user";
import type { IOption } from "@/types/common";

// ─── Single ───────────────────────────────────────────────────────────────────

type MemberSelectorProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function MemberSelector({ value, onChange, placeholder = "Select member..." }: MemberSelectorProps) {
  const { user } = useUser();
  const [options, setOptions] = useState<IOption[]>([]);

  useEffect(() => {
    if (user?.dmc?.id) fetchMemberOptions(user.dmc.id).then(setOptions);
  }, [user?.dmc?.id]);

  return (
    <Autocomplete
      mode="client"
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search member..."
    />
  );
}

// ─── Multi ────────────────────────────────────────────────────────────────────

type MultiMemberSelectorProps = {
  value?: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
};

export function MultiMemberSelector({ value = [], onChange, placeholder = "Select members..." }: MultiMemberSelectorProps) {
  const { user } = useUser();
  const [options, setOptions] = useState<IOption[]>([]);

  useEffect(() => {
    if (user?.dmc?.id) fetchMemberOptions(user.dmc.id).then(setOptions);
  }, [user?.dmc?.id]);

  return (
    <MultiSelector values={value} onValuesChange={onChange}>
      <MultiSelectorTrigger data={options}>
        <MultiSelectorInput placeholder={value.length === 0 ? placeholder : ""} />
      </MultiSelectorTrigger>
      <MultiSelectorContent>
        <MultiSelectorList>
          {options.map((option) => (
            <MultiSelectorItem key={option.value} value={option.value}>
              {option.label}
            </MultiSelectorItem>
          ))}
        </MultiSelectorList>
      </MultiSelectorContent>
    </MultiSelector>
  );
}
