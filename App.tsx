import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Shell
import LayoutAston from "@/components/LayoutAston";

// Pages
import Index from "@/pages/Index";
import Billing from "@/pages/Billing";
import CarDetail from "@/pages/CarDetail";
import NotFound from "@/pages/NotFound";
import TransferAccept from "@/pages/TransferAccept"; // safe placeholder below
import ShareCar from "@/pages/ShareCar";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<LayoutAston />}>
          <Route index element={<Index />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/car/:id" element={<CarDetail />} />
          <Route path="/share/:id" element={<ShareCar />} />
          <Route path="/transfer/:token" element={<TransferAccept />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
