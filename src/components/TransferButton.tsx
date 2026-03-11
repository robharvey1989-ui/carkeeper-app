import { useState } from "react";
import { Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Using shadcn's AlertDialog primitives. If your project exports them from
 * "@/components/ui/dialog" instead, change the import path below to:
 *    "@/components/ui/dialog"
 */
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import StartTransfer from "@/components/StartTransfer";

type Props = {
  carId: string;
};

/**
 * Subtle transfer control:
 * - Small outline button (low attention)
 * - Opens a dialog; no destructive action occurs here
 * - The actual “ownership change” only happens when recipient accepts
 */
export default function TransferButton({ carId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-white/80 hover:text-white"
          aria-label="Transfer car to another account"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Transfer</span>
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
            Transfer this car
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/70">
            Generate a secure link to move this car to another CarKeeper
            account. The recipient must sign in and accept. Nothing changes
            until they confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Your existing component that generates the token/link */}
        <div className="mt-2">
          <StartTransfer carId={carId} />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
