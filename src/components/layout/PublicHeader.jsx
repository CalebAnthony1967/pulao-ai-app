import React from "react";
import { Link } from "react-router-dom";
import { Scale } from "lucide-react";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

function landingFor(role) {
  if (role === "committee") return "/committee";
  if (role === "researcher") return "/research";
  if (role === "superadmin") return "/vault";
  if (role === "admin") return "/admin";
  return "/supplier";
}

export default function PublicHeader() {
  const { isAuthenticated, role, profile } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-compliance">
            <Scale className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-lg leading-none">Pulao-AI</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link to="/" className="rounded-md px-3 py-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            Open tenders
          </Link>
          <a href="/#how" className="rounded-md px-3 py-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            How the audit works
          </a>
          <a href="/#portals" className="rounded-md px-3 py-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            Portals
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="hidden text-xs text-white/60 sm:block">{profile?.full_name}</span>
              <Button asChild size="sm" className="bg-compliance text-white hover:bg-compliance/90">
                <Link to={landingFor(role)}>Open my workspace</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="text-white/80 hover:bg-white/10 hover:text-white"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-compliance text-white hover:bg-compliance/90">
                <Link to="/auth?mode=register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}