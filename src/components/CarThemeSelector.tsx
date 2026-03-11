import React from 'react';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, RotateCcw } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Car } from '@/hooks/useCars';
import { Control } from 'react-hook-form';

interface CarThemeSelectorProps {
  car: Car;
  control: Control<any>;
  fieldName: string;
}

const CarThemeSelector = ({ car, control, fieldName }: CarThemeSelectorProps) => {
  const { globalTheme, themes, currentCarTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-automotive-blue" />
        <h3 className="font-semibold">Car Theme Override</h3>
      </div>
      
      <FormField
        control={control}
        name={fieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Theme (Optional)</FormLabel>
            <div className="space-y-3">
              <Select onValueChange={field.onChange} value={field.value || "default"}>
                <SelectTrigger>
                  <SelectValue placeholder={`Use app default (${themes.find(t => t.value === globalTheme)?.label})`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" />
                      Use app default ({themes.find(t => t.value === globalTheme)?.label})
                    </div>
                  </SelectItem>
                  {themes.map((themeOption) => (
                    <SelectItem key={themeOption.value} value={themeOption.value}>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full border border-background shadow-sm"
                          style={{ backgroundColor: themeOption.primaryColor }}
                        />
                        <div className="flex flex-col">
                          <span>{themeOption.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {themeOption.description}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <p className="text-xs text-muted-foreground">
                Override the app theme for this specific car. Leave empty to use the global app theme.
                {currentCarTheme && (
                  <span className="block mt-1 text-primary font-medium">
                    Currently using: {themes.find(t => t.value === currentCarTheme)?.label}
                  </span>
                )}
              </p>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default CarThemeSelector;