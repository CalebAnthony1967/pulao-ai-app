import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem("pulao_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.session || { user: parsed.user };
      }
    } catch {}
    return null;
  });

  const [profile, setProfile] = useState(() => {
    try {
      const stored = localStorage.getItem("pulao_session");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.profile || null;
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(false);

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

      if (!error && data) {
        setProfile(data);
        try {
          const stored = localStorage.getItem("pulao_session");
          const parsed = stored ? JSON.parse(stored) : {};
          localStorage.setItem("pulao_session", JSON.stringify({ ...parsed, profile: data }));
        } catch {}
      } else {
        // Fallback profile if table lookup fails
        setProfile((prev) => {
          if (prev && prev.id === user.id) return prev;
          const fallbackRole = user.email?.includes("admin")
            ? user.email?.includes("super") ? "superadmin" : "admin"
            : user.email?.includes("committee")
            ? "committee"
            : user.email?.includes("research")
            ? "researcher"
            : "supplier";
          const newProfile = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            organization: user.user_metadata?.organization || "Pulao-AI User",
            role: user.user_metadata?.role || fallbackRole,
            created_at: new Date().toISOString(),
          };
          try {
            localStorage.setItem("pulao_session", JSON.stringify({ user, profile: newProfile }));
          } catch {}
          return newProfile;
        });
      }
    } catch {
      // Graceful fallback on network/schema error
      setProfile((prev) => prev || {
        id: user.id,
        email: user.email,
        full_name: user.email?.split("@")[0] || "User",
        organization: "Pulao-AI User",
        role: "supplier",
        created_at: new Date().toISOString(),
      });
    }
  }, []);

  const setAuthSession = useCallback((user, userProfile) => {
    const s = { user };
    setSession(s);
    setProfile(userProfile);
    try {
      localStorage.setItem("pulao_session", JSON.stringify({ user, profile: userProfile }));
    } catch {}
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      if (data.session) {
        setSession(data.session);
        await loadProfile(data.session.user);
      }
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      if (next?.user) {
        setSession(next);
        await loadProfile(next.user);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = async () => {
    try {
      localStorage.removeItem("pulao_session");
    } catch {}
    setSession(null);
    setProfile(null);
    await supabase.auth.signOut().catch(() => {});
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAuthenticated: Boolean(session?.user || profile),
    loading,
    signOut,
    setAuthSession,
    refreshProfile: () => loadProfile(session?.user),
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
