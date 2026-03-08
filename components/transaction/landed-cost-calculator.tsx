"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatAed, formatCurrency, calculateLandedCost } from "@/lib/utils";
import { DESTINATION_COUNTRIES, type DestinationCountryCode } from "@/lib/constants";

interface LandedCostCalculatorProps {
  vehiclePriceAed: number;
  shippingCostAed?: number;
}

// Exchange rates — replace with live API in production
const MOCK_EXCHANGE_RATES: Record<DestinationCountryCode, number> = {
  NG: 2100, // 1 AED ≈ 2100 NGN (approximate)
  GH: 4.3,  // 1 AED ≈ 4.3 GHS (approximate)
};

export function LandedCostCalculator({
  vehiclePriceAed,
  shippingCostAed,
}: LandedCostCalculatorProps) {
  const [country, setCountry] = useState<DestinationCountryCode>("NG");
  const [expanded, setExpanded] = useState(false);

  const breakdown = calculateLandedCost(
    { vehiclePriceAed, destinationCountry: country, shippingCostAed },
    MOCK_EXCHANGE_RATES[country]
  );

  const countryConfig = DESTINATION_COUNTRIES[country];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-sand-500/10 border border-sand-500/20 flex items-center justify-center">
            <Calculator className="h-4 w-4 text-sand-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">Landed Cost Calculator</p>
            <p className="text-xs text-muted-foreground">
              Estimate total cost delivered to your country
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total to {countryConfig.name}</p>
            <p className="text-sm font-bold text-sand-400">
              {formatCurrency(
                breakdown.totalBuyerCurrency,
                countryConfig.currency
              )}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border">
              {/* Country selector */}
              <div className="mt-4 mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Destination Country
                </Label>
                <Select
                  value={country}
                  onValueChange={(v) => setCountry(v as DestinationCountryCode)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DESTINATION_COUNTRIES).map(([code, cfg]) => (
                      <SelectItem key={code} value={code}>
                        {cfg.name} ({cfg.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2.5">
                <LineItem
                  label="Vehicle Price"
                  valueAed={breakdown.vehiclePriceAed}
                />
                <LineItem
                  label="Shipping (Jebel Ali → Port)"
                  valueAed={breakdown.shippingCostAed}
                />
                <LineItem
                  label={`Import Duty (${breakdown.importDutyPercent}% of CIF)`}
                  valueAed={breakdown.importDutyAed}
                />
                <LineItem
                  label={`VAT (${breakdown.vatPercent}%)`}
                  valueAed={breakdown.vatAed}
                />
                {breakdown.levyAed > 0 && (
                  <LineItem label="Levies" valueAed={breakdown.levyAed} />
                )}
                <LineItem label="Port Charges" valueAed={breakdown.portChargesAed} />
                <LineItem
                  label="Platform Fee (2.5%)"
                  valueAed={breakdown.platformFeeAed}
                />

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total (AED)</span>
                  <span className="text-sm font-semibold">
                    {formatAed(breakdown.totalAed)}
                  </span>
                </div>

                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-sand-500/10 border border-sand-500/20">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total in {countryConfig.name}
                    </p>
                    <p className="text-lg font-bold text-sand-400">
                      {formatCurrency(
                        breakdown.totalBuyerCurrency,
                        countryConfig.currency
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Exchange Rate</p>
                    <p className="text-xs font-medium">
                      1 AED = {breakdown.exchangeRate} {countryConfig.currency}
                    </p>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p>
                  Estimates only. Final duties, taxes, and exchange rates may vary.
                  Consult a licensed clearing agent for exact figures.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LineItem({
  label,
  valueAed,
}: {
  label: string;
  valueAed: number;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{formatAed(valueAed)}</span>
    </div>
  );
}
