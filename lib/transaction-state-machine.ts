/**
 * Yellow Sand — Transaction State Machine
 *
 * Defines valid state transitions, guards, and the milestone sequence.
 * The state machine is the authoritative source for what transitions are allowed.
 * All status mutations go through advanceTransaction(), which enforces guards.
 */

import type { TransactionStatus, MilestoneType } from "@/types/database";

// =============================================================
// Transition map: fromState -> array of valid toStates
// =============================================================
const TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  pending_payment:          ["funded", "cancelled"],
  funded:                   ["inspection_pending", "refunded"],
  inspection_pending:       ["inspection_complete", "disputed"],
  inspection_complete:      ["documentation_pending", "disputed"],
  documentation_pending:    ["documentation_verified", "disputed"],
  documentation_verified:   ["shipping_pending", "disputed"],
  shipping_pending:         ["in_transit", "disputed"],
  in_transit:               ["delivered", "disputed"],
  delivered:                ["completed", "disputed"],
  completed:                [],
  disputed:                 ["completed", "refunded"],
  cancelled:                [],
  refunded:                 [],
};

// Milestones that must be completed when entering each state
const STATE_MILESTONES: Partial<Record<TransactionStatus, MilestoneType>> = {
  funded:                  "payment_received",
  inspection_complete:     "inspection_verified",
  documentation_verified:  "documentation_verified",
  in_transit:              "shipping_confirmed",
  delivered:               "delivery_confirmed",
  completed:               "funds_released",
};

// Who can trigger each transition
type Actor = "system" | "buyer" | "dealer" | "admin";

const TRANSITION_ACTORS: Record<string, Actor[]> = {
  "pending_payment->funded":               ["system"],       // Stripe webhook
  "pending_payment->cancelled":            ["buyer", "admin"],
  "funded->inspection_pending":            ["system"],
  "funded->refunded":                      ["admin"],
  "inspection_pending->inspection_complete": ["admin", "dealer"],
  "inspection_pending->disputed":          ["buyer"],
  "inspection_complete->documentation_pending": ["system"],
  "inspection_complete->disputed":         ["buyer"],
  "documentation_pending->documentation_verified": ["admin"],
  "documentation_pending->disputed":       ["buyer"],
  "documentation_verified->shipping_pending": ["system"],
  "documentation_verified->disputed":      ["buyer"],
  "shipping_pending->in_transit":          ["dealer"],
  "shipping_pending->disputed":            ["buyer"],
  "in_transit->delivered":                 ["buyer"],
  "in_transit->disputed":                  ["buyer"],
  "delivered->completed":                  ["system", "buyer"],
  "delivered->disputed":                   ["buyer"],
  "disputed->completed":                   ["admin"],
  "disputed->refunded":                    ["admin"],
};

export class TransactionStateMachineError extends Error {
  constructor(
    message: string,
    public readonly currentStatus: TransactionStatus,
    public readonly targetStatus: TransactionStatus
  ) {
    super(message);
    this.name = "TransactionStateMachineError";
  }
}

/**
 * Check if a transition is valid.
 */
export function canTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if an actor can trigger a specific transition.
 */
export function isActorAllowed(
  from: TransactionStatus,
  to: TransactionStatus,
  actor: Actor
): boolean {
  const key = `${from}->${to}`;
  const allowed = TRANSITION_ACTORS[key];
  if (!allowed) return false;
  return allowed.includes(actor);
}

/**
 * Validate a transition and throw if invalid.
 */
export function assertTransition(
  from: TransactionStatus,
  to: TransactionStatus,
  actor: Actor
): void {
  if (!canTransition(from, to)) {
    throw new TransactionStateMachineError(
      `Invalid transition: ${from} → ${to}`,
      from,
      to
    );
  }
  if (!isActorAllowed(from, to, actor)) {
    throw new TransactionStateMachineError(
      `Actor "${actor}" is not permitted to transition ${from} → ${to}`,
      from,
      to
    );
  }
}

/**
 * Get the milestone type that should be completed when entering a state.
 */
export function getMilestoneForState(
  state: TransactionStatus
): MilestoneType | null {
  return STATE_MILESTONES[state] ?? null;
}

/**
 * Get the ordered list of milestones for the happy path.
 */
export function getMilestoneSequence(): MilestoneType[] {
  return [
    "payment_received",
    "inspection_verified",
    "documentation_verified",
    "shipping_confirmed",
    "delivery_confirmed",
    "funds_released",
  ];
}

/**
 * Get the step index (0-based) for the happy path.
 * Returns -1 for terminal error states.
 */
export function getTransactionStep(status: TransactionStatus): number {
  const happyPath: TransactionStatus[] = [
    "pending_payment",
    "funded",
    "inspection_pending",
    "inspection_complete",
    "documentation_pending",
    "documentation_verified",
    "shipping_pending",
    "in_transit",
    "delivered",
    "completed",
  ];
  const idx = happyPath.indexOf(status);
  return idx; // -1 for disputed/cancelled/refunded
}

/**
 * Determine the next expected state for display purposes.
 */
export function getNextState(
  current: TransactionStatus
): TransactionStatus | null {
  const happyPath: TransactionStatus[] = [
    "pending_payment",
    "funded",
    "inspection_pending",
    "inspection_complete",
    "documentation_pending",
    "documentation_verified",
    "shipping_pending",
    "in_transit",
    "delivered",
    "completed",
  ];
  const idx = happyPath.indexOf(current);
  if (idx === -1 || idx === happyPath.length - 1) return null;
  return happyPath[idx + 1];
}

/**
 * Returns true if a transaction is in a terminal state.
 */
export function isTerminalState(status: TransactionStatus): boolean {
  return ["completed", "cancelled", "refunded"].includes(status);
}

/**
 * Returns true if a transaction can still be disputed.
 */
export function canBeDisputed(status: TransactionStatus): boolean {
  const disputable: TransactionStatus[] = [
    "inspection_pending",
    "inspection_complete",
    "documentation_pending",
    "documentation_verified",
    "shipping_pending",
    "in_transit",
    "delivered",
  ];
  return disputable.includes(status);
}
