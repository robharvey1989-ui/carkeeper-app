// src/pages/AuthPage.tsx
import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMsg("Check your inbox for the login link.");
    } catch (e: any) {
      setErr(e.message || "Failed to send link");
    } finally {
      setSending(false);
    }
  }

  async function signInWithGithub() {
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github" });
    if (error) setErr(error.message);
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-xl p-6 bg-transparent">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>

        <form onSubmit={handleMagicLink} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button className="w-full btn-primary" type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send magic link"}
          </Button>
        </form>

        <div className="my-4 text-center text-sm text-muted-foreground">or</div>

        <Button variant="secondary" className="w-full" onClick={signInWithGithub}>
          Continue
        </Button>

        {msg && <p className="text-green-600 text-sm mt-4">{msg}</p>}
        {err && <p className="text-red-600 text-sm mt-4">{err}</p>}

        <div className="text-xs text-muted-foreground mt-6 text-center">
          Already signed in?{" "}
          <button className="underline" onClick={() => navigate("/")}>
            Go to app
          </button>
        </div>
      </div>
    </div>
  );
}

