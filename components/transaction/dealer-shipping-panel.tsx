"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const shippingSchema = z.object({
  tracking_number: z.string().min(3, "Tracking number is required"),
  estimated_delivery_date: z.string().min(1, "Estimated delivery date is required"),
  notes: z.string().optional(),
});

type ShippingForm = z.infer<typeof shippingSchema>;

export function DealerShippingPanel({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ShippingForm>({ resolver: zodResolver(shippingSchema) });

  async function onSubmit(data: ShippingForm) {
    const res = await fetch(`/api/transactions/${transactionId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestone_type: "shipping_confirmed",
        tracking_number: data.tracking_number,
        estimated_delivery_date: data.estimated_delivery_date,
        notes: data.notes || undefined,
      }),
    });
    const result = await res.json();
    if (res.ok) {
      toast.success("Shipping confirmed — buyer can now track the vehicle.");
      setSubmitted(true);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to confirm shipping");
    }
  }

  if (submitted) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-5">
          <p className="text-sm text-green-400 font-medium">Shipping details submitted.</p>
          <p className="text-xs text-muted-foreground mt-1">The buyer can now see tracking information.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Truck className="h-4 w-4 text-sand-400" />
          Confirm Shipment
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter shipping details. The buyer will be notified and can track their vehicle.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tracking_number">Tracking Number</Label>
            <Input
              id="tracking_number"
              placeholder="e.g. MAEU1234567890"
              {...register("tracking_number")}
            />
            {errors.tracking_number && (
              <p className="text-xs text-destructive">{errors.tracking_number.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimated_delivery_date">Estimated Delivery Date</Label>
            <Input
              id="estimated_delivery_date"
              type="date"
              {...register("estimated_delivery_date")}
            />
            {errors.estimated_delivery_date && (
              <p className="text-xs text-destructive">{errors.estimated_delivery_date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Shipping line, port of loading, etc."
              {...register("notes")}
            />
          </div>

          <Button type="submit" variant="gold" loading={isSubmitting}>
            Confirm Shipment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
