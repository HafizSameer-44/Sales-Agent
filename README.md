# Sales Agent (free stack, no LinkedIn)
1. Supabase (free): new project, SQL Editor, paste schema.sql, Run. Copy Project URL + service_role key.
2. Fill brain/business.md and brain/icp.md (most important step).
3. Free LLM key: Groq (console.groq.com) or Google AI Studio (Gemini). Set LLM_* vars.
4. Gmail: turn on 2-Step Verification, create an App Password.
5. Copy .env.example to .env.local, fill in, then: npm install && npm run dev
6. Deploy: push to a PRIVATE GitHub repo, import to Vercel (or Cloudflare), add the same env vars. Never commit .env.local.
7. cron-job.org (free): GET https://YOUR-APP/api/run every 15 min, header Authorization: Bearer CRON_SECRET.
8. Cal.com webhook -> /api/webhooks/cal (BOOKING_CREATED, CANCELLED) with secret. Stripe webhook -> /api/webhooks/stripe (checkout.session.completed, invoice.paid).
9. Phone: open the app link, Share > Add to Home Screen. Alerts come via a free Telegram bot (TG_TOKEN, TG_CHAT).
