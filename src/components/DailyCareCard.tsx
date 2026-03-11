import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Calendar,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
  Lightbulb,
  Camera,
  Gauge,
  Shield,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocalization } from '@/hooks/useLocalization';

interface DailyTaskItem {
  id: string;
  type: 'maintenance';
  title: string;
  description: string;
  icon: typeof Lightbulb;
  completed?: boolean;
  streak?: number;
}

const DailyCareCard = () => {
  const [dailyItems, setDailyItems] = useState<DailyTaskItem[]>([]);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const { t } = useLocalization();

  // Daily maintenance tasks to keep car details updated
  const dailyTasks = useMemo(() => ([
    {
      id: 'task-1',
      type: 'maintenance' as const,
      title: 'Update Current Mileage',
      description: 'Keep your mileage current for accurate service tracking.',
      icon: Gauge
    },
    {
      id: 'task-2',
      type: 'maintenance' as const,
      title: `Check ${t('tyre')} Condition`,
      description: `Inspect ${t('tyre')}s for wear and proper pressure.`,
      icon: Shield
    },
    {
      id: 'task-3',
      type: 'maintenance' as const,
      title: 'Log Recent Expenses',
      description: `Add any ${t('fuel')} or maintenance costs from today.`,
      icon: TrendingUp
    },
    {
      id: 'task-4',
      type: 'maintenance' as const,
      title: 'Take Progress Photo',
      description: 'Document your car\'s current condition.',
      icon: Camera
    },
    {
      id: 'task-5',
      type: 'maintenance' as const,
      title: 'Review Upcoming Services',
      description: 'Check if any maintenance is due soon.',
      icon: Clock
    },
    {
      id: 'task-6',
      type: 'maintenance' as const,
      title: 'Update Car Details',
      description: 'Add or update any missing car information.',
      icon: Lightbulb
    },
    {
      id: 'task-7',
      type: 'maintenance' as const,
      title: 'Set Maintenance Reminder',
      description: 'Schedule your next important service reminder.',
      icon: Calendar
    }
  ]), [t]);

  useEffect(() => {
    // Generate daily task based on current date
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    // Show one task per day, cycling through all available tasks
    const taskIndex = dayOfYear % dailyTasks.length;
    const todaysTask = dailyTasks[taskIndex];

    setDailyItems([todaysTask]);

    // Load completed items from localStorage
    const completedKey = `carkeeper-completed-${format(today, 'yyyy-MM-dd')}`;
    const completed = JSON.parse(localStorage.getItem(completedKey) || '[]');
    setCompletedToday(completed);

    // Load streak from localStorage
    const streak = parseInt(localStorage.getItem('carkeeper-streak') || '0');
    setCurrentStreak(streak);
  }, [dailyTasks]);

  const markComplete = (itemId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const completedKey = `carkeeper-completed-${today}`;
    
    const newCompleted = [...completedToday, itemId];
    setCompletedToday(newCompleted);
    localStorage.setItem(completedKey, JSON.stringify(newCompleted));

    // Update streak if all items completed
    if (newCompleted.length === dailyItems.length) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      localStorage.setItem('carkeeper-streak', newStreak.toString());
    }
  };

  const isCompleted = (itemId: string) => completedToday.includes(itemId);
  const allCompleted = dailyItems.length > 0 && completedToday.length === dailyItems.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="card-premium relative overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="relative z-10 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                Daily Tasks
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 mb-1">
                    {format(new Date(), 'MMM d')}
                  </Badge>
                  {currentStreak > 0 && (
                    <div className="text-sm text-white/80 flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {currentStreak} day streak
                    </div>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent className="transition-all duration-200 ease-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <CardContent className="relative z-10 pt-0 pb-4">
        {dailyItems.map((item) => (
          <div 
            key={item.id}
            className={`p-3 rounded-lg backdrop-blur-sm transition-all duration-300 ${
              isCompleted(item.id) 
                ? 'bg-white/20 border border-white/30' 
                : 'bg-white/10 border border-white/20 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                isCompleted(item.id) ? 'bg-green-500/20' : 'bg-white/20'
              }`}>
                {isCompleted(item.id) ? (
                  <CheckCircle2 className="w-4 h-4 text-green-300" />
                ) : (
                  <item.icon className="w-4 h-4 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-white text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-white/80">{item.description}</p>
              </div>
              
              {!isCompleted(item.id) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => markComplete(item.id)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-7 px-2 text-xs"
                >
                  Complete
                </Button>
              )}
            </div>
          </div>
        ))}

        {allCompleted && (
          <div className="p-3 rounded-lg bg-green-500/20 border border-green-400/30 text-center">
            <div className="flex items-center justify-center gap-2 text-green-300 mb-1">
              <Star className="w-4 h-4" />
              <span className="font-medium text-sm">Task completed!</span>
            </div>
            <p className="text-xs text-green-200">
              Check back tomorrow for a new task.
            </p>
          </div>
        )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default DailyCareCard;
