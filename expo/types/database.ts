export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type VowStatus =
  | 'draft'
  | 'sealed'
  | 'active'
  | 'awaiting_verdict'
  | 'kept'
  | 'broken'
  | 'voided';

export type Verdict = 'kept' | 'broken';

export type VowType = 'self' | 'challenge';

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type ActorType = 'maker' | 'witness' | 'target' | 'system';

export type SmsMessageType = 'seal' | 'warmup' | 'verdict_request' | 'outcome';

export interface AuditEvent {
  id: string;
  vow_id: string;
  event_type: string;
  actor_type: ActorType;
  actor_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          display_name: string | null;
          phone: string | null;
          stripe_customer_id: string | null;
          push_token: string | null;
          push_permission_status?: 'unknown' | 'granted' | 'denied' | 'undetermined' | null;
          timezone?: string | null;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          last_push_receipt_ok_at?: string | null;
          last_push_receipt_failed_at?: string | null;
          sms_only_preference?: boolean | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          phone?: string | null;
          stripe_customer_id?: string | null;
          push_token?: string | null;
          push_permission_status?: 'unknown' | 'granted' | 'denied' | 'undetermined' | null;
          timezone?: string | null;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          last_push_receipt_ok_at?: string | null;
          last_push_receipt_failed_at?: string | null;
          sms_only_preference?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          phone?: string | null;
          stripe_customer_id?: string | null;
          push_token?: string | null;
          push_permission_status?: 'unknown' | 'granted' | 'denied' | 'undetermined' | null;
          timezone?: string | null;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          last_push_receipt_ok_at?: string | null;
          last_push_receipt_failed_at?: string | null;
          sms_only_preference?: boolean | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vows: {
        Row: {
          id: string;
          user_id: string | null;
          raw_input: string;
          refined_text: string;
          status: VowStatus;
          witness_name: string | null;
          witness_phone: string | null;
          witness_invite_token: string | null;
          stake_amount: number;
          consequence: string;
          destination: string;
          stripe_payment_intent_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
          verdict: Verdict | null;
          verdict_at: string | null;
          witness_accepted_at: string | null;
          witness_declined: boolean;
          sealed_at: string | null;
          vow_type?: VowType;
          target_user_id?: string | null;
          target_phone?: string | null;
          challenge_status?: ChallengeStatus | null;
          challenge_invite_token?: string | null;
          witness_user_id?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          raw_input: string;
          refined_text: string;
          status?: VowStatus;
          witness_name?: string | null;
          witness_phone?: string | null;
          witness_invite_token?: string | null;
          stake_amount: number;
          consequence?: string;
          destination: string;
          stripe_payment_intent_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          verdict?: Verdict | null;
          verdict_at?: string | null;
          witness_accepted_at?: string | null;
          witness_declined?: boolean;
          sealed_at?: string | null;
          vow_type?: VowType;
          target_user_id?: string | null;
          target_phone?: string | null;
          challenge_status?: ChallengeStatus | null;
          challenge_invite_token?: string | null;
          witness_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          raw_input?: string;
          refined_text?: string;
          status?: VowStatus;
          witness_name?: string | null;
          witness_phone?: string | null;
          witness_invite_token?: string | null;
          stake_amount?: number;
          consequence?: string;
          destination?: string;
          stripe_payment_intent_id?: string | null;
          starts_at?: string | null;
          ends_at?: string | null;
          verdict?: Verdict | null;
          verdict_at?: string | null;
          witness_accepted_at?: string | null;
          witness_declined?: boolean;
          sealed_at?: string | null;
          vow_type?: VowType;
          target_user_id?: string | null;
          target_phone?: string | null;
          challenge_status?: ChallengeStatus | null;
          challenge_invite_token?: string | null;
          witness_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          vow_id: string;
          event_type: string;
          actor_type: ActorType;
          actor_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          vow_id: string;
          event_type: string;
          actor_type: ActorType;
          actor_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: string;
          vow_id?: string;
          event_type?: string;
          actor_type?: ActorType;
          actor_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      sms_log: {
        Row: {
          id: string;
          vow_id: string | null;
          message_type: SmsMessageType;
          twilio_sid: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          vow_id?: string | null;
          message_type: SmsMessageType;
          twilio_sid?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          vow_id?: string | null;
          message_type?: SmsMessageType;
          twilio_sid?: string | null;
          sent_at?: string;
        };
        Relationships: [];
      };
      push_queue: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          body: string;
          data: Json | null;
          send_after: string;
          sent: boolean;
          status?: 'queued' | 'sent' | 'failed' | 'dead' | null;
          attempts?: number | null;
          last_attempt_at?: string | null;
          sent_at?: string | null;
          receipt_id?: string | null;
          error_code?: string | null;
          dedupe_key?: string | null;
          event_type?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          body: string;
          data?: Json | null;
          send_after: string;
          sent?: boolean;
          status?: 'queued' | 'sent' | 'failed' | 'dead' | null;
          attempts?: number | null;
          last_attempt_at?: string | null;
          sent_at?: string | null;
          receipt_id?: string | null;
          error_code?: string | null;
          dedupe_key?: string | null;
          event_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          body?: string;
          data?: Json | null;
          send_after?: string;
          sent?: boolean;
          status?: 'queued' | 'sent' | 'failed' | 'dead' | null;
          attempts?: number | null;
          last_attempt_at?: string | null;
          sent_at?: string | null;
          receipt_id?: string | null;
          error_code?: string | null;
          dedupe_key?: string | null;
          event_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
