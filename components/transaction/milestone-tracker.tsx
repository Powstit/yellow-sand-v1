"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  CreditCard,
  Search,
  FileText,
  Ship,
  Package,
  DollarSign,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { getMilestoneSequence } from "@/lib/transaction-state-machine";
import type { TransactionMilestone, MilestoneType } from "@/types/database";

const MILESTONE_CONFIG: Record<
  MilestoneType,
  { label: string; description: string; icon: React.ElementType }
> = {
  payment_received: {
    label: "Payment Received",
    description: "Funds held in escrow",
    icon: CreditCard,
  },
  inspection_verified: {
    label: "Inspection Verified",
    description: "Vehicle condition confirmed",
    icon: Search,
  },
  documentation_verified: {
    label: "Docs Verified",
    description: "Export documents cleared",
    icon: FileText,
  },
  shipping_confirmed: {
    label: "Shipment Confirmed",
    description: "Vehicle dispatched from port",
    icon: Ship,
  },
  delivery_confirmed: {
    label: "Delivery Confirmed",
    description: "Vehicle received at destination",
    icon: Package,
  },
  funds_released: {
    label: "Funds Released",
    description: "Payment sent to dealer",
    icon: DollarSign,
  },
};

interface MilestoneTrackerProps {
  milestones: TransactionMilestone[];
  currentStatus: string;
}

export function MilestoneTracker({
  milestones,
  currentStatus,
}: MilestoneTrackerProps) {
  const sequence = getMilestoneSequence();
  const milestoneMap = new Map(
    milestones.map((m) => [m.milestone_type, m])
  );

  const isDisputed = currentStatus === "disputed";
  const isCancelled = ["cancelled", "refunded"].includes(currentStatus);

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-5 top-8 bottom-8 w-px bg-border" />

      <div className="space-y-0">
        {sequence.map((milestoneType, index) => {
          const milestone = milestoneMap.get(milestoneType);
          const config = MILESTONE_CONFIG[milestoneType];
          const Icon = config.icon;

          const isCompleted = milestone?.status === "completed";
          const isFailed = milestone?.status === "failed";
          const isInProgress = milestone?.status === "in_progress";
          const isPending = !milestone || milestone.status === "pending";

          let statusIcon;
          let iconBg;
          let textColor;

          if (isCompleted) {
            statusIcon = <CheckCircle2 className="h-5 w-5" />;
            iconBg = "bg-green-500/20 text-green-400 border-green-500/30";
            textColor = "text-foreground";
          } else if (isFailed) {
            statusIcon = <AlertCircle className="h-5 w-5" />;
            iconBg = "bg-red-500/20 text-red-400 border-red-500/30";
            textColor = "text-red-400";
          } else if (isInProgress) {
            statusIcon = <Clock className="h-5 w-5 animate-pulse" />;
            iconBg = "bg-sand-500/20 text-sand-400 border-sand-500/30";
            textColor = "text-sand-400";
          } else {
            statusIcon = <Circle className="h-5 w-5" />;
            iconBg = "bg-muted/30 text-muted-foreground border-border";
            textColor = "text-muted-foreground";
          }

          return (
            <motion.div
              key={milestoneType}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07 }}
              className="relative flex items-start gap-4 pb-6"
            >
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                  iconBg
                )}
              >
                {statusIcon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("text-sm font-medium", textColor)}>
                    {config.label}
                  </p>
                  {isInProgress && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-sand-500/10 text-sand-400 border border-sand-500/20">
                      In Progress
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
                {milestone?.completed_at && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatDate(milestone.completed_at)}
                  </p>
                )}
                {milestone?.notes && (
                  <p className="text-xs text-muted-foreground/80 mt-1 italic">
                    &ldquo;{milestone.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Step number */}
              <div className="shrink-0 pt-1.5">
                <span className="text-xs text-muted-foreground/50">
                  {index + 1}/{sequence.length}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Disputed / Cancelled overlay */}
      {(isDisputed || isCancelled) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "mt-4 flex items-center gap-3 px-4 py-3 rounded-xl border",
            isDisputed
              ? "bg-red-500/5 border-red-500/20 text-red-400"
              : "bg-muted/20 border-border text-muted-foreground"
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">
            {isDisputed
              ? "This transaction is under dispute review by our team."
              : "This transaction has been cancelled or refunded."}
          </p>
        </motion.div>
      )}
    </div>
  );
}
