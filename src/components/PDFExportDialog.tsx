import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Car } from "@/hooks/useCars";
import { supabase } from "@/integrations/supabase/client";
import { fetchVehicleGovData } from "@/lib/vehicleApi";
import { getPrimaryImageUrl } from "@/lib/media";
import { formatDate } from "@/lib/dateFormat";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: Car;
  historySummary?: string | null;
};

type TimelineEntry = {
  date: string;
  event: string;
  source: string;
  notes?: string;
};

type DocRow = {
  id: string;
  name: string | null;
  storage_path: string;
  mime_type?: string | null;
  created_at: string;
  analysis_summary?: string | null;
  analysis_detected?: Record<string, unknown> | null;
};

type ExpenseRow = {
  amount: number | null;
  expense_date: string | null;
  description?: string | null;
  odometer?: number | null;
  category?: { name?: string | null } | null;
};

type NarrativeBlock = {
  heading: string;
  body: string[];
};

const DATE_RX =
  /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/;

function cleanNarrative(input?: string | null) {
  if (!input) return "";
  return input
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\d+[.)]\s*/gm, "")
    .replace(/^[*\u2022\u2023\u25E6\u2043\u2219-]\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTimelineFromNarrative(input?: string | null): TimelineEntry[] {
  if (!input) return [];
  const rows: TimelineEntry[] = [];
  const lines = cleanNarrative(input)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(DATE_RX);
    if (!match) continue;
    const dateToken = match[1];
    const after = line.replace(dateToken, "").replace(/^[:\-| ]+/, "").trim();
    if (!after) continue;
    rows.push({
      date: dateToken,
      event: after.slice(0, 120),
      source: "AI History",
      notes: line.length > 120 ? line : "",
    });
  }

  return rows.slice(0, 30);
}

