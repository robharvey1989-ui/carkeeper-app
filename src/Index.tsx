import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AddCarDialog from "@/components/AddCarDialog";
import AuthDialog from "@/components/AuthDialog";
import { useCars } from "@/hooks/useCars";
import { getPrimaryImageUrl } from "@/lib/media";

// Placeholder to use if no media resolves or image fails to load
const PLACEHOLDER = "/placeholder.svg";

export default function Index() {
  const { cars, loading, createCar, deleteCar } = useCars();
  const [openAdd, setOpenAdd] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);

  const list = useMemo(() => cars ?? [], [cars]);

  return (
    <div className="am-content pt-4 pb-10">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">Private Collection</p>
          <h1 className="text-3xl md:text-4xl">Garage</h1>
        </div>
        <Button className="btn-primary" onClick={() => setOpenAdd(true)}>Add car</Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden bg-white/[0.04] border-white/10 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="aspect-video">
                  <Skeleton className="h-full w-full rounded-none" />
                </div>
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="bg-white/[0.04] border-white/10 backdrop-blur-sm">
          <CardContent>
            <div className="py-10 text-center text-white/80">
              No cars yet. Click <span className="font-medium">Add car</span> to begin.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((car: any) => {
            const imgUrl = getPrimaryImageUrl(car) || PLACEHOLDER;
            const reg = car.registration || car.reg_number || car.reg || "?";
            return (
              <Link key={car.id} to={`/car/${car.id}`} className="block relative group">
                <Card className="overflow-hidden border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] shadow-[0_18px_36px_rgba(0,0,0,0.32)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-white/25 group-hover:shadow-[0_30px_50px_rgba(0,0,0,0.45)]">
                  <CardContent className="p-0">
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={imgUrl}
                        alt={`${car.make ?? ""} ${car.model ?? ""}`.trim() || "Car cover"}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                        }}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const ok = window.confirm("Delete this car? This cannot be undone.");
                            if (!ok) return;
                            try {
                              await deleteCar(car.id);
                            } catch (err: any) {
                              alert(err?.message || "Failed to delete car");
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="font-semibold text-lg">
                        {(car.make || "").toString()} {(car.model || "").toString()}
                      </div>
                      <div className="text-white/70 text-sm tracking-wide">{reg}</div>
                      <div className="mt-2 flex gap-2 text-xs">
                        {(() => {
                          const d = car?.mot_expiry ? new Date(car.mot_expiry) : null;
                          const s = d ? (d.getTime() >= Date.now() ? 'Valid' : 'Expired') : 'MOT';
                          return <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15">{s}</span>;
                        })()}
                        {(() => {
                          const d = car?.tax_due ? new Date(car.tax_due) : null;
                          const s = d ? (d.getTime() >= Date.now() ? 'Taxed' : 'Overdue') : 'Tax';
                          return <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15">{s}</span>;
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add Car Dialog */}
      <AddCarDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        onCreate={async (data) => {
          try {
            await createCar(data);
            setOpenAdd(false);
          } catch (e: any) {
            const msg = e?.message || String(e);
            if (/not signed in/i.test(msg)) {
              alert("Please sign in to save your car.");
              setOpenAuth(true);
            } else {
              alert(msg || "Failed to save car");
            }
          }
        }}
      />
      <AuthDialog open={openAuth} onOpenChange={setOpenAuth} />
    </div>
  );
}


