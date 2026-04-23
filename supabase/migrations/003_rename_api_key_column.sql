-- Rename gemini_api_key to ai_api_key to be provider-agnostic
ALTER TABLE public.profiles
  RENAME COLUMN gemini_api_key TO ai_api_key;
