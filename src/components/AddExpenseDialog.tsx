import React, { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car } from '@/hooks/useCars';
import { useExpenses } from '@/hooks/useExpenses';
import { useLocalization } from '@/hooks/useLocalization';
import FileUpload from './FileUpload';
import * as icons from 'lucide-react';
import { useVehicleGovData } from '@/hooks/useVehicleGovData';
import { useMileage } from '@/hooks/useMileage';

const formSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  amount: z.string().min(1, 'Amount is required'),
  currency: z.string().default('GBP'),
  description: z.string().optional(),
  expense_date: z.string().min(1, 'Date is required'),
  odometer_reading: z.string().optional(),
  fuel_volume: z.string().optional(),
  fuel_unit: z.string().default('gallons'),
  notes: z.string().optional(),
});

interface AddExpenseDialogProps {
  car: Car;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const AddExpenseDialog = ({ car, open, onOpenChange, onSuccess }: AddExpenseDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const { addExpense } = useExpenses(car.id);
  const { config } = useLocalization();
  const { add: addMileageLog } = useMileage(car.id);

  // Best-effort VRM from car data
  const vrm = (car.reg_number || (car as any).registration || (car as any).reg || '').toString() || undefined;
  const { data: govData } = useVehicleGovData(vrm);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: '',
      amount: '',
      currency: 'GBP',
      description: '',
      expense_date: new Date().toISOString().split('T')[0],
      odometer_reading: '',
      fuel_volume: '',
      fuel_unit: config.fuelUnit,
      notes: '',
    },
  });

  // Update form when localization config changes
  React.useEffect(() => {
    form.setValue('currency', 'GBP');
    form.setValue('fuel_unit', config.fuelUnit);
  }, [config, form]);

  // When dialog opens and we have a MOT mileage, prefill odometer if empty
  useEffect(() => {
    if (!open) return;
    const current = form.getValues('odometer_reading');
    if ((current === undefined || current === '') && (govData?.lastMotMileage ?? null) !== null) {
      form.setValue('odometer_reading', String(govData!.lastMotMileage));
    }
  }, [open, govData?.lastMotMileage, form, govData]);

  // Minimal categories matching current expenses implementation
  const expenseCategories = [
    { id: 'Repair', name: 'Repair', icon: 'Wrench', description: 'Repairs and fixes' },
    { id: 'Other', name: 'Other', icon: 'FileText', description: 'Other expenses' },
  ];
  const selectedCategory = expenseCategories.find(
    cat => cat.id === form.watch('category_id')
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const created = await addExpense({
        car_id: car.id,
        category: values.category_id as 'Repair' | 'Other',
        amount: parseFloat(values.amount),
        description: values.description || null,
        date: values.expense_date,
      } as any);

      form.reset();
      setReceiptUrl('');
      onOpenChange(false);
      onSuccess?.();

      // Also record mileage log if provided
      const mRaw = values.odometer_reading?.toString().trim();
      const mNum = mRaw ? Number(mRaw.replace(/[,\s]/g, '')) : NaN;
      if (Number.isFinite(mNum) && mNum > 0) {
        try { await (addMileageLog as any)({ date: values.expense_date, odometer: mNum }); } catch {}
      }
    } catch (error) {
      console.error('Error adding expense record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptUploaded = (url: string, fileName: string) => {
    setReceiptUrl(url);
  };

  const removeReceipt = () => {
    setReceiptUrl('');
  };

  // Get the icon component dynamically
  const getIconComponent = (iconName: string) => {
    const IconComponent = (icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  // Get currency symbol based on localization
  const getCurrencySymbol = () => {    
    const currencySymbols: { [key: string]: string } = {
      'USD': '$',
      'GBP': '£',
      'EUR': '€',
      'CAD': 'C$',
      'AUD': 'A$',
      'SEK': 'kr',
      'NOK': 'kr',
      'DKK': 'kr',
    };
    const symbol = currencySymbols[config.currency] || '£';    return symbol;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Record an expense for your {car.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expense category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategories
                          .filter(category => category.id && category.id.trim() !== '')
                          .map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              {getIconComponent(category.icon)}
                              <div className="flex flex-col">
                                <span>{category.name}</span>
                                {category.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {category.description}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-muted-foreground text-sm">
                          {getCurrencySymbol()}
                        </span>
                        <Input {...field} placeholder="99.99" type="number" step="0.01" className="pl-8" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odometer_reading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odometer Reading</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="50,000" type="number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCategory?.name === 'Fuel' && (
                <>
                  <FormField
                    control={form.control}
                    name="fuel_volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Volume</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="12.5" type="number" step="0.1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fuel_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gallons">Gallons</SelectItem>
                            <SelectItem value="liters">Liters</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Additional details about this expense..."
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Any additional notes..."
                        className="min-h-[60px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Receipt Upload */}
            <div>
              <FormLabel>Receipt</FormLabel>
              <div className="mt-2">
                <FileUpload
                  onFileUploaded={handleReceiptUploaded}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10}
                  bucket="car-documents"
                  folder={`expenses/${car.id}`}
                  placeholder="Upload receipt or invoice"
                />
              </div>
              
              {receiptUrl && (
                <div className="mt-3">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Receipt uploaded</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeReceipt}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddExpenseDialog;



