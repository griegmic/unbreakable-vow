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

export type ChallengeStatus = 'pending' | 'accepted' | 'declined';

export type ActorType = 'maker' | 'witness' | 'target' | 'system';

export type SmsMessageType =
  | 'seal'
  | 'warmup'
  | 'witness_reminder'
  | 'witness_24h'
  | 'witness_accept_confirm'
  | 'verdict_request'
  | 'early_completion_request'
  | 'outcome'
  | 'maker_seal_confirm'
  | 'maker_witness_accepted'
  | 'maker_24h'
  | 'maker_verdict_time'
  | 'maker_outcome';

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
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          phone?: string | null;
          stripe_customer_id?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          phone?: string | null;
          stripe_customer_id?: string | null;
          push_token?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vows: {
        Row: {
          id: string;
          user_id: string;
          raw_input: string;
          refined_text: string;
          status: VowStatus;
          witness_name: string;
          witness_phone: string | null;
          witness_invite_token: string | null;
          witness_share_locked_at?: string | null;
          witness_share_method?: string | null;
          terms_hash?: string | null;
          superseded_by_vow_id?: string | null;
          witness_user_id?: string | null;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          raw_input: string;
          refined_text: string;
          status?: VowStatus;
          witness_name: string;
          witness_phone?: string | null;
          witness_invite_token?: string | null;
          witness_share_locked_at?: string | null;
          witness_share_method?: string | null;
          terms_hash?: string | null;
          superseded_by_vow_id?: string | null;
          witness_user_id?: string | null;
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
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          raw_input?: string;
          refined_text?: string;
          status?: VowStatus;
          witness_name?: string;
          witness_phone?: string | null;
          witness_invite_token?: string | null;
          witness_share_locked_at?: string | null;
          witness_share_method?: string | null;
          terms_hash?: string | null;
          superseded_by_vow_id?: string | null;
          witness_user_id?: string | null;
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
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_display_name: {
        Args: { user_uuid: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
  };
}
