import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AddReminderDialogProps {
  carId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const reminderTypes = [
  'MOT',
  'Insurance',
  'Tax',
  'Custom'
];

const AddReminderDialog = ({ carId, open, onOpenChange, onSuccess }: AddReminderDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_type: '',
    due_date: new Date(),
    reminder_days_before: 30,
    is_recurring: false,
    recurring_interval_months: 6
  });

  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.reminder_type || formData.reminder_type.trim() === '') {
      toast({
        title: 'Reminder type required',
        description: 'Please select a type or enter a custom type.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reminders')
        .insert([{
          car_id: carId,
          user_id: user.id,
          title: formData.title,
          description: formData.description || null,
          reminder_type: formData.reminder_type,
          due_date: formData.due_date.toISOString().split('T')[0],
          reminder_days_before: formData.reminder_days_before,
          is_recurring: formData.is_recurring,
          recurring_interval_months: formData.is_recurring ? formData.recurring_interval_months : null
        }]);

      if (error) throw error;

      toast({
        title: 'Reminder added',
        description: `You'll be notified ${formData.reminder_days_before} days before it's due.`,
      });

      onSuccess();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        reminder_type: '',
        due_date: new Date(),
        reminder_days_before: 30,
        is_recurring: false,
        recurring_interval_months: 6
      });
    } catch (error: any) {
      toast({
        title: 'Error adding reminder',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    setFormData(prev => ({
      ...prev,
      reminder_type: type === 'Custom' ? '' : type,
      title: type === 'Custom' ? '' : type
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Reminder</DialogTitle>
          <DialogDescription className="sr-only">Create a reminder for this car</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder_type">Reminder Type</Label>
            <Select onValueChange={handleTypeChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Select reminder type" />
              </SelectTrigger>
              <SelectContent>
                {reminderTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType === 'Custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom_type">Custom Type</Label>
              <Input
                id="custom_type"
                value={formData.reminder_type}
                onChange={(e) => setFormData(prev => ({ ...prev, reminder_type: e.target.value }))}
                placeholder="Enter custom reminder type"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter reminder title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add any additional details..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.due_date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, due_date: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_days">Remind me (days before)</Label>
            <Select 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reminder_days_before: parseInt(value) }))}
              defaultValue="30"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
                <SelectItem value="60">2 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="recurring">Recurring Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create new reminders
                </p>
              </div>
              <Switch
                id="recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
              />
            </div>

            {formData.is_recurring && (
              <div className="space-y-2">
                <Label htmlFor="interval">Repeat every</Label>
                <Select 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, recurring_interval_months: parseInt(value) }))}
                  defaultValue="6"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">1 year</SelectItem>
                    <SelectItem value="24">2 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Reminder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddReminderDialog;
