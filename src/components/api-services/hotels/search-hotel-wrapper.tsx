"use client";

import SearchHotelFilters from "./search-hotel-filters";
import SearchHotelList from "./search-hotel-list";
import { useState } from "react";
import SearchWrapperHeader from "../shared/search-wrapper-header";

export default function SearchHotelWrapper() {
  const [isLoading, setIsLoading] = useState(false);

  const handleApplyFilters = () => {
    setIsLoading(true);
    // Simulate API call - replace with actual API integration later
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const headerTexts = ["Bangkok, Thailand", "21 Jun 2025 - 22 Jun 2025, 1 room, 2 guests"];

  return (
    <div className="w-full pr-8 space-y-3">
      <SearchWrapperHeader displayTexts={headerTexts} category="hotel" />

      <div className="flex gap-3">
        <div className="w-72 sticky top-2 self-start">
          <SearchHotelFilters onApplyFilters={handleApplyFilters} isLoading={isLoading} />
        </div>
        <div className="flex-1">
          <SearchHotelList />
        </div>
      </div>
    </div>
  );
}
