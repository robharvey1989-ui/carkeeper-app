// src/pages/CarDetail.tsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { getPrimaryImageUrl, getSortedImageUrls } from "@/lib/media";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import AddImagesDialog from "@/components/AddImagesDialog";
import ImageGalleryView from "@/components/ImageGalleryView";
import MaintenancePanel from "@/components/MaintenancePanel";
import ServiceSchedulesPanel from "@/components/ServiceSchedulesPanel";
import RemindersCard from "@/components/RemindersCard";
import SectionNav, { SectionKey } from "@/components/SectionNav";
import CarStage from "@/components/CarStage";
import StatusSummary from "@/components/StatusSummary";
import VehicleDetailsCard from "@/components/VehicleDetailsCard";
import LegalDetailsCard from "@/components/LegalDetailsCard";
import { useServiceSchedules } from "@/hooks/useServiceSchedules";
import { useMileage } from "@/hooks/useMileage";
import { useAuth } from "@/hooks/useAuth";
import { useVehicleGovData } from "@/hooks/useVehicleGovData";
import { useValuation } from "@/hooks/useValuation";
import useCarHistoryFinder from "@/hooks/useCarHistoryFinder";
import EditCarDialog from "@/components/EditCarDialog";
const CarHistoryFinderChat = lazy(() => import("@/components/CarHistoryFinderChat"));
const PDFExportDialog = lazy(() => import("@/components/PDFExportDialog"));
import TransferButton from "@/components/TransferButton";
import TransfersPanel from "@/components/TransfersPanel";
import { uploadCarDocument } from "@/lib/storage";
import {
  FileText as FileTextIcon,
  FileImage,
  Shield,
  Receipt,
  Wrench,
  Folder,
  Pencil,
  Check,
  X,
  Trash2,
  Upload,
} from "lucide-react";

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
  mime_type?: string | null;
  size?: number | null;
  created_at: string;
  analysis_detected?: {
    mileage?: number | string | null;
    registration?: string | null;
    vin?: string | null;
    dates?: string[] | null;
    docType?: string | null;
  } | null;
  analysis_summary?: string | null;
  analysis_text?: string | null;
};

type ReminderRow = {
  id: Id;
  car_id: Id;
  user_id: Id;
  due_date: string;
  is_completed?: boolean | null;
  title?: string | null;
  reminder_type?: string | null;
  created_at?: string | null;
};

type DueTask = {
  key: string;
  title: string;
  due_date: string;
  source: "schedule" | "reminder" | "tax" | "mot" | "document" | "pending";
};

type DocFolderKey =
  | "MOT & Inspection"
  | "Registration & Ownership"
  | "Service & Care"
  | "Invoices & Receipts"
  | "Insurance"
  | "Media & Images"
  | "General Documents";

const DOC_FOLDERS: DocFolderKey[] = [
  "MOT & Inspection",
  "Registration & Ownership",
  "Service & Care",
  "Invoices & Receipts",
  "Insurance",
  "Media & Images",
  "General Documents",
];

function isDocFolderKey(value: unknown): value is DocFolderKey {
  return typeof value === "string" && DOC_FOLDERS.includes(value as DocFolderKey);
}

const unclearNamePattern =
  /^(image\d+|img[_-]?\d+|scan[_-]?\d+|document\d*|doc\d*|file\d*|untitled\d*|new[-_ ]?document|whatsapp.*|screenshot.*)\b/i;

function isUnclearDocumentName(name?: string | null) {
  if (!name) return true;
  const base = name.replace(/\.[a-z0-9]+$/i, "").trim();
  return base.length < 4 || unclearNamePattern.test(base);
}

function classifyDocument(doc: DocRow): DocFolderKey {
  const override = (doc.analysis_detected as any)?.folderOverride;
  if (isDocFolderKey(override)) return override;

  const hay = [
    doc.name || "",
    doc.mime_type || "",
    doc.analysis_summary || "",
    doc.analysis_text || "",
  ]
    .join(" ")
    .toLowerCase();

  if (/mot|inspection|advisory|defect|roadworthiness|test certificate/.test(hay)) {
    return "MOT & Inspection";
  }
  if (/v5c|logbook|registration|keeper|dvla|vin|chassis|ownership/.test(hay)) {
    return "Registration & Ownership";
  }
  if (/service|maintenance|health check|repair|workshop|garage/.test(hay)) {
    return "Service & Care";
  }
  if (/invoice|receipt|bill|paid|payment|sale/.test(hay)) {
    return "Invoices & Receipts";
  }
  if (/insurance|policy|claim|cover/.test(hay)) {
    return "Insurance";
  }
  if (/image|photo|jpeg|jpg|png|webp|heic/.test(hay)) {
    return "Media & Images";
  }
  return "General Documents";
}

function deriveSmartName(doc: DocRow) {
  const folder = classifyDocument(doc);
  const detected = (doc.analysis_detected || {}) as any;
  const date = doc.created_at ? new Date(doc.created_at).toISOString().slice(0, 10) : "";
  const reg =
    typeof detected.registration === "string"
      ? detected.registration.replace(/\s+/g, "").toUpperCase()
      : "";
  const mileage = parseMileageNumber(detected.mileage);
  const docType =
    typeof detected.docType === "string" ? detected.docType.trim() : "";
  const shortId = String(doc.id || "").slice(0, 4);

  let base = folder === "General Documents" ? "Document" : folder.replace(" & ", " ");
  if (docType) base = docType;
  if (reg) base = `${base} ${reg}`;
  if (mileage) base = `${base} ${mileage}mi`;
  if (date) base = `${base} ${date}`;
  if (shortId) base = `${base} ${shortId}`;

  return base.trim();
}

function parseMileageNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value);
  const unitMatch = raw.match(
    /(\d{1,3}(?:[,\s.]\d{3})+|\d{1,6})\s*(?:miles?|mi|km)\b/i
  );
  const genericMatches = raw.match(/\d{1,3}(?:[,\s.]\d{3})+|\d{4,6}/g) || [];
  const token =
    unitMatch?.[1] ??
    genericMatches
      .map((m) => ({ raw: m, val: Number(m.replace(/[,\s.]/g, "")) }))
      .filter((x) => Number.isFinite(x.val))
      .sort((a, b) => b.val - a.val)[0]?.raw ??
    null;
  if (!token) return null;
  const n = Number(token.replace(/[,\s.]/g, ""));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > 999_999) return null;
  return rounded;
}

function normalizeVinCandidate(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 17) return null;
  const corrected = raw.replace(/O/g, "0").replace(/Q/g, "0").replace(/I/g, "1");
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(corrected)) return null;
  return corrected;
}

function extractVinFromDocText(doc: Pick<DocRow, "analysis_text" | "analysis_summary" | "analysis_detected">): string | null {
  const detectedVin = normalizeVinCandidate((doc as any)?.analysis_detected?.vin);
  if (detectedVin) return detectedVin;

  const corpus = [
    typeof doc.analysis_text === "string" ? doc.analysis_text : "",
    typeof doc.analysis_summary === "string" ? doc.analysis_summary : "",
    doc.analysis_detected ? JSON.stringify(doc.analysis_detected) : "",
  ]
    .join(" ")
    .toUpperCase();

  const tokens = corpus.match(/\b[A-Z0-9]{17}\b/g) || [];
  for (const token of tokens) {
    const vin = normalizeVinCandidate(token);
    if (vin) return vin;
  }
  return null;
}

