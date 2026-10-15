from sqlalchemy import Column, Integer, String, Text, Boolean
from database import Base
class OutboxModel(Base):
    __tablename__ = "event_outbox"
    revision = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(36), unique=True, nullable=False)
    request_key = Column(String(128), unique=True, nullable=True)
    payload = Column(Text, nullable=False)
    published = Column(Boolean, nullable=False, default=False)
