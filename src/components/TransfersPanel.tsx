import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  car_id: string;
  from_user: string;
  to_email: string;
  token: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  expires_at: string;
  created_at: string;
};

export default function TransfersPanel({ carId }: { carId?: string }) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth?.user?.id;
        if (!uid) { setItems([]); return; }
        let q = supabase.from("car_transfers").select("*").eq("from_user", uid).order("created_at", { ascending: false });
        if (carId) q = q.eq("car_id", carId);
        const { data, error } = await q;
        if (error) throw error;
        if (!cancelled) setItems((data as any as Row[]) || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load transfers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [carId]);

  async function cancel(id: string) {
    try {
      const { error } = await supabase.from("car_transfers").update({ status: "cancelled" }).eq("id", id).eq("status", "pending");
      if (error) throw error;
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
    } catch (e: any) {
      alert(e?.message || "Could not cancel");
    }
  }

  const pending = items.filter((r) => r.status === "pending");

  if (loading && items.length === 0) return null;

  return (
    <Card className="mt-3">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Transfers</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {error && <div className="text-sm text-red-400 mb-2">{error}</div>}
        {pending.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending transfers.</div>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => {
              const link = `${base}/transfer/${r.token}`;
              const exp = new Date(r.expires_at);
              const left = Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400000));
              return (
                <li key={r.id} className="rounded-md border border-white/10 p-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">To: {r.to_email}</div>
                    <div className="text-xs text-muted-foreground truncate">{link}</div>
                    <div className="text-[11px] opacity-60">Expires in {left} day{left === 1 ? "" : "s"}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { try { navigator.clipboard?.writeText(link); } catch {} }}
                    >
                      Copy link
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => cancel(r.id)}>
                      Cancel
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

