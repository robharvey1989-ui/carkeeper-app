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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit3,
  Shield,
  Wrench,
  Hammer,
  FileText,
  Car,
  CreditCard,
  Sparkles,
  AlertTriangle,
  DollarSign,
  Fuel,
  Gauge,
  MapPin,
  Receipt,
  ShoppingCart,
  Heart
} from 'lucide-react';
import { useUserExpenseCategories } from '@/hooks/useUserExpenseCategories';
import * as icons from 'lucide-react';
import { useLocalization } from '@/hooks/useLocalization';

const formSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Name must be 50 characters or less'),
  description: z.string().optional(),
  icon: z.string().default('DollarSign'),
  is_enabled: z.boolean().default(true),
});

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICON_OPTIONS = [
  { value: 'Shield', label: 'Shield', component: Shield },
  { value: 'Wrench', label: 'Wrench', component: Wrench },
  { value: 'Hammer', label: 'Tool', component: Hammer },
  { value: 'FileText', label: 'Document', component: FileText },
  { value: 'Car', label: 'Car', component: Car },
  { value: 'CreditCard', label: 'Credit Card', component: CreditCard },
  { value: 'Sparkles', label: 'Sparkles', component: Sparkles },
  { value: 'AlertTriangle', label: 'Alert', component: AlertTriangle },
  { value: 'DollarSign', label: 'Dollar', component: DollarSign },
  { value: 'Fuel', label: 'Fuel', component: Fuel },
  { value: 'Gauge', label: 'Gauge', component: Gauge },
  { value: 'MapPin', label: 'Location', component: MapPin },
  { value: 'Receipt', label: 'Receipt', component: Receipt },
  { value: 'ShoppingCart', label: 'Shopping', component: ShoppingCart },
  { value: 'Heart', label: 'Heart', component: Heart },
];

const CategoryManagerDialog = ({ open, onOpenChange }: CategoryManagerDialogProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { t } = useLocalization();
  const { 
    userCategories, 
    loading, 
    addUserCategory, 
    updateUserCategory, 
    deleteUserCategory, 
    toggleCategoryEnabled 
  } = useUserExpenseCategories();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: 'DollarSign',
      is_enabled: true,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingId) {
        await updateUserCategory(editingId, values);
        setEditingId(null);
      } else {
        await addUserCategory({
          name: values.name,
          description: values.description,
          icon: values.icon,
          is_enabled: values.is_enabled,
        });
      }
      form.reset();
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    form.setValue('name', category.name);
    form.setValue('description', category.description || '');
    form.setValue('icon', category.icon);
    form.setValue('is_enabled', category.is_enabled);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      await deleteUserCategory(id);
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    await toggleCategoryEnabled(id, enabled);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = (icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />;
  };

  const resetForm = () => {
    form.reset();
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manage Expense Categories
          </DialogTitle>
          <DialogDescription>
            Choose which categories to track and add your own custom categories.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category Form */}
          {isAdding && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {editingId ? 'Edit Category' : 'Add New Category'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={`e.g., ${t('tyre')}s, Oil Change`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="icon"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Icon</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose an icon" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ICON_OPTIONS.map(icon => (
                                  <SelectItem key={icon.value} value={icon.value}>
                                    <div className="flex items-center gap-2">
                                      <icon.component className="w-4 h-4" />
                                      <span>{icon.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Brief description of what this category covers..."
                              className="min-h-[60px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Enable Category</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Show this category in expense forms
                            </p>
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

                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingId ? 'Update Category' : 'Add Category'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Add Category Button */}
          {!isAdding && (
            <Button 
              onClick={() => setIsAdding(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Category
            </Button>
          )}

          <Separator />

          {/* Categories List */}
          <div>
            <h3 className="text-lg font-medium mb-4">Your Categories</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : userCategories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No custom categories yet. Add one to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userCategories.map(category => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-4 bg-background border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getIconComponent(category.icon)}
                      <div>
                        <h4 className="font-medium">{category.name}</h4>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>
                      {!category.is_enabled && (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_enabled}
                        onCheckedChange={(checked) => handleToggleEnabled(category.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManagerDialog;