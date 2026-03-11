import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

export default function AppHeader(props: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
      <div className="container-narrow h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">{props.right}</div>
      </div>
    </header>
  );
}
