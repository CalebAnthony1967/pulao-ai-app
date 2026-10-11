import React from "react";
import PortalShell from "@/components/layout/PortalShell";
import RoleGate from "@/components/common/RoleGate";
import VaultTable from "@/components/vault/VaultTable";

export default function AuditVault() {
  return (
    <PortalShell
      eyebrow="Super admin vault"
      title="Immutable audit vault"
      description="Every tool invocation, audit run, committee decision and override — chained together with SHA-256 hashes and masked for personal data. Nothing here can be edited or deleted."
    >
      <RoleGate roles={["admin", "superadmin"]}>
        <VaultTable />
      </RoleGate>
    </PortalShell>
  );
}