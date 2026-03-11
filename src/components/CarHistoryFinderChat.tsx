import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useCarHistoryFinder from "@/hooks/useCarHistoryFinder";
import type { Car } from "@/hooks/useCars";
import { uploadCarDocument } from "@/lib/storage";
import { Download, FileText, Loader2, RefreshCw, Upload } from "lucide-react";

type HistoryClient = ReturnType<typeof useCarHistoryFinder>;
type DocumentSection = { title: string; body: string };

export default function CarHistoryFinderChat({
  car,
  client,
  onExportPdf,
}: {
  car: Partial<Car>;
  client?: HistoryClient;
  onExportPdf?: () => void;
}) {
  const carId = (car as any)?.id;
  const [uploading, setUploading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const fallbackClient = useCarHistoryFinder(car);
  const { summary, loading, error, run } = client ?? fallbackClient;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Treat persisted history as already generated so it survives reloads/resets.
    setHasGenerated(Boolean((summary || "").trim()));
  }, [carId, summary]);

  const canGenerate = Boolean(
    (car as any)?.reg_number ||
      (car as any)?.registration ||
      (car as any)?.reg ||
      car?.make ||
      car?.model ||
      car?.year ||
      (car as any)?.id
  );

  const vehicleLabel = useMemo(() => {
    const mk = [car?.make, car?.model].filter(Boolean).join(" ");
    const yr = car?.year ? `${car.year}` : "";
    const reg = (car as any)?.reg_number || (car as any)?.registration || (car as any)?.reg || "";
    return [yr, mk, reg].filter(Boolean).join(" ").trim() || "This vehicle";
  }, [car]);

  const cleanedSummary = useMemo(() => {
    return (summary || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }, [summary]);
  const hasExistingHistory = cleanedSummary.length > 0;
  const hasVisibleHistory = hasGenerated && hasExistingHistory;

  const sections = useMemo<DocumentSection[]>(() => {
    if (!cleanedSummary) return [];

    const chunks = cleanedSummary
      .split(/(?=^\s*\d+\)\s+)/gm)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (chunks.length <= 1) {
      return [{ title: "History report", body: cleanedSummary }];
    }

    return chunks.map((chunk, idx) => {
      const lines = chunk.split("\n");
      const firstLine = (lines[0] || "").trim();
      const body = lines.slice(1).join("\n").trim();
      return {
        title: firstLine || `Section ${idx + 1}`,
        body: body || "Insufficient evidence from current uploads.",
      };
    });
  }, [cleanedSummary]);

  const generateHistory = async () => {
    try {
      await run(undefined, true);
      setHasGenerated(true);
    } catch (e: any) {
      console.error("History generation failed", e);
    }
  };

  const handleGenerateIntent = () => {
    if (!canGenerate) return;
    void generateHistory();
  };

  const downloadText = () => {
    if (!cleanedSummary) return;
    const mk = [car?.make, car?.model].filter(Boolean).join("-");
    const reg =
      (car as any)?.reg_number ||
      (car as any)?.registration ||
      (car as any)?.reg ||
      "vehicle";
    const fileName = `${String(reg).replace(/\s+/g, "").toLowerCase()}-${mk || "history-report"}.txt`;
    const blob = new Blob([cleanedSummary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (!carId) {
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        await uploadCarDocument(carId, file);
      }
    } catch (e: any) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="relative overflow-hidden border border-white/15 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 shadow-2xl rounded-[30px]">
      <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_15%_12%,rgba(56,189,248,.16),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(16,185,129,.14),transparent_36%),radial-gradient(circle_at_75%_85%,rgba(14,116,144,.14),transparent_35%)]" />
      <CardContent className="relative p-4 md:p-6">
        <div className="space-y-4 md:space-y-5">
          <div className="rounded-[22px] border border-white/15 bg-white/[0.06] backdrop-blur-md p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200/80">
                  History document
                </p>
                <h3 className="mt-1 text-base md:text-xl font-semibold text-white">{vehicleLabel}</h3>
                <p className="mt-1 text-xs text-white/65">Evidence-led report mode.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs px-3 py-1.5 rounded-full border backdrop-blur-sm ${
                  loading
                    ? "border-amber-300/50 text-amber-100 bg-amber-400/20"
                    : "border-emerald-300/50 text-emerald-100 bg-emerald-400/20"
                }`}
                >
                  {loading ? "Analyzing" : "Ready"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-white/25 bg-white/5 hover:bg-white/15"
                  onClick={downloadText}
                  disabled={!hasVisibleHistory || !cleanedSummary}
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Download .txt
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-white text-slate-900 hover:bg-white/90"
                  onClick={onExportPdf}
                  disabled={!hasVisibleHistory || !cleanedSummary || !onExportPdf}
                >
                  <FileText className="mr-1.5 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border border-white/15 bg-black/25 backdrop-blur-sm p-3 text-left hover:bg-black/35 transition-colors"
                disabled={uploading}
              >
                <p className="font-medium text-white inline-flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Upload evidence
                </p>
                <p className="text-white/65 mt-1">
                  Add documents, certificates, and images.
                </p>
              </button>
              <button
                type="button"
                onClick={handleGenerateIntent}
                disabled={loading || uploading || !canGenerate}
                className="rounded-2xl border border-sky-300/40 bg-sky-500/15 backdrop-blur-sm p-3 text-left hover:bg-sky-500/25 transition-colors disabled:opacity-60"
              >
                <p className="font-medium text-white inline-flex items-center gap-1.5">
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {hasExistingHistory ? "Update full AI history report" : "Generate full AI history report"}
                </p>
                <p className="text-white/65 mt-1">
                  Click to generate when you are ready.
                </p>
              </button>
              <div className="rounded-2xl border border-white/15 bg-black/25 backdrop-blur-sm p-3">
                <p className="font-medium text-white">Living document</p>
                <p className="text-white/65 mt-1">
                  Export from this panel when you are ready.
                </p>
              </div>
            </div>

          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/50 backdrop-blur-md p-4 md:p-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.heic,.webp,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*,text/plain"
            />

            {hasVisibleHistory && sections.length > 0 && (
              <div className="space-y-4 md:space-y-5">
                {sections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5"
                  >
                    <h4 className="text-sm md:text-base font-semibold tracking-wide text-sky-100">
                      {section.title}
                    </h4>
                    <div className="mt-3 space-y-3">
                      {section.body
                        .split(/\n\s*\n/)
                        .filter(Boolean)
                        .map((paragraph, idx) => (
                          <p
                            key={`${section.title}-${idx}`}
                            className="whitespace-pre-wrap text-sm leading-relaxed text-white/90"
                          >
                            {paragraph.trim()}
                          </p>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {hasGenerated && !sections.length && loading && (
              <div className="flex items-center justify-center gap-2 py-16 text-white/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building history document...
              </div>
            )}

            {!hasVisibleHistory && !loading && (
              <div className="py-16 text-center">
                <p className="text-sm text-white/85">
                  Have you uploaded all relevant information and evidence?
                </p>
                <p className="mt-2 text-xs text-white/60">
                  If yes, press {hasExistingHistory ? "Update history" : "Generate history"}. If not, continue to upload and run it when ready.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-white/12 bg-white/[0.04] backdrop-blur-md p-3.5 md:p-4 space-y-3">
            <div className="grid gap-2.5 md:grid-cols-[auto_auto] items-end justify-end">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-white/25 bg-white/5 hover:bg-white/15"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-4 w-4" />
                    Upload docs
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-white/55">Upload evidence and refresh to rebuild the report.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

