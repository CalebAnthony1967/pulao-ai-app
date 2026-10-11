import React from "react";
import { Link } from "react-router-dom";
import { Lock, ShieldAlert } from "lucide-react";
import { useSession } from "@/lib/session";
import { roleLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import LoadingBlock from "./LoadingBlock";

export default function RoleGate({ roles, children }) {
  const { loading, isAuthenticated, role } = useSession();

  if (loading) return <LoadingBlock label="Checking your access" />;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <Lock className="mx-auto h-8 w-8 text-navy" />
        <h2 className="mt-3 text-lg font-semibold">This workspace is restricted</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sign in with your government account to open this portal.
        </p>
        <Button asChild className="mt-5">
          <Link to="/auth">Sign in or register</Link>
        </Button>
      </div>
    );
  }

  if (roles && roles.length && !roles.includes(role)) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-caution/30 bg-caution-soft p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-caution" />
        <h2 className="mt-3 text-lg font-semibold text-caution">Access not granted</h2>
        <p className="mt-2 text-sm leading-relaxed text-caution/90">
          You are signed in as a {roleLabel(role)}. This workspace is reserved for {roles.map(roleLabel).join(", ")}.
        </p>
        <Button asChild variant="outline" className="mt-5 border-caution/40 bg-transparent text-caution">
          <Link to="/">Return to the public register</Link>
        </Button>
      </div>
    );
  }

  return children;
}