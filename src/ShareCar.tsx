import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageGalleryView from "@/components/ImageGalleryView";

type Id = string;

export default function ShareCar() {
  const { id } = useParams<{ id: Id }>();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [car, setCar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState<string>("");
  const [hasPrompted, setHasPrompted] = useState(false);

  const expiresAt = useMemo(() => Number(params.get("e") || 0), [params]);
  const token = params.get("t") || "";

  useEffect(() => {
    // Basic link validation (client-side convenience only)
    if (!token) { setError("Invalid share link."); return; }
    if (expiresAt && Date.now() > expiresAt) { setError("This link has expired."); return; }
  }, [expiresAt, token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id || error) return;
      setLoading(true);
      let pw = password;
      if (!hasPrompted) {
        pw = prompt("Enter password to view handover pack (leave blank if none):") || "";
        setPassword(pw);
        setHasPrompted(true);
      }
      try {
        const res = await fetch("/api/share-car", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, carId: id, password: pw }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Unable to load shared car");
        if (!cancelled) { setCar(json.car || null); setLoading(false); }
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || "Unable to load shared car"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [id, error, token, password, hasPrompted]);

  const title = useMemo(() => {
    if (!car) return "";
    const parts = [car.make, car.model, car.year].filter(Boolean).join(" ");
    return parts || "Car";
  }, [car]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 space-y-4">
        <Card>
          <CardHeader><CardTitle>Share Link</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-red-400">{error}</div>
            <div className="text-xs text-muted-foreground mt-2">If you received this link from someone, ask them to create a new one.</div>
          </CardContent>
        </Card>
        <div className="text-xs opacity-70"><Link to="/">Back to home</Link></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 space-y-4">
      <div className="text-xs text-muted-foreground">Shared Handover</div>
      <h1 className="text-xl font-semibold">{title || (loading ? "Loading..." : "Car")}</h1>
      <Card>
        <CardContent className="p-0">
          {car?.images?.length ? (
            <ImageGalleryView car={car} />
          ) : (
            <div className="aspect-[16/9] grid place-items-center text-sm text-muted-foreground">No images</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="opacity-70">Make</div><div>{car?.make || '—'}</div></div>
          <div><div className="opacity-70">Model</div><div>{car?.model || '—'}</div></div>
          <div><div className="opacity-70">Year</div><div>{car?.year || '—'}</div></div>
          <div><div className="opacity-70">Registration</div><div>{car?.registration || car?.reg || '—'}</div></div>
        </CardContent>
      </Card>
      <div className="text-xs opacity-70">© {new Date().getFullYear()} CarKeeper</div>
    </div>
  );
}

