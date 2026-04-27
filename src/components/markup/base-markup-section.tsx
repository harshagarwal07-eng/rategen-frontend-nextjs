"use client";

import { useEffect, useState } from "react";
import isEqual from "lodash/isEqual";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpdateMarkupConfig } from "@/hooks/markup/use-markup-configs";
import type { MarkupValue } from "@/types/markup";
import { MarkupValueEditor } from "./markup-value-editor";

type Props = {
  configId: string;
  initial: MarkupValue;
};

export function BaseMarkupSection({ configId, initial }: Props) {
  const [value, setValue] = useState<MarkupValue>(initial);
  const update = useUpdateMarkupConfig(configId);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  const dirty = !isEqual(value, initial);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Base markup</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <MarkupValueEditor value={value} onChange={setValue} />
        <p className="text-xs text-muted-foreground">
          Applied when no modifiers match a more specific rule.
        </p>
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!dirty || update.isPending}
            loading={update.isPending}
            onClick={() => update.mutate({ base_markup: value })}
          >
            Save base
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
