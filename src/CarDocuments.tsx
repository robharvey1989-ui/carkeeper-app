// src/pages/CarDocuments.tsx
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import type { Car } from "@/hooks/useCars";
import DocumentFolderView from "@/components/DocumentFolderView";
import AddDocumentsSmartDialog from "@/components/AddDocumentsSmartDialog";

export default function CarDocuments() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [car, setCar] = useState<Car | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id || !id) return;
    (async () => {
      const { data } = await supabase.from("cars").select("*").eq("id", id).eq("user_id", user.id).single();
      if (!data) return navigate("/");
      setCar(data as any);
    })();
  }, [user?.id, id, navigate]);

  if (!car) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="w-4 h-4 mr-1"/>Back</Link></Button>
        <div className="mt-6">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <Button asChild variant="ghost" size="sm"><Link to={`/car/${car.id}`}><ArrowLeft className="w-4 h-4 mr-1"/>Back</Link></Button>
        <div className="flex items-center gap-2">
          <div className="text-lg font-semibold">Documents  {car.reg_number || car.name || "Car"}</div>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Add</Button>
        </div>
      </div>

      <DocumentFolderView car={car} />

      <div className="mt-4">
        <AddDocumentsSmartDialog
          carId={car.id}
          onUploaded={async () => {
            const { data } = await supabase.from("cars").select("*").eq("id", car.id).single();
            if (data) setCar(data as any);
          }}
        />
      </div>
    </div>
  );
}
