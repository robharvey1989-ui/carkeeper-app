import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function UserPreferencesDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [theme, setTheme] = useState("system");
  const [units, setUnits] = useState("metric");
  const [defaultTab, setDefaultTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setTheme((data as any).theme ?? "system");
        setUnits((data as any).units ?? "metric");
        setDefaultTab((data as any).default_tab ?? "overview");
      }
      setLoading(false);
    })();
  }, [open, user?.id]);

  async function onSave() {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: user.id,
      theme,
      units,
      default_tab: defaultTab,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v)=>{ if (!saving) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>User preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Units</Label>
            <Select value={units} onValueChange={setUnits}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Metric</SelectItem>
                <SelectItem value="imperial">Imperial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Default tab</Label>
            <Select value={defaultTab} onValueChange={setDefaultTab}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="mileage">Mileage</SelectItem>
                <SelectItem value="media">Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={onSave} disabled={saving || loading}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

