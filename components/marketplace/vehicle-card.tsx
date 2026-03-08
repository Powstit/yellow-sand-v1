"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Heart,
  MapPin,
  Gauge,
  Calendar,
  Fuel,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAed, formatMileage, cn } from "@/lib/utils";
import type { VehicleWithDetails } from "@/types";

interface VehicleCardProps {
  vehicle: VehicleWithDetails;
  onSave?: (vehicleId: string, saved: boolean) => void;
}

export function VehicleCard({ vehicle, onSave }: VehicleCardProps) {
  const primaryImage =
    vehicle.images.find((img) => img.is_primary) ?? vehicle.images[0];

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(vehicle.id, !vehicle.is_saved);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
    >
      <Link href={`/vehicles/${vehicle.id}`} className="block group">
        <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-sand-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-sand-500/5">
          {/* Image */}
          <div className="relative aspect-[16/10] bg-muted/20 overflow-hidden">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={vehicle.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
                <svg
                  className="h-16 w-16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3m4 4l-4-4m0 0l-4 4m4-4v9a2 2 0 0 1-2 2H9" />
                </svg>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {vehicle.export_ready && (
                <Badge variant="gold" className="text-[10px] font-semibold gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Export Ready
                </Badge>
              )}
              {vehicle.inspection_report?.overall_rating === "pass" && (
                <Badge variant="success" className="text-[10px]">
                  Inspected
                </Badge>
              )}
            </div>

            {/* Save button */}
            {onSave && (
              <button
                onClick={handleSave}
                className={cn(
                  "absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-all",
                  vehicle.is_saved
                    ? "bg-red-500 text-white"
                    : "bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm"
                )}
                aria-label={vehicle.is_saved ? "Remove from saved" : "Save vehicle"}
              >
                <Heart
                  className={cn("h-4 w-4", vehicle.is_saved && "fill-current")}
                />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-sand-400 transition-colors">
                {vehicle.title}
              </h3>
            </div>

            <p className="text-xl font-bold text-sand-400 mb-3">
              {formatAed(vehicle.price_aed)}
            </p>

            {/* Specs */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <SpecItem
                icon={<Calendar className="h-3 w-3" />}
                label={vehicle.year.toString()}
              />
              <SpecItem
                icon={<Gauge className="h-3 w-3" />}
                label={formatMileage(vehicle.mileage)}
              />
              <SpecItem
                icon={<Fuel className="h-3 w-3" />}
                label={vehicle.fuel_type ?? "—"}
              />
            </div>

            {/* Dealer + location */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {vehicle.location}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate ml-2 max-w-[100px]">
                {vehicle.dealer.business_name}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function SpecItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-muted/30 rounded-md px-2 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-medium capitalize truncate">{label}</span>
    </div>
  );
}
