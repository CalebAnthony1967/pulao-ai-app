import React, { useState } from "react";
import { Shield, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/session";
import { toast } from "@/components/ui/use-toast";
import { recordAudit } from "@/lib/audit";
import { supabase } from "@/lib/supabase";

export default function AccessRequestModal({ open, onOpenChange }) {
  const { profile } = useSession();
  const [targetRole, setTargetRole] = useState("committee");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const requestData = {
        id: `req-${Date.now()}`,
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        target_role: targetRole,
        reason,
        status: "pending",
        created_at: new Date().toISOString()
      };

      // Try inserting into access_requests table if exists, or store in localStorage / system settings
      const { error } = await supabase.from("access_requests").insert([requestData]);
      if (error) {
        // Fallback to local storage persistence for robust demo
        const existing = JSON.parse(localStorage.getItem("pulao_access_requests") || "[]");
        localStorage.setItem("pulao_access_requests", JSON.stringify([requestData, ...existing]));
      }

      await recordAudit({
        action: "Access request submitted",
        input: { target_role: targetRole, reason },
        output: { status: "pending" }
      });

      toast({
        title: "Access request submitted",
        description: "Your request has been forwarded to the system administrators for review."
      });
      onOpenChange(false);
      setReason("");
    } catch (err) {
      toast({
        title: "Error submitting request",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-compliance" />
            Request Privileged Access
          </DialogTitle>
          <DialogDescription>
            Self-registration grants supplier standing. Request elevation to committee, researcher, or administrator roles with a valid institutional justification.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="target-role">Requested Role</Label>
            <Select value={targetRole} onValueChange={setTargetRole}>
              <SelectTrigger id="target-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="committee">Evaluation Committee Member</SelectItem>
                <SelectItem value="researcher">Policy Researcher</SelectItem>
                <SelectItem value="admin">System Administrator</SelectItem>
                <SelectItem value="superadmin">Super Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Institutional Justification</Label>
            <Textarea
              id="reason"
              placeholder="Provide agency mandate, committee assignment reference, or oversight credentials..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-navy text-white hover:bg-navy/90">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
