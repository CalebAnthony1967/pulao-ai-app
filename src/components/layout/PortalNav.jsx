import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Scale, Shield } from "lucide-react";
import { useSession } from "@/lib/session";
import { roleLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import AccessRequestModal from "@/components/common/AccessRequestModal";

export const PORTALS = [
  { path: "/supplier", label: "Supplier desk", roles: ["supplier"] },
  { path: "/committee", label: "Evaluation room", roles: ["committee", "admin", "superadmin"] },
  { path: "/research", label: "Policy & analytics", roles: ["researcher", "admin", "superadmin"] },
  { path: "/admin", label: "System control", roles: ["admin", "superadmin"] },
  { path: "/vault", label: "Audit vault", roles: ["admin", "superadmin"] },
];

export default function PortalNav() {
  const { profile, role, signOut } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const visible = PORTALS.filter((portal) => portal.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-compliance">
            <Scale className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-lg leading-none">Pulao-AI</span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-1 lg:flex">
          {visible.map((portal) => (
            <Link
              key={portal.path}
              to={portal.path}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                location.pathname.startsWith(portal.path)
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {portal.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {role === "supplier" && (
            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-md border border-compliance/40 bg-compliance/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-compliance/30"
            >
              <Shield className="h-3.5 w-3.5" />
              Request Role Access
            </button>
          )}

          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight">{profile?.full_name || "Signed in"}</p>
            <p className="text-[11px] leading-tight text-white/60">{roleLabel(role)}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 lg:hidden">
        {visible.map((portal) => (
          <Link
            key={portal.path}
            to={portal.path}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition-colors",
              location.pathname.startsWith(portal.path)
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10",
            )}
          >
            {portal.label}
          </Link>
        ))}
        {role === "supplier" && (
          <button
            type="button"
            onClick={() => setRequestModalOpen(true)}
            className="whitespace-nowrap rounded-md bg-compliance/20 px-3 py-1.5 text-xs text-emerald-300"
          >
            Request Access
          </button>
        )}
      </nav>

      <AccessRequestModal open={requestModalOpen} onOpenChange={setRequestModalOpen} />
    </header>
  );
}