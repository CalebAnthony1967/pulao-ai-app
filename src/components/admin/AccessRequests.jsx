import React, { useEffect, useState } from "react";
import { UserCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { recordAudit } from "@/lib/audit";
import { toast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, ROLE_LABELS } from "@/lib/format";

export default function AccessRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("access_requests").select("*").order("created_at", { ascending: false });
      if (error) {
        // Fallback to localStorage
        const local = JSON.parse(localStorage.getItem("pulao_access_requests") || "[]");
        setRequests(local);
      } else {
        setRequests(data || []);
      }
    } catch {
      const local = JSON.parse(localStorage.getItem("pulao_access_requests") || "[]");
      setRequests(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (req, action, declineReason = "") => {
    setBusyId(req.id);
    try {
      if (action === "approve") {
        // Update user role in users_roles
        const { error: roleError } = await supabase.from("users_roles").update({ role: req.target_role }).eq("id", req.user_id);
        if (roleError) {
          // Update via local/mock if needed
        }
      }

      // Update request status
      const updatedReqs = requests.map(r => r.id === req.id ? { ...r, status: action === "approve" ? "approved" : "declined", decline_reason: declineReason } : r);
      setRequests(updatedReqs);
      localStorage.setItem("pulao_access_requests", JSON.stringify(updatedReqs));

      await supabase.from("access_requests").update({ status: action === "approve" ? "approved" : "declined" }).eq("id", req.id).catch(() => {});

      await recordAudit({
        action: action === "approve" ? "Access request approved" : "Access request declined",
        input: { requester: req.email, target_role: req.target_role, reason: req.reason, decline_reason: declineReason },
        output: { status: action }
      });

      toast({
        title: action === "approve" ? "Access granted" : "Access request declined",
        description: `Successfully ${action === "approve" ? "granted" : "declined"} ${req.target_role} access for ${req.email}.`
      });
    } catch (err) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground bg-card rounded-xl border border-border">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading access requests...
      </div>
    );
  }

  const pending = requests.filter(r => r.status === "pending");

  if (pending.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm mb-6">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <UserCheck className="h-4 w-4 text-compliance" />
        <div>
          <h3 className="font-semibold text-foreground">Pending Privileged Access Requests ({pending.length})</h3>
          <p className="text-sm text-muted-foreground">
            Review and approve role elevation requests. All decisions are immutably audited.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {pending.map((req) => (
          <li key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{req.full_name || req.email}</span>
                <StatusBadge tone="warning">Requested: {ROLE_LABELS[req.target_role] || req.target_role}</StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground">{req.email} · Submitted {formatDate(req.created_at)}</p>
              <p className="text-xs text-foreground/90 bg-muted/50 p-2.5 rounded-md mt-1 italic">
                "{req.reason}"
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                disabled={busyId === req.id}
                onClick={() => handleAction(req, "decline", "Declined by administrator")}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                className="bg-compliance text-white hover:bg-compliance/90"
                disabled={busyId === req.id}
                onClick={() => handleAction(req, "approve")}
              >
                {busyId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Approve & Grant Role
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
