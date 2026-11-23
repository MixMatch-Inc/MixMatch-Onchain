from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db, AsyncSessionLocal
from src.core.security import CurrentUser, get_current_user
from src.db.models import Match, Message

router = APIRouter(tags=["Messages"])

# user_id -> set of websockets
_WS_CONNECTIONS: dict[str, set[WebSocket]] = {}


class SendMessageRequest(BaseModel):
    recipient_id: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1, max_length=4000)


def _serialize(m: Message) -> Dict[str, Any]:
    return {
        "id": m.id,
        "sender_id": m.sender_id,
        "recipient_id": m.recipient_id,
        "body": m.body,
        "delivery_state": m.delivery_state,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None,
        "read_at": m.read_at.isoformat() if m.read_at else None,
    }


async def _ensure_match(db: AsyncSession, a: str, b: str) -> bool:
    x, y = sorted([a, b])
    res = await db.execute(select(Match).where(Match.user_a_id == x, Match.user_b_id == y))
    return res.scalars().first() is not None


async def _push_to_user(user_id: str, payload: Dict[str, Any]) -> None:
    for ws in list(_WS_CONNECTIONS.get(user_id, set())):
        try:
            await ws.send_json(payload)
        except Exception:
            _WS_CONNECTIONS.get(user_id, set()).discard(ws)


@router.get("/messages/{other_user_id}")
async def list_messages(
    other_user_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    uid = current_user.id
    res = await db.execute(
        select(Message).where(
            or_(
                (Message.sender_id == uid) & (Message.recipient_id == other_user_id),
                (Message.sender_id == other_user_id) & (Message.recipient_id == uid),
            )
        ).order_by(Message.created_at.asc())
    )
    msgs = res.scalars().all()
    # mark received as delivered/read when fetched
    now = datetime.now(timezone.utc)
    changed = False
    for m in msgs:
        if m.recipient_id == uid and m.delivery_state == "sent":
            m.delivery_state = "delivered"
            m.delivered_at = now
            changed = True
        if m.recipient_id == uid and m.delivery_state in ("sent", "delivered"):
            m.delivery_state = "read"
            m.read_at = now
            changed = True
    if changed:
        await db.commit()
        for m in msgs:
            await db.refresh(m)
    return {"messages": [_serialize(m) for m in msgs]}


@router.post("/messages", status_code=201)
async def send_message(
    body: SendMessageRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    uid = current_user.id
    if body.recipient_id == uid:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    # require match for 1:1 messaging
    if not await _ensure_match(db, uid, body.recipient_id):
        raise HTTPException(status_code=403, detail="Users are not matched")

    msg = Message(sender_id=uid, recipient_id=body.recipient_id, body=body.body, delivery_state="sent")
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    payload = {"type": "message", "message": _serialize(msg)}
    await _push_to_user(body.recipient_id, payload)
    # if recipient connected, mark delivered
    if _WS_CONNECTIONS.get(body.recipient_id):
        msg.delivery_state = "delivered"
        msg.delivered_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(msg)
        payload["message"] = _serialize(msg)
    return {"ok": True, "message": _serialize(msg)}


@router.websocket("/ws/messages")
async def messages_ws(websocket: WebSocket):
    user_id = websocket.headers.get("x-user-id") or websocket.query_params.get("user_id")
    if not user_id:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    _WS_CONNECTIONS.setdefault(user_id, set()).add(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # allow sending via ws: {"recipient_id":..., "body":...}
            recipient_id = str(data.get("recipient_id") or "")
            body = str(data.get("body") or "")
            if not recipient_id or not body:
                await websocket.send_json({"type": "error", "detail": "recipient_id and body required"})
                continue
            async with AsyncSessionLocal() as db:
                if not await _ensure_match(db, user_id, recipient_id):
                    await websocket.send_json({"type": "error", "detail": "Users are not matched"})
                    continue
                msg = Message(sender_id=user_id, recipient_id=recipient_id, body=body, delivery_state="sent")
                db.add(msg)
                await db.commit()
                await db.refresh(msg)
                payload = {"type": "message", "message": _serialize(msg)}
                await websocket.send_json(payload)
                await _push_to_user(recipient_id, payload)
                if _WS_CONNECTIONS.get(recipient_id):
                    msg.delivery_state = "delivered"
                    msg.delivered_at = datetime.now(timezone.utc)
                    await db.commit()
                    await db.refresh(msg)
                    await websocket.send_json({"type": "delivery", "message": _serialize(msg)})
    except WebSocketDisconnect:
        pass
    finally:
        _WS_CONNECTIONS.get(user_id, set()).discard(websocket)