function splitNarrativeBlocks(input?: string | null): NarrativeBlock[] {
  const cleaned = cleanNarrative(input);
  if (!cleaned) return [];

  const lines = cleaned
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const blocks: NarrativeBlock[] = [];
  let current: NarrativeBlock | null = null;

  const headingRx = /^(\d+\)\s+.+|[A-Za-z][A-Za-z0-9 &/()'-]{2,}:)$/;
  const softHeadingRx = /^[A-Za-z][A-Za-z0-9 &/()'-]{3,70}$/;

  for (const line of lines) {
    if (headingRx.test(line) || (softHeadingRx.test(line) && !/[.!?]$/.test(line))) {
      if (current) blocks.push(current);
      current = { heading: line.replace(/:$/, ""), body: [] };
      continue;
    }
    if (!current) {
      current = { heading: "Summary", body: [] };
    }
    current.body.push(line.replace(/^[*-]\s+/, ""));
  }

  if (current) blocks.push(current);
  return blocks;
}

function toSalePackTone(input: string) {
  return input
    .replace(/\byour vehicle\b/gi, "this car")
    .replace(/\byour car\b/gi, "this car")
    .replace(/\byou should\b/gi, "the buyer should")
    .replace(/\byour\b/gi, "this");
}

function toIsoDate(value?: string | null) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    const yyyy = Number(dmy[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) {
      return `${yyyy.toString().padStart(4, "0")}-${mm
        .toString()
        .padStart(2, "0")}-${dd.toString().padStart(2, "0")}`;
    }
  }
  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

async function toDataUrl(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function getImageMeta(dataUrl: string): Promise<{ width: number; height: number; format: "JPEG" | "PNG" }> {
  const format = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = dataUrl;
  });
  return { ...size, format };
}

function fitRect(
  srcWidth: number,
  srcHeight: number,
  boxX: number,
  boxY: number,
  boxWidth: number,
  boxHeight: number
) {
  const srcRatio = srcWidth / srcHeight;
  const boxRatio = boxWidth / boxHeight;
  let w = boxWidth;
  let h = boxHeight;
  if (srcRatio > boxRatio) {
    h = w / srcRatio;
  } else {
    w = h * srcRatio;
  }
  const x = boxX + (boxWidth - w) / 2;
  const y = boxY + (boxHeight - h) / 2;
  return { x, y, w, h };
}

async function signedDocUrl(path: string) {
  const tryBucket = async (bucket: string) => {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };
  return (await tryBucket("car-documents")) || (await tryBucket("documents")) || "";
}

export default function PDFExportDialog({ open, onOpenChange, car, historySummary }: Props) {
  const [exportAudience, setExportAudience] = useState<"owner" | "sale">("owner");
  const [exportLayout, setExportLayout] = useState<"digital" | "print">("digital");
  const [generating, setGenerating] = useState(false);

  const reg = useMemo(
    () => (car as any)?.registration || (car as any)?.reg || (car as any)?.reg_number || "",
    [car]
  );

  if (!open) return null;

  async function handleExport() {
    setGenerating(true);
    try {
      const salePack = exportAudience === "sale";
      const printMode = exportLayout === "print";
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 16;
      const topMargin = 16;
      const bottomMargin = 16;
      const contentWidth = pageWidth - marginX * 2;
      const palette = {
        ink: [24, 30, 40] as [number, number, number],
        muted: [104, 114, 129] as [number, number, number],
        accent: [171, 139, 84] as [number, number, number],
        deep: [30, 45, 66] as [number, number, number],
        soft: [248, 249, 251] as [number, number, number],
        paper: [244, 246, 250] as [number, number, number],
        line: [223, 228, 236] as [number, number, number],
      };
      let y = 0;
      const vehicleTitle = [car.year, car.make, car.model].filter(Boolean).join(" ") || "Vehicle Report";

      const addPage = () => {
        doc.addPage();
        y = topMargin;
        doc.setDrawColor(...palette.line);
        doc.setLineWidth(0.22);
        doc.line(marginX - 2, 10, pageWidth - (marginX - 2), 10.1);
        doc.setTextColor(...palette.muted);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.4);
        doc.text(vehicleTitle, marginX, 8);
        y = 18;
        // Reset defaults after page chrome so body text doesn't inherit tiny header font.
        doc.setTextColor(...palette.ink);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.8);
      };
      const ensure = (space: number) => {
        if (y + space > pageHeight - bottomMargin) addPage();
      };

      const sectionTitle = (title: string) => {
        if (y > 30) y += 4;
        ensure(18);
        doc.setFillColor(...palette.soft);
        doc.setDrawColor(...palette.line);
        doc.roundedRect(marginX - 1, y - 5, contentWidth + 2, 10, 1.5, 1.5, "FD");
        doc.setDrawColor(...palette.accent);
        doc.setLineWidth(0.5);
        doc.line(marginX + 1, y - 5, marginX + 1, y + 5);
        doc.setTextColor(...palette.ink);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, marginX + 6, y + 1.4);
        y += 10;
        doc.setDrawColor(...palette.line);
        doc.setLineWidth(0.2);
        doc.line(marginX, y - 1.2, pageWidth - marginX, y - 1.2);
      };

      const tableTheme = {
        styles: {
          fontSize: 9.8,
          cellPadding: 3.2,
          textColor: palette.ink,
          valign: "middle" as const,
          overflow: "linebreak" as const,
          lineColor: palette.line,
          lineWidth: 0.14,
        },
        headStyles: {
          fillColor: [234, 238, 244] as [number, number, number],
          textColor: palette.ink,
          fontStyle: "bold" as const,
        },
        bodyStyles: { fillColor: [252, 253, 255] as [number, number, number] },
        alternateRowStyles: { fillColor: [246, 248, 252] as [number, number, number] },
        margin: { left: marginX, right: marginX },
      };

      const writeNoteTable = (message: string) => {
        autoTable(doc, {
          startY: y,
          columns: [{ header: "Note", dataKey: "note" }],
          body: [{ note: message }],
          ...tableTheme,
          columnStyles: { note: { cellWidth: contentWidth } },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 8;
      };

      const writeNarrativeBlocks = (input: string) => {
        const blocks = splitNarrativeBlocks(input);
        if (blocks.length === 0) {
          writeNoteTable(input || "No narrative details available.");
          return;
        }
        const rows: Array<{ section: string; details: string }> = [];
        for (const block of blocks) {
          const heading = block.heading.replace(/^\d+\)\s*/, "");
          const details = block.body.join(" ").trim() || "No additional details provided.";
          rows.push({ section: heading, details });
        }
        autoTable(doc, {
          startY: y,
          columns: [
            { header: "Section", dataKey: "section" },
            { header: "Details", dataKey: "details" },
          ],
          body: rows,
          ...tableTheme,
          columnStyles: {
            section: { cellWidth: 45, fontStyle: "bold" },
            details: { cellWidth: contentWidth - 45 },
          },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 8;
      };

      const renderPrintImageGrid = async (
        title: string,
        items: Array<{ url: string; caption: string }>
      ) => {
        sectionTitle(title);
        if (items.length === 0) {
          writeNoteTable("No images available for print layout.");
          return;
        }

        const tileGap = 4;
        const cols = 2;
        const tileW = (contentWidth - tileGap * (cols - 1)) / cols;
        const tileH = 60;
        let rowY = y;

        for (let i = 0; i < items.length; i++) {
          const col = i % cols;
          if (col === 0) {
            ensure(tileH + 8);
            rowY = y;
          }
          const item = items[i];
          const x = marginX + col * (tileW + tileGap);
          const boxY = rowY;

          doc.setDrawColor(224, 230, 238);
          doc.setFillColor(248, 250, 253);
          doc.roundedRect(x, boxY, tileW, tileH, 1.5, 1.5, "FD");
          try {
            const img = await toDataUrl(item.url);
            const meta = await getImageMeta(img);
            const fitted = fitRect(meta.width, meta.height, x + 1.5, boxY + 1.5, tileW - 3, tileH - 13);
            doc.addImage(img, meta.format, fitted.x, fitted.y, fitted.w, fitted.h, undefined, "FAST");
          } catch {
            doc.setTextColor(...palette.muted);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.text("Image unavailable in this run", x + 3, boxY + tileH / 2);
            doc.setTextColor(...palette.ink);
            doc.setFont("helvetica", "normal");
          }

          const cap = item.caption || "Image";
          const capLines = doc.splitTextToSize(cap, tileW - 4).slice(0, 2);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.8);
          doc.setTextColor(...palette.ink);
          doc.text(capLines, x + 2, boxY + tileH - 5);

          const rowClosed = col === cols - 1 || i === items.length - 1;
          if (rowClosed) y = rowY + tileH + 6;
        }
      };

      const gov = reg ? await fetchVehicleGovData(reg) : null;
      const narrativeSource = cleanNarrative(historySummary || (car as any)?.history_text || "");
      const narrative = salePack ? toSalePackTone(narrativeSource) : narrativeSource;

      const [eventsRes, expensesRes, docsRes] = await Promise.all([
        supabase
          .from("car_events")
          .select("*")
          .eq("car_id", car.id)
          .order("event_date", { ascending: false }),
        supabase
          .from("expense_records")
          .select("amount,expense_date,description,odometer,category:expense_categories(name)")
          .eq("car_id", car.id)
          .order("expense_date", { ascending: false }),
        supabase
          .from("car_documents")
          .select("id,name,storage_path,mime_type,created_at,analysis_summary,analysis_detected")
          .eq("car_id", car.id)
          .order("created_at", { ascending: false }),
      ]);

      const events = (eventsRes.data || []) as any[];
      const expenses = (expensesRes.data || []) as ExpenseRow[];
      const docs = (docsRes.data || []) as DocRow[];

      doc.setFillColor(...palette.paper);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setFillColor(...palette.accent);
      doc.rect(0, 0, pageWidth, 2.2, "F");
      doc.rect(0, pageHeight - 2.2, pageWidth, 2.2, "F");

      const coverBoxX = marginX;
      const coverBoxY = 18;
      const coverBoxW = contentWidth;
      const coverBoxH = 96;
      doc.setFillColor(241, 245, 250);
      doc.setDrawColor(...palette.line);
      doc.roundedRect(coverBoxX, coverBoxY, coverBoxW, coverBoxH, 3, 3, "FD");

      const heroImage = getPrimaryImageUrl(car as any);
      if (heroImage) {
        try {
          const img = await toDataUrl(heroImage);
          const meta = await getImageMeta(img);
          const fitted = fitRect(meta.width, meta.height, coverBoxX + 2, coverBoxY + 2, coverBoxW - 4, coverBoxH - 4);
          doc.addImage(img, meta.format, fitted.x, fitted.y, fitted.w, fitted.h, undefined, "FAST");
        } catch {
          // Continue without image.
        }
      }

      const coverTitleY = coverBoxY + coverBoxH + 12;
      doc.setTextColor(...palette.ink);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text(vehicleTitle, marginX, coverTitleY);
      doc.setTextColor(...palette.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(`${reg ? `Registration ${reg}` : "Registration not provided"}`, marginX, coverTitleY + 8);
      doc.text(`Generated ${formatDate(new Date())}`, marginX, coverTitleY + 15);

      // CarKeeper branding lockup on the cover.
      const brandY = coverTitleY + 24;
      let brandLogoDrawn = false;
      try {
        const logoData = await toDataUrl("/carkeeper-logo.png");
        const logoMeta = await getImageMeta(logoData);
        const logoH = 8;
        const logoW = (logoMeta.width / logoMeta.height) * logoH;
        doc.addImage(
          logoData,
          logoMeta.format,
          marginX,
          brandY - 6.5,
          logoW,
          logoH,
          undefined,
          "FAST"
        );
        doc.setTextColor(...palette.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.text("Produced with CarKeeper", marginX + logoW + 3, brandY - 0.5);
        brandLogoDrawn = true;
      } catch {
        // Fallback badge when logo asset is unavailable.
      }
      if (!brandLogoDrawn) {
        doc.setFillColor(...palette.deep);
        doc.roundedRect(marginX, brandY - 7.2, 10, 7.2, 1.2, 1.2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("CK", marginX + 2.2, brandY - 2.3);
        doc.setTextColor(...palette.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.text("Produced with CarKeeper", marginX + 13, brandY - 0.5);
      }

      addPage();

      sectionTitle(salePack ? "Vehicle Overview" : "Executive Overview");
      const factRows: Array<{ item: string; value: string }> = [
        { item: "Registration", value: reg || "-" },
        { item: "Make / Model", value: `${car.make ?? "-"} ${car.model ?? ""}`.trim() },
        { item: "Year", value: String(car.year ?? (gov as any)?.yearOfManufacture ?? "-") },
        { item: "First Registration", value: String((car as any)?.original_reg_date ?? gov?.firstRegistration ?? "-") },
        { item: "Fuel Type", value: String((car as any)?.fuel_type ?? gov?.fuelType ?? "-") },
        { item: "MOT Expiry", value: String((car as any)?.mot_expiry ?? gov?.motExpiry ?? "-") },
        { item: "Tax Due", value: String((car as any)?.tax_due ?? gov?.taxDue ?? "-") },
        { item: "VIN", value: String((car as any)?.original_vin ?? "-") },
      ];
      autoTable(doc, {
        startY: y,
        columns: [
          { header: "Detail", dataKey: "item" },
          { header: "Value", dataKey: "value" },
        ],
        body: factRows,
        ...tableTheme,
        columnStyles: {
          item: { cellWidth: 45, fontStyle: "bold" },
          value: { cellWidth: contentWidth - 45 },
        },
      });
      y = ((doc as any).lastAutoTable?.finalY || y) + 8;

      sectionTitle(salePack ? "Vehicle Narrative" : "AI-Written Vehicle Story");
      if (narrative) {
        writeNarrativeBlocks(narrative);
      } else {
        writeNoteTable(
          "No full AI narrative is currently available. Add more documents, maintenance entries, and history notes to enrich this section."
        );
      }

      sectionTitle(salePack ? "Chronology" : "Life Timeline");
      const aiRows = extractTimelineFromNarrative(narrative);
      const eventRows: TimelineEntry[] = events.map((e: any) => ({
        date: e?.event_date || "",
        event: e?.title || e?.type || "Recorded event",
        source: salePack ? "Service record" : "Owner record",
        notes: e?.notes || "",
      }));
      const timeline = [...eventRows, ...aiRows]
        .sort((a, b) => toIsoDate(b.date).localeCompare(toIsoDate(a.date)))
        .slice(0, 80);

      if (timeline.length > 0) {
        autoTable(doc, {
          startY: y,
          columns: [
            { header: "Date", dataKey: "date" },
            { header: "Event", dataKey: "event" },
            { header: "Source", dataKey: "source" },
            { header: "Notes", dataKey: "notes" },
          ],
          body: timeline.map((t) => ({
            date: t.date || "-",
            event: t.event || "-",
            source: t.source || "-",
            notes: (t.notes || "").slice(0, 150) || "-",
          })),
          ...tableTheme,
          columnStyles: {
            date: { cellWidth: 24 },
            event: { cellWidth: 50 },
            source: { cellWidth: 28 },
            notes: { cellWidth: contentWidth - 24 - 50 - 28 },
          },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 8;
      } else {
        writeNoteTable("No timeline entries are currently available.");
      }

      sectionTitle("Ownership Costs");
      const totalEvents = events.reduce((sum, e: any) => sum + (Number(e?.cost) || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
      autoTable(doc, {
        startY: y,
        columns: [
          { header: "Metric", dataKey: "metric" },
          { header: "Value", dataKey: "value" },
        ],
        body: [
          { metric: "Total recorded spend", value: `GBP ${(totalEvents + totalExpenses).toFixed(2)}` },
          { metric: "Expense rows", value: String(expenses.length) },
          { metric: "Care event rows", value: String(events.length) },
        ],
        ...tableTheme,
        columnStyles: {
          metric: { cellWidth: 60, fontStyle: "bold" },
          value: { cellWidth: contentWidth - 60 },
        },
      });
      y = ((doc as any).lastAutoTable?.finalY || y) + 8;

      if (!salePack) {
        autoTable(doc, {
          startY: y,
          columns: [
            { header: "Date", dataKey: "date" },
            { header: "Category", dataKey: "category" },
            { header: "Description", dataKey: "description" },
            { header: "Amount (GBP)", dataKey: "amount" },
            { header: "Mileage", dataKey: "odometer" },
          ],
          body: expenses.map((e) => ({
            date: e.expense_date ? formatDate(e.expense_date) : "-",
            category: e?.category?.name || "General",
            description: (e.description || "-").slice(0, 80),
            amount: Number(e.amount || 0).toFixed(2),
            odometer: e.odometer != null ? String(e.odometer) : "-",
          })),
          ...tableTheme,
          columnStyles: {
            date: { cellWidth: 24 },
            category: { cellWidth: 28 },
            description: { cellWidth: 52 },
            amount: { cellWidth: 30, halign: "right" },
            odometer: { cellWidth: contentWidth - 24 - 28 - 52 - 30, halign: "right" },
          },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 8;
      }

      if (!printMode) {
        sectionTitle("Document Register");
        const docsWithLinks = await Promise.all(
          docs.map(async (d) => {
            const highlights: string[] = [];
            const detected = (d.analysis_detected || {}) as Record<string, unknown>;
            if (detected?.registration) highlights.push(`Reg ${String(detected.registration)}`);
            if (detected?.vin) highlights.push(`VIN ${String(detected.vin)}`);
            if (detected?.mileage) highlights.push(`Mileage ${String(detected.mileage)}`);
            return {
              name: d.name || "Document",
              docType: d.mime_type || "-",
              date: formatDate(d.created_at),
              highlights: (d.analysis_summary || highlights.join(" | ") || "-").slice(0, 90),
              linkText: d.storage_path ? "" : "-",
              _link: d.storage_path ? await signedDocUrl(d.storage_path) : "",
            };
          })
        );
        autoTable(doc, {
          startY: y,
          columns: [
            { header: "Name", dataKey: "name" },
            { header: "Type", dataKey: "docType" },
            { header: "Date", dataKey: "date" },
            { header: "Highlights", dataKey: "highlights" },
            { header: "Link", dataKey: "linkText" },
          ],
          body: docsWithLinks,
          ...tableTheme,
          columnStyles: {
            name: { cellWidth: 36 },
            docType: { cellWidth: 28 },
            date: { cellWidth: 24 },
            highlights: { cellWidth: contentWidth - 36 - 28 - 24 - 18 },
            linkText: { cellWidth: 18, halign: "center" },
          },
          didDrawCell: (data: any) => {
            if (data.section !== "body") return;
            if (data.column.dataKey !== "linkText") return;
            const row = data.row.raw as { _link?: string; linkText?: string };
            if (!row?._link) return;
            doc.setTextColor(31, 78, 160);
            const tx = data.cell.x + data.cell.width / 2 - doc.getTextWidth("Open") / 2;
            const ty = data.cell.y + data.cell.height / 2 + 1.3;
            doc.textWithLink("Open", tx, ty, { url: row._link });
            doc.setTextColor(42, 49, 61);
          },
        });
        y = ((doc as any).lastAutoTable?.finalY || y) + 8;
      }

      const mediaRows = ((car.images || []) as any[]).slice(0, 100).map((m) => ({
        name: m?.name || "Image",
        type: m?.type || "-",
        size: m?.size ? `${Math.round(Number(m.size) / 1024)} KB` : "-",
        link: m?.url ? "" : "-",
        _link: m?.url || "",
      }));

      if (!printMode) {
        sectionTitle("Media Assets");
        if (mediaRows.length === 0) {
          writeNoteTable("No media assets are currently attached.");
        } else {
          autoTable(doc, {
            startY: y,
            columns: [
              { header: "Name", dataKey: "name" },
              { header: "Type", dataKey: "type" },
              { header: "Size", dataKey: "size" },
              { header: "Link", dataKey: "link" },
            ],
            body: mediaRows,
            ...tableTheme,
            columnStyles: {
              name: { cellWidth: 56 },
              type: { cellWidth: 40 },
              size: { cellWidth: contentWidth - 56 - 40 - 20, halign: "right" },
              link: { cellWidth: 20, halign: "center" },
            },
            didDrawCell: (data: any) => {
              if (data.section !== "body") return;
              if (data.column.dataKey !== "link") return;
              const row = data.row.raw as { _link?: string; link?: string };
              if (!row?._link) return;
              doc.setTextColor(31, 78, 160);
              const tx = data.cell.x + data.cell.width / 2 - doc.getTextWidth("Open") / 2;
              const ty = data.cell.y + data.cell.height / 2 + 1.3;
              doc.textWithLink("Open", tx, ty, { url: row._link });
              doc.setTextColor(42, 49, 61);
            },
          });
          y = ((doc as any).lastAutoTable?.finalY || y) + 8;
        }
      }

      if (printMode) {
        const docVisualRows = await Promise.all(
          docs
            .filter((d) => String(d.mime_type || "").toLowerCase().startsWith("image/"))
            .slice(0, 24)
            .map(async (d) => ({
              url: await signedDocUrl(d.storage_path),
              caption: d.name || "Document image",
            }))
        );
        const visualItems = [
          ...mediaRows
            .filter((m) => !!m._link)
            .map((m) => ({ url: String(m._link), caption: `${m.name} (Media)` })),
          ...docVisualRows.filter((d) => !!d.url),
        ].slice(0, 18);
        await renderPrintImageGrid(
          "Visual Appendix",
          visualItems
        );
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...palette.line);
        doc.line(marginX - 2, pageHeight - 11, pageWidth - (marginX - 2), pageHeight - 11);
        doc.setTextColor(...palette.muted);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.text(vehicleTitle, marginX, pageHeight - 6.5);
        const right = `Page ${i} of ${pageCount}`;
        const w = doc.getTextWidth(right);
        doc.text(right, pageWidth - marginX - w, pageHeight - 6.5);
      }

      const suffix = salePack ? "sale-pack" : "owner-report";
      const mode = printMode ? "print" : "digital";
      const file = `${String(reg || car.id || "vehicle").replace(/[^a-zA-Z0-9_-]+/g, "_")}_${suffix}_${mode}.pdf`;
      doc.save(file);
      onOpenChange(false);
    } finally {
      setGenerating(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-center p-4 overflow-y-auto">
      <div className="w-[640px] max-w-[96vw] max-h-[92vh] overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-white shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
        <div className="mb-4">
          <div className="text-xs uppercase tracking-[0.2em] text-amber-300/90">CarKeeper Export</div>
          <div className="mt-1 text-xl font-semibold">Export Document</div>
          <div className="mt-1 text-sm text-white/70">
            Choose one strict export profile: Owner report or For sale pack, then Digital or Print output.
          </div>
        </div>

        <div className="space-y-4 text-sm mb-5">
          <div className="rounded-xl border border-white/15 p-3">
            <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Document Type</div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="exportAudience"
                value="owner"
                checked={exportAudience === "owner"}
                onChange={() => setExportAudience("owner")}
              />
              Owner report
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exportAudience"
                value="sale"
                checked={exportAudience === "sale"}
                onChange={() => setExportAudience("sale")}
              />
              Export for sale (professional buyer-facing pack)
            </label>
          </div>

          <div className="rounded-xl border border-white/15 p-3">
            <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Output Format</div>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="exportLayout"
                value="digital"
                checked={exportLayout === "digital"}
                onChange={() => setExportLayout("digital")}
              />
              Digital only (clickable links and online-friendly layout)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="exportLayout"
                value="print"
                checked={exportLayout === "print"}
                onChange={() => setExportLayout("print")}
              />
              Print (image/document visual grid and print-first layout)
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="rounded-lg border border-white/25 px-3 py-2 text-sm hover:bg-white/10" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
            disabled={generating}
            onClick={handleExport}
          >
            {generating
              ? "Generating..."
              : `Download ${exportAudience === "sale" ? "Sale Pack" : "Owner Report"} (${exportLayout === "print" ? "Print" : "Digital"})`}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}
