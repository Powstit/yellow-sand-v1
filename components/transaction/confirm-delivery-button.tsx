"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ConfirmDeliveryButtonProps {
  transactionId: string;
}

export function ConfirmDeliveryButton({ transactionId }: ConfirmDeliveryButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}/confirm-delivery`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Delivery confirmed — funds are being released to the dealer.");
        router.refresh();
      } else {
        toast.error(data.error ?? "Failed to confirm delivery");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="mt-6 p-4 rounded-xl border border-green-500/20 bg-green-500/5">
      <p className="text-sm font-medium text-green-400 mb-1 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        Vehicle Delivered
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Confirm you have received the vehicle in good condition. This releases escrow funds to
        the dealer. You have 48 hours from delivery to raise a dispute before automatic release.
      </p>
      <Button
        variant="gold"
        size="sm"
        onClick={handleConfirm}
        loading={confirming}
      >
        Confirm Delivery & Release Funds
      </Button>
    </div>
  );
}
