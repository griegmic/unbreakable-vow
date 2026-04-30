type SupabaseLike = any;

export async function createAuditEvent(
  supabase: SupabaseLike,
  vowId: string,
  eventType: string,
  actorType: "maker" | "witness" | "target" | "system",
  actorId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("audit_events").insert({
    vow_id: vowId,
    event_type: eventType,
    actor_type: actorType,
    actor_id: actorId || null,
    metadata: metadata || {},
  });

  if (error) {
    console.error(`Failed to create audit event ${eventType} for vow ${vowId}:`, error);
    // Non-blocking: audit failures should not break the main operation
  }
}
