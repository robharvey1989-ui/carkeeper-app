import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Car } from "@/hooks/useCars";
import NotesView from "@/components/NotesView";

export default function CarNotes() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [car, setCar] = useState<Car | null>(null);

  useEffect(() => {
    if (!user?.id || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) return navigate("/");
      setCar(data as any);
    })();
  }, [user?.id, id, navigate]);

  if (!car) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
        <div className="mt-6">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={`/car/${car.id}`}><ArrowLeft className="w-4 h-4 mr-1" />Back</Link>
        </Button>
        <div className="text-lg font-semibold">
          Notes • {car.reg_number || car.name || "Car"}
        </div>
      </div>
      <NotesView car={car} />
    </div>
  );
}