function parseLatestMileageFromHistoryText(input?: string | null): number | null {
  if (!input) return null;
  const text = String(input);
  const lines = text.split(/\r?\n/);
  let best: { ts: number; mileage: number } | null = null;

  const parseDate = (raw: string) => {
    const d = new Date(raw);
    const ts = d.getTime();
    return Number.isFinite(ts) ? ts : null;
  };

  const mileageRx = /(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:miles|mi)\b/i;
  const dateRx =
    /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/;

  for (const line of lines) {
    const m = mileageRx.exec(line);
    const d = dateRx.exec(line);
    if (!m || !d) continue;
    const mileage = parseMileageNumber(m[1]);
    const ts = parseDate(d[1]);
    if (mileage == null || ts == null) continue;
    if (!best || ts > best.ts) best = { ts, mileage };
  }

  return best?.mileage ?? null;
}

function extractMileageCandidates(text?: string | null): number[] {
  if (!text) return [];
  const out: number[] = [];
  // 1) Explicit unit forms, e.g. "65,432 miles"
  const rx = /(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:miles|mi)\b/gi;
  let m: RegExpExecArray | null = null;
  while ((m = rx.exec(text)) !== null) {
    const parsed = parseMileageNumber(m[1]);
    if (parsed != null) out.push(parsed);
  }

  // 2) Label-based forms without units, e.g. "Odometer reading: 65432"
  const labeledRx =
    /\b(?:mileage|odometer(?:\s+reading)?|test mileage)\b[^0-9]{0,24}(\d{1,3}(?:[,\s.]\d{3})+|\d{4,6})\b/gi;
  while ((m = labeledRx.exec(text)) !== null) {
    const parsed = parseMileageNumber(m[1]);
    if (parsed != null) out.push(parsed);
  }

  return out;
}

function normalizeDateToIso(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    const yyyy = Number(dmy[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yyyy >= 1900) {
      return `${yyyy.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd
        .toString()
        .padStart(2, "0")}`;
    }
  }
  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function latestMotExpiryIsoFromGov(govData: any): string | null {
  const direct = normalizeDateToIso(govData?.motExpiry);
  if (direct) return direct;
  const tests = Array.isArray(govData?.motTests) ? govData.motTests : [];
  let bestTs: number | null = null;
  let bestIso: string | null = null;
  for (const t of tests) {
    const iso = normalizeDateToIso(t?.expiryDate ?? t?.completedDate ?? t?.testDate);
    if (!iso) continue;
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) continue;
    if (bestTs == null || ts > bestTs) {
      bestTs = ts;
      bestIso = iso;
    }
  }
  return bestIso;
}

async function ensureSystemReminder(args: {
  carId: string;
  userId: string;
  title: string;
  reminderType: string;
  dueDateIso: string;
  description: string;
}): Promise<boolean> {
  const { carId, userId, title, reminderType, dueDateIso, description } = args;
  const { data: existing, error: findErr } = await supabase
    .from("reminders")
    .select("id,due_date,is_completed,created_at")
    .eq("car_id", carId)
    .eq("user_id", userId)
    .eq("title", title)
    .eq("is_completed", false)
    .order("created_at", { ascending: true });

  if (findErr) {
    console.error(`ensureSystemReminder: find failed for ${title}`, findErr.message);
    return false;
  }

  const rows = (existing || []) as Array<{ id: string; due_date: string }>;
  const sameDate = rows.find((r) => normalizeDateToIso(r.due_date) === dueDateIso);
  if (sameDate) return true;

  if (rows.length > 0) {
    const target = rows[0];
    const { error: updateErr } = await supabase
      .from("reminders")
      .update({
        due_date: dueDateIso,
        reminder_type: reminderType,
        description,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", target.id)
      .eq("user_id", userId);
    if (updateErr) {
      console.error(`ensureSystemReminder: update failed for ${title}`, updateErr.message);
      return false;
    }
    return true;
  }

  const { error: insertErr } = await supabase.from("reminders").insert({
    user_id: userId,
    car_id: carId,
    title,
    description,
    due_date: dueDateIso,
    reminder_type: reminderType,
    is_completed: false,
    reminder_days_before: 14,
  } as any);
  if (insertErr) {
    console.error(`ensureSystemReminder: insert failed for ${title}`, insertErr.message);
    return false;
  }
  return true;
}

function uniqueFutureDates(dates: string[] = []): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out = new Set<string>();
  for (const d of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) continue;
    if (dt >= today) out.add(d);
  }
  return Array.from(out).sort();
}

type AutomationSuggestion = {
  docId: string;
  detailsPatch: Record<string, any>;
  care?: {
    maintenance_type: string;
    service_date: string;
    description: string;
    notes: string;
  };
  reminder?: {
    title: string;
    due_date: string;
    reminder_type: string;
    description: string;
  };
};

type IngestSeenMap = Record<string, { status: "accepted" | "skipped" }>;

type PendingAutomation = {
  storageKey: string;
  seen: IngestSeenMap;
  suggestions: AutomationSuggestion[];
  careCount: number;
  reminderCount: number;
};

type MileageConflict = {
  key: string;
  docId: string;
  docName: string;
  docMileage: number;
  motMileage: number;
};

function dedupeDocsRows(items: DocRow[]): DocRow[] {
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  const out: DocRow[] = [];
  for (const d of items) {
    const idKey = String(d.id || "");
    const pathKey = String(d.storage_path || "");
    if (idKey && seenIds.has(idKey)) continue;
    if (pathKey && seenPaths.has(pathKey)) continue;
    if (idKey) seenIds.add(idKey);
    if (pathKey) seenPaths.add(pathKey);
    out.push(d);
  }
  return out;
}

function readJsonObject<T extends Record<string, any>>(storageKey: string): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {} as T;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as T) : ({} as T);
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore storage cleanup failures
    }
    return {} as T;
  }
}

function buildAutomationSuggestion(doc: DocRow, car: any): AutomationSuggestion | null {
  const detected = (doc.analysis_detected || {}) as any;
  const detailsPatch: Record<string, any> = {};

  const regDetected =
    typeof detected.registration === "string"
      ? detected.registration.replace(/\s+/g, "").toUpperCase()
      : null;
  const vinDetected = extractVinFromDocText(doc);
  const mileageDetected = parseMileageNumber(detected.mileage);
  const docType = String(detected.docType || "").toLowerCase();
  const folder = classifyDocument(doc);

  if (vinDetected && !(car as any)?.original_vin) detailsPatch.original_vin = vinDetected;
  if (regDetected && !(car as any)?.reg_number) detailsPatch.reg_number = regDetected;
  if (mileageDetected && (folder === "MOT & Inspection" || /mot|inspection|test certificate/.test(docType))) {
    const current = parseMileageNumber((car as any)?.last_mot_mileage);
    if (!current || mileageDetected > current) detailsPatch.last_mot_mileage = mileageDetected;
  }

  const summary = doc.analysis_summary || doc.analysis_text?.slice(0, 180) || doc.name || "Document insight";
  const createdDate = (doc.created_at || new Date().toISOString()).slice(0, 10);
  const marker = `[AUTO_DOC:${doc.id}]`;

  let care: AutomationSuggestion["care"];
  if (/mot|inspection|service|maintenance|invoice|receipt|repair/.test(docType)) {
    care = {
      maintenance_type: /mot/.test(docType) ? "MOT" : "Service",
      service_date: createdDate,
      description: doc.name || "Imported from uploaded document",
      notes: `${marker} ${summary}`,
    };
  }

  let reminder: AutomationSuggestion["reminder"];
  const candidateDates = uniqueFutureDates(Array.isArray(detected.dates) ? detected.dates : []);
  if (candidateDates.length > 0) {
    const due = candidateDates[0];
    const type = /mot/.test(docType)
      ? "MOT"
      : /insurance/.test(docType)
        ? "Insurance"
        : "Service";
    reminder = {
      title: /mot/.test(docType)
        ? "MOT reminder"
        : /insurance/.test(docType)
          ? "Insurance reminder"
          : "Maintenance reminder",
      due_date: due,
      reminder_type: type,
      description: `${marker} Suggested from ${doc.name || "uploaded document"}`,
    };
  }

  if (!Object.keys(detailsPatch).length && !care && !reminder) return null;
  return { docId: doc.id, detailsPatch, care, reminder };
}

