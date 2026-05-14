#!/bin/bash
# Build script with dummy environment variables for build-time only

export DATABASE_URL="postgresql://dummy@localhost/dummy"
export STRIPE_SECRET_KEY="sk_test_dummy"
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_dummy"
export CLERK_SECRET_KEY="sk_test_dummy"
export UPSTASH_REDIS_REST_URL="https://dummy.upstash.io"
export UPSTASH_REDIS_REST_TOKEN="dummy"
export ENCRYPTION_KEY="dummy-256-bit-key-change-in-production-1234567890abcd"
export OPENROUTER_API_KEY="dummy"
export GEMINI_API_KEY="dummy"
export GSC_CLIENT_ID="dummy"
export GSC_CLIENT_SECRET="dummy"
export GSC_REDIRECT_URI="http://localhost:3000/api/gsc/oauth/callback"
export CRON_SECRET="dummy"
export API_SECRET="dummy"
export NEXT_PUBLIC_APP_URL="http://localhost:3000"

npm run build
