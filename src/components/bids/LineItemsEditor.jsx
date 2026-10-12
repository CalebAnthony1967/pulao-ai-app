import React from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

export const EMPTY_ITEM = { description: "", quantity: 1, unit_of_measure: "per unit", unit_price: "" };

export function lineTotal(item) {
  if (!item) return 0;
  const q = typeof item.quantity === "number"
    ? item.quantity
    : Number(String(item.quantity ?? "1").replace(/[^0-9.-]+/g, "")) || 1;
  const p = typeof item.unit_price === "number"
    ? item.unit_price
    : Number(String(item.unit_price ?? "0").replace(/[^0-9.-]+/g, "")) || 0;
  return q * p;
}

export default function LineItemsEditor({ items, onChange, tender }) {
  const update = (index, patch) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const handlePreFill = () => {
    if (!tender) return;
    const defaultTitle = tender.title || "Tender deliverables";
    onChange([
      {
        description: defaultTitle + " (Primary Supply & Delivery)",
        quantity: 1,
        unit_of_measure: "lot",
        unit_price: tender.budget_allocation ? Math.round(tender.budget_allocation * 0.85) : 500000,
      },
      {
        description: "Installation, Commissioning and Warranted Support",
        quantity: 1,
        unit_of_measure: "service",
        unit_price: tender.budget_allocation ? Math.round(tender.budget_allocation * 0.1) : 75000,
      },
    ]);
  };

  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);

  return (
    <div className="space-y-3">
      <div className="hidden gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1.5fr_4.5rem_6rem_8rem_2rem]">
        <span>Item / Scope Description</span>
        <span>Qty</span>
        <span>Unit</span>
        <span>Unit price (KES)</span>
        <span />
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1.5fr_4.5rem_6rem_8rem_2rem] sm:items-center sm:border-0 sm:bg-transparent sm:p-1"
        >
          <Input
            value={item.description || ""}
            onChange={(event) => update(index, { description: event.target.value })}
            placeholder="Describe the item or deliverable"
          />
          <Input
            type="number"
            min="1"
            value={item.quantity ?? 1}
            onChange={(event) =>
              update(index, { quantity: event.target.value === "" ? "" : Math.max(1, Number(event.target.value)) })
            }
            className="font-mono"
          />
          <Input
            value={item.unit_of_measure || ""}
            onChange={(event) => update(index, { unit_of_measure: event.target.value })}
            placeholder="per unit"
          />
          <Input
            type="text"
            inputMode="decimal"
            value={item.unit_price ?? ""}
            onChange={(event) => {
              const cleaned = event.target.value.replace(/[^0-9.]/g, "");
              update(index, { unit_price: cleaned });
            }}
            placeholder="0.00"
            className="font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            disabled={items.length === 1}
            className="justify-self-end text-muted-foreground hover:text-critical"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground sm:col-span-5">
            Line total: <span className="font-semibold text-foreground">{formatCurrency(lineTotal(item))}</span>
          </p>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...items, { ...EMPTY_ITEM }])}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add another item
          </Button>
          {tender ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePreFill}
              className="text-xs text-navy hover:bg-navy-soft"
            >
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Pre-fill from tender scope
            </Button>
          ) : null}
        </div>
        <p className="text-sm font-semibold text-navy">Quoted total: {formatCurrency(total)}</p>
      </div>
    </div>
  );
}
