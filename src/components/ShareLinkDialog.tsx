import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function ShareLinkDialog(props: { carId: string }) {
  const { carId } = props;
  const [open, setOpen] = useState(false);
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [password, setPassword] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = useMemo(() => window.location.origin, []);

  async function generate() {
    setBusy(true);
    setError(null);
    setLink("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Sign in to create a share link.");

      const res = await fetch("/api/share-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ carId, expiryDays, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to create share link");
      const url = json.url || `${base}/share/${carId}?t=${json.token}&e=${Date.parse(json.expiresAt)}`;
      setLink(url);
      try { navigator.clipboard?.writeText(url); } catch {}
    } catch (e: any) {
      setError(e?.message || "Failed to create share link");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Open state is controlled via setter methods on the returned object
  }, []);

  return (
    <Card className="bg-gradient-card border-automotive-blue/20">
      <CardHeader>
        <CardTitle>Create Share Link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs opacity-70">Expires</label>
          <select className="rounded-md border px-2 py-1 bg-background text-sm" value={expiryDays} onChange={(e)=> setExpiryDays(Number(e.target.value))}>
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <label className="text-xs opacity-70">Password</label>
          <input className="rounded-md border px-2 py-1 bg-background text-sm" placeholder="Optional" value={password} onChange={(e)=> setPassword(e.target.value)} />
          <Button onClick={generate} disabled={busy}>
            {busy ? "Working..." : "Generate & Copy"}
          </Button>
        </div>
        {error && <div className="text-xs text-red-500">{error}</div>}
        {link && (
          <div className="text-xs break-all opacity-80">{link}</div>
        )}
      </CardContent>
    </Card>
  );
}
