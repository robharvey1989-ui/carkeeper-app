import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Crown, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SubState {
  loading: boolean;
  subscribed: boolean;
  subscription_tier: "Five" | "Unlimited" | null;
  subscription_end: string | null;
}

const SubscriptionPanel = () => {
  const [state, setState] = useState<SubState>({
    loading: true,
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
  });

  const fetchStatus = async () => {
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await supabase.functions.invoke("check-subscription");
    if (error) {
      toast.error(error.message || "Failed to check subscription");
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState({ loading: false, ...(data as any) });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const startCheckout = async (tier: "five" | "unlimited") => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { tier },
    });
    if (error) {
      toast.error(error.message || "Unable to start checkout");
      return;
    }
    const url = (data as any)?.url;
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("No checkout URL returned");
    }
  };

  const openPortal = async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) {
      toast.error(error.message || "Unable to open portal");
      return;
    }
    const url = (data as any)?.url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking status...
          </div>
        ) : state.subscribed ? (
          <div className="flex items-center justify-between p-3 rounded-lg border border-border-light">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">Active subscription</p>
                <p className="text-sm text-muted-foreground">Plan: {state.subscription_tier}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="btn-secondary" onClick={fetchStatus}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button variant="default" className="btn-primary" onClick={openPortal}>
                Manage
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="border border-border-light">
              <CardHeader>
                <CardTitle className="text-base">Up to 5 cars</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold">£4.99</div>
                  <div className="text-muted-foreground text-sm">per month</div>
                </div>
                <Button variant="default" className="btn-primary" onClick={() => startCheckout("five")}>Subscribe</Button>
              </CardContent>
            </Card>
            <Card className="border border-border-light">
              <CardHeader>
                <CardTitle className="text-base">Unlimited cars</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-semibold">£9.99</div>
                  <div className="text-muted-foreground text-sm">per month</div>
                </div>
                <Button variant="default" className="btn-primary" onClick={() => startCheckout("unlimited")}>Subscribe</Button>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionPanel;