const sectionReveal = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
};

export default function CarDetail() {
  const { id } = useParams<{ id: Id }>();
  const carId = id as Id;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [car, setCar] = useState<CarRow | null>(null);
  // images are stored on the car row (car.images)
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [reminderItems, setReminderItems] = useState<ReminderRow[]>([]);
  const [selectedDocFolder, setSelectedDocFolder] = useState<DocFolderKey | "All">("All");
  const [docUploading, setDocUploading] = useState(false);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<DocFolderKey | "All" | null>(null);
  const [pendingAutomation, setPendingAutomation] = useState<PendingAutomation | null>(null);
  const [automationApplying, setAutomationApplying] = useState(false);
  const [pendingMileageConflict, setPendingMileageConflict] = useState<MileageConflict | null>(null);
  const [mileageConflictChoice, setMileageConflictChoice] = useState<{ key: string; choice: "mot" | "document" } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey | null>("details");
  const [remindersJumpToken, setRemindersJumpToken] = useState(0);
  const { items: scheduleItems } = useServiceSchedules(carId);
  const { items: mileageItems, add: addMileage } = useMileage(carId);
  const [editOpen, setEditOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const enableMarketInsights = ((import.meta as any)?.env?.VITE_MARKET_INSIGHTS === "true");
  const valuation = useValuation(
    {
      make: (car as any)?.make ?? null,
      model: (car as any)?.model ?? null,
      year: (car as any)?.year ?? null,
      reg: (car as any)?.registration || (car as any)?.reg || (car as any)?.reg_number || null,
    },
    { enabled: enableMarketInsights }
  );

  function selectSection(key: SectionKey) {
    if (activeSection === key) {
      setActiveSection(null);
      return;
    }
    setActiveSection(key);
    // Scroll the detail block into view for minimal movement after tab click
    setTimeout(() => {
      const el = document.getElementById("active-section-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  useEffect(() => {
    if (activeSection !== "reminders" || remindersJumpToken === 0) return;
    setTimeout(() => {
      const el = document.getElementById("reminders-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, [activeSection, remindersJumpToken]);

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
  const historyCar = useMemo(() => {
    if (!car) return null as any;
    return {
      ...(car as any),
      gov_data: govData ?? (car as any)?.gov_data ?? null,
    } as any;
  }, [car, govData]);
  const historyClient = useCarHistoryFinder(historyCar, {
    prefetchGovData: activeSection === "timeline",
  });

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
      last_mot_mileage: (govData as any)?.lastMotMileage ?? (car as any)?.last_mot_mileage ?? null,
    } as any;
  }, [car, govData]);

  const govMotTests = useMemo(
    () => (Array.isArray((govData as any)?.motTests) ? (govData as any).motTests : []),
    [govData]
  );
  const taxDueForReminder = useMemo(
    () => normalizeDateToIso((car as any)?.tax_due) ?? normalizeDateToIso(govData?.taxDue) ?? null,
    [car, govData?.taxDue]
  );
  const motDueForReminder = useMemo(
    () =>
      normalizeDateToIso((car as any)?.mot_expiry) ??
      latestMotExpiryIsoFromGov({ motExpiry: govData?.motExpiry, motTests: govMotTests }) ??
      null,
    [car, govData?.motExpiry, govMotTests]
  );

  // Optional: persist live data back to DB when available
  useEffect(() => {
    const autoSave = (import.meta as any)?.env?.VITE_AUTO_SAVE_GOV_DATA === "true";
    if (!autoSave) return;
    if (!car || !carId || !user?.id) return;
    if (!govData) return;
    const updates: any = {};
    // Only fill blanks; do not overwrite manual entries
    if (motDueForReminder && !(car as any)?.mot_expiry) updates.mot_expiry = motDueForReminder;
    if (govData.taxDue && !(car as any)?.tax_due) updates.tax_due = govData.taxDue;
    if (govData.firstRegistration && !(car as any)?.original_reg_date) updates.original_reg_date = govData.firstRegistration;
    if (govData.colour && !(car as any)?.original_color) updates.original_color = govData.colour;
    if (govData.fuelType && !(car as any)?.fuel_type) updates.fuel_type = govData.fuelType;
    if (govData.make && !(car as any)?.make) updates.make = govData.make;
    if (govData.model && !(car as any)?.model) updates.model = govData.model;
    if ((govData as any)?.lastMotMileage) {
      const latest = Number((govData as any).lastMotMileage);
      const current = Number((car as any)?.last_mot_mileage);
      if (!Number.isFinite(current) || current !== latest) updates.last_mot_mileage = latest;
    }
    if (Object.keys(updates).length === 0) return;
    (async () => {
      const { data, error } = await supabase
        .from("cars")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", carId)
        .eq("user_id", user.id)
        .select("*")
        .maybeSingle();
      if (!error && data) setCar(data as any);
    })();
  }, [govData, car, carId, user?.id, motDueForReminder]);

  // Auto-create a tax due reminder when tax expiry is known.
  useEffect(() => {
    if (!user?.id || !carId) return;
    const rawDue = taxDueForReminder;
    if (!rawDue) return;

    const dueDate = normalizeDateToIso(rawDue);
    if (!dueDate) return;

    let cancelled = false;
    (async () => {
      const ok = await ensureSystemReminder({
        carId,
        userId: user.id,
        title: "Vehicle tax due",
        reminderType: "Tax",
        dueDateIso: dueDate,
        description: "Automatically added from DVLA tax due data.",
      });
      if (!ok) {
        await supabase.from("reminders").insert({
          user_id: user.id,
          car_id: carId,
          title: "Vehicle tax due",
          description: "Automatically added from DVLA tax due data.",
          due_date: dueDate,
          reminder_type: "Tax",
          is_completed: false,
          reminder_days_before: 14,
        } as any);
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, carId, taxDueForReminder]);

  // Auto-create an MOT due reminder when MOT expiry is known.
  useEffect(() => {
    if (!user?.id || !carId) return;
    const rawDue = motDueForReminder;
    if (!rawDue) return;

    const dueDate = normalizeDateToIso(rawDue);
    if (!dueDate) return;

    let cancelled = false;
    (async () => {
      const ok = await ensureSystemReminder({
        carId,
        userId: user.id,
        title: "MOT due",
        reminderType: "MOT",
        dueDateIso: dueDate,
        description: "Automatically added from DVSA MOT expiry data.",
      });
      if (!ok) {
        await supabase.from("reminders").insert({
          user_id: user.id,
          car_id: carId,
          title: "MOT due",
          description: "Automatically added from DVSA MOT expiry data.",
          due_date: dueDate,
          reminder_type: "MOT",
          is_completed: false,
          reminder_days_before: 14,
        } as any);
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, carId, motDueForReminder]);

  // Reconcile MOT reminder after reminders load/update to avoid timing misses.
  useEffect(() => {
    if (!user?.id || !carId || !motDueForReminder) return;
    const dueDate = normalizeDateToIso(motDueForReminder);
    if (!dueDate) return;

    const hasMatch = reminderItems.some((r) => {
      if (r.is_completed) return false;
      const d = normalizeDateToIso(r.due_date);
      if (d !== dueDate) return false;
      const hay = `${r.title || ""} ${r.reminder_type || ""}`.toLowerCase();
      return /\bmot\b/.test(hay);
    });
    if (hasMatch) return;

    void (async () => {
      const ok = await ensureSystemReminder({
        carId,
        userId: user.id,
        title: "MOT due",
        reminderType: "MOT",
        dueDateIso: dueDate,
        description: "Automatically added from DVSA MOT expiry data.",
      });
      if (ok) return;
      // Fallback UI entry so the reminder is still visible even if DB sync fails.
      setReminderItems((prev) => {
        const exists = prev.some((r) => {
          if (r.is_completed) return false;
          const d = normalizeDateToIso(r.due_date);
          if (d !== dueDate) return false;
          const hay = `${r.title || ""} ${r.reminder_type || ""}`.toLowerCase();
          return /\bmot\b/.test(hay);
        });
        if (exists) return prev;
        const local: ReminderRow = {
          id: `local-mot-${carId}-${dueDate}`,
          car_id: carId,
          user_id: user.id,
          due_date: dueDate,
          is_completed: false,
          title: "MOT due",
          reminder_type: "MOT",
          created_at: new Date().toISOString(),
        };
        return [local, ...prev].sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
      });
    })();
  }, [user?.id, carId, motDueForReminder, reminderItems]);

  const lastMileage = useMemo(() => {
    if (!mileageItems || mileageItems.length === 0) return null;
    return Math.max(...mileageItems.map((m) => Number((m as any).odometer) || 0));
  }, [mileageItems]);

  const carYear = (car as any)?.year ?? null;
  const historyTextSource = (car as any)?.history_text ?? null;
  const historyTextMotMileage = useMemo(() => {
    const src = historyClient.summary ?? historyTextSource;
    return parseLatestMileageFromHistoryText(src);
  }, [historyClient.summary, historyTextSource]);

  const officialDocMotMileage = useMemo(() => {
    let best: number | null = null;
    const minLikely = (carYear ?? 0) >= 1990 ? 1000 : 0;
    for (const d of dedupeDocsRows(docs)) {
      const folder = classifyDocument(d);
      const docType = String((d as any)?.analysis_detected?.docType || "").toLowerCase();
      const isOfficialSource =
        folder === "MOT & Inspection" ||
        /mot|inspection|certificate|roadworthiness/.test(docType);
      if (!isOfficialSource) continue;

      const candidates: number[] = [];
      const detected = parseMileageNumber(
        (d as any)?.analysis_detected?.mileage ?? (d as any)?.analysis_detected?.odometer
      );
      if (detected != null) candidates.push(detected);
      candidates.push(...extractMileageCandidates((d as any)?.analysis_text ?? ""));
      candidates.push(...extractMileageCandidates((d as any)?.analysis_summary ?? ""));

      for (const val of candidates) {
        if (val < minLikely) continue;
        if (best == null || val > best) best = val;
      }
    }
    return best;
  }, [docs, carYear]);

  const dueTaskItems = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const maxTs = now.getTime() + 31 * 86400000;

    const parseDateOnlyTs = (value: unknown) => {
      if (!value) return null;
      const s = String(value).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
      const ts = new Date(s).getTime();
      return Number.isFinite(ts) ? ts : null;
    };

    const map = new Map<string, DueTask>();
    const addIfDueSoon = (task: Omit<DueTask, "due_date">, dateLike: unknown) => {
      const ts = parseDateOnlyTs(dateLike);
      if (ts == null) return;
      if (ts < now.getTime() || ts > maxTs) return;
      const dueDate = new Date(ts).toISOString().slice(0, 10);
      const dedupeKey = `${task.key}:${dueDate}`;
      if (!map.has(dedupeKey)) {
        map.set(dedupeKey, { ...task, due_date: dueDate });
      }
    };

    // Service schedules
    for (const s of (scheduleItems || []) as any[]) {
      if (!s.interval_months) continue;
      const base = s.last_done_date ? new Date(s.last_done_date) : (s.created_at ? new Date(s.created_at) : new Date());
      const next = new Date(base.getTime());
      next.setMonth(next.getMonth() + (s.interval_months || 0));
      addIfDueSoon(
        {
          key: `schedule:${s.id || s.maintenance_type || "item"}`,
          title: `${s.name || s.maintenance_type || "Service schedule"} due`,
          source: "schedule",
        },
        next.toISOString().slice(0, 10)
      );
    }

    // Explicit reminders table (includes tax/doc automation reminders)
    for (const r of reminderItems) {
      if (r.is_completed) continue;
      addIfDueSoon(
        {
          key: `reminder:${r.id || r.title || "item"}`,
          title: r.title || r.reminder_type || "Reminder due",
          source: "reminder",
        },
        r.due_date
      );
    }

    // DVLA/DVSA due dates
    addIfDueSoon({ key: "tax", title: "Vehicle tax due", source: "tax" }, taxDueForReminder);
    addIfDueSoon(
      { key: "mot", title: "MOT due", source: "mot" },
      (mergedLegalCar as any)?.mot_expiry ?? govData?.motExpiry ?? null
    );

    // Upcoming dates extracted from uploaded documents (secondary safety net)
    for (const d of dedupeDocsRows(docs)) {
      const folder = classifyDocument(d);
      const docType = String((d as any)?.analysis_detected?.docType || "").toLowerCase();
      const isTaskDoc =
        folder !== "General Documents" &&
        folder !== "Media & Images" &&
        /mot|tax|insurance|service|maintenance|inspection|invoice|receipt|repair/.test(docType || folder.toLowerCase());
      if (!isTaskDoc) continue;

      const dates = Array.isArray((d as any)?.analysis_detected?.dates) ? (d as any).analysis_detected.dates : [];
      for (const dateStr of dates) {
        addIfDueSoon(
          {
            key: `doc:${d.id}`,
            title: `${d.name || "Document task"} due`,
            source: "document",
          },
          dateStr
        );
      }
    }

    // Pending AI suggestions not yet accepted by user
    for (const s of pendingAutomation?.suggestions || []) {
      if (!s.reminder?.due_date) continue;
      addIfDueSoon(
        {
          key: `pending:${s.docId}:${s.reminder.title || "reminder"}`,
          title: s.reminder.title || "Pending reminder",
          source: "pending",
        },
        s.reminder.due_date
      );
    }

    return Array.from(map.values()).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [scheduleItems, reminderItems, taxDueForReminder, mergedLegalCar, govData?.motExpiry, docs, pendingAutomation]);
  const nextDueTask = useMemo(
    () => (dueTaskItems.length > 0 ? dueTaskItems[0] : null),
    [dueTaskItems]
  );

  // Always derive latest MOT mileage from test history by date when available.
  const motMileage = useMemo(() => {
    const parseMileage = (val: any) => parseMileageNumber(val);

    const tests = Array.isArray((govData as any)?.motTests) ? (govData as any).motTests : [];
    if (tests.length) {
      const sorted = [...tests].sort((a: any, b: any) => {
        const da = new Date(a.completedDate || a.testDate || a.expiryDate || 0).getTime();
        const db = new Date(b.completedDate || b.testDate || b.expiryDate || 0).getTime();
        return db - da;
      });
      for (const t of sorted) {
        const parsed = parseMileage(
          t?.odometerValue ??
          t?.odometer ??
          t?.odometer_value ??
          t?.odometerReading ??
          t?.odometer_reading ??
          t?.mileage
        );
        if (parsed != null) return parsed;
      }
    }

    // Tile rule: source from DVSA/gov data first, then persisted gov-derived car field.
    // Do not bootstrap this from uploaded document parsing or AI summary text.
    const raw =
      (govData as any)?.lastMotMileage ??
      (mergedVehicleCar as any)?.last_mot_mileage ??
      null;
    if (raw == null) return null;
    return parseMileage(raw);
  }, [govData, mergedVehicleCar]);

  const hasTrustedMotSource = useMemo(() => {
    const hasTests = Array.isArray((govData as any)?.motTests) && (govData as any).motTests.length > 0;
    return Boolean(
      hasTests ||
      (govData as any)?.lastMotMileage != null ||
      (mergedVehicleCar as any)?.last_mot_mileage != null ||
      historyTextMotMileage != null
    );
  }, [govData, mergedVehicleCar, historyTextMotMileage]);

  const mileageConflict = useMemo(() => {
    const parseMileage = (val: any) => {
      const n = parseMileageNumber(val);
      if (n == null) return null;
      if (n < 100 || n > 400_000) return null;
      return n;
    };
    if (!carId || motMileage == null || !hasTrustedMotSource) return null as MileageConflict | null;

    const candidates = dedupeDocsRows(docs)
      .map((doc) => {
        const folder = classifyDocument(doc);
        const docType = String((doc as any)?.analysis_detected?.docType || "").toLowerCase();
        const isOfficialSource =
          folder === "MOT & Inspection" ||
          /mot|inspection|certificate|roadworthiness/.test(docType);
        if (!isOfficialSource) return null;
        const parsed = parseMileage((doc as any)?.analysis_detected?.mileage ?? (doc as any)?.analysis_detected?.odometer);
        if (parsed == null) return null;
        const diff = Math.abs(parsed - motMileage);
        if (diff < 50) return null;
        return {
          doc,
          docMileage: parsed,
          diff,
        };
      })
      .filter(Boolean) as Array<{ doc: DocRow; docMileage: number; diff: number }>;

    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => {
      const da = new Date(a.doc.created_at || 0).getTime();
      const db = new Date(b.doc.created_at || 0).getTime();
      return db - da;
    })[0];
    const key = `${carId}:${motMileage}:${best.doc.id}:${best.docMileage}`;
    return {
      key,
      docId: best.doc.id,
      docName: best.doc.name || "uploaded document",
      docMileage: best.docMileage,
      motMileage,
    } as MileageConflict;
  }, [docs, motMileage, carId, hasTrustedMotSource]);

  useEffect(() => {
    if (!mileageConflict || pendingMileageConflict) return;
    const storageKey = `car-mileage-decisions:${carId}`;
    const seen = readJsonObject<Record<string, "mot" | "document">>(storageKey);
    const savedChoice = seen[mileageConflict.key] || null;
    if (savedChoice) {
      setMileageConflictChoice({ key: mileageConflict.key, choice: savedChoice });
      return;
    }
    setMileageConflictChoice(null);
    setPendingMileageConflict(mileageConflict);
  }, [mileageConflict, pendingMileageConflict, carId]);

  const resolveMileageConflict = async (choice: "mot" | "document") => {
    if (!pendingMileageConflict || !carId) return;
    const storageKey = `car-mileage-decisions:${carId}`;
    const seen = readJsonObject<Record<string, "mot" | "document">>(storageKey);
    seen[pendingMileageConflict.key] = choice;
    localStorage.setItem(storageKey, JSON.stringify(seen));
    setMileageConflictChoice({ key: pendingMileageConflict.key, choice });

    if (choice === "document" && user?.id) {
      try {
        await addMileage({
          date: new Date().toISOString().slice(0, 10),
          odometer: pendingMileageConflict.docMileage,
          notes: `Confirmed from official document (${pendingMileageConflict.docName})`,
        });
      } catch (e) {
        console.warn("Could not add document-confirmed mileage log", e);
      }
    }

    setPendingMileageConflict(null);
  };

  const displayMileage = useMemo(() => {
    if (motMileage != null) return motMileage;
    if (mileageConflict && mileageConflictChoice?.key === mileageConflict.key && mileageConflictChoice.choice === "document") {
      return mileageConflict.docMileage;
    }
    if (lastMileage != null && lastMileage >= 0 && lastMileage <= 999_999) return lastMileage;
    return null;
  }, [mileageConflict, mileageConflictChoice, motMileage, lastMileage]);

  // Auto-log mileage from latest MOT if not already present
  useEffect(() => {
    if (!user?.id || !carId) return;
    const motVal = motMileage != null ? Number(motMileage) : null;
    if (motVal == null || Number.isNaN(motVal)) return;
    const exists = (mileageItems || []).some((m: any) => Number(m?.odometer) === motVal);
    if (exists) return;
    (async () => {
      try {
        await addMileage({
          date: new Date().toISOString().slice(0, 10),
          odometer: motVal,
          notes: "Imported from latest MOT",
        });
      } catch (e) {
        console.warn("Auto-mileage import failed", e);
      }
    })();
  }, [motMileage, mileageItems, user?.id, carId, addMileage]);

  const openMotHistory = async (vrm: string) => {
    const clean = (vrm || "").toUpperCase().replace(/\s+/g, "");
    if (!clean) return;
    try { await navigator.clipboard?.writeText(clean); } catch {}
    const url = `https://www.check-mot.service.gov.uk/results?registration=${encodeURIComponent(clean)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const documentsWithFolder = useMemo(
    () => dedupeDocsRows(docs).map((d) => ({ ...d, folder: classifyDocument(d) })),
    [docs]
  );

  const folderCards = useMemo(() => {
    const order: (DocFolderKey | "All")[] = [
      "All",
      "Registration & Ownership",
      "MOT & Inspection",
      "Service & Care",
      "Invoices & Receipts",
      "Insurance",
      "Media & Images",
      "General Documents",
    ];

    return order.map((folder) => {
      const items =
        folder === "All"
          ? documentsWithFolder
          : documentsWithFolder.filter((d) => d.folder === folder);
      return {
        folder,
        count: items.length,
        latest: items[0]?.created_at ?? null,
      };
    });
  }, [documentsWithFolder]);

  const visibleDocs = useMemo(() => {
    if (selectedDocFolder === "All") return documentsWithFolder;
    return documentsWithFolder.filter((d) => d.folder === selectedDocFolder);
  }, [documentsWithFolder, selectedDocFolder]);

  const saveDocName = async (docId: string, nextName: string) => {
    const clean = nextName.trim();
    if (!clean) return;
    const { error } = await supabase
      .from("car_documents")
      .update({ name: clean })
      .eq("id", docId);
    if (error) throw error;
    setDocs((prev) =>
      dedupeDocsRows(prev.map((d) => (d.id === docId ? { ...d, name: clean } : d)))
    );
  };

  const moveDocToFolder = async (docId: string, folder: DocFolderKey) => {
    const current = docs.find((d) => d.id === docId);
    if (!current) return;
    const existingDetected = ((current.analysis_detected || {}) as Record<string, unknown>) ?? {};
    const previousOverride = existingDetected.folderOverride;

    if (previousOverride === folder) return;

    setDocs((prev) =>
      dedupeDocsRows(
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                analysis_detected: {
                  ...((d.analysis_detected || {}) as Record<string, unknown>),
                  folderOverride: folder,
                },
              }
            : d
        )
      )
    );

    const { error } = await supabase
      .from("car_documents")
      .update({
        analysis_detected: {
          ...existingDetected,
          folderOverride: folder,
        },
      })
      .eq("id", docId);

    if (error) {
      setDocs((prev) =>
        dedupeDocsRows(
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  analysis_detected: {
                    ...((d.analysis_detected || {}) as Record<string, unknown>),
                    folderOverride: previousOverride,
                  },
                }
              : d
          )
        )
      );
      throw error;
    }
  };

  const removeDoc = async (docId: string) => {
    const old = docs.find((d) => d.id === docId);
    setDocs((prev) => dedupeDocsRows(prev.filter((d) => d.id !== docId)));
    const { error } = await supabase.from("car_documents").delete().eq("id", docId);
    if (error && old) {
      setDocs((prev) => dedupeDocsRows([old, ...prev]));
      throw error;
    }
  };

  const uploadDocs = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (!carId || files.length === 0) return;
    setDocUploading(true);
    try {
      const inserted: DocRow[] = [];
      for (const file of files) {
        const { documentId } = await uploadCarDocument(carId, file);
        const { data } = await supabase
          .from("car_documents")
          .select("*")
          .eq("id", documentId)
          .maybeSingle();
        if (data) inserted.push(data as DocRow);
      }
      if (inserted.length) {
        setDocs((prev) => dedupeDocsRows([...inserted, ...prev]));
      }
    } finally {
      setDocUploading(false);
    }
  };

  const resolveAutomationDecision = async (approve: boolean) => {
    if (!pendingAutomation || !user?.id || !carId) {
      setPendingAutomation(null);
      return;
    }

    const { suggestions, seen, storageKey } = pendingAutomation;
    const next = { ...seen };

    if (!approve) {
      suggestions.forEach((s) => { next[s.docId] = { status: "skipped" }; });
      localStorage.setItem(storageKey, JSON.stringify(next));
      setPendingAutomation(null);
      return;
    }

    setAutomationApplying(true);
    try {
      for (const s of suggestions) {
        if (s.care) {
          const marker = `[AUTO_DOC:${s.docId}]`;
          const { data: existing } = await supabase
            .from("maintenance_records")
            .select("id")
            .eq("car_id", carId)
            .eq("user_id", user.id)
            .ilike("notes", `%${marker}%`)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from("maintenance_records").insert({
              user_id: user.id,
              car_id: carId,
              maintenance_type: s.care.maintenance_type,
              service_date: s.care.service_date,
              description: s.care.description,
              notes: s.care.notes,
            } as any);
          }
        }

        if (s.reminder) {
          const marker = `[AUTO_DOC:${s.docId}]`;
          const { data: existing } = await supabase
            .from("reminders")
            .select("id")
            .eq("car_id", carId)
            .eq("user_id", user.id)
            .eq("title", s.reminder.title)
            .eq("due_date", s.reminder.due_date)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from("reminders").insert({
              user_id: user.id,
              car_id: carId,
              title: s.reminder.title,
              description: `${marker} ${s.reminder.description}`,
              due_date: s.reminder.due_date,
              reminder_type: s.reminder.reminder_type,
              is_completed: false,
              reminder_days_before: 7,
            } as any);
          }
        }

        next[s.docId] = { status: "accepted" };
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
    } finally {
      setAutomationApplying(false);
      setPendingAutomation(null);
    }
  };

  // Auto-name unclear uploads using lightweight "AI-style" categorisation.
  // User-provided clear names are preserved.
  useEffect(() => {
    if (!docs.length) return;
    const candidates = docs.filter((d) => isUnclearDocumentName(d.name));
    if (!candidates.length) return;

    let cancelled = false;
    (async () => {
      for (const doc of candidates) {
        if (cancelled) return;
        const proposed = deriveSmartName(doc);
        if (!proposed || proposed === doc.name) continue;
        try {
          await saveDocName(doc.id, proposed);
        } catch {
          // Non-blocking; user can still rename manually.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docs]);

  useEffect(() => {
    if (!user?.id || !carId || !car) return;
    if (!docs.length) return;
    if (pendingAutomation || automationApplying) return;

    const storageKey = `mcv.doc.ingest.${carId}`;
    const seen = readJsonObject<Record<string, { status: "accepted" | "skipped" }>>(storageKey);

    const candidates = docs
      .filter((d) => !seen[d.id])
      .filter((d) => Boolean(d.analysis_summary || d.analysis_text || d.analysis_detected))
      .map((d) => buildAutomationSuggestion(d, car))
      .filter(Boolean) as AutomationSuggestion[];

    if (!candidates.length) return;
    let cancelled = false;

    (async () => {
      // 1) Apply safe Details updates automatically.
      const detailsPatch: Record<string, any> = {};
      for (const c of candidates) {
        Object.assign(detailsPatch, c.detailsPatch || {});
      }
      if (Object.keys(detailsPatch).length) {
        const { data, error } = await supabase
          .from("cars")
          .update({ ...detailsPatch, updated_at: new Date().toISOString() })
          .eq("id", carId)
          .eq("user_id", user.id)
          .select("*")
          .maybeSingle();
        if (!cancelled && !error && data) setCar(data as any);
      }

      // 2) Ask before adding to Care/Reminders.
      const careCount = candidates.filter((c) => c.care).length;
      const reminderCount = candidates.filter((c) => c.reminder).length;
      if (careCount === 0 && reminderCount === 0) {
        const next = { ...seen };
        candidates.forEach((c) => { next[c.docId] = { status: "accepted" }; });
        localStorage.setItem(storageKey, JSON.stringify(next));
        return;
      }
      if (!cancelled) {
        setPendingAutomation({
          storageKey,
          seen,
          suggestions: candidates,
          careCount,
          reminderCount,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [docs, car, carId, user?.id, pendingAutomation, automationApplying]);

  useEffect(() => {
    let isMounted = true;
    if (!carId || !user?.id) {
      setCar(null);
      setDocs([]);
      setReminderItems([]);
      setLoading(false);
      return () => { isMounted = false; };
    }

    async function fetchAll() {
      setLoading(true);

      // 1) Car scoped to user
      const { data: carData, error: carErr } = await supabase
        .from("cars")
        .select("*")
        .eq("id", carId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (carErr) {
        console.error("Load car error:", carErr.message);
      }
      if (isMounted) setCar((carData as CarRow) || null);

      // 2) Documents scoped to user + car
      const { data: docsData, error: docsErr } = await supabase
        .from("car_documents")
        .select("*")
        .eq("car_id", carId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (docsErr) {
        console.error("Load documents error:", docsErr.message);
      }
      if (isMounted) setDocs(dedupeDocsRows((((docsData || []) as DocRow[]) ?? [])));

      // 3) Reminders scoped to user + car
      const { data: remindersData, error: remindersErr } = await supabase
        .from("reminders")
        .select("id,car_id,user_id,due_date,is_completed,title,reminder_type,created_at")
        .eq("car_id", carId)
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });

      if (remindersErr) {
        console.error("Load reminders error:", remindersErr.message);
      }
      if (isMounted) setReminderItems((((remindersData || []) as ReminderRow[]) ?? []));

      if (isMounted) setLoading(false);
    }

    fetchAll();

    const channel = supabase
      .channel(`car-detail-${carId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cars", filter: `id=eq.${carId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id !== user.id) return;
          setCar(row as CarRow);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "cars", filter: `id=eq.${carId}` },
        (payload) => {
          if ((payload.old as any)?.user_id !== user.id) return;
          setCar(null);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "car_documents", filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id && row.user_id !== user.id) return;
          setDocs((prev) => {
            const exists = prev.some((d) => d.id === row.id);
            const merged = exists
              ? prev.map((d) => (d.id === row.id ? (row as DocRow) : d))
              : [row as DocRow, ...prev];
            return dedupeDocsRows(merged);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "car_documents", filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id && row.user_id !== user.id) return;
          setDocs((prev) => {
            if (prev.some((d) => d.id === row.id)) return dedupeDocsRows(prev);
            return dedupeDocsRows([row as DocRow, ...prev]);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "car_documents", filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.old as any;
          if (row.user_id && row.user_id !== user.id) return;
          setDocs((prev) => dedupeDocsRows(prev.filter((d) => d.id !== row.id)));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reminders", filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id && row.user_id !== user.id) return;
          setReminderItems((prev) => {
            const next = prev.some((r) => r.id === row.id)
              ? prev.map((r) => (r.id === row.id ? (row as ReminderRow) : r))
              : [row as ReminderRow, ...prev];
            return next.sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reminders", filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id && row.user_id !== user.id) return;
          setReminderItems((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            return [row as ReminderRow, ...prev].sort((a, b) =>
              String(a.due_date).localeCompare(String(b.due_date))
            );
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reminders", filter: `car_id=eq.${carId}` },
        (payload) => {
          const row = payload.old as any;
          if (row.user_id && row.user_id !== user.id) return;
          setReminderItems((prev) => prev.filter((r) => r.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [carId, user?.id]);

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
      <div className="sticky top-[4.5rem] sm:top-16 z-20">
        <SectionNav value={activeSection} onChange={selectSection} />
      </div>

      {/* HERO AREA (frameless) */}
      <motion.div {...sectionReveal} className="animate-fade-in-up">
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
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
              <div className="space-y-3 rounded-2xl p-4 sm:p-5 lux-card">
                <div className="text-xl font-semibold tracking-tight">{title}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="border-white/30 bg-white/5 hover:bg-white/12 lux-press" onClick={() => setEditOpen(true)} disabled={!car}>
                    Edit details
                  </Button>
                  {car && (
                    <span className="align-middle inline-block">
                      <TransferButton carId={carId} />
                    </span>
                  )}
                </div>
                {/* Year / Reg if available */}
                <div className="text-sm text-muted-foreground">
                  {car?.year ? `${car.year}` : null}
                  {car?.year && reg ? " • " : ""}
                  {reg}
                </div>
                {reg ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      className="text-xs underline opacity-80 hover:opacity-100 transition-opacity"
                      onClick={() => openMotHistory(reg)}
                    >
                      Check MOT history
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setRemindersJumpToken((n) => n + 1);
                    selectSection("reminders");
                  }}
                  className={`w-full text-left rounded-xl px-3 py-2 text-xs transition-colors ${
                    nextDueTask
                      ? "border border-amber-300/35 bg-amber-500/10 text-amber-50 hover:bg-amber-500/15"
                      : "border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {nextDueTask ? (
                    <>
                      <span className="font-semibold">Due soon: {nextDueTask.title}</span>
                      <span className="ml-2 text-amber-100/90">
                        {new Date(nextDueTask.due_date).toLocaleDateString()}
                      </span>
                      {dueTaskItems.length > 1 ? (
                        <span className="ml-2 text-amber-100/80">
                          (+{dueTaskItems.length - 1} more)
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="font-medium text-white/75">
                      No tasks due in the next 31 days
                    </span>
                  )}
                </button>
              </div>
              {/* Global status next to the image */}
              <div className="mt-3">
                <StatusSummary
                  motExpiry={((car as any)?.mot_expiry ?? govData?.motExpiry) as any}
                  taxDue={((car as any)?.tax_due ?? govData?.taxDue) as any}
                  emphasis="slightly-larger"
                />
              </div>

              {/* Pending transfers for this car */}
              <TransfersPanel carId={carId} />

              {/* Market valuation + online provenance */}
              {enableMarketInsights && (valuation.loading || valuation.valuation || (valuation.provenance?.length ?? 0) > 0) && (
                <Card className="mt-4 lux-card">
                  <CardHeader>
                    <CardTitle>Market Insight</CardTitle>
                    <p className="text-sm text-muted-foreground">Rough valuation from current listings plus any online mentions of this car.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {valuation.loading && <div className="text-sm text-muted-foreground">Fetching market data...</div>}
                    {!valuation.loading && valuation.error && (
                      <div className="text-sm text-red-500">Could not fetch valuation: {valuation.error}</div>
                    )}
                    {!valuation.loading && !valuation.error && valuation.valuation && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs uppercase text-muted-foreground">Estimated value</div>
                          <div className="text-lg font-semibold">
                            {valuation.valuation.currency} {valuation.valuation.mid.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Range {valuation.valuation.currency} {valuation.valuation.low.toLocaleString()} – {valuation.valuation.currency} {valuation.valuation.high.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-muted-foreground">Samples</div>
                          <div className="text-sm">
                            {valuation.valuation.sampleCount > 0
                              ? `${valuation.valuation.sampleCount} active listings`
                              : "Heuristic estimate (no live listings returned)"}
                          </div>
                          <div className="text-xs text-muted-foreground">Source: {valuation.valuation.source}</div>
                        </div>
                      </div>
                    )}

                    {valuation.provenance?.length > 0 && (
                      <div>
                        <div className="text-xs uppercase text-muted-foreground mb-1">Online provenance</div>
                        <ul className="space-y-2 text-sm">
                          {valuation.provenance.slice(0, 3).map((hit, idx) => (
                            <li key={idx}>
                              {hit.url ? (
                                <a href={hit.url} target="_blank" rel="noreferrer" className="underline">
                                  {hit.text || hit.url}
                                </a>
                              ) : (
                                <span>{hit.text}</span>
                              )}
                              {hit.source && <span className="text-xs text-muted-foreground ml-2">({hit.source}{hit.location ? ` • ${hit.location}` : ""})</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!valuation.loading && !valuation.error && !valuation.valuation && (valuation.provenance?.length ?? 0) === 0 && (
                      <div className="text-sm text-muted-foreground">No live market data found for this car yet.</div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Insurance section removed by request; insurance docs can be uploaded under Documents */}
            </div>
          </div>
      </motion.div>

      {/* Active section content pulled up to minimize scrolling */}
      <motion.div
        key={activeSection ?? "none"}
        {...sectionReveal}
        id="active-section-panel"
        className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 stagger-reveal"
      >
        {activeSection === null && (
          <Card className="animate-fade-in border-white/10 bg-white/[0.03] backdrop-blur-md lux-card">
            <CardContent className="py-8 text-center text-sm text-white/70">
              Select a section above to view details.
            </CardContent>
          </Card>
        )}

        {/* DVLA / VEHICLE DETAILS */}
        {activeSection === "details" && (
          <div className="grid grid-cols-12 gap-4 lg:gap-6 animate-fade-in">
            <div className="col-span-12 lg:col-span-6 space-y-6">
              {mergedVehicleCar && <VehicleDetailsCard car={mergedVehicleCar} />}
            </div>
            <div className="col-span-12 lg:col-span-6 space-y-6">
              {mergedLegalCar && <LegalDetailsCard car={mergedLegalCar} />}
            </div>
          </div>
        )}

        {/* STORY & PROVENANCE (narrative history) */}
        {activeSection === "timeline" && car && (
          <Suspense fallback={null}>
            <CarHistoryFinderChat
              car={historyCar as any}
              client={historyClient}
              onExportPdf={() => setPdfOpen(true)}
            />
          </Suspense>
        )}

        {/* MAINTENANCE */}
        {activeSection === "maintenance" && (
          <Card className="animate-fade-in lux-card">
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
        {activeSection === "documents" && (
          <Card className="animate-fade-in border-white/10 bg-white/[0.03] backdrop-blur-md lux-card">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Documents</CardTitle>
              <label className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white cursor-pointer hover:bg-white/15 transition-colors duration-300">
                <Upload className="h-4 w-4" />
                {docUploading ? "Uploading..." : "Upload files"}
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.heic,.webp,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,text/plain"
                  onChange={(e) => {
                    void uploadDocs(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  disabled={docUploading}
                />
              </label>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {folderCards.map((f) => {
                  const isActive = selectedDocFolder === f.folder;
                  const dropEnabled = f.folder !== "All";
                  const isDragTarget = dropEnabled && dragOverFolder === f.folder;
                  return (
                    <button
                      key={f.folder}
                      type="button"
                      onClick={() => setSelectedDocFolder(f.folder)}
                      onDragOver={(e) => {
                        if (!dropEnabled || !draggingDocId) return;
                        e.preventDefault();
                        setDragOverFolder(f.folder as DocFolderKey);
                      }}
                      onDragLeave={() => {
                        if (dropEnabled && dragOverFolder === f.folder) {
                          setDragOverFolder(null);
                        }
                      }}
                      onDrop={async (e) => {
                        if (!dropEnabled || !draggingDocId) return;
                        e.preventDefault();
                        const docId = e.dataTransfer.getData("text/plain") || draggingDocId;
                        setDragOverFolder(null);
                        if (!docId) return;
                        try {
                          await moveDocToFolder(docId, f.folder as DocFolderKey);
                        } catch (err: any) {
                          alert(err?.message || "Failed to move document");
                        }
                      }}
                      className={`text-left rounded-2xl border p-4 transition-all duration-300 lux-press ${
                        isDragTarget
                          ? "border-emerald-300/70 bg-emerald-500/20 shadow-lg shadow-emerald-900/40"
                          : isActive
                            ? "border-white/40 bg-white/15 shadow-lg shadow-black/30"
                            : "border-white/10 bg-black/20 hover:bg-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2 text-white/90">
                          <Folder className="h-4 w-4" />
                          <span className="text-sm font-medium">{f.folder}</span>
                        </div>
                        <span className="text-xs rounded-full bg-white/15 px-2 py-0.5">{f.count}</span>
                      </div>
                      <div className="mt-2 text-xs text-white/60">
                        {f.latest ? `Latest ${new Date(f.latest).toLocaleDateString()}` : "No documents"}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-white/60">
                Tip: Drag a document card onto a folder tile to move it.
              </div>

              {visibleDocs.length === 0 ? (
                <div className="rounded-md p-6 text-sm text-muted-foreground bg-transparent">
                  No documents in this folder yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {visibleDocs.map((d) => {
                    const icon = d.mime_type?.startsWith("image/")
                      ? <FileImage className="h-4 w-4" />
                      : d.folder === "Insurance"
                        ? <Shield className="h-4 w-4" />
                        : d.folder === "Invoices & Receipts"
                          ? <Receipt className="h-4 w-4" />
                          : d.folder === "Service & Care"
                            ? <Wrench className="h-4 w-4" />
                            : <FileTextIcon className="h-4 w-4" />;

                    return (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingDocId(d.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", d.id);
                        }}
                        onDragEnd={() => {
                          setDraggingDocId(null);
                          setDragOverFolder(null);
                        }}
                        className={`rounded-xl border bg-black/25 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-black/35 hover:shadow-[0_14px_28px_rgba(0,0,0,0.35)] ${
                          draggingDocId === d.id ? "border-emerald-300/70 opacity-80" : "border-white/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="inline-flex items-center gap-2 text-white/80 text-xs uppercase tracking-wide">
                            {icon}
                            {d.folder}
                          </div>
                          <button
                            type="button"
                            className="text-white/60 hover:text-white transition-colors duration-300"
                            onClick={() => {
                              setRenamingDocId(d.id);
                              setRenameValue(d.name || "");
                            }}
                            title="Rename"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>

                        {renamingDocId === d.id ? (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="flex-1 rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                              placeholder="Document name"
                            />
                            <button
                              type="button"
                              className="rounded-md border border-emerald-400/40 bg-emerald-500/20 p-1.5"
                              onClick={async () => {
                                await saveDocName(d.id, renameValue);
                                setRenamingDocId(null);
                                setRenameValue("");
                              }}
                              title="Save"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-white/20 bg-white/10 p-1.5"
                              onClick={() => {
                                setRenamingDocId(null);
                                setRenameValue("");
                              }}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 text-sm font-medium text-white truncate">
                            {d.name || "Document"}
                          </div>
                        )}

                        <div className="mt-1 text-xs text-white/60">
                          {new Date(d.created_at).toLocaleString()}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/15 transition-colors duration-300"
                            onClick={async () => {
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
                              if (!res.data?.signedUrl) {
                                alert("Could not get link. Please ensure you're signed in and the document bucket exists.");
                                return;
                              }
                              window.open(res.data.signedUrl, "_blank");
                            }}
                          >
                            Open
                          </button>
                          <button
                            className="rounded-md border border-red-400/40 bg-red-500/20 px-2.5 py-1.5 text-xs hover:bg-red-500/30 inline-flex items-center gap-1 transition-colors duration-300"
                            onClick={async () => {
                              try {
                                await removeDoc(d.id);
                              } catch (e: any) {
                                alert(e?.message || "Failed to delete document");
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* MEDIA */}
        {activeSection === "media" && (
          <Card className="animate-fade-in lux-card">
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
                    if (!user?.id) return;
                    const { data } = await supabase
                      .from("cars")
                      .select("*")
                    .eq("id", carId)
                    .eq("user_id", user.id)
                    .maybeSingle();
                    if (data) setCar(data as any);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* REMINDERS (service schedules) */}
        {activeSection === "reminders" && (
          <Card id="reminders-panel" className="animate-fade-in lux-card">
            <CardHeader>
              <CardTitle>Reminders</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-6">
                <RemindersCard
                  carId={carId}
                  systemReminders={[
                    ...(taxDueForReminder
                      ? [{
                          title: "Vehicle tax due",
                          description: "Automatically added from DVLA tax due data.",
                          due_date: taxDueForReminder,
                          reminder_type: "Tax",
                        }]
                      : []),
                    ...(motDueForReminder
                      ? [{
                          title: "MOT due",
                          description: "Automatically added from DVSA MOT expiry data.",
                          due_date: motDueForReminder,
                          reminder_type: "MOT",
                        }]
                      : []),
                  ]}
                />
                <ServiceSchedulesPanel carId={carId} />
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

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
            if (!user?.id) return;
            const { data } = await supabase
              .from("cars")
              .select("*")
              .eq("id", carId)
              .eq("user_id", user.id)
              .maybeSingle();
            if (data) setCar(data as any);
          }}
        />
      )}
      {car && (
        <Suspense fallback={null}>
          <PDFExportDialog
            open={pdfOpen}
            onOpenChange={setPdfOpen}
            car={car as any}
            historySummary={historyClient.summary ?? (car as any)?.history_text ?? null}
          />
        </Suspense>
      )}

      <AlertDialog
        open={Boolean(pendingAutomation)}
        onOpenChange={(open) => {
          if (!open && !automationApplying) {
            setPendingAutomation(null);
          }
        }}
      >
        <AlertDialogContent className="border-white/10 bg-slate-950/95 backdrop-blur-xl text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Document Automation Found Updates</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Uploaded documents were analyzed and we found suggested updates.
              Details have been applied automatically where safe.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm space-y-2">
            <div>
              <span className="text-white/60">Care entries:</span>{" "}
              <span className="font-medium">{pendingAutomation?.careCount ?? 0}</span>
            </div>
            <div>
              <span className="text-white/60">Reminder entries:</span>{" "}
              <span className="font-medium">{pendingAutomation?.reminderCount ?? 0}</span>
            </div>
            <div className="text-white/60 text-xs pt-1">
              You can edit or delete any generated item later.
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={(e) => {
                e.preventDefault();
                void resolveAutomationDecision(false);
              }}
              disabled={automationApplying}
            >
              Skip for now
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-white text-slate-900 hover:bg-white/90"
              onClick={(e) => {
                e.preventDefault();
                void resolveAutomationDecision(true);
              }}
              disabled={automationApplying}
            >
              {automationApplying ? "Applying..." : "Add to Care & Reminders"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingMileageConflict)}
        onOpenChange={(open) => {
          if (!open) setPendingMileageConflict(null);
        }}
      >
        <AlertDialogContent className="border-white/10 bg-slate-950/95 backdrop-blur-xl text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Mileage Conflict Found</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Latest MOT history mileage does not match mileage found in an official uploaded document.
              Please confirm which value is correct.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm space-y-2">
            <div>
              <span className="text-white/60">MOT history:</span>{" "}
              <span className="font-medium">{pendingMileageConflict?.motMileage?.toLocaleString()} miles</span>
            </div>
            <div>
              <span className="text-white/60">Uploaded document:</span>{" "}
              <span className="font-medium">{pendingMileageConflict?.docMileage?.toLocaleString()} miles</span>
            </div>
            <div className="text-white/60 text-xs pt-1">
              Source document: {pendingMileageConflict?.docName || "uploaded document"}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={(e) => {
                e.preventDefault();
                void resolveMileageConflict("mot");
              }}
            >
              Keep MOT mileage
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-white text-slate-900 hover:bg-white/90"
              onClick={(e) => {
                e.preventDefault();
                void resolveMileageConflict("document");
              }}
            >
              Use document mileage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}



