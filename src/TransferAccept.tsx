import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type TransferRow = {
  id: string;
  car_id: string;
  from_user: string;
  to_email: string;
  token: string;
  status: "pending" | "accepted" | "cancelled" | "expired";
  expires_at: string;
  created_at: string;
};

export default function TransferAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<TransferRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (!token) {
        setError("Missing transfer token. Please reopen the link from your email.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setError("Please sign in to accept a transfer.");
        setLoading(false);
        return;
      }
      setUserEmail(auth.user.email || "");

      const { data, error } = await supabase
        .from("car_transfers")
        .select("*")
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("Transfer link not found.");
        setLoading(false);
        return;
      }

      const expired = new Date(data.expires_at).getTime() < Date.now();
      if (expired) {
        setError("This transfer link has expired.");
        setLoading(false);
        return;
      }

      if (data.status !== "pending") {
        setError(`This transfer is ${data.status}.`);
        setLoading(false);
        return;
      }

      if ((auth.user.email || "").toLowerCase() !== (data.to_email || "").toLowerCase()) {
        setError("This transfer is not addressed to your email.");
        setLoading(false);
        return;
      }

      setRow(data as TransferRow);
      setLoading(false);
    })();
  }, [token]);

  async function accept() {
    if (!row) return;
    setLoading(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      setError("Please sign in to accept a transfer.");
      setLoading(false);
      return;
    }

    const edge = await supabase.functions.invoke("transfer-accept", {
      body: { token: row.token },
    });
    if (edge.error) {
      const v2 = await supabase.rpc("accept_car_transfer_v2", { p_token: row.token });
      if (v2.error) {
        const legacy = await supabase.rpc("accept_car_transfer", { p_token: row.token });
        if (legacy.error) {
          const detail = [
            edge.error.message,
            v2.error.message,
            legacy.error.message,
          ]
            .filter(Boolean)
            .join(" | ");
          setError(detail || "Transfer failed");
          setLoading(false);
          return;
        }
      }
    }

    navigate(`/car/${row.car_id}`);
  }

  const ErrorState = (
    <div className="max-w-xl p-6 space-y-3">
      <div className="font-medium">Transfer can't be completed</div>
      <div className="text-sm opacity-80">{error}</div>
      <div>
        <Link to="/" className="text-sm underline underline-offset-4 opacity-90 hover:opacity-100">
          Back to Garage
        </Link>
      </div>
    </div>
  );

  if (loading) {
    return <div className="max-w-xl p-6">Checking transfer...</div>;
  }

  if (error) return ErrorState;
  if (!row) return ErrorState;

  return (
    <div className="max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold tracking-tight">Accept transfer</h1>
      <p className="text-sm opacity-80">
        This car is being transferred to <strong>{row.to_email}</strong>. You're signed in as{" "}
        <strong>{userEmail}</strong>.
      </p>
      <div className="flex gap-2">
        <Button className="btn-primary" onClick={accept} disabled={loading}>
          {loading ? "Accepting..." : "Accept"}
        </Button>
        <Link to="/" className="inline-flex items-center rounded-md px-3 py-2 text-sm underline">
          Cancel
        </Link>
      </div>
    </div>
  );
}
