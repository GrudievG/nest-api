export interface AuditEvent {
  /** Short machine-readable action identifier, e.g. 'auth.login.failure' */
  action: string;
  /** ID of the user who performed the action (null for unauthenticated) */
  actorId: string | null;
  /** Roles of the actor at the time of the event */
  actorRoles: string[];
  /** Type of the resource being acted on, e.g. 'User', 'Order', 'Payment' */
  targetType: string;
  /** ID of the resource being acted on */
  targetId: string | null;
  /** Whether the action succeeded or failed */
  outcome: 'success' | 'failure';
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Correlation / request ID for tracing */
  correlationId: string;
  /** Optional: client IP address */
  ip?: string;
  /** Optional: User-Agent header */
  userAgent?: string;
  /** Optional: human-readable failure reason */
  reason?: string;
}

/** Subset of fields needed to emit an audit event (timestamp is auto-set) */
export type AuditEventInput = Omit<AuditEvent, 'timestamp'>;
