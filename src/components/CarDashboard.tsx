import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, ImagePlus } from "lucide-react";
import type { Car } from "@/hooks/useCars";

type Props = {
  car: Car;
  onAddDocuments?: () => void;
  onAddImages?: () => void;
};

export default function CarDashboard({ car, onAddDocuments, onAddImages }: Props) {
  const title =
    car.name || [car.make, car.model, car.year].filter(Boolean).join(" ") || "Untitled";

  const imagesCount = Array.isArray(car.images) ? car.images.length : 0;
  const documentsCount = Array.isArray((car as any).documents) ? (car as any).documents.length : 0; // legacy

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xl font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">
              {car.make || "—"} • {car.model || "—"} • {car.reg_number || "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              Images: {imagesCount} • Documents: {documentsCount}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onAddDocuments}>
              <FilePlus className="w-4 h-4 mr-2" />
              Add documents
            </Button>
            <Button onClick={onAddImages}>
              <ImagePlus className="w-4 h-4 mr-2" />
              Add photos
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
