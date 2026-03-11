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
import { useMaintenance } from '@/hooks/useMaintenance';
import { useLocalization } from '@/hooks/useLocalization';
import FileUpload from './FileUpload';
import { useVehicleGovData } from '@/hooks/useVehicleGovData';
import { useMileage } from '@/hooks/useMileage';

const formSchema = z.object({
  maintenance_type: z.string().optional(),
  custom_type: z.string().optional(),
  description: z.string().optional(),
  cost: z.string().optional(),
  currency: z.string().default('GBP'),
  mileage: z.string().optional(),
  service_date: z.string().min(1, 'Service date is required'),
  next_service_date: z.string().optional(),
  next_service_mileage: z.string().optional(),
  service_provider: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => !!(data.maintenance_type && data.maintenance_type.trim()) || !!(data.custom_type && data.custom_type.trim()), {
  message: 'Please select a type or enter a custom type',
  path: ['maintenance_type'],
});

interface AddMaintenanceDialogProps {
  car: Car;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultType?: string;
}

const AddMaintenanceDialog = ({ car, open, onOpenChange, onSuccess, defaultType }: AddMaintenanceDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ url: string; name: string }>>([]);
  const maintenance = useMaintenance(car.id);
  const { add: addMileageLog } = useMileage(car.id);
  const { config } = useLocalization();

  // Best-effort VRM from car data
  const vrm = (car.reg_number || (car as any).registration || (car as any).reg || '').toString() || undefined;
  const { data: govData } = useVehicleGovData(vrm);

  const defaultTypes = ['MOT','Service','Repairs'];
  const [showCustomType, setShowCustomType] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maintenance_type: '',
      description: '',
      cost: '',
      currency: 'GBP',
      mileage: '',
      service_date: new Date().toISOString().split('T')[0],
      service_provider: '',
      notes: '',
    },
  });

  // Update form when localization config changes
  React.useEffect(() => {
    form.setValue('currency', 'GBP');
  }, [config, form]);

  // When dialog opens and we have a MOT mileage, prefill mileage if empty
  useEffect(() => {
    if (!open) return;
    const current = form.getValues('mileage');
    if ((current === undefined || current === '') && (govData?.lastMotMileage ?? null) !== null) {
      form.setValue('mileage', String(govData!.lastMotMileage));
    }
  }, [open, govData?.lastMotMileage, form, govData]);

  // Apply default maintenance type when dialog opens or when defaultType changes
  React.useEffect(() => {
    if (open) {
      if (defaultType === '__custom') {
        setShowCustomType(true);
        form.setValue('maintenance_type', '');
      } else if (defaultType) {
        setShowCustomType(false);
        form.setValue('maintenance_type', defaultType);
      } else {
        setShowCustomType(false);
        form.setValue('maintenance_type', '');
      }
    }
  }, [defaultType, open, form]);
  // Minimal maintenance entry; advanced scheduling removed for now

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const finalType = (values.custom_type && values.custom_type.trim()) || values.maintenance_type || '';

      // next service details not calculated in minimal mode

      await (maintenance as any).add({
        category: finalType,
        date: values.service_date,
        cost: values.cost ? parseFloat(values.cost) : null,
        notes: values.notes || null,
      });

      // Also record mileage log if provided
      const mRaw = values.mileage?.toString().trim();
      const mNum = mRaw ? Number(mRaw.replace(/[,\s]/g, '')) : NaN;
      if (Number.isFinite(mNum) && mNum > 0) {
        try { await (addMileageLog as any)({ date: values.service_date, odometer: mNum }); } catch {}
      }

      form.reset();
      setUploadedDocuments([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding maintenance record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUploaded = (url: string, fileName: string) => {
    setUploadedDocuments(prev => [...prev, { url, name: fileName }]);
  };

  const removeDocument = (index: number) => {
    setUploadedDocuments(prev => prev.filter((_, i) => i !== index));
  };

// Using default types and optional custom type; DB maintenanceTypes are available via useMaintenance if needed.

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
    return currencySymbols[config.currency] || '£';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Maintenance Record</DialogTitle>
          <DialogDescription>
            Record maintenance performed on your {car.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maintenance_type"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Maintenance Type</FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        if (val === '__custom') {
                          setShowCustomType(true);
                          form.setValue('maintenance_type', '');
                        } else {
                          setShowCustomType(false);
                          field.onChange(val);
                        }
                      }} 
                      defaultValue={defaultType === '__custom' ? undefined : field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select maintenance type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {defaultTypes.map((name) => (
                          <SelectItem key={name} value={name}>
                            {name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom">Custom type...</SelectItem>
                      </SelectContent>
                    </Select>
                    {showCustomType && (
                      <div className="mt-2">
                        <FormField
                          control={form.control}
                          name="custom_type"
                          render={({ field: customField }) => (
                            <FormItem>
                              <FormLabel>Custom Type</FormLabel>
                              <FormControl>
                                <Input {...customField} placeholder="e.g. MOT Retest, Wheel Alignment" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date</FormLabel>
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
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Mileage</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="50,000" type="number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
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
                name="service_provider"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Service Provider</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Quick Lube, Joe's Garage, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Additional details about the service performed..."
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
                        placeholder="Any additional notes or observations..."
                        className="min-h-[60px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Document Upload */}
            <div>
              <FormLabel>Service Documents</FormLabel>
              <div className="mt-2">
                <FileUpload
                  onFileUploaded={handleDocumentUploaded}
                  accept=".pdf,.jpg,.jpeg,.png"
                  maxSize={10}
                  bucket="car-documents"
                  folder={`maintenance/${car.id}`}
                  placeholder="Upload receipts, invoices, or service records"
                />
              </div>
              
              {uploadedDocuments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <FormLabel className="text-sm">Uploaded Documents:</FormLabel>
                  {uploadedDocuments.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{doc.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
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
                {isLoading ? 'Adding...' : 'Add Record'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMaintenanceDialog;



