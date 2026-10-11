import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

export const EMPTY_ITEM = { description: "", quantity: 1, unit_of_measure: "per unit", unit_price: 0 };

export function lineTotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
}

export default function LineItemsEditor({ items, onChange }) {
  const update = (index, patch) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);

  return (
    <div className="space-y-3">
      <div className="hidden gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_5rem_7rem_8rem_2rem]">
        <span>Item</span>
        <span>Qty</span>
        <span>Unit</span>
        <span>Unit price (KES)</span>
        <span />
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_5rem_7rem_8rem_2rem] sm:items-center sm:border-0 sm:bg-transparent sm:p-1"
        >
          <Input
            value={item.description}
            onChange={(event) => update(index, { description: event.target.value })}
            placeholder="Describe the item or work"
          />
          <Input
            type="number"
            min="0"
            value={item.quantity}
            onChange={(event) => update(index, { quantity: Number(event.target.value) })}
          />
          <Input
            value={item.unit_of_measure}
            onChange={(event) => update(index, { unit_of_measure: event.target.value })}
            placeholder="per unit"
          />
          <Input
            type="number"
            min="0"
            value={item.unit_price}
            onChange={(event) => update(index, { unit_price: Number(event.target.value) })}
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
            Line total: {formatCurrency(lineTotal(item))}
          </p>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, { ...EMPTY_ITEM }])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add another item
        </Button>
        <p className="text-sm font-semibold text-navy">Quoted total: {formatCurrency(total)}</p>
      </div>
    </div>
  );
}