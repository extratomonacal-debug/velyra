"""VELYRA AI Negotiator: allowlisted Telegram MTProto assistant.
Run on an always-on machine/VPS. Never run on public Vercel static hosting.
"""
import asyncio
import json
import logging
import os
import re
import sqlite3
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI
from telethon import TelegramClient, events

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("velyra")
API_ID = int(os.environ["TELEGRAM_API_ID"])
API_HASH = os.environ["TELEGRAM_API_HASH"]
OWNER_ID = int(os.environ["TELEGRAM_OWNER_ID"])
MODEL = os.getenv("AI_MODEL", "gemini-2.5-flash")
DB = Path(os.getenv("DB_PATH", "negotiator.sqlite3"))
SESSION = os.getenv("TELEGRAM_SESSION", "velyra_negotiator")
MIN_DELAY = max(2, int(os.getenv("REPLY_DELAY_SECONDS", "8")))
MAX_AUTO_PER_CHAT_PER_DAY = 12
DRY_RUN = os.getenv("DRY_RUN", "true").lower() != "false"
ai = AsyncOpenAI(\n    api_key=os.environ["AI_API_KEY"],\n    base_url=os.getenv("AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/"),\n)
tg = TelegramClient(SESSION, API_ID, API_HASH)
db = sqlite3.connect(DB)
db.row_factory = sqlite3.Row
db.executescript("""
create table if not exists allowlist (peer_id integer primary key, label text, enabled integer not null default 1);
create table if not exists pending (id integer primary key autoincrement, peer_id integer not null, source_message_id integer not null, text text not null, created_at integer not null, status text not null default 'pending');
create table if not exists sent_log (peer_id integer not null, sent_at integer not null, message_id integer);
create table if not exists message_log (peer_id integer not null, direction text not null, body text not null, created_at integer not null);
""")
db.commit()
FINANCIAL = re.compile(r"(?i)(\b(?:€|\$|usd|eur|usdt|ftd|cpa|rev\s?share|rs|kpi|roi|budget|deposit|payment|payout|invoice|contract|agreement|deal|fixed|upfront|postpay|wager|bonus|fee|rate|offer|commission|percent|percentage|guarantee|deadline|signature|approve|accept|confirm|commit|transfer|wallet|kyc|license|licence|licença|pagamento|contrato|acordo|valor|depósito|comissão|proposta|fechar|aceito|aceitamos|aprovado|garantimos|assinar)\b|\d+[.,]?\d*\s?[%€$])")
SYSTEM = """You are VELYRA AI Negotiator, an openly identified AI assistant working for VELYRA.
You are communicating with a professional affiliate manager. Use natural, brief, respectful English or European Portuguese matching the incoming message.
Scope: business-to-business creator sponsorship discussions, never marketing to gamblers.
Never impersonate a human, never invent streamer metrics, agreements, permissions, payment receipts, or past relationships.
Do not promise or accept terms, quote or negotiate prices, commit to streams, authorize transfers, share wallets or personal data, or make compliance/legal claims.
For any commercial terms, only say that the team will review them and reply.
Do not proactively suggest CPA. Prefer asking whether a fixed fee per stream can be discussed; even this commercial negotiation requires approval before sending.
Do not contact anyone first. Avoid repeated or unsolicited messages.
If a jurisdiction, license, age-restriction or advertising compliance issue arises, flag for human review.
Return JSON with keys: reply (string, at most 80 words), needs_approval (boolean), reason (string).
Set needs_approval=true for commercial terms, uncertain identity, legal issues, pressure, promises, or anything beyond routine greetings/availability/scheduling.
Acknowledge that you are an AI assistant on first contact, and when asked.
"""
def allowed(peer_id):
    row=db.execute("select enabled from allowlist where peer_id=?", (peer_id,)).fetchone()
    return bool(row and row["enabled"])

def log_msg(peer_id, direction, body):
    db.execute("insert into message_log values (?,?,?,?)", (peer_id,direction,body,int(time.time())))
    db.commit()

def recent_history(peer_id):
    rows=db.execute("select direction,body from message_log where peer_id=? order by created_at desc limit 10",(peer_id,)).fetchall()
    return [{"role":"assistant" if r["direction"]=="out" else "user","content":r["body"][:2500]} for r in reversed(rows)]

def auto_budget(peer_id):
    since=int(time.time())-86400
    return db.execute("select count(*) from sent_log where peer_id=? and sent_at>?",(peer_id,since)).fetchone()[0] < MAX_AUTO_PER_CHAT_PER_DAY

def requires_review(incoming, reply, ai_review):
    return bool(ai_review or FINANCIAL.search(incoming) or FINANCIAL.search(reply))

async def notify_owner(text):
    await tg.send_message("me", text)

async def create_pending(peer_id, source_id, text, reason):
    cur=db.execute("insert into pending(peer_id,source_message_id,text,created_at) values (?,?,?,?)",
                   (peer_id,source_id,text,int(time.time())))
    db.commit()
    await notify_owner(f"VELYRA AI | APROVAÇÃO #{cur.lastrowid}\nChat: {peer_id}\nMotivo: {reason}\n\n{text}\n\n/approve {cur.lastrowid}  ou  /reject {cur.lastrowid}")
    log.info("Approval required for peer %s, id %s",peer_id,cur.lastrowid)

