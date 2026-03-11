import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Calendar,
  CalendarPlus,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown
} from 'lucide-react';
import AddReminderDialog from './AddReminderDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { buildWebCalendarUrl, buildICS } from '@/lib/calendar';
import { formatDate } from '@/lib/dateFormat';

interface Reminder {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  reminder_type: string;
  is_completed: boolean;
  reminder_days_before: number;
}

interface RemindersCardProps {
  carId: string;
  systemReminders?: Array<{
    title: string;
    description?: string | null;
    due_date: string;
    reminder_type: string;
  }>;
}

const RemindersCard = ({ carId, systemReminders = [] }: RemindersCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const fetchReminders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('car_id', carId)
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading reminders',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [carId, toast, user]);

  useEffect(() => {
    if (user && carId) {
      fetchReminders();
    }
  }, [user, carId, fetchReminders]);

  useEffect(() => {
    if (!user?.id || !carId) return;
    const channel = supabase
      .channel(`reminders-card-${carId}-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reminders', filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id && row.user_id !== user.id) return;
          setReminders((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            return [...prev, row as Reminder].sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reminders', filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id && row.user_id !== user.id) return;
          setReminders((prev) => {
            const next = prev.some((r) => r.id === row.id)
              ? prev.map((r) => (r.id === row.id ? (row as Reminder) : r))
              : [...prev, row as Reminder];
            return next.sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reminders', filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.old as any;
          if (row.user_id && row.user_id !== user.id) return;
          setReminders((prev) => prev.filter((r) => r.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, carId]);

  const markAsCompleted = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ 
          is_completed: true,
          completed_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', reminderId);

      if (error) throw error;

      setReminders(prev =>
        prev.map(r =>
          r.id === reminderId
            ? { ...r, is_completed: true }
            : r
        )
      );
      toast({
        title: 'Reminder completed',
        description: 'Great job staying on top of your car maintenance!',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating reminder',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getUrgencyBadge = (dueDate: string, isCompleted: boolean) => {
    if (isCompleted) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 opacity-80">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </Badge>
      );
    }
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge variant="outline" className="border-automotive-orange text-automotive-orange flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Due Soon
      </Badge>;
    } else {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        Upcoming
      </Badge>;
    }
  };

  const formatDueDate = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue === 0) return 'Today';
    if (daysUntilDue === 1) return 'Tomorrow';
    if (daysUntilDue === -1) return 'Yesterday';
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days ago`;
    if (daysUntilDue <= 7) return `In ${daysUntilDue} days`;
    
    return formatDate(due);
  };

  const mergedReminders = (() => {
    const out = [...reminders];
    for (const s of systemReminders) {
      const exists = out.some((r) => {
        const a = String(r.title || "").trim().toLowerCase();
        const b = String(s.title || "").trim().toLowerCase();
        return a === b && String(r.due_date).slice(0, 10) === String(s.due_date).slice(0, 10);
      });
      if (!exists) {
        out.push({
          id: `system-${s.reminder_type}-${String(s.due_date).slice(0, 10)}`,
          title: s.title,
          description: s.description || undefined,
          due_date: String(s.due_date).slice(0, 10),
          reminder_type: s.reminder_type,
          is_completed: false,
          reminder_days_before: 14,
        });
      }
    }
    return out.sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  })();

  if (loading) {
    return (
      <Card className="bg-gradient-card border-automotive-blue/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-gradient-card border-automotive-blue/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-automotive-blue" />
                  Reminders
                  {mergedReminders.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {mergedReminders.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddDialogOpen(true);
                    }}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-200 ease-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <CardContent className="pt-0 space-y-4">
              {mergedReminders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No upcoming reminders</p>
                  <p className="text-xs mt-1">Add reminders to stay on top of maintenance</p>
                </div>
              ) : (
                mergedReminders.map((reminder, index) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const due = new Date(reminder.due_date);
                  const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const needsAttentionSoon = !reminder.is_completed && daysUntilDue >= 0 && daysUntilDue <= 31;
                  return (
                  <div key={reminder.id}>
                    <div className={`flex items-start justify-between gap-3 rounded-lg px-2 py-2 ${needsAttentionSoon ? 'border border-amber-300/40 bg-amber-500/10' : ''}`}>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{reminder.title}</h4>
                          {getUrgencyBadge(reminder.due_date, reminder.is_completed)}
                        </div>
                        {reminder.description && (
                          <p className="text-xs text-muted-foreground">{reminder.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDueDate(reminder.due_date)}
                          <Badge variant="outline" className="text-xs">
                            {reminder.reminder_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Add to Calendar">
                              <CalendarPlus className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50">
                            <DropdownMenuItem
                              onClick={() => {
                                const url = buildWebCalendarUrl({
                                  title: reminder.title,
                                  description: reminder.description,
                                  due_date: reminder.due_date,
                                  reminder_type: reminder.reminder_type,
                                });
                                window.open(url, '_blank');
                              }}
                            >
                              Calendar (web)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const ics = buildICS({
                                  title: reminder.title,
                                  description: reminder.description,
                                  due_date: reminder.due_date,
                                  reminder_type: reminder.reminder_type,
                                });
                                const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = `${reminder.title || 'reminder'}.ics`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                setTimeout(() => URL.revokeObjectURL(link.href), 0);
                              }}
                            >
                              Download .ics
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {!reminder.is_completed && !String(reminder.id).startsWith('system-') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsCompleted(reminder.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {index < mergedReminders.length - 1 && <Separator className="mt-4" />}
                  </div>
                )})
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <AddReminderDialog
        carId={carId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          fetchReminders();
          setAddDialogOpen(false);
        }}
      />
    </>
  );
};

export default RemindersCard;
