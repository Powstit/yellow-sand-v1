"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_MAKES, BODY_TYPES } from "@/lib/constants";

export function VehicleFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset pagination
      router.push(`/vehicles?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearAll = () => {
    router.push("/vehicles");
  };

  const activeFilters = Array.from(searchParams.entries()).filter(
    ([key]) => key !== "q" && key !== "page"
  );

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilters.length > 0 && (
            <Badge variant="gold" className="ml-1 h-4 px-1 text-[10px]">
              {activeFilters.length}
            </Badge>
          )}
        </Button>

        {/* Quick sort */}
        <Select
          value={searchParams.get("sortBy") ?? "created_desc"}
          onValueChange={(v) => updateFilter("sortBy", v)}
        >
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Newest First</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="year_desc">Newest Year</SelectItem>
            <SelectItem value="mileage_asc">Lowest Mileage</SelectItem>
          </SelectContent>
        </Select>

        {/* Active filter chips */}
        {activeFilters.map(([key, value]) => (
          <button
            key={key}
            onClick={() => updateFilter(key, null)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-sand-500/10 border border-sand-500/20 text-sand-400 hover:bg-sand-500/20 transition-colors"
          >
            <span className="capitalize">{key.replace(/_/g, " ")}: {value}</span>
            <X className="h-3 w-3" />
          </button>
        ))}

        {activeFilters.length > 1 && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 p-5 rounded-xl border border-border bg-card grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <FilterField label="Make">
            <Select
              value={searchParams.get("make") ?? "all"}
              onValueChange={(v) => updateFilter("make", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any make" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any make</SelectItem>
                {VEHICLE_MAKES.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Body Type">
            <Select
              value={searchParams.get("bodyType") ?? "all"}
              onValueChange={(v) => updateFilter("bodyType", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any type</SelectItem>
                {BODY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Condition">
            <Select
              value={searchParams.get("condition") ?? "all"}
              onValueChange={(v) => updateFilter("condition", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any condition</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Transmission">
            <Select
              value={searchParams.get("transmission") ?? "all"}
              onValueChange={(v) => updateFilter("transmission", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Min Year">
            <Input
              type="number"
              placeholder="e.g. 2018"
              className="h-8 text-xs"
              defaultValue={searchParams.get("minYear") ?? ""}
              onBlur={(e) => updateFilter("minYear", e.target.value || null)}
              min={1990}
              max={2030}
            />
          </FilterField>

          <FilterField label="Max Price (AED)">
            <Input
              type="number"
              placeholder="e.g. 200000"
              className="h-8 text-xs"
              defaultValue={searchParams.get("maxPrice") ?? ""}
              onBlur={(e) => updateFilter("maxPrice", e.target.value || null)}
            />
          </FilterField>
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
