"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const inspectionSchema = z.object({
  notes: z.string().min(10, "Please provide inspection notes (min 10 characters)"),
});

type InspectionForm = z.infer<typeof inspectionSchema>;

export function DealerInspectionPanel({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<InspectionForm>({ resolver: zodResolver(inspectionSchema) });

  async function onSubmit(data: InspectionForm) {
    const res = await fetch(`/api/transactions/${transactionId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        milestone_type: "inspection_verified",
        notes: data.notes,
      }),
    });
    const result = await res.json();
    if (res.ok) {
      toast.success("Inspection submitted — transaction advancing to documentation.");
      setSubmitted(true);
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to submit inspection");
    }
  }

  if (submitted) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-5">
          <p className="text-sm text-green-400 font-medium">Inspection submitted successfully.</p>
          <p className="text-xs text-muted-foreground mt-1">The transaction is now pending documentation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sand-400" />
          Submit Inspection Report
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Confirm the vehicle has been inspected and is in the described condition.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Inspection Notes</Label>
            <Textarea
              id="notes"
              placeholder="Describe the vehicle's condition — engine, bodywork, interior, mileage confirmed..."
              className="min-h-[100px] resize-none"
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-destructive">{errors.notes.message}</p>
            )}
          </div>
          <Button type="submit" variant="gold" loading={isSubmitting}>
            Submit Inspection
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