async def send_reply(peer_id, text):
    if DRY_RUN:
        await notify_owner(f"[SIMULAÇÃO] Para {peer_id}:\n{text}")
        return
    await asyncio.sleep(MIN_DELAY)
    if not allowed(peer_id):
        return
    sent=await tg.send_message(peer_id,text)
    db.execute("insert into sent_log values (?,?,?)",(peer_id,int(time.time()),sent.id))
    db.commit()
    log_msg(peer_id,"out",text)

@tg.on(events.NewMessage(incoming=True))
async def incoming(event):
    if not event.is_private or event.sender_id==OWNER_ID:
        return
    peer=event.sender_id
    if not allowed(peer) or not event.raw_text or not auto_budget(peer):
        return
    message=event.raw_text.strip()
    if len(message)>5000 or event.message.media:
        await notify_owner(f"VELYRA AI | Mensagem longa ou multimédia em {peer}; analisar manualmente.")
        return
    history=recent_history(peer)
    log_msg(peer,"in",message)
    try:
        result=await ai.chat.completions.create(
            model=MODEL,
            response_format={"type":"json_object"},
            messages=[{"role":"system","content":SYSTEM},
                      *history,
                      {"role":"user","content":message}],
            temperature=0.3,
            timeout=25,
        )
        obj=json.loads(result.choices[0].message.content)
        reply=str(obj.get("reply","")).strip()
        if not reply or len(reply)>700:
            await notify_owner(f"VELYRA AI | Resposta inválida em {peer}.")
            return
        if not any(h["role"]=="assistant" for h in history):
            reply="Olá! Sou o assistente de IA da VELYRA. " + reply if not re.search(r"(?i)\b(ai|ia|artificial intelligence|inteligência artificial)\b",reply) else reply
        review=requires_review(message,reply,obj.get("needs_approval",True))
        if review:
            await create_pending(peer,event.id,reply,obj.get("reason","Condições comerciais ou conteúdo sensível"))
        else:
            await send_reply(peer,reply)
    except Exception:
        log.exception("Failed processing message from %s",peer)
        await notify_owner(f"VELYRA AI | Erro ao processar mensagem do chat {peer}.")

@tg.on(events.NewMessage(outgoing=True))
async def commands(event):
    if not event.is_private or event.chat_id != OWNER_ID:
        return
    text=event.raw_text.strip()
    if not text.startswith("/"):
        return
    parts=text.split(maxsplit=2)
    cmd=parts[0].lower()
    try:
        if cmd=="/help":
            await notify_owner("Comandos: /allow PEER_ID [nome] | /block PEER_ID | /list | /pending | /approve ID | /reject ID | /status")
        elif cmd=="/allow" and len(parts)>=2:
            peer=int(parts[1])
            if peer==OWNER_ID: return
            db.execute("insert into allowlist(peer_id,label,enabled) values (?,?,1) on conflict(peer_id) do update set enabled=1,label=excluded.label",(peer,parts[2] if len(parts)>2 else ""))
            db.commit()
            await notify_owner(f"Chat {peer} autorizado. O assistente pode responder apenas a mensagens recebidas neste chat.")
        elif cmd=="/block" and len(parts)>=2:
            peer=int(parts[1])
            db.execute("update allowlist set enabled=0 where peer_id=?",(peer,))
            db.commit()
            await notify_owner(f"Chat {peer} desativado.")
        elif cmd=="/list":
            rows=db.execute("select * from allowlist order by peer_id").fetchall()
            await notify_owner("Allowlist:\n"+("\n".join(f"{r['peer_id']} {r['label']} {'ON' if r['enabled'] else 'OFF'}" for r in rows) or "(vazia)"))
        elif cmd=="/pending":
            rows=db.execute("select * from pending where status='pending' order by id desc limit 20").fetchall()
            await notify_owner("Pendentes:\n"+("\n".join(f"#{r['id']} chat {r['peer_id']}: {r['text'][:120]}" for r in rows) or "(nenhum)"))
        elif cmd in ("/approve","/reject") and len(parts)>=2:
            item=int(parts[1])
            row=db.execute("select * from pending where id=? and status='pending'",(item,)).fetchone()
            if not row:
                await notify_owner("Pedido inexistente ou já processado.")
                return
            if cmd=="/approve" and not allowed(row["peer_id"]):
                await notify_owner("Chat bloqueado. Não foi enviada nenhuma mensagem.")
                return
            if cmd=="/approve":
                await send_reply(row["peer_id"],row["text"])
            db.execute("update pending set status=? where id=?",("approved" if cmd=="/approve" else "rejected",item))
            db.commit()
            await notify_owner("Pedido #"+str(item)+(" aprovado." if cmd=="/approve" else " rejeitado."))
        elif cmd=="/status":
            await notify_owner(f"VELYRA AI online. DRY_RUN={DRY_RUN}. Allowlist ativa={db.execute('select count(*) from allowlist where enabled=1').fetchone()[0]}")
    except (ValueError,IndexError):
        await notify_owner("Comando inválido. Usa /help.")

async def main():
    await tg.start()
    me=await tg.get_me()
    if me.id!=OWNER_ID:
        raise RuntimeError("TELEGRAM_OWNER_ID does not match authenticated Telegram account. Refusing to run.")
    await notify_owner(f"VELYRA AI iniciado. Modo simulação={DRY_RUN}. Envia /help para comandos.")
    await tg.run_until_disconnected()

if __name__=="__main__":
    asyncio.run(main())
