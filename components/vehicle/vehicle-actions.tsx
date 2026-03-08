"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageSquare, Send, Loader2, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface VehicleActionsProps {
  vehicleId: string;
  isSaved: boolean;
  isAuthenticated: boolean;
  vehicleStatus: "active" | "reserved" | "sold" | "draft" | "pending_review" | "suspended";
  userHasReservation?: boolean;
  depositAmountGbp?: number;
}

export function VehicleActions({
  vehicleId,
  isSaved: initialSaved,
  isAuthenticated,
  vehicleStatus,
  userHasReservation = false,
  depositAmountGbp = 500,
}: VehicleActionsProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [savingPending, setSavingPending] = useState(false);
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [enquirySent, setEnquirySent] = useState(false);
  const [reserving, setReserving] = useState(false);

  async function handleSave() {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/vehicles/${vehicleId}`);
      return;
    }
    setSavingPending(true);
    try {
      const res = await fetch("/api/saved-vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicleId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(data.saved);
        toast.success(data.saved ? "Vehicle saved" : "Removed from saved");
      } else {
        toast.error(data.error ?? "Failed to save");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingPending(false);
    }
  }

  async function handleEnquiry() {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/vehicles/${vehicleId}`);
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Message must be at least 10 characters");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicleId, message: message.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnquirySent(true);
        setShowEnquiry(false);
        setMessage("");
        toast.success("Enquiry sent to dealer");
      } else {
        toast.error(data.error ?? "Failed to send enquiry");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSending(false);
    }
  }

  async function handleReserve() {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/vehicles/${vehicleId}`);
      return;
    }
    setReserving(true);
    try {
      const res = await fetch("/api/reservations/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicleId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? "Failed to start reservation");
        setReserving(false);
      }
    } catch {
      toast.error("Something went wrong");
      setReserving(false);
    }
  }

  const isReservedByOther = vehicleStatus === "reserved" && !userHasReservation;
  const isSold = vehicleStatus === "sold";

  return (
    <div className="space-y-3">
      {/* Reserve Vehicle — primary action */}
      {userHasReservation ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-sand-500/30 bg-sand-500/5">
          <Clock className="h-4 w-4 text-sand-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-sand-400">You have reserved this vehicle</p>
            <p className="text-xs text-muted-foreground mt-0.5">Complete the full purchase within your 48-hour window</p>
          </div>
        </div>
      ) : isReservedByOther ? (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-border bg-muted/10">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Currently Reserved</p>
            <p className="text-xs text-muted-foreground mt-0.5">This vehicle is on hold. Check back in 48 hours.</p>
          </div>
        </div>
      ) : isSold ? null : (
        <Button
          variant="gold"
          size="lg"
          className="w-full gap-2"
          onClick={handleReserve}
          disabled={reserving || vehicleStatus !== "active"}
        >
          {reserving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {reserving ? "Redirecting to Checkout..." : `Reserve — £${depositAmountGbp} deposit`}
        </Button>
      )}

      <Button
        variant="outline"
        size="lg"
        className={cn("w-full gap-2", saved && "border-sand-500/40 text-sand-400")}
        onClick={handleSave}
        disabled={savingPending}
      >
        {savingPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={cn("h-4 w-4", saved && "fill-sand-400")} />
        )}
        {saved ? "Saved" : "Save Vehicle"}
      </Button>

      {enquirySent ? (
        <div className="flex items-center gap-2 text-sm text-emerald-400 px-1">
          <Send className="h-3.5 w-3.5" />
          Enquiry sent — dealer will respond by email
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            size="lg"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => {
              if (!isAuthenticated) {
                router.push(`/auth/login?redirect=/vehicles/${vehicleId}`);
                return;
              }
              setShowEnquiry(!showEnquiry);
            }}
          >
            <MessageSquare className="h-4 w-4" />
            Ask Dealer a Question
          </Button>

          {showEnquiry && (
            <div className="space-y-2">
              <Textarea
                placeholder="Ask about the vehicle's service history, any defects, availability for inspection..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] text-sm resize-none"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{message.length}/1000</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowEnquiry(false); setMessage(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={handleEnquiry}
                    loading={sending}
                    disabled={message.trim().length < 10}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
