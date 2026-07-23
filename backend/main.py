import os
import uuid
import json
import httpx
import jwt
import re
import hmac
import hashlib
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
import time
from datetime import datetime, timedelta
from typing import List, Optional
from urllib.parse import quote
from fastapi import FastAPI, Depends, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.responses import StreamingResponse
from collections import defaultdict
import mimetypes
from sqlalchemy import update
from sqlalchemy import or_, and_, func
from sqlalchemy.orm import Session, sessionmaker
import requests
from icalendar import Calendar
import pytz
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio

from models import (
    Base,
    DBAssignment,
    DBAttachment,
    DBAttachmentLike,
    DBAuditLog,
    DBChangelog,
    DBCourse,
    DBSemester,
    DBHiddenMoodleUID,
    DBSummary,
    DBSummaryLike,
    DBUser,
    DBUserAssignment,
    DBUserCourse,
    DBUserStat,
    SessionLocal,
    engine,
)
from schemas import (
    AdvanceSemesterPayload,
    AssignmentCreate,
    AttachmentUpdate,
    ChangelogFeature,
    ChangelogPayload,
    CourseCodeUpdate,
    CourseUpdate,
    GradeUpdate,
    MergeAssignmentsRequest,
    MoodleSyncRequest,
    ProgressUpdateReq,
    SemesterOut,
    UpdateVersionRequest,
    RoleUpdate
)

# Load environment variables from .env file
load_dotenv()

# --- Configuration & Environment ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "https://api.myteaspoon.tech/api/v2/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://myteaspoon.tech")
JWT_SECRET = os.getenv("JWT_SECRET")
APP_SECRET = os.getenv("SECRET_KEY").encode()

# --- MinIO Configuration ---
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "https://api.myteaspoon.tech")
BUCKET_NAME = "teaspoon-files"
SUMMARIES_BUCKET = "teaspoon-summaries"

s3_client = boto3.client(
    's3',
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version='s3v4')
)

# Ensure both buckets exist on startup
for bucket in [BUCKET_NAME, SUMMARIES_BUCKET]:
    try:
        s3_client.head_bucket(Bucket=bucket)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=bucket)
        except Exception as e:
            print(f"Warning: Could not create MinIO bucket {bucket} on startup. ({e})")

# --- App Setup ---
scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP LOGIC ---
    scheduler.add_job(async_nightly_job, CronTrigger(hour=2, minute=0))
    scheduler.start()
    print("Nightly Moodle Sync Scheduler Started!")

    yield  # Yield control back to FastAPI to run the server

    # --- SHUTDOWN LOGIC ---
    print("Shutting down Moodle Sync Scheduler...")
    scheduler.shutdown()
app = FastAPI(title="Teaspoon API", lifespan=lifespan)

