# Prompt 02: Supabase Client + Database Types + Env Config

## Context
We're building the backend for "Unbreakable Vow" — a stakes-based accountability app. The Expo React Native frontend is already built (UI prototype). We need to connect it to Supabase for auth, database, and edge functions.

The user has already completed manual setup: Supabase project exists, `.env` file has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Files to create

### 1. `expo/lib/supabase.ts`
Create a Supabase client configured for React Native:

```typescript
import 'react-native-url-polyfill/dist/setup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 2. `expo/types/database.ts`
Generate TypeScript types matching this schema:

```sql
create table public.users (
  id uuid primary key references auth.users(id),
  display_name text,
  phone text,
  stripe_customer_id text,
  push_token text,
  created_at timestamptz default now()
);

create table public.vows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) not null,
  raw_input text not null,
  refined_text text not null,
  status text not null default 'draft'
    check (status in ('draft','sealed','active','awaiting_verdict','kept','broken','voided')),
  witness_name text not null,
  witness_phone text,
  witness_invite_token text unique,
  stake_amount integer not null,
  consequence text not null default 'charity',
  destination text not null,
  stripe_payment_intent_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  verdict text check (verdict in ('kept','broken')),
  verdict_at timestamptz,
  sealed_at timestamptz,
  created_at timestamptz default now()
);

create table public.sms_log (
  id uuid primary key default gen_random_uuid(),
  vow_id uuid references public.vows(id),
  message_type text not null,
  twilio_sid text,
  sent_at timestamptz default now()
);

create table public.push_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  title text not null,
  body text not null,
  data jsonb,
  send_after timestamptz not null,
  sent boolean default false,
  created_at timestamptz default now()
);
```

Write the `Database` type with `Tables`, `Row`, `Insert`, `Update` subtypes for each table. Follow the standard Supabase generated types pattern.

### 3. `expo/supabase/migrations/001_initial_schema.sql`
Create the full migration SQL with:
- All 4 tables above
- RLS enabled on all tables
- Policies:
  - `users`: users can read/update their own row
  - `vows`: users can select/insert/update their own vows
  - `sms_log`: service role only (no client access)
  - `push_queue`: service role only
- Indexes on `vows.user_id`, `vows.witness_invite_token`, `vows.status`, `push_queue.send_after` where `sent = false`

### 4. Install dependencies
Run:
```bash
cd expo
npx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage
```

### 5. Update `.gitignore`
Add `.env` to `expo/.gitignore` if not already there.

## Do NOT modify
- Any existing app screens
- Any existing components
- `providers/vow-flow.tsx`
- `constants/unbreakable.ts`
