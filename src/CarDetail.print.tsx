// src/pages/CarDetail.tsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getPrimaryImageUrl, getSortedImageUrls } from "@/lib/media";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import AddImagesDialog from "@/components/AddImagesDialog";
import AddDocumentsDialog from "@/components/AddDocumentsDialog";
import ImageGalleryView from "@/components/ImageGalleryView";
import MaintenancePanel from "@/components/MaintenancePanel";
import ServiceSchedulesPanel from "@/components/ServiceSchedulesPanel";
import SectionNav, { SectionKey } from "@/components/SectionNav";
import CarStage from "@/components/CarStage";
import StatusSummary from "@/components/StatusSummary";
import VehicleDetailsCard from "@/components/VehicleDetailsCard";
import LegalDetailsCard from "@/components/LegalDetailsCard";
// Story & provenance printout removed
import { useServiceSchedules } from "@/hooks/useServiceSchedules";
import { useMileage } from "@/hooks/useMileage";
import { useVehicleGovData } from "@/hooks/useVehicleGovData";
import EditCarDialog from "@/components/EditCarDialog";
const PDFExportDialog = lazy(() => import("@/components/PDFExportDialog"));
import CostSummary from "@/components/CostSummary";

type Id = string;

type CarRow = {
  id: Id;
  // Keep these optional so we don't break if columns differ in your DB
  make?: string | null;
  model?: string | null;
  year?: number | null;
  reg?: string | null;
  registration?: string | null;
};

type CarImage = { url: string; name?: string | null; type?: string; size?: number; storage_path?: string };

type DocRow = {
  id: Id;
  car_id: Id;
  storage_path: string;
  name: string | null;
  created_at: string;
  analysis_detected?: { mileage?: number | string | null } | null;
  analysis_summary?: string | null;
  analysis_text?: string | null;
};

