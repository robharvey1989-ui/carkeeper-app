import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/hooks/useAuth";

export default function Layout() {
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="container-narrow h-14 flex items-center justify-between">
          <Link to="/" className="heading font-semibold tracking-tight">
            CarKeeper
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink to="/" className={({isActive}) => isActive ? "font-medium" : "opacity-80 hover:opacity-100"}>
              Garage
            </NavLink>
            <NavLink to="/billing" className={({isActive}) => isActive ? "font-medium" : "opacity-80 hover:opacity-100"}>
              Billing
            </NavLink>
            <span className="opacity-30">|</span>
            {loading ? (
              <span className="opacity-70">Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="opacity-80 text-xs hidden sm:inline">{user.email}</span>
                <Button size="sm" variant="outline" onClick={signOut}>Sign out</Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>
            )}
          </nav>
        </div>
      </header>

      <main className="container-narrow py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs opacity-70">{'©'} 2025 CarKeeper</footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
