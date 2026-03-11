import { useState, useEffect } from "react";
import { Plus, Car, Search, Filter, LogOut, User, Settings, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CarCard from "./CarCard";
import AddCarDialog from "./AddCarDialog";
import AuthDialog from "./AuthDialog";
import InitialSetupDialog from "./InitialSetupDialog";
import UserPreferencesDialog from "./UserPreferencesDialog";
import Logo from "./Logo";
import DailyCareCard from "./DailyCareCard";
import SubscriptionPanel from "./SubscriptionPanel";
import { useAuth } from "@/hooks/useAuth";
import { useCars } from "@/hooks/useCars";
import { useUserPreferences } from "@/hooks/useCarAnalytics";
import { isSupabaseConfigured } from "@/lib/supabase";

const GarageView = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { cars, loading: carsLoading, addCar } = useCars(user?.id);
  const { preferences } = useUserPreferences();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);
  const [isUserPreferencesOpen, setIsUserPreferencesOpen] = useState(false);
  const [isSubscriptionPanelOpen, setIsSubscriptionPanelOpen] = useState(false);
  const [hasShownInitialSetup, setHasShownInitialSetup] = useState(false);

  // Show initial setup for new users who haven't completed setup yet
  useEffect(() => {
    if (user && preferences && !preferences.setup_completed && !hasShownInitialSetup) {
      setIsInitialSetupOpen(true);
      setHasShownInitialSetup(true);
    }
  }, [user, preferences, hasShownInitialSetup]);

  const filteredCars = cars.filter(car => {
    const term = searchTerm.toLowerCase();
    const name = (car.name || '').toLowerCase();
    const make = (car.make || '').toLowerCase();
    const model = (car.model || '').toLowerCase();
    return name.includes(term) || make.includes(term) || model.includes(term);
  });

  const handleAddCar = async (newCarData: any) => {
    try {
      const make = newCarData.make || "";
      const model = newCarData.model || "";
      const name = (newCarData.name || `${make} ${model}`).trim() || null;
      const reg = newCarData.regNumber ?? newCarData.registration ?? null;
      const year = newCarData.year !== undefined && newCarData.year !== "" ? parseInt(newCarData.year) : null;

      await addCar({
        name,
        year,
        make: make || null,
        model: model || null,
        reg_number: reg || null,
        notes: newCarData.notes || null,
      });
      setIsAddDialogOpen(false);
    } catch (error: any) {
      const msg = error?.message || String(error) || "Failed to save car";
      alert(msg);
      if (/not signed in/i.test(msg)) setIsAuthDialogOpen(true);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-automotive-blue mx-auto"></div>
          <p className="text-muted-foreground">Loading CarKeeper...</p>
        </div>
      </div>
    );
  }

  // Show cloud setup message if not configured
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen">
        {/* Simple Header */}
        <div className="bg-transparent border-b border-white/10">
          <div className="container mx-auto px-6 py-8">
            <div className="text-center">
              <Logo size="lg" />
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                Your premium digital garage. Keep track of every detail about your vehicles in one elegant place.
              </p>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-24">
            <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Cloud Setup Required</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              To enable user accounts and cloud storage, please connect your cloud backend using the setup option in the top right corner.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Elegant Header */}
      <div className="hero-section border-b border-border-light">
        {/* Auth Button in top right */}
        <div className="absolute top-8 right-8 z-20">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground font-medium tracking-wide">
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUserPreferencesOpen(true)}
                className="btn-secondary backdrop-blur-sm bg-background/90 hover:bg-background border-border-light"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="btn-secondary backdrop-blur-sm bg-background/90 hover:bg-background border-border-light"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthDialogOpen(true)}
              className="btn-secondary backdrop-blur-sm bg-background/90 hover:bg-background border-border-light"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>

        <div className="section-container py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto relative z-10">
            <div className="animate-fade-in-up">
              <Logo size="lg" />
            </div>
            
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h1 className="text-display text-5xl lg:text-6xl xl:text-7xl text-foreground mt-8 mb-6">
                Welcome to your garage
              </h1>
            </div>
            
            {!user && (
              <div className="mt-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <Button 
                  variant="default" 
                  size="lg" 
                  onClick={() => setIsAuthDialogOpen(true)}
                  className="btn-primary text-lg px-10 py-4 h-auto font-medium rounded-xl"
                >
                  <User className="w-5 h-5 mr-3" />
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="section-container py-16">
        {user ? (
          <>
            {/* Daily Care Card - Always visible for authenticated users */}
            <div className="mb-12 animate-fade-in">
              <DailyCareCard />
            </div>
            {/* Subtle Upgrade Button */}
            <div className="mb-12 animate-fade-in flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSubscriptionPanelOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            </div>
            {/* Subscription Panel */}
            {isSubscriptionPanelOpen && (
              <div className="mb-12 animate-fade-in">
                <SubscriptionPanel />
                <div className="flex justify-center mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSubscriptionPanelOpen(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Hide plans
                  </Button>
                </div>
              </div>
            )}
            {/* Search and Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-6 mb-16 animate-fade-in">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search your cars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-premium pl-12 h-14 text-base"
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" size="lg" className="btn-secondary h-14 px-6">
                  <Filter className="w-5 h-5 mr-2" />
                  Filter
                </Button>
                <Button variant="default" size="lg" className="btn-primary h-14 px-6" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-5 h-5 mr-2" />
                  Add Car
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {/* Cars Grid or Auth Prompt */}
        {!user ? (
          <div className="text-center py-32 animate-fade-in-up">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-primary/10 flex items-center justify-center">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-display text-4xl mb-6">Sign in to access your garage</h3>
            <p className="text-body text-xl mb-12 max-w-lg mx-auto leading-relaxed">
              Create an account or sign in to start building your car collection and access it from any device.
            </p>
            <Button variant="default" size="lg" className="btn-primary text-lg px-10 py-4 h-auto" onClick={() => setIsAuthDialogOpen(true)}>
              <User className="w-5 h-5 mr-3" />
              Get Started
            </Button>
          </div>
        ) : carsLoading ? (
          <div className="text-center py-32">
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/20 border-t-primary mx-auto mb-6"></div>
            <p className="text-body text-lg">Loading your garage...</p>
          </div>
        ) : filteredCars.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredCars.map((car, index) => (
              <div 
                key={car.id} 
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CarCard car={car} index={index} />
              </div>
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="text-center py-32 animate-fade-in-up">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-primary/10 flex items-center justify-center">
              <Car className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-display text-4xl mb-6">Your garage is empty</h3>
            <p className="text-body text-xl mb-12 max-w-lg mx-auto leading-relaxed">
              Start building your car collection by adding your first vehicle.
            </p>
            <Button variant="default" size="lg" className="btn-primary text-lg px-10 py-4 h-auto" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-5 h-5 mr-3" />
              Add Your First Car
            </Button>
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-body text-lg">No cars found matching your search.</p>
          </div>
        )}
      </div>

      {user && (
        <AddCarDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
          onCreate={handleAddCar}
        />
      )}

      <AuthDialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
      />

      <InitialSetupDialog
        open={isInitialSetupOpen}
        onOpenChange={setIsInitialSetupOpen}
        onComplete={() => setHasShownInitialSetup(true)}
      />

      <UserPreferencesDialog
        open={isUserPreferencesOpen}
        onOpenChange={setIsUserPreferencesOpen}
      />
    </div>
  );
};

export default GarageView;
