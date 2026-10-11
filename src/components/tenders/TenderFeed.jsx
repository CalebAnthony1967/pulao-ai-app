import React, { useEffect, useMemo, useState } from "react";
import { FileSearch, Search, SlidersHorizontal } from "lucide-react";
import { listTenders } from "@/lib/data";
import TenderCard from "./TenderCard";
import EmptyState from "@/components/common/EmptyState";
import LoadingBlock from "@/components/common/LoadingBlock";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function TenderFeed({ linkPrefix = "/tenders", limit }) {
  const [tenders, setTenders] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [agpoOnly, setAgpoOnly] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setTenders(null);
    const timer = setTimeout(() => {
      listTenders({ search, category, region, agpoOnly })
        .then((rows) => {
          if (active) setTenders(rows);
        })
        .catch((err) => {
          if (active) setError(err.message);
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, category, region, agpoOnly]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set((tenders || []).map((t) => t.category).filter(Boolean)))],
    [tenders],
  );
  const regions = useMemo(
    () => ["all", ...Array.from(new Set((tenders || []).map((t) => t.region).filter(Boolean)))],
    [tenders],
  );

  const visible = limit ? (tenders || []).slice(0, limit) : tenders || [];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, tender number or procuring entity"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Switch id="agpo" checked={agpoOnly} onCheckedChange={setAgpoOnly} />
            <Label htmlFor="agpo" className="cursor-pointer text-sm">
              Preference-reserved only
            </Label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Category
          </span>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                category === item
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-background text-muted-foreground hover:border-navy/30 hover:text-navy",
              )}
            >
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Region</span>
          {regions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRegion(item)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                region === item
                  ? "border-compliance bg-compliance text-white"
                  : "border-border bg-background text-muted-foreground hover:border-compliance/30 hover:text-compliance",
              )}
            >
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={FileSearch}
          title="The tender register could not be reached"
          description={error}
        />
      ) : tenders === null ? (
        <LoadingBlock label="Loading the tender register" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No tenders match those filters"
          description="Try a different category, region or search term."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((tender) => (
            <TenderCard key={tender.id} tender={tender} to={`${linkPrefix}/${tender.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}