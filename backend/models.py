import os
from datetime import datetime

from dotenv import load_dotenv
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

load_dotenv()

DB_FILE_NAME = os.getenv("DB_FILE", "teaspoon_v1.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///./data/{DB_FILE_NAME}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DBUserCourse(Base):
    __tablename__ = "user_courses"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, index=True)
    course_code = Column(String, ForeignKey("courses.code"), primary_key=True, index=True)
    semester_code = Column(String, ForeignKey("semesters.code"), primary_key=True, index=True)


class DBUserAssignment(Base):
    __tablename__ = "user_assignments"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), primary_key=True)
    is_completed = Column(Boolean, default=False)
    grade = Column(Integer, nullable=True)


class DBUser(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    picture = Column(String)
    role = Column(String, default="student")
    moodle_ics_url = Column(String(500), nullable=True)
    total_credits = Column(Float, default=0.0)
    weighted_sum = Column(Float, default=0.0)
    previous_total_credits = Column(Float, default=0.0)
    previous_weighted_sum = Column(Float, default=0.0)
    binary_credits = Column(Float, default=0.0)
    previous_binary_credits = Column(Float, default=0.0)
    last_seen_version = Column(Integer, default=0)


class DBCourse(Base):
    __tablename__ = "courses"
    code = Column(String, primary_key=True, index=True)
    name = Column(String)
    hw_weight = Column(Integer, default=0)
    hw_keep = Column(Integer, default=0)
    ww_weight = Column(Integer, default=0)
    ww_keep = Column(Integer, default=0)
    exam_weight = Column(Integer, default=0)
    hw_magen = Column(Boolean, default=False)
    ww_magen = Column(Boolean, default=False)
    exam_magen = Column(Boolean, default=False)
    lab_report_weight = Column(Integer, default=0)
    lab_report_keep = Column(Integer, default=0)
    lab_report_magen = Column(Boolean, default=False)
    last_edited = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DBAssignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    moodle_uid = Column(String(255), nullable=True)
    title = Column(String)
    course_code = Column(String, ForeignKey("courses.code"))
    type = Column(String)
    deadline = Column(String)
    recommended_deadline = Column(String, nullable=True)
    attachments = relationship("DBAttachment", back_populates="assignment", cascade="all, delete-orphan")
    user_id = Column(Integer, ForeignKey("users.id"))
    semester_code = Column(String, ForeignKey("semesters.code"), nullable=True, index=True)


class DBSemester(Base):
    __tablename__ = "semesters"
    
    code = Column(String, primary_key=True)  # e.g., "2026_SPRING"
    name = Column(String)                    # e.g., "סמסטר אביב תשפ\"ו"
    term = Column(String)                    # "WINTER", "SPRING", or "SUMMER"
    year = Column(Integer)
    position = Column(Integer, index=True)   # 0 = Current, 1 = Previous, 2 = Oldest
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DBHiddenMoodleUID(Base):
    __tablename__ = "hidden_moodle_uids"
    moodle_uid = Column(String, primary_key=True, index=True)
    deleted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    deleted_at = Column(DateTime, default=datetime.utcnow)


class DBAttachment(Base):
    __tablename__ = "attachments"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    object_name = Column(String)
    category = Column(String, default="assignment")
    assignment = relationship("DBAssignment", back_populates="attachments")


class DBAttachmentLike(Base):
    __tablename__ = "attachment_likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    attachment_id = Column(Integer, ForeignKey("attachments.id"))


class DBUserStat(Base):
    __tablename__ = "user_stats"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    lifetime_likes = Column(Integer, default=0)


class DBAuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(String)
    old_data = Column(String, nullable=True)
    new_data = Column(String, nullable=True)
    status = Column(String, default="PENDING")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    user = relationship("DBUser")


class DBSummary(Base):
    __tablename__ = "summaries"
    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String, ForeignKey("courses.code", ondelete="CASCADE"))
    uploader_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    object_name = Column(String)
    upload_date = Column(DateTime, default=datetime.utcnow)
    course = relationship("DBCourse")
    semester_code = Column(String, ForeignKey("semesters.code"), nullable=True, index=True)


class DBSummaryLike(Base):
    __tablename__ = "summary_likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    summary_id = Column(Integer, ForeignKey("summaries.id", ondelete="CASCADE"))


class DBChangelog(Base):
    __tablename__ = "changelogs"
    id = Column(Integer, primary_key=True, index=True)
    version = Column(Integer, unique=True, index=True)
    date_str = Column(String(100))
    title = Column(String(255))
    features = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)
