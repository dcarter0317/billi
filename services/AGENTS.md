# Services: External Integrations

## Overview

Centralized setup and configuration for external services: Clerk for authentication and Supabase for the database. Handles JWT token injection from Clerk into Supabase requests and token caching for offline resilience.

## Key files

| File | Owns |
|---|---|
| `clerk.ts` | Clerk client setup, publishable key, token cache configuration |
| `supabase.ts` | Supabase client init, token provider pattern, session initialization |

## Conventions

- **Token provider pattern**: Supabase client accepts a token provider function that is called before each request; set once in UserContext effect
- **Token cache in secure store**: Clerk tokens are cached in expo-secure-store, not AsyncStorage, for security
- **JWT custom claim**: Clerk is configured with a custom JWT template 'supabase' that Supabase recognizes via RLS policies
- **Initialization barrier**: supabase.ts exports waitForInitialization() to block queries until the token provider is set
- **Environment variables**: Clerk publishable key and Supabase URL/anon key read from .env (EXPO_PUBLIC_* prefix for Expo)

## Gotchas

- **Token provider must be set before queries**: Supabase queries fail silently or throw if token provider is not yet configured; UserContext must set it before other contexts attempt queries
- **No retry on token expiry**: if a token expires mid-request, the request fails; relies on Clerk to auto-refresh on next auth action
- **Anon key is public**: Supabase anon key is exposed in client code; all security depends on RLS policies, not key secrecy
- **RLS policies required**: without Row Level Security on Supabase tables, any authenticated user can read/write any row; policies must verify user_id matches
- **Token caching applies globally**: both Clerk auth and Supabase requests use the same cached token from secure store; a cache miss blocks both flows

## Related specs

(None yet)

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
