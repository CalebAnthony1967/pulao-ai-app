import React from "react";
import PortalNav from "./PortalNav";
import PulaoAssistantDrawer from "@/components/common/PulaoAssistantDrawer";

export default function PortalShell({ eyebrow, title, description, actions, children }) {
  return (
    <div className="min-h-screen bg-background">
      <PortalNav />
      <div className="border-b border-border bg-navy-soft">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-compliance">{eyebrow}</p>
              ) : null}
              <h1 className="mt-1 font-display text-3xl leading-tight text-navy sm:text-4xl">{title}</h1>
              {description ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </div>
      </div>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <PulaoAssistantDrawer />
    </div>
  );
}