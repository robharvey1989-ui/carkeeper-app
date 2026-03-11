import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, MapPin, Palette } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useCarAnalytics';
import { useTheme } from '@/hooks/useTheme';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  country: z.string(),
  preferred_currency: z.string(),
  distance_unit: z.string(),
  fuel_unit: z.string(),
  date_format: z.string(),
  email_notifications: z.boolean(),
  reminder_notifications: z.boolean(),
  theme: z.string(),
});

interface InitialSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const InitialSetupDialog = ({ open, onOpenChange, onComplete }: InitialSetupDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { updatePreferences } = useUserPreferences();
  const { setGlobalTheme, themes } = useTheme();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: 'UK',
      preferred_currency: 'GBP',
      distance_unit: 'miles',
      fuel_unit: 'liters',
      date_format: 'dd/MM/yyyy',
      email_notifications: true,
      reminder_notifications: true,
      theme: 'automotive',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      // Update user preferences
      await updatePreferences({
        country: values.country,
        preferred_currency: values.preferred_currency,
        distance_unit: values.distance_unit,
        fuel_unit: values.fuel_unit,
        date_format: values.date_format,
        timezone: 'UTC', // Default timezone
        email_notifications: values.email_notifications,
        reminder_notifications: values.reminder_notifications,
        setup_completed: true,
      });

      // Set theme
      setGlobalTheme(values.theme as any);

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving initial setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Welcome! Let's Set Up Your Account
          </DialogTitle>
          <DialogDescription>
            Help us customise your experience by setting your location and preferences
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Location & Regional Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Location & Regional Settings</h3>
              </div>
              
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country/Region</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                       <SelectContent>
                         <SelectItem value="UK">United Kingdom</SelectItem>
                         <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="EU">European Union</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="ES">Spain</SelectItem>
                        <SelectItem value="IT">Italy</SelectItem>
                        <SelectItem value="NL">Netherlands</SelectItem>
                        <SelectItem value="SE">Sweden</SelectItem>
                        <SelectItem value="NO">Norway</SelectItem>
                        <SelectItem value="DK">Denmark</SelectItem>
                        <SelectItem value="FI">Finland</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="preferred_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                         <SelectContent>
                           <SelectItem value="GBP">GBP (�)</SelectItem>
                           <SelectItem value="USD">USD ($)</SelectItem>
                           <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="CAD">CAD ($)</SelectItem>
                          <SelectItem value="AUD">AUD ($)</SelectItem>
                          <SelectItem value="JPY">JPY (¥)</SelectItem>
                          <SelectItem value="CHF">CHF (Fr)</SelectItem>
                          <SelectItem value="CNY">CNY (¥)</SelectItem>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distance_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distance Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="miles">Miles</SelectItem>
                          <SelectItem value="kilometers">Kilometers</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Theme Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">App Theme</h3>
              </div>
              
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose your preferred theme</FormLabel>
                    <div className="grid grid-cols-2 gap-3">
                      {themes.map((themeOption) => (
                        <div
                          key={themeOption.value}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-105 ${
                            field.value === themeOption.value
                              ? 'border-primary bg-primary/5 shadow-lg'
                              : 'border-muted hover:border-primary/50'
                          }`}
                          onClick={() => field.onChange(themeOption.value)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                              style={{ backgroundColor: themeOption.primaryColor }}
                            />
                            <span className="font-medium text-sm">{themeOption.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{themeOption.description}</p>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Notifications */}
            <div className="space-y-4">
              <h3 className="font-semibold">Notifications</h3>
              
              <FormField
                control={form.control}
                name="email_notifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Email Notifications</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Receive maintenance reminders and updates
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reminder_notifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Reminder Notifications</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Get notified about upcoming maintenance
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Skip for now
              </Button>
              <Button type="submit" disabled={isLoading} variant="default">
                {isLoading ? 'Saving...' : 'Complete Setup'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InitialSetupDialog;

