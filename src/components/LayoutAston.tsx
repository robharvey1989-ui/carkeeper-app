import { Link, NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/AuthDialog";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";

export default function LayoutAston() {
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const bgCandidates = [
    `${import.meta.env.BASE_URL}backgroundsgarage.jpg`,
    "/backgroundsgarage.jpg",
    "backgroundsgarage.jpg",
  ];
  const [bgIndex, setBgIndex] = useState(0);
  const appBackgroundUrl = bgCandidates[Math.min(bgIndex, bgCandidates.length - 1)];
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "rounded-full px-3 py-1.5 text-white bg-white/16 border border-white/25"
      : "rounded-full px-3 py-1.5 text-white/80 border border-transparent hover:text-white hover:bg-white/10";

  return (
    <div
      className="am-app text-foreground min-h-screen"
      style={{
        backgroundImage: `url("${appBackgroundUrl}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <img
        src={appBackgroundUrl}
        alt=""
        className="hidden"
        aria-hidden
        onError={() => setBgIndex((prev) => (prev < bgCandidates.length - 1 ? prev + 1 : prev))}
      />
      {/* Floating glass header */}
      <header className="am-header fixed top-4 left-1/2 -translate-x-1/2 z-40 rounded-2xl px-3 sm:px-4 w-[calc(100%-1rem)] max-w-[1440px]">
        <div className="h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Logo size="sm" />
          </Link>
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <NavLink to="/" className={navClass}>Garage</NavLink>
            <NavLink to="/billing" className={navClass}>Billing</NavLink>
            <span className="opacity-40 mx-1">|</span>
            {loading ? (
              <span className="opacity-70 px-2">Loading...</span>
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="opacity-80 text-xs hidden lg:inline">{user.email}</span>
                <Button size="sm" variant="outline" className="border-white/30 bg-white/5 hover:bg-white/12" onClick={signOut}>Sign out</Button>
              </div>
            ) : (
              <Button size="sm" className="btn-primary" onClick={() => setAuthOpen(true)}>Sign in</Button>
            )}
          </nav>
          <div className="md:hidden flex items-center gap-2">
            <NavLink to="/" className={navClass}>Garage</NavLink>
            {user ? (
              <Button size="sm" variant="outline" className="border-white/30 bg-white/5 hover:bg-white/12" onClick={signOut}>
                Sign out
              </Button>
            ) : (
              <Button size="sm" className="btn-primary" onClick={() => setAuthOpen(true)}>
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="am-content pt-24 pb-12 animate-fade-in-up">
        <Outlet />
      </main>

      <footer className="py-6 text-center text-xs text-white/60">{`© ${new Date().getFullYear()} CarKeeper`}</footer>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
