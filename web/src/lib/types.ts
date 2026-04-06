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

export type SmsMessageType = 'seal' | 'warmup' | 'verdict_request' | 'outcome';

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
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
