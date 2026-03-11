import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  carId: string;
};

export default function StartTransfer({ carId }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const createTransfer = async () => {
    setBusy(true);
    setErr(null);
    setLink(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error("You must be signed in to transfer a car.");
      }

      // Verify the car belongs to the current user before creating a transfer token.
      const { data: ownedCar, error: carError } = await supabase
        .from("cars")
        .select("id, user_id")
        .eq("id", carId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (carError || !ownedCar) {
        throw new Error("You can only transfer cars you own.");
      }

      const { data, error } = await supabase
        .from("car_transfers")
        .insert({
          car_id: carId,
          from_user: user.id,
          to_email: email.trim(),
        })
        .select("token")
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/transfer/${data.token}`;
      setLink(url);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create transfer link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="Buyer email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md bg-white/[0.06] border border-white/15 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button onClick={createTransfer} disabled={busy || !email}>
          {busy ? "Creating..." : "Generate link"}
        </Button>
      </div>
      {err && <div className="text-red-400 text-sm">{err}</div>}
      {link && (
        <div className="text-sm">
          Share this link with the buyer:{" "}
          <a className="text-blue-400 underline" href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        </div>
      )}
    </div>
  );
}

