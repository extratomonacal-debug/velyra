# VELYRA AI Negotiator (Telegram personal account)
A standalone, **opt-in** MTProto worker. This is **not** a Vercel serverless function. It needs an always-on machine or VPS. Nothing is deployed or connected until the owner configures it.

## Security and operating model
- Only incoming private messages from explicitly allowlisted Telegram user IDs are considered.
- No unsolicited outreach or bulk messaging.
- First replies identify VELYRA's AI assistant; human approval is required for business commitments, prices, KPIs, legal/compliance matters, payment details, and offers.
- Approval commands are sent to your **Saved Messages** in Telegram.
- `DRY_RUN=true` by default: **no messages are sent to other people**, even after approval. Test thoroughly before setting false.
- SQLite logs contain private business messages: secure the server and back up encrypted storage.
- Never share API hash, Telegram login codes, 2FA password, session files, or OpenAI key. Turn on Telegram two-step verification.
- Do not process gambling consumer messages. Check applicable licensing and advertising law before entering a commercial partnership.

## Setup (owner-operated, not done by ChatGPT)
1. Install Python 3.11+ on a secured always-on server, then `cd negotiator && python -m venv .venv` and activate it.
2. `pip install -r requirements.txt`
3. Obtain **API ID and API hash** for your own Telegram account at https://my.telegram.org. Keep them private.
4. Copy `.env.example` to `.env`. Fill Telegram API ID/hash, **your numeric Telegram user ID**, and an OpenAI API key. Do not paste credentials into chats or GitHub.
5. Run `python negotiator.py` interactively for the first login. Telethon will ask for a Telegram authentication code and possibly your 2FA password. The session stays on the server; protect it.
6. In your Telegram **Saved Messages**, send `/help`, then `/allow 123456789 BrandManager` for a *verified* manager's numeric Telegram user ID. `/list` and `/block 123456789` manage access.
7. While `DRY_RUN=true`, test routine questions and commercial offers. Inspect draft approvals in Saved Messages; `/approve ID` and `/reject ID` handle them.
8. After verifying identity, wording, consent and legal compliance, set `DRY_RUN=false` and restart. Start with one low-risk chat. All commercial commitments still require approval.

## Notes
- This worker has no integration with VELYRA website or Supabase yet; avoid exposing your personal Telegram session to the public website.
- Telegram may restrict automation on user accounts. Keep volume low, respect recipient consent and Telegram terms.
- Never run more than one instance with the same session file.
- For production use, add encrypted persistence, observability, a dedicated approval UI, queueing, idempotency and a legal/compliance review.
