import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    if ((user.email || "").toLowerCase() === "lhy38871@163.com") {
      setRole("admin");
      return;
    }
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.role) {
          setRole(data.role);
        } else {
          const ls = localStorage.getItem("aiindex_role");
          if (ls) setRole(ls);
          else if ((user.email || "").toLowerCase().includes("admin")) setRole("admin");
          else setRole("user");
        }
      });
  }, [user]);
  return { role };
}
