from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import CurrentUser, get_current_user, require_admin
from src.modules.moderation import service
from src.modules.moderation.service import ModerationError

router = APIRouter(tags=["Moderation"])


class BlockRequest(BaseModel):
    user_id: str


class BlockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    blocked_id: str
    created_at: datetime


class ReportRequest(BaseModel):
    user_id: str
    reason: str
    details: Optional[str] = Field(default=None, max_length=2000)


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    reporter_id: str
    reported_id: str
    reason: str
    details: Optional[str] = None
    status: str
    resolution_note: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class ResolveReportRequest(BaseModel):
    outcome: str
    note: Optional[str] = Field(default=None, max_length=2000)
    deactivate_user: bool = False


def _http(error: ModerationError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)


@router.post("/blocks", response_model=BlockResponse, status_code=status.HTTP_201_CREATED)
async def block(body: BlockRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        return await service.block_user(db, user.id, body.user_id)
    except ModerationError as error:
        raise _http(error)


@router.get("/blocks", response_model=list[BlockResponse])
async def my_blocks(user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await service.list_blocks(db, user.id)


@router.delete("/blocks/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock(user_id: str, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not await service.unblock_user(db, user.id, user_id):
        raise HTTPException(status_code=404, detail="Block not found")


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def report(body: ReportRequest, user: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        return await service.create_report(db, user.id, body.user_id, body.reason, body.details)
    except ModerationError as error:
        raise _http(error)


@router.get("/admin/reports", response_model=list[ReportResponse])
async def review_queue(
    report_status: Optional[str] = Query(default="OPEN", alias="status"),
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await service.list_reports(db, report_status)
    except ModerationError as error:
        raise _http(error)


@router.post("/admin/reports/{report_id}/resolve", response_model=ReportResponse)
async def resolve(
    report_id: str,
    body: ResolveReportRequest,
    admin: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await service.resolve_report(db, report_id, admin.id, body.outcome, body.note, body.deactivate_user)
    except ModerationError as error:
        raise _http(error)