# Robust CORS handling with regex catch-all
allowed_origins = [
    "https://myteaspoon.tech",
    "http://localhost:5173",
    "http://localhost:3000",
]
if FRONTEND_URL and FRONTEND_URL not in allowed_origins:
    allowed_origins.append(FRONTEND_URL.strip().rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://([a-zA-Z0-9-]+\.)*myteaspoon\.tech",  # Catches any subdomain mismatch
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Anti-Cache Middleware to prevent browsers from holding onto ghost 200 OK errors
@app.middleware("http")
async def prevent_browser_caching(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def touch_course_vitality(db: Session, course_code: str):
    """Updates the last_edited timestamp for a course to keep it active."""
    # Don't track the personal 'My Tasks' pseudo-course
    if course_code == "9990999":
        return

    course = db.query(DBCourse).filter(DBCourse.code == course_code).first()
    if course:
        course.last_edited = datetime.utcnow()
        db.add(course)


# --- Authentication Dependencies ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def get_optional_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        return None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_active_semester_code(db: Session) -> str:
    """Fetches the code of the currently active semester (position 0)."""
    active_sem = db.query(DBSemester).filter(DBSemester.position == 0).first()
    return active_sem.code if active_sem else None


def get_admin_user(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    if not user or user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access strictly required")
    return user


def get_write_user(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    if user and user.role == "restricted":
        raise HTTPException(status_code=403, detail="Your account has been restricted from making edits.")
    return current_user  # Returns the normal payload so your routes don't break


# -- MinIO helper functions --
def generate_secure_download_query(attachment_id: int, expires_in_seconds: int = 3600) -> str:
    """Generates a cryptographically signed query string with an expiration timestamp."""
    expires_at = int(time.time()) + expires_in_seconds
    message = f"{attachment_id}:{expires_at}".encode()
    signature = hmac.new(APP_SECRET, message, hashlib.sha256).hexdigest()
    return f"?expires={expires_at}&sig={signature}"


def file_stream(response):
    """Yields large files from S3 in 1MB chunks to prevent memory overload"""
    for chunk in response['Body'].iter_chunks(chunk_size=1024 * 1024):
        if chunk:
            yield chunk


# Moodle import helper functions
def process_moodle_link(ics_url: str, user_id: int, db: Session):
    """Core logic to fetch, parse, and upsert Moodle assignments."""
    response = requests.get(ics_url, timeout=15)
    response.raise_for_status()
    cal = Calendar.from_ical(response.content)
    sync_count = 0
    hidden_records = db.query(DBHiddenMoodleUID.moodle_uid).all()
    blacklisted_uids = {record[0] for record in hidden_records} # Fast lookup set

    for component in cal.walk():
        if component.name == "VEVENT":
            summary = str(component.get('summary', '')).strip()
            deadline_keywords = ['הגשה', 'הגשת', 'להגיש', 'גליון', 'גיליון', 'תרגיל', 'נסגר', 'is due', 'Quiz', 'סימולציה']

            moodle_uid = str(component.get('uid', ''))
            if moodle_uid in blacklisted_uids: continue

            # Filter out Zoom meetings or course openings
            if summary.startswith("נפתח ב") or "קישור" in summary or "זום" in summary or "סקר" in summary or "מילואים" in summary:
                continue

            if not any(word in summary for word in deadline_keywords):
                continue

            # Extract Deadline
            dt_field = component.get('dtend') or component.get('dtstart')
            if not dt_field: continue

            deadline = dt_field.dt
            if not isinstance(deadline, datetime):
                deadline = datetime.combine(deadline, datetime.max.time())
            if deadline.tzinfo:
                deadline = deadline.astimezone(pytz.utc).replace(tzinfo=None)

            # Skip past deadlines
            if deadline < datetime.utcnow():
                continue

            # Extract Category (Technion Moodle Format)
            category_prop = component.get('categories')
            if not category_prop:
                continue

            # Properly extract the raw text from the icalendar vCategory object
            try:
                category_str = category_prop.to_ical().decode('utf-8')
            except AttributeError:
                category_str = str(category_prop)

            raw_code = category_str.split('.')[0]  # e.g. '00440252'

            course_code = raw_code.lstrip('0')
            course_code = course_code.zfill(7)

            moodle_uid = str(component.get('uid', ''))
            if not moodle_uid: continue

            clean_title = (summary.replace(" נסגרת", "").replace(" נסגר", "")
                           .replace(" is due", "").replace("הגשת ", "").replace("הגשה ", "")
                           .replace("יש להגיש", "").replace(" את ", "").replace("תאריך ", "").strip())

            # Regex to extract structured assignment names
            pattern = r"(תרגיל|סימולציה|גיליון|גליון|Quiz|HW|WW).*?(\d+)"
            match = re.search(pattern, clean_title, re.IGNORECASE)

            if match:
                keyword = match.group(1)

                # Optional: Standardize spelling (make "גליון" -> "גיליון" and capitalize English words)
                if keyword == "גליון":
                    keyword = "גיליון"
                elif keyword.lower() == "quiz":
                    keyword = "Quiz"
                elif keyword.lower() == "ww":
                    keyword = "WW"

                number = match.group(2)
                clean_title = f"{keyword} {number}"

            # Deduplication: Check if it exists by UID or (Code + Title)
            existing = db.query(DBAssignment).filter(DBAssignment.moodle_uid == moodle_uid).first()

            if not existing:
                # 2. Heuristic Search: Find manual assignments in the same course (no moodle_uid yet)
                manual_candidates = db.query(DBAssignment).filter(
                    DBAssignment.course_code == course_code,
                    DBAssignment.moodle_uid == None
                ).all()

                for cand in manual_candidates:
                    # Safely convert the database string back to a datetime object
                    cand_deadline_dt = cand.deadline
                    if isinstance(cand_deadline_dt, str):
                        # Standardize "YYYY-MM-DD HH:MM:SS" SQLite format
                        clean_str = cand_deadline_dt[:19].replace('T', ' ')
                        try:
                            cand_deadline_dt = datetime.strptime(clean_str, "%Y-%m-%d %H:%M:%S")
                        except ValueError:
                            continue  # Skip if unparseable

                    # Now we can safely subtract them!
                    delta_days = abs((cand_deadline_dt - deadline).days)

                    if delta_days <= 10:
                        # Extract the first number found in both titles
                        cand_num_match = re.search(r"(\d+)", str(cand.title))
                        new_num_match = re.search(r"(\d+)", clean_title)

                        if (not new_num_match or (
                                cand_num_match and new_num_match and cand_num_match.group(1) == new_num_match.group(
                                1))):
                            existing = cand
                            print(f"DEBUG [AUTO-MERGE]: Merged Moodle '{clean_title}' into Manual '{cand.title}'")
                            break

            if existing:
                if not existing.moodle_uid: existing.moodle_uid = moodle_uid

                # Check for deadline updates (Convert both to strings to compare safely)
                existing_deadline_str = str(existing.deadline)[:19].replace('T', ' ')
                new_deadline_str = str(deadline)[:19]

                if existing_deadline_str != new_deadline_str:
                    existing.deadline = deadline
                    sync_count += 1

                if getattr(existing, 'course_code', existing.course_code) != course_code:
                    if hasattr(existing, 'course_code'):
                        existing.course_code = course_code
                    else:
                        existing.course_code = course_code
            else:
                print(f"DEBUG [NEW]: {course_code} | '{clean_title}' | Deadline: {deadline}")
                new_assignment = DBAssignment(
                    title=clean_title,
                    course_code=course_code,
                    deadline=deadline,
                    type="Assignment",
                    user_id=user_id,
                    moodle_uid=moodle_uid,
                    semester_code=get_active_semester_code(db)
                )
                db.add(new_assignment)
                sync_count += 1

    db.commit()
    return sync_count


def run_nightly_moodle_sync():
    print("Starting Smart Nightly Moodle Sync...")
    db = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        users_with_links = db.query(DBUser).filter(DBUser.moodle_ics_url != None).all()
        user_coverage = {}
        all_uncovered_courses = set()

        for u in users_with_links:
            user_courses = set(json.loads(u.courses)) if u.courses else set()
            if user_courses:
                user_coverage[u.id] = {"url": u.moodle_ics_url, "courses": user_courses}
                all_uncovered_courses.update(user_courses)

        selected_links = []

        # Greedy algorithm: Pick links that cover the most missing courses
        while all_uncovered_courses:
            best_user_id, max_coverage = None, 0
            for uid, data in user_coverage.items():
                coverage_count = len(data["courses"].intersection(all_uncovered_courses))
                if coverage_count > max_coverage:
                    max_coverage = coverage_count
                    best_user_id = uid

            if not best_user_id: break

            winner_data = user_coverage.pop(best_user_id)
            selected_links.append((best_user_id, winner_data["url"]))
            all_uncovered_courses -= winner_data["courses"]

        # Execute sequentially
        for uid, url in selected_links:
            try:
                process_moodle_link(url, uid, db)
            except Exception as e:
                db.rollback()
            time.sleep(5)  # Polite delay for Moodle servers

    finally:
        db.close()
        print("Nightly sync finished.")


async def async_nightly_job():
    await asyncio.to_thread(run_nightly_moodle_sync)


# --- Auth Routes ---
@app.get("/api/v2/auth/login")
def login_via_google():
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={GOOGLE_CLIENT_ID}&response_type=code&redirect_uri={GOOGLE_REDIRECT_URI}&scope=openid%20email%20profile&access_type=offline"
    return RedirectResponse(url=google_auth_url)


@app.get("/api/v2/auth/callback")
async def google_auth_callback(code: str, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_res = await client.post("https://oauth2.googleapis.com/token", data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI
        })
        token_data = token_res.json()
        if "access_token" not in token_data:
            error_msg = token_data.get("error_description", token_data.get("error", "Unknown error"))
            raise HTTPException(status_code=400, detail=f"Google Error: {error_msg}")

        user_res = await client.get("https://www.googleapis.com/oauth2/v2/userinfo",
                                    headers={"Authorization": f"Bearer {token_data['access_token']}"})
        user_info = user_res.json()

    user = db.query(DBUser).filter(DBUser.google_id == user_info["id"]).first()
    if not user:
        user = DBUser(google_id=user_info["id"], email=user_info["email"], name=user_info["name"],
                      picture=user_info.get("picture", ""))
        db.add(user)
    else:
        # refresh profile data on every login
        new_picture = user_info.get("picture", "")
        new_name = user_info.get("name", user.name)

        # Only trigger a database update if something actually changed
        if user.picture != new_picture or user.name != new_name:
            user.picture = new_picture
            user.name = new_name

    # Commit changes (either the new user insertion or the updated profile)
    db.commit()
    db.refresh(user)

    jwt_token = jwt.encode({"sub": user.google_id, "id": user.id, "role": user.role, "exp": datetime.utcnow() + timedelta(days=30)},
                           JWT_SECRET, algorithm="HS256")
    return RedirectResponse(url=f"{FRONTEND_URL}/?token={jwt_token}")


@app.get("/api/v2/users/me")
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()

    # Calculate valid likes from this current active semester (Attachments)
    semester_likes = db.query(DBAttachmentLike).join(
        DBAttachment, DBAttachmentLike.attachment_id == DBAttachment.id
    ).filter(DBAttachment.user_id == user.id).count()

    # Calculate likes from Summaries
    summary_likes = db.query(DBSummaryLike).join(
        DBSummary, DBSummaryLike.summary_id == DBSummary.id
    ).filter(DBSummary.uploader_id == user.id).count()

    # Grab their preserved "Vault" score from previous semesters
    stats = db.query(DBUserStat).filter(DBUserStat.user_id == user.id).first()
    lifetime = stats.lifetime_likes if stats else 0

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "totalLikesReceived": semester_likes + summary_likes + lifetime,
        "last_seen_version": user.last_seen_version or 0,
        "moodle_ics_url": user.moodle_ics_url,
        "total_credits": getattr(user, 'total_credits', 0.0),
        "weighted_sum": getattr(user, 'weighted_sum', 0.0),
        "previous_total_credits": getattr(user, 'previous_total_credits', 0.0),
        "previous_weighted_sum": getattr(user, 'previous_weighted_sum', 0.0),
        "binary_credits": getattr(user, 'binary_credits', 0.0),
        "previous_binary_credits": getattr(user, 'previous_binary_credits', 0.0)
    }


# --- Course Routes ---
@app.get("/api/v2/courses")
def get_all_courses(db: Session = Depends(get_db)):
    courses = db.query(DBCourse).all()
    return {
        c.code: {
            "name": c.name,
            "hw_weight": c.hw_weight,
            "hw_keep": c.hw_keep,
            "ww_weight": c.ww_weight,
            "ww_keep": c.ww_keep,
            "exam_weight": c.exam_weight,
            "hw_magen": c.hw_magen,
            "ww_magen": c.ww_magen,
            "exam_magen": c.exam_magen,
            "lab_report_weight": c.lab_report_weight,
            "lab_report_keep": c.lab_report_keep,
            "lab_report_magen": c.lab_report_magen
        } for c in courses
    }


@app.put("/api/v2/courses/{course_code}")
def update_course(course_code: str, course_data: dict, current_user: dict = Depends(get_write_user),
                  db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    course = db.query(DBCourse).filter(DBCourse.code == course_code).first()
    is_trusted = user.role in ["admin", "owner"]

    # Filter frontend keys to match EXACTLY what exists in the database
    valid_data = {}
    dummy = course if course else DBCourse()
    for key, value in course_data.items():
        if hasattr(dummy, key) and not key.startswith("_"):
            valid_data[key] = value

    if not course:
        new_course = DBCourse(code=course_code, **valid_data)
        db.add(new_course)
        if not is_trusted:
            audit_log = DBAuditLog(
                user_id=user.id,
                action="CREATE",
                entity_type="COURSE",
                entity_id=course_code,
                new_data=json.dumps(valid_data),
                status="PENDING"
            )
            db.add(audit_log)
    else:
        # Snapshot existing courses before updating safely
        old_data = {key: getattr(course, key) for key in valid_data.keys()}

        for key, value in valid_data.items():
            setattr(course, key, value)

        if not is_trusted:
            audit_log = DBAuditLog(
                user_id=user.id,
                action="UPDATE",
                entity_type="COURSE",
                entity_id=course_code,
                old_data=json.dumps(old_data),
                new_data=json.dumps(valid_data),
                status="PENDING"
            )
            db.add(audit_log)

    touch_course_vitality(db, course_code)

    db.commit()
    return {"success": True}


@app.put("/api/v2/admin/courses/{old_code}/code")
def update_course_code(old_code: str, payload: CourseCodeUpdate, admin: DBUser = Depends(get_admin_user),
                       db: Session = Depends(get_db)):
    new_code = payload.new_code
    if new_code == old_code:
        return {"success": True}

    course = db.query(DBCourse).filter(DBCourse.code == old_code).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if db.query(DBCourse).filter(DBCourse.code == new_code).first():
        raise HTTPException(status_code=400, detail="Target course code already exists")

    # Clone the course FIRST so the new Foreign Key target exists
    course_dict = {c.name: getattr(course, c.name) for c in course.__table__.columns if c.name != "code"}
    course_dict["code"] = new_code

    new_course = DBCourse(**course_dict)
    db.add(new_course)
    db.flush()  # Pushes the new course to the DB instantly, keeping the transaction open

    # Repoint all assignments to the new course code
    db.query(DBAssignment).filter(DBAssignment.course_code == old_code).update({"course_code": new_code})

    # Safely repoint the many-to-many association table
    db.execute(
        update(DBUserCourse)
        .where(DBUserCourse.course_code == old_code)
        .values(course_code=new_code)
    )

    # Safely destroy the old course now that nothing depends on it
    db.delete(course)

    touch_course_vitality(db, new_code)

    # Commit the entire transaction atomically
    db.commit()

    return {"success": True}


@app.get("/api/v2/users/me/courses")
def get_my_courses(
    semester_code: Optional[str] = None, 
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Fallback for empty/bad JS strings
    if not semester_code or semester_code in ["undefined", "null", ""]:
        active_sem = db.query(DBSemester).filter(DBSemester.position == 0).first()
        semester_code = active_sem.code if active_sem else None

    # Query the real model directly!
    user_courses_records = db.query(DBUserCourse).filter(
        DBUserCourse.user_id == current_user["id"],
        DBUserCourse.semester_code == semester_code
    ).all()
    
    # Extract just the strings for the frontend
    return [record.course_code for record in user_courses_records]


@app.post("/api/v2/users/me/courses")
def update_my_courses(
    course_codes: List[str], 
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get the current active semester
    active_sem = db.query(DBSemester).filter(DBSemester.position == 0).first()
    active_sem_code = active_sem.code if active_sem else None

    if not active_sem_code:
        raise HTTPException(status_code=400, detail="No active semester found")

    # Delete existing selections for THIS SEMESTER ONLY
    db.query(DBUserCourse).filter(
        DBUserCourse.user_id == current_user["id"],
        DBUserCourse.semester_code == active_sem_code
    ).delete(synchronize_session=False)

    # Insert the new selections as real objects
    for code in course_codes:
        new_enrollment = DBUserCourse(
            user_id=current_user["id"],
            course_code=code,
            semester_code=active_sem_code
        )
        db.add(new_enrollment)

    db.commit()
    return {"success": True}


# --- Assignment Routes ---
@app.get("/api/v2/assignments")
def get_assignments(semester_code: Optional[str] = None, optional_user: dict = Depends(get_optional_user), db: Session = Depends(get_db)):
    pending_logs = db.query(DBAuditLog.entity_id).filter(
        DBAuditLog.action == "DELETE",
        DBAuditLog.entity_type == "ASSIGNMENT",
        DBAuditLog.status == "PENDING"
    ).all()

    pending_ids = [int(log[0].split(":")[0]) for log in pending_logs if ":" in log[0]]

    if not semester_code or semester_code in ["undefined", "null", ""]:
        active_sem = db.query(DBSemester).filter(DBSemester.position == 0).first()
        semester_code = active_sem.code if active_sem else None

    conditions = []

    if semester_code:
        conditions.append(DBAssignment.semester_code == semester_code)
    if pending_ids:
        conditions.append(DBAssignment.id.notin_(pending_ids))
    if optional_user:
        current_user_id = optional_user["id"]
        # Users see public courses OR their own private tasks
        user_permission_block = or_(
            DBAssignment.course_code != "9990999",
            and_(
                DBAssignment.course_code == "9990999",
                DBAssignment.user_id == current_user_id
            )
        )
        conditions.append(user_permission_block)

        # Fetch personal completed/grade data
        entries = db.query(DBUserAssignment).filter(DBUserAssignment.user_id == current_user_id).all()
        user_data = {e.assignment_id: {"completed": e.is_completed, "grade": e.grade} for e in entries}

    else:
        # Guests ONLY see public courses
        conditions.append(DBAssignment.course_code != "9990999")
        user_data = {}

    assignments = db.query(DBAssignment).filter(and_(*conditions)).all()

    print(f"DEBUG: Fetched {len(assignments)} assignments for semester '{semester_code}' with user context: {optional_user}")

    results = []
    for a in assignments:
        attachments = []
        for att in a.attachments:
            try:
                # Generate a mathematically un-guessable 1-hour presigned URL
                secure_query = generate_secure_download_query(att.id, expires_in_seconds=3600)
                url = f"{MINIO_PUBLIC_URL}/api/v2/attachments/{att.id}/download{secure_query}"

                # Dynamically calculate likes and user status
                likes_count = db.query(DBAttachmentLike).filter(DBAttachmentLike.attachment_id == att.id).count()

                is_liked = False
                if optional_user:
                    is_liked = db.query(DBAttachmentLike).filter(
                        DBAttachmentLike.attachment_id == att.id,
                        DBAttachmentLike.user_id == optional_user["id"]
                    ).first() is not None

                attachments.append({
                    "id": att.id,
                    "filename": att.filename,
                    "url": url,
                    "uploader_id": att.user_id,
                    "category": att.category,
                    "likes": likes_count,
                    "isLikedByMe": is_liked
                })
            except Exception as e:
                print(f"Error generating url for {att.filename}: {e}")

        results.append({
            "id": a.id,
            "title": a.title,
            "course_code": a.course_code,
            "type": a.type,
            "deadline": a.deadline,
            "recommended_deadline": getattr(a, 'recommended_deadline', None),
            "isCompleted": user_data.get(a.id, {}).get("completed", False),
            "grade": user_data.get(a.id, {}).get("grade", None),
            "attachments": attachments
        })
    return results


@app.post("/api/v2/assignments")
def create_assignment(assignment: AssignmentCreate, current_user: dict = Depends(get_write_user),
                      db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()

    new_assignment = DBAssignment(
        **assignment.dict(exclude={"user_id"}),
        user_id=current_user.get("id"),
        semester_code=get_active_semester_code(db)
    )
    db.add(new_assignment)
    db.flush()

    # Send for admin approval if not owner or admin
    if user and user.role not in ["admin", "owner"] and assignment.course_code != "9990999":
        audit_log = DBAuditLog(
            user_id=user.id,
            action="CREATE",
            entity_type="ASSIGNMENT",
            entity_id=f"{new_assignment.id}:{new_assignment.course_code} - {new_assignment.title}",
            new_data=json.dumps(assignment.dict()),
            status="PENDING"
        )
        db.add(audit_log)

    db_course = db.query(DBCourse).filter(DBCourse.code == assignment.course_code).first()
    if db_course:
        touch_course_vitality(db, assignment.course_code)

    db.commit()
    db.refresh(new_assignment)
    return new_assignment


@app.put("/api/v2/assignments/{assignment_id}")
def update_assignment(assignment_id: int, assignment: AssignmentCreate,
                      current_user: dict = Depends(get_write_user),
                      db: Session = Depends(get_db)):
    db_assignment = db.query(DBAssignment).filter(DBAssignment.id == assignment_id).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    old_data = {
        "title": db_assignment.title,
        "course_code": db_assignment.course_code,
        "type": db_assignment.type,
        "deadline": db_assignment.deadline,
        "recommended_deadline": getattr(db_assignment, 'recommended_deadline', None)
    }

    # Always apply changes optimistically
    for key, value in assignment.dict().items():
        setattr(db_assignment, key, value)

    # Send for admin approval if not owner or admin
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    is_trusted = user and user.role in ["admin", "owner"] or user.id == db_assignment.user_id
    if not is_trusted and assignment.course_code != "9990999":
        audit_log = DBAuditLog(
            user_id=user.id,
            action="UPDATE",
            entity_type="ASSIGNMENT",
            entity_id=f"{db_assignment.id}:{db_assignment.course_code} - {db_assignment.title}",
            old_data=json.dumps(old_data),
            new_data=json.dumps(assignment.dict()),
            status="PENDING"  # Stored for Admin Approval
        )
        db.add(audit_log)

    db_course = db.query(DBCourse).filter(DBCourse.code == assignment.course_code).first()
    if db_course:
        touch_course_vitality(db, assignment.course_code)

    db.commit()
    db.refresh(db_assignment)
    return db_assignment


@app.post("/api/v2/attachments/{attachment_id}/like")
def toggle_like(attachment_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    existing_like = db.query(DBAttachmentLike).filter(
        DBAttachmentLike.user_id == current_user["id"],
        DBAttachmentLike.attachment_id == attachment_id
    ).first()

    if existing_like:
        db.delete(existing_like)
    else:
        new_like = DBAttachmentLike(user_id=current_user["id"], attachment_id=attachment_id)
        db.add(new_like)

    db.commit()
    return {"success": True}


@app.delete("/api/v2/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, current_user: dict = Depends(get_write_user),
                      db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    db_assignment = db.query(DBAssignment).filter(DBAssignment.id == assignment_id).first()

    if (not user or user.role not in ["admin", "owner"]) and len(db_assignment.attachments) > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete assignment because it has attachments. Delete the attachments first."
        )

    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    is_trusted = user and user.role in ["admin", "owner"] or user.id == db_assignment.user_id

    # If untrusted, just create the ticket and leave the data alone!
    if not is_trusted and db_assignment.course_code != "9990999":
        audit_log = DBAuditLog(
            user_id=user.id,
            action="DELETE",
            entity_type="ASSIGNMENT",
            entity_id=f"{db_assignment.id}:{db_assignment.course_code} - {db_assignment.title}",
            old_data="{}",  # No snapshot needed, the data is still safely in the DB!
            status="PENDING"
        )
        db.add(audit_log)
        db.commit()
        return {"success": True, "status": "pending_approval"}

    # Execute the full deep sweep immediately for trusted users
    db.query(DBAuditLog).filter(
        DBAuditLog.entity_type == "ASSIGNMENT",
        DBAuditLog.entity_id.like(f"{db_assignment.id}:%")
    ).delete(synchronize_session=False)

    db.query(DBUserAssignment).filter(DBUserAssignment.assignment_id == db_assignment.id).delete(
        synchronize_session=False)

    for attachment in db_assignment.attachments:
        db.query(DBAttachmentLike).filter(DBAttachmentLike.attachment_id == attachment.id).delete(
            synchronize_session=False)
        try:
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=attachment.object_name)
        except Exception:
            pass
        db.delete(attachment)

    if getattr(db_assignment, 'moodle_uid', None):
            hidden_record = DBHiddenMoodleUID(
                moodle_uid=db_assignment.moodle_uid,
                deleted_by=user.id
            )
            db.merge(hidden_record)

    db.delete(db_assignment)

    db_course = db.query(DBCourse).filter(DBCourse.code == db_assignment.course_code).first()
    if db_course:
        touch_course_vitality(db, str(db_assignment.course_code))

    db.commit()
    return {"success": True}


@app.post("/api/v2/assignments/{assignment_id}/toggle")
def toggle_assignment_completion(assignment_id: int, current_user: dict = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    entry = db.query(DBUserAssignment).filter_by(user_id=current_user["id"], assignment_id=assignment_id).first()
    if not entry:
        entry = DBUserAssignment(user_id=current_user["id"], assignment_id=assignment_id, is_completed=True)
        db.add(entry)
    else:
        entry.is_completed = not entry.is_completed
    db.commit()
    return {"success": True}


@app.post("/api/v2/assignments/{assignment_id}/grade")
def update_assignment_grade(assignment_id: int, grade_data: GradeUpdate, current_user: dict = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    entry = db.query(DBUserAssignment).filter_by(user_id=current_user["id"], assignment_id=assignment_id).first()
    if not entry:
        entry = DBUserAssignment(user_id=current_user["id"], assignment_id=assignment_id, grade=grade_data.grade)
        db.add(entry)
    else:
        entry.grade = grade_data.grade
    db.commit()
    return {"success": True}


@app.post("/api/v2/sync/moodle")
def sync_moodle_calendar_api(req: MoodleSyncRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not req.ics_url.startswith("http") or "moodle" not in req.ics_url.lower():
        raise HTTPException(status_code=400, detail="Invalid Moodle Calendar URL")

    # Save the link to the user for the nightly background job
    db_user = db.query(DBUser).filter(DBUser.id == current_user['id']).first()
    if db_user and db_user.moodle_ics_url != req.ics_url:
        db_user.moodle_ics_url = req.ics_url
        db.commit()

    try:
        count = process_moodle_link(req.ics_url, current_user['id'], db)
        return {"status": "success", "synced_count": count}
    except Exception as e:
        print(f"Manual Sync Error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to parse Moodle calendar")


# --- Calendar Routes ---
@app.get("/api/v2/calendar/feed")
def get_calendar_feed(token: Optional[str] = None, courses: Optional[str] = None, db: Session = Depends(get_db)):
    target_courses = []
    user_id = None

    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            user_id = payload.get("id")
            user = db.query(DBUser).filter(DBUser.id == user_id).first()
            if user:
                target_courses = [c.code for c in user.followed_courses]
        except Exception:
            pass

    if not target_courses and courses:
        target_courses = [c.strip() for c in courses.split(",") if c.strip()]

    if not target_courses:
        assignments = []
    else:
        assignments = db.query(DBAssignment).filter(DBAssignment.course_code.in_(target_courses)).all()

    # Build a lookup so each event shows its own course name
    course_codes = {a.course_code for a in assignments if a.course_code}
    course_map = {
        c.code: c.name
        for c in db.query(DBCourse).filter(DBCourse.code.in_(course_codes)).all()
    } if course_codes else {}

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Teaspoon//IL",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Teaspoon Assignments",
        "X-WR-TIMEZONE:UTC"
    ]

    now_str = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    for a in assignments:
        if not a.deadline:
            continue
        if a.course_code == "9990999" and a.user_id != user_id:
            continue
        try:
            # Parse the deadline into a real datetime so we can shift it
            raw = a.deadline
            if "." in raw:
                raw = raw.split(".")[0]
            raw = raw.rstrip("Z")
            # Try the most common ISO formats
            try:
                end_dt = datetime.strptime(raw, "%Y-%m-%dT%H:%M:%S")
            except ValueError:
                end_dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")

            start_dt = end_dt - timedelta(minutes=30)
            dt_end_str = end_dt.strftime("%Y%m%dT%H%M%SZ")
            dt_start_str = start_dt.strftime("%Y%m%dT%H%M%SZ")
        except Exception:
            continue

        title = (a.title or "Assignment").replace("\r", "").replace("\n", " ")
        # Resolve THIS assignment's course name individually
        course_name = course_map.get(a.course_code, a.course_code or "")
        course_label = f"{course_name}" if course_name and course_name != a.course_code else (a.course_code or "")
        desc = f"סוג: {a.type} | קורס: {course_label} - {a.course_code}".replace("\r", "").replace("\n", " ")

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:assignment-{a.id}@teaspoon",
            f"DTSTAMP:{now_str}",
            f"DTSTART:{dt_start_str}",
            f"DTEND:{dt_end_str}",
            f"SUMMARY:{course_label} - {title}",
            f"DESCRIPTION:{desc}",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(lines)

    return Response(content=ics_content, media_type="text/calendar",
                    headers={"Content-Disposition": 'attachment; filename="teaspoon.ics"'})


# --- File Attachments ---
@app.post("/api/v2/assignments/{assignment_id}/attachments")
async def upload_attachment(assignment_id: int, file: UploadFile = File(...), category: str = Form("assignment"),
                            current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    assignment = db.query(DBAssignment).filter(DBAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    ext = os.path.splitext(file.filename)[1]
    object_name = f"{uuid.uuid4()}{ext}"

    try:
        s3_client.upload_fileobj(file.file, BUCKET_NAME, object_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinIO Upload Error: {str(e)}")

    new_attachment = DBAttachment(assignment_id=assignment_id, user_id=current_user["id"], filename=file.filename,
                                  object_name=object_name, category=category)
    db.add(new_attachment)

    touch_course_vitality(db, str(assignment.course_code))
    db.commit()
    db.refresh(new_attachment)
    return {"id": new_attachment.id, "filename": new_attachment.filename, "category": new_attachment.category}


@app.put("/api/v2/attachments/{attachment_id}")
def update_attachment(attachment_id: int, data: AttachmentUpdate, current_user: dict = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    attachment = db.query(DBAttachment).filter(DBAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    if attachment.user_id != current_user["id"] and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this file")

    attachment.filename = data.filename
    db.commit()
    return {"success": True}


@app.delete("/api/v2/attachments/{attachment_id}")
def delete_attachment(attachment_id: int, current_user: dict = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    attachment = db.query(DBAttachment).filter(DBAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    if attachment.user_id != current_user["id"] and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")

    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=attachment.object_name)
    except Exception:
        pass

    db.delete(attachment)
    db.commit()
    return {"success": True}


@app.get("/api/v2/attachments/{attachment_id}/generate-link")
def generate_download_link(attachment_id: int, current_user: dict = Depends(get_current_user)):
    """Mints a fresh 60-second HMAC signature for the proxy download endpoint."""

    # 1. Set expiration to exactly 60 seconds from right now
    expires = int(time.time()) + 60

    # 2. Cryptographically sign the payload exactly as the proxy expects it
    message = f"{attachment_id}:{expires}".encode()
    sig = hmac.new(APP_SECRET, message, hashlib.sha256).hexdigest()

    # 3. Construct the relative secure URL
    download_url = f"/api/v2/attachments/{attachment_id}/download?expires={expires}&sig={sig}"

    return {"url": download_url}


@app.get("/api/v2/attachments/{attachment_id}/download")
def download_attachment(attachment_id: int, expires: int, sig: str, db: Session = Depends(get_db)):
    # Check if the link has expired
    if int(time.time()) > expires:
        raise HTTPException(status_code=403, detail="Download link has expired. Please refresh the page.")

    # Cryptographically verify that nobody tampered with the ID or timestamp
    expected_message = f"{attachment_id}:{expires}".encode()
    expected_sig = hmac.new(APP_SECRET, expected_message, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=403, detail="Invalid or tampered download signature.")

    att = db.query(DBAttachment).filter(DBAttachment.id == attachment_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    try:
        s3_response = s3_client.get_object(Bucket=BUCKET_NAME, Key=att.object_name)

        content_type, _ = mimetypes.guess_type(att.filename)
        encoded_filename = quote(att.filename)

        return StreamingResponse(
            file_stream(s3_response),
            media_type=content_type or "application/octet-stream",
            headers={"Content-Disposition": f"inline; filename*=utf-8''{encoded_filename}"}
        )
    except Exception as e:
        print(f"MinIO Download Error: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving file from storage")


# --- Summaries Routes ---
@app.get("/api/v2/summaries/{course_code}")
def get_summaries(course_code: str, optional_user: dict = Depends(get_optional_user), db: Session = Depends(get_db)):
    # Hide pending creations
    pending_logs = db.query(DBAuditLog.entity_id).filter(
        DBAuditLog.action == "CREATE",
        DBAuditLog.entity_type == "SUMMARY",
        DBAuditLog.status == "PENDING"
    ).all()
    pending_ids = [int(log[0].split(":")[0]) for log in pending_logs if ":" in log[0]]

    query = db.query(DBSummary).filter(DBSummary.course_code == course_code)
    if pending_ids:
        query = query.filter(DBSummary.id.notin_(pending_ids))

    summaries = query.all()
    results = []

    for s in summaries:
        secure_query = generate_secure_download_query(s.id, expires_in_seconds=3600)
        url = f"{MINIO_PUBLIC_URL}/api/v2/summaries/{s.id}/download{secure_query}"
        likes_count = db.query(DBSummaryLike).filter(DBSummaryLike.summary_id == s.id).count()
        is_liked = False
        if optional_user:
            is_liked = db.query(DBSummaryLike).filter(
                DBSummaryLike.summary_id == s.id,
                DBSummaryLike.user_id == optional_user["id"]
            ).first() is not None

        # Fetch uploader details
        uploader = db.query(DBUser).filter(DBUser.id == s.uploader_id).first()

        results.append({
            "id": s.id,
            "filename": s.filename,
            "url": url,
            "uploader_id": s.uploader_id,
            "uploader_name": uploader.name if uploader else "Unknown",
            "uploader_picture": uploader.picture if uploader else "",
            "upload_date": s.upload_date.isoformat(),
            "likes": likes_count,
            "isLikedByMe": is_liked,
            "semester_code": s.semester_code
        })

    results.sort(key=lambda x: (x["likes"], x["upload_date"]), reverse=True)
    return results


@app.post("/api/v2/summaries")
async def upload_summary(course_code: str = Form(...), filename: str = Form(...), file: UploadFile = File(...),
                         current_user: dict = Depends(get_write_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    course = db.query(DBCourse).filter(DBCourse.code == course_code).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    ext = os.path.splitext(file.filename)[1]
    object_name = f"summary_{uuid.uuid4()}{ext}"

    try:
        s3_client.upload_fileobj(file.file, SUMMARIES_BUCKET, object_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinIO Upload Error: {str(e)}")

    new_summary = DBSummary(
        course_code=course_code,
        uploader_id=user.id,
        filename=filename,
        object_name=object_name,
        semester_code=get_active_semester_code(db)
    )
    db.add(new_summary)

    db.flush()
    if user.role not in ["admin", "owner"]:
        audit_log = DBAuditLog(
            user_id=user.id,
            action="CREATE",
            entity_type="SUMMARY",
            entity_id=f"{new_summary.id}:{course_code} - {filename}",
            new_data=json.dumps({"filename": filename}),
            status="PENDING"
        )
        db.add(audit_log)

    touch_course_vitality(db, course_code)

    db.commit()
    db.refresh(new_summary)
    return {"success": True, "id": new_summary.id}


@app.put("/api/v2/summaries/{summary_id}")
async def update_summary(summary_id: int, filename: str = Form(...), file: Optional[UploadFile] = File(None),
                         current_user: dict = Depends(get_write_user), db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    summary = db.query(DBSummary).filter(DBSummary.id == summary_id).first()

    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    if summary.uploader_id != user.id and user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this summary")

    old_filename = summary.filename
    summary.filename = filename

    # Overwrite file in MinIO if provided
    if file:
        try:
            s3_client.upload_fileobj(file.file, SUMMARIES_BUCKET, summary.object_name)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"MinIO Upload Error: {str(e)}")

    db.flush()
    if user.role not in ["admin", "owner"]:
        audit_log = DBAuditLog(
            user_id=user.id,
            action="UPDATE",
            entity_type="SUMMARY",
            entity_id=f"{summary.id}:{summary.course_code} - {summary.filename}",
            old_data=json.dumps({"filename": old_filename}),
            new_data=json.dumps({"filename": filename, "file_updated": file is not None}),
            status="PENDING"
        )
        db.add(audit_log)

    touch_course_vitality(db, str(summary.course_code))
    db.commit()
    return {"success": True}


@app.get("/api/v2/admin/summaries/{summary_id}/preview")
def admin_preview_summary(summary_id: int, token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = db.query(DBUser).filter(DBUser.id == payload.get("id")).first()
        if not user or user.role not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    summary = db.query(DBSummary).filter(DBSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    try:
        s3_response = s3_client.get_object(Bucket=SUMMARIES_BUCKET, Key=summary.object_name)
        content_type, _ = mimetypes.guess_type(summary.filename)
        return StreamingResponse(
            file_stream(s3_response),
            media_type=content_type or "application/octet-stream",
            headers={"Content-Disposition": f"inline; filename*=utf-8''{quote(summary.filename)}"}
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Storage read error")


@app.post("/api/v2/summaries/{summary_id}/like")
def toggle_summary_like(summary_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    existing_like = db.query(DBSummaryLike).filter(
        DBSummaryLike.user_id == current_user["id"],
        DBSummaryLike.summary_id == summary_id
    ).first()

    if existing_like:
        db.delete(existing_like)
    else:
        new_like = DBSummaryLike(user_id=current_user["id"], summary_id=summary_id)
        db.add(new_like)

    db.commit()
    return {"success": True}


@app.delete("/api/v2/summaries/{summary_id}")
def delete_summary(summary_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    summary = db.query(DBSummary).filter(DBSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    user = db.query(DBUser).filter(DBUser.id == current_user["id"]).first()
    if summary.uploader_id != current_user["id"] and user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this summary")

    try:
        s3_client.delete_object(Bucket=SUMMARIES_BUCKET, Key=summary.object_name)
    except Exception:
        pass

    db.query(DBSummaryLike).filter(DBSummaryLike.summary_id == summary_id).delete()
    db.delete(summary)
    touch_course_vitality(db, str(summary.course_code))
    db.commit()
    return {"success": True}


@app.get("/api/v2/summaries/{summary_id}/download")
def download_summary(summary_id: int, expires: int, sig: str, db: Session = Depends(get_db)):
    if int(time.time()) > expires:
        raise HTTPException(status_code=403, detail="Download link has expired. Please refresh the page.")

    expected_message = f"{summary_id}:{expires}".encode()
    expected_sig = hmac.new(APP_SECRET, expected_message, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=403, detail="Invalid signature.")

    summary = db.query(DBSummary).filter(DBSummary.id == summary_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    try:
        print(f"DEBUG: Requesting from Bucket: '{SUMMARIES_BUCKET}', Key: '{summary.object_name}'")
        s3_response = s3_client.get_object(Bucket=SUMMARIES_BUCKET, Key=summary.object_name)

        # Extract the missing extension from the S3 object key (e.g., ".pdf")
        _, ext = os.path.splitext(summary.object_name)

        # Stitch the extension back onto the clean Hebrew name
        full_filename = summary.filename
        if ext and not full_filename.lower().endswith(ext.lower()):
            full_filename += ext

        # URL-encode it safely
        encoded_filename = quote(full_filename)

        content_type = s3_response.get('ContentType')
        if not content_type or content_type in ['application/octet-stream', 'binary/octet-stream']:
            guessed_type, _ = mimetypes.guess_type(full_filename)
            content_type = guessed_type or 'application/octet-stream'

        return StreamingResponse(
            file_stream(s3_response),
            media_type=content_type,
            headers={
                "Content-Disposition": f"inline; filename*=utf-8''{encoded_filename}",
                "Content-Length": str(s3_response.get('ContentLength', 0))
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Admin Dashboard Routes ---
@app.get("/api/v2/admin/users")
def get_all_users(admin: DBUser = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(DBUser).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "picture": u.picture} for u in users]


@app.put("/api/v2/admin/users/{target_user_id}/role")
def update_user_role(target_user_id: int, role_data: RoleUpdate, admin: DBUser = Depends(get_admin_user),
                     db: Session = Depends(get_db)):
    if role_data.role not in ["admin", "user", "restricted"]:
        raise HTTPException(status_code=400, detail="Invalid role definition")

    user = db.query(DBUser).filter(DBUser.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "owner":
        raise HTTPException(status_code=403, detail="Cannot modify the role of an owner.")

    user.role = role_data.role
    db.commit()
    return {"success": True, "new_role": user.role}


@app.get("/api/v2/admin/logs")
def get_audit_logs(limit: int = 50, admin: DBUser = Depends(get_admin_user), db: Session = Depends(get_db)):
    # Only fetch PENDING logs!
    logs = db.query(DBAuditLog).filter(DBAuditLog.status == "PENDING").order_by(DBAuditLog.id.desc()).limit(limit).all()

    result = []
    for log in logs:
        user = db.query(DBUser).filter(DBUser.id == log.user_id).first()
        result.append({
            "id": log.id,
            "user_name": user.name if user else "Unknown User",
            "user_email": user.email if user else "unknown@email.com",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_data": log.old_data,
            "new_data": log.new_data,
            "status": log.status,
            "created_at": log.created_at
        })
    return result


@app.post("/api/v2/admin/logs/{log_id}/approve")
def approve_change(log_id: int, admin: DBUser = Depends(get_admin_user), db: Session = Depends(get_db)):
    log = db.query(DBAuditLog).filter(DBAuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    # Deleting all traces of the assignment
    if log.action == "DELETE" and log.entity_type == "ASSIGNMENT":
        real_id = int(log.entity_id.split(":")[0]) if ":" in log.entity_id else int(log.entity_id)
        db_assignment = db.query(DBAssignment).filter(DBAssignment.id == real_id).first()

        if db_assignment:
            # Sweep user grades
            db.query(DBUserAssignment).filter(DBUserAssignment.assignment_id == real_id).delete(
                synchronize_session=False)

            # Sweep attachments, likes, and MinIO files
            for attachment in db_assignment.attachments:
                db.query(DBAttachmentLike).filter(DBAttachmentLike.attachment_id == attachment.id).delete(
                    synchronize_session=False)
                try:
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=attachment.object_name)
                except Exception:
                    pass
                db.delete(attachment)

            # Sweep old audit logs (but spare this current ticket until the end!)
            db.query(DBAuditLog).filter(
                DBAuditLog.entity_type == "ASSIGNMENT",
                DBAuditLog.entity_id.like(f"{real_id}:%"),
                DBAuditLog.id != log.id
            ).delete(synchronize_session=False)

            # Trigger course vitality
            db_course = db.query(DBCourse).filter(DBCourse.code == db_assignment.course_code).first()
            if db_course:
                db_course.last_edited = datetime.utcnow()

            if getattr(db_assignment, 'moodle_uid', None):
                hidden_record = DBHiddenMoodleUID(
                    moodle_uid=db_assignment.moodle_uid,
                    deleted_by=admin.id  # Logging the admin who approved it!
                )
                db.merge(hidden_record)

            # elete the assignment
            db.delete(db_assignment)

    db.delete(log)
    db.commit()
    return {"success": True, "message": "Change approved and log cleared."}


@app.post("/api/v2/admin/logs/{log_id}/revert")
def revert_change(log_id: int, admin: DBUser = Depends(get_admin_user), db: Session = Depends(get_db)):
    log = db.query(DBAuditLog).filter(DBAuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    if log.entity_type == "ASSIGNMENT":
        real_id = int(log.entity_id.split(":")[0]) if ":" in log.entity_id else int(log.entity_id)
        if log.action == "UPDATE":
            old_data = json.loads(log.old_data)
            assignment = db.query(DBAssignment).filter(DBAssignment.id == real_id).first()
            if assignment:
                for key, value in old_data.items():
                    setattr(assignment, key, value)
        elif log.action == "CREATE":
            # Reverting a creation means deleting it
            assignment = db.query(DBAssignment).filter(DBAssignment.id == real_id).first()
            if assignment:
                db.delete(assignment)
        elif log.action == "DELETE":
            # Deletion only actually happens if the log is approved
            pass
        else:
            raise HTTPException(status_code=400, detail="Invalid action for reversion")

    elif log.entity_type == "COURSE":
        course = db.query(DBCourse).filter(DBCourse.code == log.entity_id).first()
        if log.action == "CREATE":
            if course: db.delete(course)
        elif log.action == "UPDATE":
            old_data = json.loads(log.old_data)
            if course:
                for key, value in old_data.items():
                    setattr(course, key, value)

    elif log.entity_type == "SUMMARY":
        real_id = int(log.entity_id.split(":")[0]) if ":" in log.entity_id else int(log.entity_id)
        if log.action == "CREATE":
            summary = db.query(DBSummary).filter(DBSummary.id == real_id).first()
            if summary:
                try:
                    s3_client.delete_object(Bucket=SUMMARIES_BUCKET, Key=summary.object_name)
                except Exception:
                    pass
                db.query(DBSummaryLike).filter(DBSummaryLike.summary_id == real_id).delete(synchronize_session=False)
                db.delete(summary)

    db.delete(log)
    db.commit()
    return {"success": True, "message": "Change reverted."}


@app.post("/api/v2/admin/logs/{log_id}/reject_and_block")
def reject_and_block(log_id: int, admin: DBUser = Depends(get_admin_user), db: Session = Depends(get_db)):
    log = db.query(DBAuditLog).filter(DBAuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    # 1. Block the spammer (unless they are somehow an admin/owner)
    spammer = db.query(DBUser).filter(DBUser.id == log.user_id).first()
    if spammer and spammer.role not in ["admin", "owner"]:
        spammer.role = "restricted"

    # 2. Extract the real ID using the new format
    real_id_str = log.entity_id.split(":")[0] if ":" in log.entity_id else log.entity_id

    # 3. Revert the change (identical to revert logic)
    if log.entity_type == "ASSIGNMENT":
        real_id = int(real_id_str)
        if log.action == "UPDATE":
            old_data = json.loads(log.old_data)
            assignment = db.query(DBAssignment).filter(DBAssignment.id == real_id).first()
            if assignment:
                for key, value in old_data.items():
                    setattr(assignment, key, value)
        elif log.action == "CREATE":
            assignment = db.query(DBAssignment).filter(DBAssignment.id == real_id).first()
            if assignment:
                db.delete(assignment)
        elif log.action == "DELETE":
            pass

    elif log.entity_type == "COURSE":
        course = db.query(DBCourse).filter(DBCourse.code == real_id_str).first()
        if log.action == "CREATE" and course:
            db.delete(course)
        elif log.action == "UPDATE" and course:
            for key, value in json.loads(log.old_data).items():
                setattr(course, key, value)

    elif log.entity_type == "SUMMARY":
        real_id = int(log.entity_id.split(":")[0]) if ":" in log.entity_id else int(log.entity_id)
        if log.action == "CREATE":
            summary = db.query(DBSummary).filter(DBSummary.id == real_id).first()
            if summary:
                try:
                    s3_client.delete_object(Bucket=SUMMARIES_BUCKET, Key=summary.object_name)
                except Exception:
                    pass
                db.query(DBSummaryLike).filter(DBSummaryLike.summary_id == real_id).delete(synchronize_session=False)
                db.delete(summary)

    db.delete(log)
    db.commit()
    return {"success": True, "message": "Change reverted and user restricted."}


@app.get("/api/v2/admin/assignments/merge-candidates")
def get_merge_candidates(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Finds courses that have both manual assignments and Moodle assignments for potential merging."""
    if current_user.get('role') not in ['owner', 'admin']:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get assignments from the last 60 days and future
    recent_limit_str = (datetime.utcnow() - timedelta(days=60)).strftime("%Y-%m-%d %H:%M:%S")
    assignments = db.query(DBAssignment).filter(DBAssignment.deadline >= recent_limit_str).all()

    grouped = defaultdict(list)
    for a in assignments:
        safe_deadline = a.deadline if isinstance(a.deadline, str) else a.deadline.isoformat()
        grouped[a.course_code].append({
            "id": a.id,
            "title": a.title,
            "deadline": safe_deadline,
            "has_moodle_uid": bool(a.moodle_uid),
            "moodle_uid": a.moodle_uid
        })

    # Only return courses that actually have a mix of Moodle and Manual assignments
    res = {}
    for code, items in grouped.items():
        has_moodle = any(i['has_moodle_uid'] for i in items)
        has_manual = any(not i['has_moodle_uid'] for i in items)
        if has_moodle and has_manual and len(items) > 1:
            res[code] = items

    return res


@app.post("/api/v2/admin/assignments/merge")
def merge_assignments_manual(req: MergeAssignmentsRequest, db: Session = Depends(get_db),
                             current_user: dict = Depends(get_current_user)):
    """Merges a Moodle assignment into a manual one, preserving internal ID and statuses."""
    if current_user.get('role') not in ['owner', 'admin']:
        raise HTTPException(status_code=403)

    target = db.query(DBAssignment).filter(DBAssignment.id == req.target_id).first()
    source = db.query(DBAssignment).filter(DBAssignment.id == req.source_id).first()

    if not target or not source:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Transfer Moodle properties to the target
    target.moodle_uid = source.moodle_uid
    target.deadline = source.deadline  # Trust Moodle's deadline

    # Delete the duplicate source (Orphans from the source are fine, as it's the duplicate)
    db.delete(source)
    db.commit()

    return {"status": "success"}


@app.get("/api/v2/users/leaderboard")
def get_leaderboard(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch all base data
    users = db.query(DBUser).all()
    stats = db.query(DBUserStat).all()
    stats_map = {s.user_id: s.lifetime_likes for s in stats}

    # Dynamically count active semester likes (Attachments)
    semester_likes = db.query(
        DBAttachment.user_id,
        func.count(DBAttachmentLike.id).label("likes")
    ).join(
        DBAttachmentLike, DBAttachment.id == DBAttachmentLike.attachment_id
    ).group_by(DBAttachment.user_id).all()

    semester_map = {row.user_id: row.likes for row in semester_likes}

    # Dynamically count active semester likes (Summaries)
    summary_likes_query = db.query(
        DBSummary.uploader_id,
        func.count(DBSummaryLike.id).label("likes")
    ).join(
        DBSummaryLike, DBSummary.id == DBSummaryLike.summary_id
    ).group_by(DBSummary.uploader_id).all()

    summary_map = {row.uploader_id: row.likes for row in summary_likes_query}

    # Build both lists simultaneously
    semester_board = []
    all_time_board = []

    for u in users:
        # Merge both maps for the total semester score
        sem_score = semester_map.get(u.id, 0) + summary_map.get(u.id, 0)
        lifetime_score = sem_score + stats_map.get(u.id, 0)

        base_user = {
            "id": u.id,
            "name": u.name.split(' ')[0] if u.name else "Unknown",
            "picture": u.picture
        }

        semester_board.append({**base_user, "score": sem_score})
        all_time_board.append({**base_user, "score": lifetime_score})

    # Sort descending
    semester_board.sort(key=lambda x: x["score"], reverse=True)
    all_time_board.sort(key=lambda x: x["score"], reverse=True)

    # Helper function to find user's rank and top 3
    def process_board(board):
        my_rank = None
        my_entry = None
        for index, entry in enumerate(board):
            if entry["id"] == current_user["id"]:
                my_rank = index + 1
                my_entry = entry
                break

        if not my_entry:
            my_entry = {"id": current_user["id"], "name": "Me", "picture": "", "score": 0}
            my_rank = len(board) + 1

        top_3 = [x for x in board[:3] if x["score"] > 0]
        return {"top_3": top_3, "me": {"rank": my_rank, "entry": my_entry}}

    # Return the dual payload
    return {
        "semester": process_board(semester_board),
        "all_time": process_board(all_time_board)
    }


@app.post("/api/v2/users/me/progress/update")
def update_degree_progress(req: ProgressUpdateReq, db: Session = Depends(get_db),
                           current_user: dict = Depends(get_current_user)):
    # Fetch the actual SQLAlchemy database object
    db_user = db.query(DBUser).filter(DBUser.id == current_user['id']).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Stash the current state for the "Undo" feature (using 'or 0.0' to prevent NoneType math errors on fresh users)
    db_user.previous_total_credits = db_user.total_credits or 0.0
    db_user.previous_weighted_sum = db_user.weighted_sum or 0.0
    db_user.previous_binary_credits = db_user.binary_credits or 0.0

    # Apply the new math
    if req.is_redo:
        # Subtract the old course
        if req.old_was_pass_fail:
            db_user.binary_credits = (db_user.binary_credits or 0.0) - req.credits
        else:
            if req.old_score is None:
                raise HTTPException(status_code=400, detail="old_score required")
            db_user.total_credits = (db_user.total_credits or 0.0) - req.credits
            db_user.weighted_sum = (db_user.weighted_sum or 0.0) - (req.old_score * req.credits)

        # Add the new course
        if req.is_pass_fail:
            db_user.binary_credits = (db_user.binary_credits or 0.0) + req.credits
        else:
            if req.new_score is None:
                raise HTTPException(status_code=400, detail="new_score required")
            db_user.total_credits = (db_user.total_credits or 0.0) + req.credits
            db_user.weighted_sum = (db_user.weighted_sum or 0.0) + (req.new_score * req.credits)

    else:
        # Brand new course
        if req.is_pass_fail:
            db_user.binary_credits = (db_user.binary_credits or 0.0) + req.credits
        else:
            if req.new_score is None:
                raise HTTPException(status_code=400, detail="new_score required")
            db_user.total_credits = (db_user.total_credits or 0.0) + req.credits
            db_user.weighted_sum = (db_user.weighted_sum or 0.0) + (req.new_score * req.credits)

    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/v2/users/me/progress/undo")
def undo_degree_progress(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_user = db.query(DBUser).filter(DBUser.id == current_user['id']).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.total_credits = db_user.previous_total_credits or 0.0
    db_user.weighted_sum = db_user.previous_weighted_sum or 0.0
    db_user.binary_credits = db_user.previous_binary_credits or 0.0
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/v2/users/me/progress/reset")
def reset_degree_progress(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_user = db.query(DBUser).filter(DBUser.id == current_user['id']).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.total_credits = 0.0
    db_user.weighted_sum = 0.0
    db_user.binary_credits = 0.0
    db_user.previous_total_credits = 0.0
    db_user.previous_weighted_sum = 0.0
    db_user.previous_binary_credits = 0.0
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/v2/users/me/intro-version")
def update_intro_version(req: UpdateVersionRequest, db: Session = Depends(get_db),
                         current_user: dict = Depends(get_current_user)):
    db_user = db.query(DBUser).filter(DBUser.id == current_user['id']).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only update if the new version is strictly greater
    if req.version > (db_user.last_seen_version or 0):
        db_user.last_seen_version = req.version
        db.commit()

    return {"status": "success", "last_seen_version": db_user.last_seen_version}


# --- CHANGELOG ENDPOINTS ---
@app.get("/api/v2/changelogs")
def get_changelogs(db: Session = Depends(get_db)):
    logs = db.query(DBChangelog).order_by(DBChangelog.version.desc()).all()
    return [{
        "id": log.id,
        "version": log.version,
        "date": log.date_str,
        "title": log.title,
        "features": json.loads(log.features) if log.features else []
    } for log in logs]


@app.post("/api/v2/admin/changelogs")
def create_changelog(req: ChangelogPayload, db: Session = Depends(get_db),
                     current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Only owners can manage changelogs")

    new_log = DBChangelog(
        version=req.version,
        date_str=req.date_str,
        title=req.title,
        features=json.dumps([f.dict() for f in req.features])
    )
    db.add(new_log)
    db.commit()
    return {"status": "success"}


@app.put("/api/v2/admin/changelogs/{log_id}")
def update_changelog(log_id: int, req: ChangelogPayload, db: Session = Depends(get_db),
                     current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Only owners can manage changelogs")

    log = db.query(DBChangelog).filter(DBChangelog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Changelog not found")

    log.version = req.version
    log.date_str = req.date_str
    log.title = req.title
    log.features = json.dumps([f.dict() for f in req.features])
    db.commit()
    return {"status": "success"}


@app.delete("/api/v2/admin/changelogs/{log_id}")
def delete_changelog(log_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="Only owners can manage changelogs")

    db.query(DBChangelog).filter(DBChangelog.id == log_id).delete()
    db.commit()
    return {"status": "success"}


# --- SEMESTERS ENDPOINTS ---
@app.get("/api/v2/semesters", response_model=List[SemesterOut])
def get_semesters(db: Session = Depends(get_db)):
    """Fetch the active 3 rolling semesters sorted by position (0=Current, 1=Previous, 2=Oldest)."""
    return db.query(DBSemester).order_by(DBSemester.position.asc()).all()


@app.post("/api/v2/admin/semesters/advance")
def advance_semester(payload: AdvanceSemesterPayload, 
                     admin: DBUser = Depends(get_admin_user), 
                     db: Session = Depends(get_db)):
    
    # 1. Identify the oldest semester (position 2)
    oldest_sem = db.query(DBSemester).filter(DBSemester.position == 2).first()
    
    if oldest_sem:
        # A. Purge attachments from S3/MinIO & DB for assignments in oldest semester
        old_assignments = db.query(DBAssignment).filter(DBAssignment.semester_code == oldest_sem.code).all()
        for ass in old_assignments:
            for att in ass.attachments:
                try:
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=att.object_name)
                except Exception:
                    pass
                db.delete(att)
            db.delete(ass)

        # C. Delete oldest semester entry
        db.delete(oldest_sem)
        db.flush()

    # 2. Shift position 1 -> position 2, and position 0 -> position 1
    prev_sem = db.query(DBSemester).filter(DBSemester.position == 1).first()
    if prev_sem:
        prev_sem.position = 2

    curr_sem = db.query(DBSemester).filter(DBSemester.position == 0).first()
    if curr_sem:
        curr_sem.position = 1
        curr_sem.is_active = False

    # 3. Create new current semester (position 0)
    new_sem = DBSemester(
        code=payload.new_semester_code,
        name=payload.new_semester_name,
        term=payload.term,
        year=payload.year,
        position=0,
        is_active=True
    )
    db.add(new_sem)
    db.commit()

    return {"status": "success", "message": f"Advanced to {payload.new_semester_name}"}