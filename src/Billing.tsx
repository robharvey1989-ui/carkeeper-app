import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BillingCycle = "monthly" | "annual";

type PricingPlan = {
  id: string;
  name: string;
  subtitle: string;
  monthly: number;
  annualMonthlyEquivalent: number;
  carLimitLabel: string;
  cta: string;
  featured?: boolean;
  notes?: string;
  features: string[];
};

const pricingPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    subtitle: "For trying CarKeeper",
    monthly: 0,
    annualMonthlyEquivalent: 0,
    carLimitLabel: "1 car",
    cta: "Current baseline",
    notes: "Ideal for evaluating the product.",
    features: [
      "Garage overview",
      "Basic reminders",
      "Core documents and images",
      "Basic owner report export",
    ],
  },
  {
    id: "five",
    name: "Owner",
    subtitle: "For most private owners",
    monthly: 4.99,
    annualMonthlyEquivalent: 4.16,
    carLimitLabel: "Up to 5 cars",
    cta: "Choose Owner",
    featured: true,
    notes: "Most popular for households.",
    features: [
      "Everything in Free",
      "AI history report generation",
      "Sale pack export",
      "Priority document processing",
    ],
  },
  {
    id: "unlimited",
    name: "Enthusiast",
    subtitle: "For collections and advanced users",
    monthly: 9.99,
    annualMonthlyEquivalent: 8.33,
    carLimitLabel: "Unlimited cars",
    cta: "Choose Enthusiast",
    notes: "Built for higher volume use.",
    features: [
      "Everything in Owner",
      "Higher monthly AI usage limits",
      "Shared access workflows",
      "Priority support queue",
    ],
  },
];

function formatPrice(value: number, cycle: BillingCycle) {
  if (value <= 0) return "Free";
  return cycle === "monthly" ? `GBP ${value.toFixed(2)}/mo` : `GBP ${(value * 12).toFixed(0)}/yr`;
}

export default function Billing() {
  const { plan, loading } = useSubscription();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const currentPlanName = useMemo(() => (plan?.name || "Free").toLowerCase(), [plan?.name]);

  if (loading) return <div className="p-6">Loading pricing preview...</div>;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(219,167,93,0.20),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(50,80,120,0.35),transparent_50%),linear-gradient(180deg,rgba(10,14,20,0.92),rgba(10,14,20,0.74))] p-6 md:p-8">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200/90">Billing Preview</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">Billing Example</h1>
          <p className="text-sm text-white/75 md:text-base">This is for demonstration purposes only.</p>
          <p className="text-sm text-white/70">
            Current detected plan: <span className="font-medium text-white">{plan?.name ?? "Free"}</span>
          </p>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Choose your billing cycle</h2>
          <p className="text-sm text-muted-foreground">Annual pricing shown with approximately 2 months free.</p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm transition ${
              cycle === "monthly" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setCycle("monthly")}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm transition ${
              cycle === "annual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setCycle("annual")}
          >
            Annual
          </button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {pricingPlans.map((item) => {
          const price = cycle === "monthly" ? item.monthly : item.annualMonthlyEquivalent;
          const isCurrent = item.name.toLowerCase() === currentPlanName;
          return (
            <Card
              key={item.id}
              className={`rounded-2xl border ${
                item.featured
                  ? "border-amber-300/40 bg-[linear-gradient(180deg,rgba(252,244,228,0.24),rgba(255,255,255,0.02))]"
                  : ""
              } ${isCurrent ? "ring-2 ring-[var(--brand)]" : ""}`}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-xl">{item.name}</CardTitle>
                  {item.featured ? (
                    <span className="rounded-full bg-amber-300/20 px-2 py-1 text-xs font-medium text-amber-200">
                      Most Popular
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                <div className="space-y-1">
                  <p className="text-3xl font-semibold tracking-tight">{formatPrice(price, cycle)}</p>
                  <p className="text-xs text-muted-foreground">{item.carLimitLabel}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={item.featured ? "default" : "outline"}
                  onClick={() => alert("Billing actions are preview-only right now. We can wire checkout next.")}
                >
                  {isCurrent ? "Current plan" : item.cta}
                </Button>
                <p className="text-xs text-muted-foreground">{item.notes || "Pricing and entitlements are illustrative."}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="rounded-2xl border bg-card p-4 md:p-6">
        <h3 className="text-lg font-semibold">Feature Snapshot</h3>
        <p className="mt-1 text-sm text-muted-foreground">Quick comparison for demo conversations.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Capability</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Free</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Owner</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Enthusiast</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-2">Car limit</td>
                <td className="px-3 py-2">1</td>
                <td className="px-3 py-2">5</td>
                <td className="px-3 py-2">Unlimited</td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-2">AI history reports / month</td>
                <td className="px-3 py-2">2</td>
                <td className="px-3 py-2">20</td>
                <td className="px-3 py-2">100</td>
              </tr>
              <tr className="border-b">
                <td className="px-3 py-2">Storage</td>
                <td className="px-3 py-2">1 GB</td>
                <td className="px-3 py-2">10 GB</td>
                <td className="px-3 py-2">50 GB</td>
              </tr>
              <tr>
                <td className="px-3 py-2">Sale pack export</td>
                <td className="px-3 py-2">-</td>
                <td className="px-3 py-2">Included</td>
                <td className="px-3 py-2">Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
