import Link from "next/link";
import { CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { Suspense } from "react";
import { Navbar } from "@/components/shared/navbar";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>

        <div>
          <h1 className="text-2xl font-bold mb-2">Vehicle Reserved!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your reservation deposit has been confirmed. The vehicle is now on
            hold for you for <span className="text-foreground font-medium">48 hours</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-sand-500/20 bg-sand-500/5 text-left space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-sand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">48-Hour Hold Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete the full purchase within 48 hours or your deposit will be refunded
                and the vehicle released.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Deposit Credited</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your deposit counts toward the final purchase price — you only pay the
                remaining balance at checkout.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="gold" size="lg" asChild className="w-full">
            <Link href="/dashboard">
              Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/vehicles">Browse more vehicles</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReservationSuccessPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={null}>
        <SuccessContent />
      </Suspense>
    </>
  );
}
