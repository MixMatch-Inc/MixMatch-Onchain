import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.db.models import Transaction
from src.modules.payments.router import get_current_user_id

router = APIRouter(prefix="/payments", tags=["Transaction export"])

CSV_HEADERS = ["id", "created_at", "destination", "amount", "asset", "memo", "status", "stellar_tx_hash"]


def _parse_date(value: Optional[str], field: str) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"{field} must be an ISO date") from exc


def _rows(transactions) -> list[list[str]]:
    rows = []
    for tx in transactions:
        rows.append(
            [
                tx.id,
                tx.created_at.isoformat(),
                tx.destination_public_key,
                tx.amount,
                tx.asset_code or "XLM",
                tx.memo or "",
                tx.status,
                tx.stellar_tx_hash or "",
            ]
        )
    return rows


def _csv_bytes(rows: list[list[str]]) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_HEADERS)
    writer.writerows(rows)
    return output.getvalue().encode("utf-8-sig")


def _pdf_bytes(rows: list[list[str]]) -> bytes:
    lines = ["Transaction history", ""]
    lines.extend(" | ".join(row[:5]) for row in rows)
    escaped = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
    text_ops = "\n".join(f"BT /F1 9 Tf 40 {800 - index * 14} Td ({line}) Tj ET" for index, line in enumerate(escaped[:50]))
    content = f"<< /Length {len(text_ops)} >>\nstream\n{text_ops}\nendstream".encode("latin-1", "replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        content,
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(pdf)


@router.get("/export")
async def export_transactions(
    format: str = Query(default="csv", pattern="^(csv|pdf)$"),
    from_date: Optional[str] = Query(default=None, alias="from"),
    to_date: Optional[str] = Query(default=None, alias="to"),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    start = _parse_date(from_date, "from")
    end = _parse_date(to_date, "to")

    result = await db.execute(select(Transaction).order_by(Transaction.created_at.desc()))
    transactions = []
    for tx in result.scalars().all():
        created = tx.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if (not start or created >= start) and (not end or created <= end):
            transactions.append(tx)
    rows = _rows(transactions)

    if format == "pdf":
        return Response(
            content=_pdf_bytes(rows),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="mixmatch-transactions.pdf"'},
        )
    return Response(
        content=_csv_bytes(rows),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="mixmatch-transactions.csv"'},
    )
