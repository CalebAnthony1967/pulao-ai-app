import React, { useEffect, useState } from "react";
import { Loader2, UserCog } from "lucide-react";
import { listTeamMembers, updateMemberRole } from "@/lib/data";
import { recordAudit } from "@/lib/audit";
import { useSession } from "@/lib/session";
import { ROLE_LABELS, formatDate } from "@/lib/format";
import StatusBadge from "@/components/common/StatusBadge";

export default function TeamRoles() {
  const { role } = useSession();
  const [members, setMembers] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => listTeamMembers().then(setMembers).catch(() => setMembers([]));

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (member, nextRole) => {
    setBusyId(member.id);
    try {
      await updateMemberRole(member.id, nextRole);
      await recordAudit({
        action: "Account role changed",
        input: { member: member.full_name, from: member.role, to: nextRole },
        output: { status: "updated" },
        mask: false,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const canEdit = role === "superadmin";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <UserCog className="h-4 w-4 text-navy" />
        <div>
          <h3 className="font-semibold text-foreground">Accounts and roles</h3>
          <p className="text-sm text-muted-foreground">
            Which workspace each signed-in person can open.
          </p>
        </div>
      </div>

      {members === null ? (
        <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading accounts
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{member.full_name || member.email}</p>
                <p className="text-xs text-muted-foreground">
                  {member.organization || "No organisation"} · joined {formatDate(member.created_at)}
                </p>
              </div>

              {canEdit ? (
                <select
                  value={member.role}
                  disabled={busyId === member.id}
                  onChange={(event) => changeRole(member, event.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Object.keys(ROLE_LABELS).map((key) => (
                    <option key={key} value={key}>
                      {ROLE_LABELS[key]}
                    </option>
                  ))}
                </select>
              ) : (
                <StatusBadge tone="neutral">{ROLE_LABELS[member.role] || member.role}</StatusBadge>
              )}
            </li>
          ))}
          {members.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">No accounts have been created yet.</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}