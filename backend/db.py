from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from config import DATABASE_URL
from datetime import datetime

engine = create_engine(DATABASE_URL)
sessionlocal = sessionmaker(bind=engine)
Base = declarative_base()

class Job(Base):
    __tablename__ = "jobs"

    id                  = Column(Integer, primary_key=True, index=True)
    job_title           = Column(String)
    job_title_short     = Column(String)
    company_name        = Column(String)
    job_location        = Column(String)
    job_country         = Column(String)
    job_schedule_type   = Column(String)
    job_work_from_home  = Column(Boolean)
    salary_year_avg     = Column(Float)
    salary_hour_avg     = Column(Float)
    job_skills          = Column(Text)
    job_posted_date     = Column(String)

class QueryHistory(Base):
    __tablename__ = "query_history"

    id         = Column(Integer, primary_key=True, index=True)
    question   = Column(Text, nullable=False)
    answer     = Column(Text, nullable=False)
    sources    = Column(Text)          # JSON-serialized list of source strings
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
