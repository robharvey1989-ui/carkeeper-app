import { useThemePrefs } from "@/hooks/useThemePrefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ThemeCustomizer() {
  const { prefs, setPrefs } = useThemePrefs();

  return (
    <Card className="max-w-lg">
      <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            Primary color
            <div className="flex items-center gap-2 mt-1">
              <Input type="color" value={prefs.primary_color}
                     onChange={(e) => setPrefs({ primary_color: e.target.value })}
                     className="h-10 w-16 p-1" />
              <Input value={prefs.primary_color}
                     onChange={(e) => setPrefs({ primary_color: e.target.value })} />
            </div>
          </label>

          <label className="text-sm">
            Font family
            <Input className="mt-1" value={prefs.font_family}
                   onChange={(e) => setPrefs({ font_family: e.target.value })} placeholder="Inter, Manrope, etc."/>
          </label>

          <label className="text-sm">
            Density
            <select className="mt-1 h-10 rounded-md border bg-background px-3"
                    value={prefs.density}
                    onChange={(e) => setPrefs({ density: e.target.value as any })}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>

          <label className="text-sm">
            Rounding
            <select className="mt-1 h-10 rounded-md border bg-background px-3"
                    value={prefs.rounding}
                    onChange={(e) => setPrefs({ rounding: e.target.value as any })}>
              <option value="md">Medium</option>
              <option value="xl">Large</option>
              <option value="2xl">Extra Large</option>
            </select>
          </label>

          <label className="text-sm">
            Card style
            <select className="mt-1 h-10 rounded-md border bg-background px-3"
                    value={prefs.card_style}
                    onChange={(e) => setPrefs({ card_style: e.target.value as any })}>
              <option value="flat">Flat</option>
              <option value="glass">Glass</option>
            </select>
          </label>
        </div>

        <Button>Done</Button>
      </CardContent>
    </Card>
  );
}
