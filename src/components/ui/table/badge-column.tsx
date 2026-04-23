import { Badge } from "@/components/ui/badge";
import Show from "@/components/ui/show";
import { queryTypes } from "@/constants/data";
import { Country, State } from "country-state-city";

type Props = {
  data: string[];
  type: "country" | "region" | "queryType";
};

export default function BadgeColumn({ data, type }: Props) {
  if (data.length === 0) return <span>-</span>;

  const displayData = data.slice(0, 3);
  const remainingCount = data.length - displayData.length;

  const convertToUserFriendlyString = (value: string) => {
    switch (type) {
      case "country":
        return Country.getCountryByCode(value)?.name;
      case "region":
        return State.getStateByCodeAndCountry(value, "IN")?.name;
      case "queryType":
        return queryTypes.find((q) => q.value === value)?.label;
      default:
        return value;
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {displayData.map((d) => (
        <Badge key={d} variant="outline">
          {convertToUserFriendlyString(d)}
        </Badge>
      ))}

      <Show when={remainingCount > 0}>
        <Badge variant="secondary">+{remainingCount} more</Badge>
      </Show>
    </div>
  );
}