export default function CarDetail() {
  const { id } = useParams<{ id: Id }>();
  const carId = id as Id;

  const [loading, setLoading] = useState(true);
  const [car, setCar] = useState<CarRow | null>(null);
  // images are stored on the car row (car.images)
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState(false);
  const { items: scheduleItems } = useServiceSchedules(carId);
  const { items: mileageItems } = useMileage(carId);
  const [editOpen, setEditOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    // Initialize notes draft from car once loaded
    const text = (car as any)?.notes ?? (car as any)?.story_notes ?? "";
    setNotesDraft(text || "");
  }, [car]);

  function selectSection(key: SectionKey) {
    if (activeSection === key) {
      setActiveSection(null);
      setShowMaintenance(false);
      setShowMedia(false);
      setShowDocuments(false);
      setShowNotes(false);
      setShowHistory(false);
      return;
    }
    setActiveSection(key);
    setShowMaintenance(key === "maintenance" || key === "expenses");
    setShowMedia(key === "media");
    setShowDocuments(key === "documents");
    setShowNotes(key === "notes");
    setShowHistory(key === "timeline");
  }

  // Derived: a friendly title
  const title = useMemo(() => {
    if (!car) return "";
    const parts = [car.make, car.model].filter(Boolean).join(" ");
    return parts || "Car";
  }, [car]);

  // Best-effort reg (your schema might use reg or registration)
  const reg = useMemo(() => {
    if (!car) return "";
    return (car as any).registration || (car as any).reg || (car as any).reg_number || "";
  }, [car]);

  // Optional: live MOT/Tax via proxy API if configured
  const { data: govData } = useVehicleGovData(reg || null);

  const prefer = (manual: any, live: any) => {
    const m = manual as any;
    if (m !== null && m !== undefined) {
      const s = typeof m === 'string' ? m.trim() : m;
      if (s !== '' && s !== undefined && s !== null) return manual;
    }
    return live;
  };

  const mergedLegalCar = useMemo(() => {
    if (!car) return null as any;
    return {
      ...(car as any),
      // Prefer manual values; fall back to live data
      mot_expiry: prefer((car as any)?.mot_expiry, govData?.motExpiry) ?? null,
      tax_due: prefer((car as any)?.tax_due, govData?.taxDue) ?? null,
      tax_status: prefer((car as any)?.tax_status, govData?.taxStatus) ?? undefined,
      export_marker: prefer((car as any)?.export_marker, (govData as any)?.markedForExport ? 'Yes' : (govData as any)?.markedForExport === false ? 'No' : undefined) ?? undefined,
      logbook_date: prefer((car as any)?.logbook_date, (govData as any)?.v5cIssuedDate) ?? undefined,
      type_approval: prefer((car as any)?.type_approval, (govData as any)?.typeApproval) ?? undefined,
      wheelplan: prefer((car as any)?.wheelplan, (govData as any)?.wheelplan) ?? undefined,
      revenue_weight: prefer((car as any)?.revenue_weight, (govData as any)?.revenueWeight) ?? undefined,
    } as any;
  }, [car, govData]);

  const mergedVehicleCar = useMemo(() => {
    if (!car) return null as any;
    return {
      ...(car as any),
      // Prefer manual values first
      make: prefer((car as any)?.make, govData?.make),
      model: prefer((car as any)?.model, govData?.model),
      original_color: prefer((car as any)?.original_color, govData?.colour),
      fuel_type: prefer((car as any)?.fuel_type, govData?.fuelType),
      original_reg_date: prefer((car as any)?.original_reg_date, govData?.firstRegistration),
      year_of_manufacture: prefer((car as any)?.year_of_manufacture, (govData as any)?.yearOfManufacture),
      cylinder_capacity: prefer((car as any)?.cylinder_capacity, (govData as any)?.cylinderCapacity),
      co2_emissions: prefer((car as any)?.co2_emissions, (govData as any)?.co2Emissions),
      euro_status: prefer((car as any)?.euro_status, (govData as any)?.euroStatus),
      rde: prefer((car as any)?.rde, (govData as any)?.rde),
      last_mot_mileage: prefer((car as any)?.last_mot_mileage, (govData as any)?.lastMotMileage),
    } as any;
  }, [car, govData]);

  // For Story & Provenance, surface DVLA/DVSA fields even if not persisted yet
  const mergedProvenanceCar = useMemo(() => {
    if (!car) return null as any;
    return {
      ...(car as any),
      original_reg_date: prefer((car as any)?.original_reg_date, govData?.firstRegistration) ?? null,
      original_color: prefer((car as any)?.original_color, govData?.colour) ?? null,
      fuel_type: prefer((car as any)?.fuel_type, govData?.fuelType) ?? null,
    } as any;
  }, [car, govData]);

  // Optional: persist live data back to DB when available
  useEffect(() => {
    const autoSave = (import.meta as any)?.env?.VITE_AUTO_SAVE_GOV_DATA === "true";
    if (!autoSave) return;
    if (!car || !carId) return;
    if (!govData) return;
    const updates: any = {};
    // Only fill blanks; do not overwrite manual entries
    if (govData.motExpiry && !(car as any)?.mot_expiry) updates.mot_expiry = govData.motExpiry;
    if (govData.taxDue && !(car as any)?.tax_due) updates.tax_due = govData.taxDue;
    if (govData.firstRegistration && !(car as any)?.original_reg_date) updates.original_reg_date = govData.firstRegistration;
    if (govData.colour && !(car as any)?.original_color) updates.original_color = govData.colour;
    if (govData.fuelType && !(car as any)?.fuel_type) updates.fuel_type = govData.fuelType;
    if (govData.make && !(car as any)?.make) updates.make = govData.make;
    if (govData.model && !(car as any)?.model) updates.model = govData.model;
    if (Object.keys(updates).length === 0) return;
    (async () => {
      const { data, error } = await supabase
        .from("cars")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", carId)
        .select("*")
        .maybeSingle();
      if (!error && data) setCar(data as any);
    })();
  }, [govData, car, carId]);

  const lastMileage = useMemo(() => {
    if (!mileageItems || mileageItems.length === 0) return null;
    return Math.max(...mileageItems.map((m) => Number((m as any).odometer) || 0));
  }, [mileageItems]);

  const displayMileage = useMemo(() => {
    const toNumber = (val: any) => {
      if (val == null) return null;
      const n = Number(String(val).replace(/[^\d.]/g, ""));
      if (!Number.isFinite(n)) return null;
      if (n < 100 || n > 400_000) return null;
      return Math.round(n);
    };

    type Candidate = { value: number; priority: number };
    const candidates: Candidate[] = [];

    const push = (priority: number, ...values: any[]) => {
      values.forEach((v) => {
        const n = toNumber(v);
        if (n != null) candidates.push({ value: n, priority });
      });
    };

    push(1, lastMileage);

    push(2, (govData as any)?.lastMotMileage);
    const motTests = Array.isArray((govData as any)?.motTests) ? (govData as any).motTests : [];
    for (const t of motTests) {
      push(2, t?.odometerValue, t?.odometer, t?.odometer_value);
    }
    push(2, (car as any)?.last_mot_mileage, (car as any)?.lastMotMileage);

    push(3, (car as any)?.mileage, (car as any)?.odometer, (car as any)?.last_mot_odometer_value, (car as any)?.last_mot_odometer);

    for (const d of docs) {
      const detected = (d as any)?.analysis_detected;
      if (detected) {
        push(4, (detected as any).mileage, (detected as any).odometer);
      }
    }

    if (!candidates.length) return null as number | null;
    const bestPriority = Math.min(...candidates.map((c) => c.priority));
    const bestValues = candidates.filter((c) => c.priority === bestPriority).map((c) => c.value);
    const bestMax = Math.max(...bestValues);

    const maxOverall = Math.max(...candidates.map((c) => c.value));

    if (maxOverall > bestMax && maxOverall >= 5000 && maxOverall > bestMax * 1.2) {
      return maxOverall;
    }

    return bestMax;
  }, [car, govData, lastMileage, docs]);

  useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      if (!carId) return;

      setLoading(true);

      // 1) Car
      const { data: carData, error: carErr } = await supabase
        .from("cars")
        .select("*")
        .eq("id", carId)
        .maybeSingle();

      if (carErr) {
        console.error("Load car error:", carErr.message);
      }
      if (isMounted) setCar((carData as CarRow) || null);

      // 2) Documents
      const { data: docsData, error: docsErr } = await supabase
        .from("car_documents")
        .select("*")
        .eq("car_id", carId)
        .order("created_at", { ascending: false });

      if (docsErr) {
        console.error("Load documents error:", docsErr.message);
      }
      if (isMounted) setDocs(((docsData || []) as DocRow[]) ?? []);

      if (isMounted) setLoading(false);
    }

    fetchAll();

    return () => {
      isMounted = false;
    };
  }, [carId]);

  // Media carousel state
  const imageUrls = useMemo(() => {
    const sorted = getSortedImageUrls(car);
    if (sorted.length > 0) return sorted;
    const primary = getPrimaryImageUrl(car);
    return primary ? [primary] : [];
  }, [car]);
  const [imgIndex, setImgIndex] = useState(0);
  useEffect(() => { setImgIndex(0); }, [car?.id]);
  const mainImage = imageUrls[imgIndex] || "/placeholder.svg";

  if (!carId) {
    return (
      <div className="p-6">
        <p>Car not found.</p>
        <Link to="/" className="underline">
          Back to Garage
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-4 w-14 rounded bg-white/10 animate-pulse" />
            <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 rounded-md bg-white/10 animate-pulse" />
            <div className="h-9 w-28 rounded-md bg-white/10 animate-pulse" />
            <div className="h-9 w-24 rounded-md bg-white/10 animate-pulse" />
          </div>
        </div>

        <div className="rounded-2xl p-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-6">
              <div className="aspect-video rounded-xl overflow-hidden">
                <div className="h-full w-full bg-white/10 animate-pulse" />
              </div>
            </div>
            <div className="col-span-12 md:col-span-6 space-y-3">
              <div className="h-5 w-2/3 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <>
      {/* Icon section navigation */}
      <div className="sticky top-16 z-20">
        <SectionNav value={activeSection} onChange={selectSection} />
      </div>

      {/* HERO AREA (frameless) */}
      <div className="animate-fade-in-up">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-6">
              <CarStage
                imageUrl={mainImage}
                title={title}
                onPrev={imageUrls.length > 1 ? () => setImgIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length) : undefined}
                onNext={imageUrls.length > 1 ? () => setImgIndex((i) => (i + 1) % imageUrls.length) : undefined}
                variant="default"
                fillBackground={false}
                frameless
                compact
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <div className="space-y-2">
                <div className="text-lg font-medium">{title}</div>
                <div>
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} disabled={!car}>
                    Edit details
                  </Button>
                  <Button size="sm" className="ml-2" onClick={() => setPdfOpen(true)} disabled={!car}>
                    Export PDF
                  </Button>
                </div>
                {/* Year / Reg if available */}
                <div className="text-sm text-muted-foreground">
                  {car?.year ? `${car.year}` : null}
                  {car?.year && reg ? " ? " : ""}
                  {reg}
                </div>
                {reg ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      className="text-xs underline opacity-80 hover:opacity-100"
                      href={`https://www.check-mot.service.gov.uk/results?registration=${encodeURIComponent(reg)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Check MOT history
                    </a>
                  </div>
                ) : null}
              </div>
              {/* Global status next to the image */}
              <div className="mt-3">
                <StatusSummary
                  motExpiry={((car as any)?.mot_expiry ?? govData?.motExpiry) as any}
                  taxDue={((car as any)?.tax_due ?? govData?.taxDue) as any}
                    emphasis="slightly-larger"
                  />
              </div>

              {/* Insurance section removed by request; insurance docs can be uploaded under Documents */}
            </div>
          </div>
      </div>

      {/* Vehicle + Legal details, side-by-side under hero */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {mergedVehicleCar && <VehicleDetailsCard car={mergedVehicleCar} />}
        </div>
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {mergedLegalCar && <LegalDetailsCard car={mergedLegalCar} />}
        </div>
      </div>

            {/* MAINTENANCE (placeholder section - shows toggle and a slot for your existing view) */}
      {showMaintenance && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-6">
              <MaintenancePanel carId={carId} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* DOCUMENTS */}
      {showDocuments && (
        <Card className="animate-fade-in">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddDocumentsDialog
              carId={carId}
              onUploaded={(newItems) =>
                setDocs((prev) => {
                  const mapped = (newItems || []).map((r: any) => ({
                    id: r.id,
                    car_id: carId,
                    storage_path: r.storage_path || "",
                    name: r.name ?? null,
                    created_at: r.created_at || new Date().toISOString(),
                  }));
                  return [...mapped, ...prev];
                })
              }
            />

            {docs.length === 0 ? (
              <div className="rounded-md p-6 text-sm text-muted-foreground bg-transparent">
                No documents yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-md p-3 hover:bg-white/5 transition-colors">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.name || "Document"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleString()}
                      </div>
                    </div>
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        async function getSigned() {
                          // Try primary bucket then fallback to legacy name
                          const attempt = async (bucket: string) => {
                            const { data, error } = await supabase.storage
                              .from(bucket)
                              .createSignedUrl(d.storage_path as any, 3600);
                            return { data, error };
                          };
                          let res = await attempt("car-documents");
                          if (res.error || !res.data?.signedUrl) {
                            res = await attempt("documents");
                          }
                          return res;
                        }
                        const { data, error } = await getSigned();
                        if (error || !data?.signedUrl) {
                          alert("Could not get link. Please ensure you're signed in and the document bucket exists.");
                          return;
                        }
                        window.open(data.signedUrl, "_blank");
                      }}
                      className="text-sm underline"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* MEDIA */}
      {showMedia && (
        <Card className="animate-fade-in">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {car && (
              <div>
                <ImageGalleryView
                  car={car}
                  onUpdated={async () => {
                    const { data } = await supabase.from("cars").select("*").eq("id", carId).maybeSingle();
                    if (data) setCar(data as any);
                  }}
                />
              </div>
            )}

            <div className="mt-2">
              <AddImagesDialog
                carId={carId}
                onUploaded={async () => {
                  const { data } = await supabase.from("cars").select("*").eq("id", carId).maybeSingle();
                  if (data) setCar(data as any);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* NOTES */}
      {showNotes && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              rows={6}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add free-form notes about this car..."
              className="w-full rounded-md bg-white/[0.06] border border-white/15 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!car) return;
                  setSavingNotes(true);
                  try {
                    const { data, error } = await supabase
                      .from("cars")
                      .update({ notes: notesDraft, updated_at: new Date().toISOString() })
                      .eq("id", carId)
                      .select("*")
                      .maybeSingle();
                    if (!error && data) setCar(data as any);
                  } finally {
                    setSavingNotes(false);
                  }
                }}
                disabled={savingNotes}
              >
                {savingNotes ? "Saving..." : "Save notes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setNotesDraft(((car as any)?.notes ?? (car as any)?.story_notes ?? "") || "")}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REMINDERS (service schedules) */}
      {activeSection === "reminders" && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Reminders</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ServiceSchedulesPanel carId={carId} />
          </CardContent>
        </Card>
      )}

      {/* Insights removed */}

      {loading && (
        <div className="text-sm text-muted-foreground">Loading</div>
      )}

      {car && (
        <EditCarDialog
          car={car as any}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={async () => {
            const { data } = await supabase.from("cars").select("*").eq("id", carId).maybeSingle();
            if (data) setCar(data as any);
          }}
        />
      )}
      {car && (
        <Suspense fallback={null}><PDFExportDialog open={pdfOpen} onOpenChange={setPdfOpen} car={car as any} /></Suspense>
      )}
    </>
  );
}











