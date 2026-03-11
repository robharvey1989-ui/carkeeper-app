// src/pages/Settings.tsx
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export default function Settings() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<string>("system");
  const envOcrEndpoint = (import.meta as any)?.env?.VITE_OCR_ENDPOINT || '';
  const envOcrKey = (import.meta as any)?.env?.VITE_OCR_KEY || '';
  const [ocrEndpoint, setOcrEndpoint] = useState<string>(() => localStorage.getItem('mcv.ocr.endpoint') || envOcrEndpoint || '');
  const [ocrKey, setOcrKey] = useState<string>(() => localStorage.getItem('mcv.ocr.key') || envOcrKey || '');
  const [cutoutEndpoint, setCutoutEndpoint] = useState<string>(() => localStorage.getItem('mcv.cutout.endpoint') || '');
  const [cutoutKey, setCutoutKey] = useState<string>(() => localStorage.getItem('mcv.cutout.key') || '');

  async function signOut() {
    await supabase.auth.signOut();
    // router guard will redirect to /auth
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-10 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Preferences</p>
        <h1 className="text-2xl md:text-3xl font-semibold mt-2">Settings</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Manage account, appearance, and integrations from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 border-white/10 bg-white/[0.03] backdrop-blur-md">
          <h2 className="font-medium mb-2">Account</h2>
          <div className="text-sm text-muted-foreground">Signed in as</div>
          <div className="mt-1">{user?.email ?? user?.id}</div>
          <Button variant="destructive" className="mt-4" onClick={signOut}>
            Sign out
          </Button>
        </Card>

        <Card className="p-5 border-white/10 bg-white/[0.03] backdrop-blur-md">
          <h2 className="font-medium mb-2">Appearance</h2>
          <Label className="text-sm mb-1 block">Theme</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground mt-2">
            (Wire this to your theme provider when ready.)
          </div>
        </Card>

        <Card className="p-5 border-white/10 bg-white/[0.03] backdrop-blur-md md:col-span-2">
          <h2 className="font-medium mb-2">Integrations</h2>
          <div className="text-sm font-medium mb-1">OCR Provider</div>
          <div className="grid gap-2 text-sm">
            <label className="opacity-80">Endpoint (POST file → JSON {`{ text }`})</label>
            <input className="rounded-md border px-3 py-2 bg-background" placeholder="https://api.example.com/ocr" value={ocrEndpoint} onChange={(e)=> setOcrEndpoint(e.target.value)} />
            <label className="opacity-80">API Key (Bearer or provider-specific)</label>
            <input className="rounded-md border px-3 py-2 bg-background" placeholder="sk-..." value={ocrKey} onChange={(e)=> setOcrKey(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { localStorage.setItem('mcv.ocr.endpoint', ocrEndpoint); localStorage.setItem('mcv.ocr.key', ocrKey); }}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { localStorage.removeItem('mcv.ocr.endpoint'); localStorage.removeItem('mcv.ocr.key'); setOcrEndpoint(''); setOcrKey(''); }}>Clear</Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Env defaults ({envOcrEndpoint || 'none'}) auto-fill; Save overrides persist in this browser. Used before on-device OCR.
            </div>
          </div>

          <div className="mt-6 text-sm font-medium mb-1">Background Removal (Cutout)</div>
          <div className="grid gap-2 text-sm">
            <label className="opacity-80">Endpoint (POST form-data: image=file → returns image/png)</label>
            <input className="rounded-md border px-3 py-2 bg-background" placeholder="https://api.example.com/remove-background" value={cutoutEndpoint} onChange={(e)=> setCutoutEndpoint(e.target.value)} />
            <label className="opacity-80">API Key (optional)</label>
            <input className="rounded-md border px-3 py-2 bg-background" placeholder="Bearer token" value={cutoutKey} onChange={(e)=> setCutoutKey(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { localStorage.setItem('mcv.cutout.endpoint', cutoutEndpoint); localStorage.setItem('mcv.cutout.key', cutoutKey); }}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => { localStorage.removeItem('mcv.cutout.endpoint'); localStorage.removeItem('mcv.cutout.key'); setCutoutEndpoint(''); setCutoutKey(''); }}>Clear</Button>
            </div>
            <div className="text-xs text-muted-foreground">When enabled, uploading images will try to create a transparent cut‑out (PNG) and use it as the cover.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
