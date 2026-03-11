import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const GarageThemeSelector = () => {
  const { globalTheme, setGlobalTheme, themes } = useTheme();

  return (
    <Card className="bg-gradient-card border-automotive-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-automotive-blue" />
          App Theme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {themes.map((themeOption) => (
            <div
              key={themeOption.value}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                globalTheme === themeOption.value
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-muted hover:border-primary/50'
              }`}
              onClick={() => setGlobalTheme(themeOption.value)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: themeOption.primaryColor }}
                />
                <span className="font-medium text-sm">{themeOption.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{themeOption.description}</p>
              {globalTheme === themeOption.value && (
                <div className="mt-2 text-xs font-medium text-primary">Active</div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Choose your preferred theme for the entire app. You can override this per car in individual car settings.
        </p>
      </CardContent>
    </Card>
  );
};

export default GarageThemeSelector;