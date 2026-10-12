import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("users_roles")
        .select("id, email, full_name, organization, role, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) {
        // Fallback profile if table is missing or user row not found
        const fallbackRole = user.email?.includes("admin") ? "admin" : user.email?.includes("committee") ? "committee" : user.email?.includes("research") ? "researcher" : "supplier";
        setProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          organization: "Pulao-AI User",
          role: fallbackRole,
          created_at: new Date().toISOString()
        });
      } else {
        setProfile(data);
      }
    } catch (err) {
      // Graceful fallback on any network/schema error
      setProfile({
        id: user.id,
        email: user.email,
        full_name: user.email?.split("@")[0] || "User",
        organization: "Pulao-AI User",
        role: "supplier",
        created_at: new Date().toISOString()
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      setSession(next);
      await loadProfile(next?.user);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAuthenticated: Boolean(session?.user),
    loading,
    signOut,
    refreshProfile: () => loadProfile(session?.user?.id),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}