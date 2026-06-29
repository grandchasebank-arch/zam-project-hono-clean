-- FIX: otp_codes is used by backend/src/routes/otp.ts; drop unused legacy table
DROP TABLE IF EXISTS public.otp_tokens;
