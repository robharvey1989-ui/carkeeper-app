import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useCarAnalytics';
import { useLocalization } from '@/hooks/useLocalization';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Fuel,
  Wrench,
  Calendar,
  BarChart3
} from 'lucide-react';

interface CarAnalyticsCardProps {
  carId: string;
}

interface Analytics {
  totalExpenses: number;
  monthlyAverage: number;
  totalMaintenance: number;
  lastServiceDate?: string;
  fuelExpenses: number;
  maintenanceExpenses: number;
  expenseCount: number;
  maintenanceCount: number;
}

const CarAnalyticsCard = ({ carId }: CarAnalyticsCardProps) => {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { formatCurrency, t } = useLocalization();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Fetch expense data
      const { data: expenses, error: expenseError } = await supabase
        .from('expense_records')
        .select('amount, expense_date, category_id')
        .eq('car_id', carId)
        .eq('user_id', user!.id);

      if (expenseError) throw expenseError;

      // Fetch maintenance data
      const { data: maintenance, error: maintenanceError } = await supabase
        .from('maintenance_records')
        .select('cost, service_date')
        .eq('car_id', carId)
        .eq('user_id', user!.id)
        .order('service_date', { ascending: false });

      if (maintenanceError) throw maintenanceError;

      // Fetch fuel category ID
      const { data: fuelCategory } = await supabase
        .from('expense_categories')
        .select('id')
        .eq('name', 'Fuel')
        .single();

      // Calculate analytics
      const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const totalMaintenance = maintenance?.reduce((sum, maint) => sum + Number(maint.cost || 0), 0) || 0;
      
      // Calculate monthly average (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      
      const recentExpenses = expenses?.filter(exp => 
        new Date(exp.expense_date) >= twelveMonthsAgo
      ) || [];
      
      const monthlyAverage = recentExpenses.length > 0 
        ? recentExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0) / 12
        : 0;

      const fuelExpenses = expenses?.filter(exp => 
        exp.category_id === fuelCategory?.id
      ).reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

      const maintenanceExpenses = totalExpenses - fuelExpenses;

      setAnalytics({
        totalExpenses,
        monthlyAverage,
        totalMaintenance,
        lastServiceDate: maintenance?.[0]?.service_date,
        fuelExpenses,
        maintenanceExpenses,
        expenseCount: expenses?.length || 0,
        maintenanceCount: maintenance?.length || 0
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [carId, user]);

  useEffect(() => {
    if (user && carId) {
      fetchAnalytics();
    }
  }, [user, carId, fetchAnalytics]);


  const formatLastService = (date?: string) => {
    if (!date) return 'No service records';
    
    const serviceDate = new Date(date);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Yesterday';
    if (daysDiff < 30) return `${daysDiff} days ago`;
    if (daysDiff < 365) return `${Math.floor(daysDiff / 30)} months ago`;
    return `${Math.floor(daysDiff / 365)} years ago`;
  };

  if (loading) {
    return (
      <Card className="bg-gradient-card border-automotive-blue/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <Card className="bg-gradient-card border-automotive-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-automotive-blue" />
          Cost Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Expenses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Expenses</span>
            </div>
            <span className="text-lg font-bold text-automotive-blue">
              {formatCurrency(analytics.totalExpenses)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            Avg {formatCurrency(analytics.monthlyAverage)}/month
            <Badge variant="outline" className="text-xs">
              {analytics.expenseCount} records
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Expense Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-orange-500" />
              <span className="text-sm">{t('fuel')}</span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(analytics.fuelExpenses)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" />
              <span className="text-sm">Maintenance</span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(analytics.totalMaintenance)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-sm">Other</span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(analytics.maintenanceExpenses)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Last Service */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Last Service</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {formatLastService(analytics.lastServiceDate)}
            </div>
            {analytics.maintenanceCount > 0 && (
              <Badge variant="secondary" className="text-xs mt-1">
                {analytics.maintenanceCount} services
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Insights */}
        {analytics.totalExpenses > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Quick Insights</h4>
              <div className="text-xs space-y-1">
                {analytics.fuelExpenses > analytics.totalMaintenance ? (
                  <div className="flex items-center gap-1 text-orange-600">
                    <TrendingUp className="w-3 h-3" />
                    {t('fuel')} is your biggest expense
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-blue-600">
                    <Wrench className="w-3 h-3" />
                    Maintenance costs are significant
                  </div>
                )}
                
                {analytics.monthlyAverage > 200 ? (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <TrendingUp className="w-3 h-3" />
                    Above average monthly costs
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="w-3 h-3" />
                    Keeping costs under control
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CarAnalyticsCard;
