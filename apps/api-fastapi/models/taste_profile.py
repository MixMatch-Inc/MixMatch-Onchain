from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import declarative_base
import datetime

Base = declarative_base()

class TasteProfileModel(Base):
    __tablename__ = "taste_profiles"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    genre_preferences = Column(String, nullable=True)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
