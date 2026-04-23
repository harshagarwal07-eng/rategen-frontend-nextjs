"use client";

import { IQueryDetails } from "@/types/crm-query";
import { DetailDataList, DetailDataListItem } from "@/components/crm/shared/detail-data-list";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AGENCY_CATEGORIES } from "@/constants/data";
import { updateAgencyCategory } from "@/data-access/crm-agency";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { OrgCatagory } from "@/types/crm-agency";

type Props = {
  query: IQueryDetails;
};

export default function AgencyDetailsSection({ query }: Props) {
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleCategoryUpdate = async (newCategory: string) => {
    if (!query.ta_id) {
      toast.error("Travel Agency ID not found");
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await updateAgencyCategory(query.ta_id, newCategory as OrgCatagory);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Category updated successfully");
      setIsEditingCategory(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    } finally {
      setIsUpdating(false);
    }
  };
  const items: DetailDataListItem[] = [
    {
      id: "agency_name",
      label: "Agency Name",
      value: query.ta_name || "-",
    },
    {
      id: "ta_country",
      label: "Country",
      value: query.ta_country_name || "-",
    },
    {
      id: "admin_name",
      label: "Admin Name",
      value: query.ta_admin_name || "-",
    },
    {
      id: "agent_phone",
      label: "Phone",
      value: query.ta_admin_phone ? `+${query.ta_admin_phone}` : "-",
    },
    {
      id: "agent_email",
      label: "Email",
      value: <div className="break-all">{query.ta_admin_email || "-"}</div>,
    },
    {
      id: "ta_category",
      label: "Category",
      value: (
        <div className="flex items-center gap-1.5 w-full">
          <span className="capitalize">
            {AGENCY_CATEGORIES.find((cat) => cat.value === query.ta_category)?.label || "Unrated"}
          </span>
          <Popover open={isEditingCategory} onOpenChange={setIsEditingCategory}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-primary">
                <Pencil />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              <div className="space-y-1">
                <p className="text-xs font-semibold mb-2 px-2">Select Category</p>
                {AGENCY_CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => handleCategoryUpdate(category.value)}
                    disabled={isUpdating}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors",
                      query.ta_category === category.value && "bg-muted font-medium",
                      isUpdating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ),
    },
  ];

  return (
    <DetailDataList
      items={items}
      accordion={{
        title: "Agency Details",
        value: "agency-details",
        defaultOpen: true,
      }}
    />
  );
}
