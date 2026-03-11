import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Fuel, Wrench } from 'lucide-react';
import { useTheme, themeConfig } from '@/hooks/useTheme';

interface ThemePreviewProps {
  themeName: string;
  isActive?: boolean;
  onClick?: () => void;
}

const ThemePreview = ({ themeName, isActive, onClick }: ThemePreviewProps) => {
  const themeData = themeConfig[themeName as keyof typeof themeConfig];
  
  if (!themeData) return null;

  const previewStyle = {
    '--preview-primary': themeData.colors.primary,
    '--preview-primary-glow': themeData.colors['primary-glow'],
    '--preview-accent': themeData.colors.accent,
  } as React.CSSProperties;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isActive ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onClick}
      style={previewStyle}
    >
      <CardContent className="p-4 space-y-3">
        {/* Theme Name */}
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">{themeData.label}</h4>
          <div 
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: themeData.primaryColor }}
          />
        </div>
        
        {/* Preview Elements */}
        <div className="space-y-2">
          {/* Mock Button */}
          <div 
            className="px-3 py-1.5 rounded-md text-xs font-medium text-white text-center"
            style={{ backgroundColor: `hsl(${themeData.colors.primary})` }}
          >
            Primary Button
          </div>
          
          {/* Mock Badges */}
          <div className="flex gap-1">
            <div 
              className="px-2 py-0.5 rounded-full text-xs border"
              style={{ 
                borderColor: `hsl(${themeData.colors.primary})`,
                color: `hsl(${themeData.colors.primary})`
              }}
            >
              Badge
            </div>
            <div 
              className="px-2 py-0.5 rounded-full text-xs text-white"
              style={{ backgroundColor: `hsl(${themeData.colors.accent})` }}
            >
              Accent
            </div>
          </div>
          
          {/* Mock Icons */}
          <div className="flex gap-2 justify-center pt-1">
            <Car 
              className="w-4 h-4" 
              style={{ color: `hsl(${themeData.colors.primary})` }}
            />
            <Fuel 
              className="w-4 h-4" 
              style={{ color: `hsl(${themeData.colors.accent})` }}
            />
            <Wrench 
              className="w-4 h-4" 
              style={{ color: `hsl(${themeData.colors.primary})` }}
            />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {themeData.description}
        </p>
      </CardContent>
    </Card>
  );
};

export default ThemePreview;