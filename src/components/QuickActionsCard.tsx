import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Wrench, Hammer, Receipt, Route, Zap, Settings, ChevronDown } from 'lucide-react';
import AddExpenseDialog from './AddExpenseDialog';
import AddMaintenanceDialog from './AddMaintenanceDialog';
import { Car } from '@/hooks/useCars';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLocalization } from '@/hooks/useLocalization';

interface QuickActionsCardProps {
  car: Car;
  onUpdate: () => void;
}

const QuickActionsCard = ({ car, onUpdate }: QuickActionsCardProps) => {
  const { s } = useLocalization();
  
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [maintenanceDefaultType, setMaintenanceDefaultType] = useState<string | undefined>(undefined);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [enabledActionIds, setEnabledActionIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default

  const storageKey = `quick_actions:${car.user_id}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setEnabledActionIds(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load quick actions prefs');
    }
  }, [storageKey]);

  const persist = (ids: string[]) => {
    setEnabledActionIds(ids);
    try {
      localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to save quick actions prefs');
    }
  };

  const OPTIONAL_ACTIONS = [
    {
      id: 'expense',
      title: 'Add Expense',
      description: 'Other car expenses',
      icon: Receipt,
      color: 'text-green-500',
      bgColor: 'bg-green-50 hover:bg-green-100',
      onClick: () => setExpenseDialogOpen(true),
    },
    {
      id: 'trip',
      title: 'Log Trip',
      description: 'Track mileage',
      icon: Route,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      onClick: () => {
        // TODO: Implement mileage logging
        console.log('Mileage logging not yet implemented');
      },
    },
  ] as const;

  const defaultActions = [
    {
      id: 'maintenance',
      title: 'Add Maintenance',
      description: 'Record maintenance',
      icon: Wrench,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      onClick: () => {
        setMaintenanceDefaultType(undefined);
        setMaintenanceDialogOpen(true);
      },
    },
    {
      id: 'repair',
      title: 'Add Repair',
      description: 'Record a repair',
      icon: Hammer,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 hover:bg-amber-100',
      onClick: () => {
        setMaintenanceDefaultType('Repairs');
        setMaintenanceDialogOpen(true);
      },
    },
  ];

  const optionalActions = OPTIONAL_ACTIONS.filter(a => enabledActionIds.includes(a.id));
  const actions = [...defaultActions, ...optionalActions];

  const toggleAction = (id: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...enabledActionIds, id]))
      : enabledActionIds.filter(x => x !== id);
    persist(next);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-gradient-card border-automotive-blue/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-automotive-blue" />
                  Quick Actions
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${s('customise')} quick actions`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomizeOpen(true);
                    }}
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="transition-all duration-200 ease-out data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                {actions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="ghost"
                      className={`h-auto p-4 flex flex-col items-center gap-2 ${action.bgColor} border border-transparent hover:border-current/20 transition-all duration-200`}
                      onClick={action.onClick}
                    >
                      <IconComponent className={`w-6 h-6 ${action.color}`} />
                      <div className="text-center">
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.description}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Add/Expense Dialogs */}
      <AddExpenseDialog
        car={car}
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={() => {
          onUpdate();
          setExpenseDialogOpen(false);
        }}
      />

      <AddMaintenanceDialog
        car={car}
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        onSuccess={() => {
          onUpdate();
          setMaintenanceDialogOpen(false);
        }}
        defaultType={maintenanceDefaultType}
      />

      {/* Customize Quick Actions */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{s('customise')} Quick Actions</DialogTitle>
            <DialogDescription>Select additional actions to show.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {OPTIONAL_ACTIONS.map((opt) => {
              const IconComp = opt.icon;
              const checked = enabledActionIds.includes(opt.id);
              return (
                <div key={opt.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`qa-${opt.id}`}
                    checked={checked}
                    onCheckedChange={(val) => toggleAction(opt.id, !!val)}
                  />
                  <Label htmlFor={`qa-${opt.id}`} className="flex items-center gap-2 cursor-pointer">
                    <IconComp className="w-4 h-4" />
                    <span>{opt.title}</span>
                  </Label>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setCustomizeOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickActionsCard;
