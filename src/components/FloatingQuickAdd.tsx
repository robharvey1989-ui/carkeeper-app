// src/components/FloatingQuickAdd.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FilePlus2, Wrench, Wallet, ImagePlus } from "lucide-react";

type Props = {
  onQuickDoc: () => void;
  onQuickMaint: () => void;
  onQuickExpense: () => void;
  onQuickMedia: () => void;
};

export default function FloatingQuickAdd({ onQuickDoc, onQuickMaint, onQuickExpense, onQuickMedia }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="flex flex-col items-end gap-2 mb-2 transition-all" style={{ pointerEvents: open ? "auto" : "none", opacity: open ? 1 : 0, transform: open ? "translateY(0)" : "translateY(8px)" }}>
        <Button size="sm" variant="secondary" className="shadow" onClick={onQuickDoc}>
          <FilePlus2 className="w-4 h-4 mr-2" /> Document
        </Button>
        <Button size="sm" variant="secondary" className="shadow" onClick={onQuickMaint}>
          <Wrench className="w-4 h-4 mr-2" /> Maintenance
        </Button>
        <Button size="sm" variant="secondary" className="shadow" onClick={onQuickExpense}>
          <Wallet className="w-4 h-4 mr-2" /> Expense
        </Button>
        <Button size="sm" variant="secondary" className="shadow" onClick={onQuickMedia}>
          <ImagePlus className="w-4 h-4 mr-2" /> Media
        </Button>
      </div>

      <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" onClick={() => setOpen((v) => !v)} aria-label="Quick add">
        <Plus className={`h-6 w-6 transition-transform ${open ? "rotate-45" : ""}`} />
      </Button>
    </div>
  );
}
