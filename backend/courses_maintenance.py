import argparse
from contextlib import contextmanager
from datetime import datetime, timedelta

from main import (
    SessionLocal,
    DBAssignment,
    DBCourse,
    DBAttachment,
    DBUserAssignment,
    DBAttachmentLike,
    DBAuditLog,
    DBUser,
    DBUserStat,
    user_courses,
    s3_client,
    BUCKET_NAME,
)

# ============================================================
#  SHARED HELPERS
# ============================================================
@contextmanager
def db_session():
    """Context manager handling session lifecycle and rollback on error."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _delete_s3_object(key: str, *, verbose_prefix: str = "      ") -> bool:
    """Delete a single S3/MinIO object. Returns True on success."""
    try:
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
        print(f"{verbose_prefix}☁️  Deleted file from MinIO: {key}")
        return True
    except Exception as e:
        print(f"{verbose_prefix}⚠️  Could not delete MinIO file {key}: {e}")
        return False


def _purge_attachment(db, attachment, *, verbose_prefix: str = "      ") -> bool:
    """Delete an attachment: its likes, its S3 object, and the DB row."""
    db.query(DBAttachmentLike).filter(
        DBAttachmentLike.attachment_id == attachment.id
    ).delete(synchronize_session=False)

    deleted = _delete_s3_object(attachment.object_name, verbose_prefix=verbose_prefix)
    db.delete(attachment)
    return deleted


def _classify_courses(db):
    """Split courses into (active, inactive) based on last_edited within 365 days."""
    one_year_ago = datetime.utcnow() - timedelta(days=365)
    active, inactive = [], []

    for course in db.query(DBCourse).all():
        # Personal assignments safeguard
        if course.code == "9990999":
            continue
        if course.last_edited is not None and course.last_edited >= one_year_ago:
            active.append(course)
        else:
            inactive.append(course)

    return active, inactive


def _print_course_audit(active, inactive):
    print(f"\n📊 Audit Complete:")
    print(f"   - Active Courses (Last 365 days): {len(active)}")
    print(f"   - Inactive Courses (Orphaned): {len(inactive)}")


def _list_s3_keys():
    """Return the set of all object keys currently in the bucket (paginated)."""
    keys = set()
    paginator = s3_client.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=BUCKET_NAME):
        for obj in page.get('Contents', []):
            keys.add(obj['Key'])
    return keys

# ============================================================
#  ACTION: --prune  (Deep-clean inactive courses; no flag = dry run)
# ============================================================
def audit_inactive_courses(execute: bool = False):
    with db_session() as db:
        print("🔍 Scanning courses for activity...")
        active, inactive = _classify_courses(db)
        _print_course_audit(active, inactive)

        if not execute:
            print("\n🛡️  DRY RUN MODE (No data was changed)")
            if inactive:
                print("The following courses are flagged for complete deep-clean removal:")
                for c in inactive:
                    print(f"   ❌ {c.code} - {c.name}")
                print("\nTo permanently wipe these and all traces, run with the --prune flag.")
            else:
                print("No inactive courses found. Your database is perfectly clean!")
            return

        print("\n🔥 EXECUTION MODE: Deep cleaning inactive courses...")
        deleted_files = 0
        for c in inactive:
            print(f"\n   Targeting {c.code} - {c.name}...")

            # Course-level audit logs and user follows
            db.query(DBAuditLog).filter(
                DBAuditLog.entity_type == "COURSE",
                DBAuditLog.entity_id == c.code,
            ).delete(synchronize_session=False)
            db.execute(user_courses.delete().where(user_courses.c.course_code == c.code))

            for assignment in db.query(DBAssignment).filter(DBAssignment.course_code == c.code).all():
                # Assignment-level audit logs & user progress
                db.query(DBAuditLog).filter(
                    DBAuditLog.entity_type == "ASSIGNMENT",
                    DBAuditLog.entity_id.like(f"{assignment.id}:%"),
                ).delete(synchronize_session=False)
                db.query(DBUserAssignment).filter(
                    DBUserAssignment.assignment_id == assignment.id
                ).delete(synchronize_session=False)

                # Attachments (likes + S3 + row) via shared helper
                for att in db.query(DBAttachment).filter(DBAttachment.assignment_id == assignment.id).all():
                    if _purge_attachment(db, att):
                        deleted_files += 1

                db.delete(assignment)

            db.delete(c)
            print(f"   🗑️  Successfully scrubbed course {c.code} and all its dependencies.")

        db.commit()
        print(f"\n✅ Deep clean complete on {len(inactive)} inactive courses.\n"
              f"{deleted_files} files were deleted from MinIO.")


def dry_run_inactive_courses():
    db = SessionLocal()
    try:
        one_year_ago = datetime.utcnow() - timedelta(days=365)
        all_courses = db.query(DBCourse).all()

        active_courses = []
        inactive_courses = []

        print("🔍 Scanning courses for activity...")

        for course in all_courses:
            if course.code == "9990999":
                continue

            if course.last_edited is not None and course.last_edited >= one_year_ago:
                active_courses.append(course)
            else:
                inactive_courses.append(course)

        print(f"\n📊 Audit Complete:")
        print(f"   - Active Courses (Last 365 days): {len(active_courses)}")
        print(f"   - Inactive Courses (Orphaned): {len(inactive_courses)}")

        print("\n🛡️  DRY RUN MODE (No data was changed)")
        if inactive_courses:
            print("The following courses are flagged for complete deep-clean removal:")
            for c in inactive_courses:
                print(f"   ❌ {c.code} - {c.name}")
            print("\nTo permanently wipe these and all traces, run the script with the --prune flag.")
        else:
            print("No inactive courses found. Your database is perfectly clean!")
    finally:
        db.close()


# ============================================================
#  ACTION: --audit  (Two-way attachment audit)
# ============================================================
def audit_attachments():
    db = SessionLocal()
    try:
        print("🔍 Starting Two-Way Attachment Audit...")

        # --- STEP 1: Get all keys from the Database ---
        attachments = db.query(DBAttachment).all()
        db_records = {att.object_name: att for att in attachments if getattr(att, 'object_name', None)}
        db_keys = set(db_records.keys())
        print(f"📊 Found {len(db_keys)} valid attachment records in the database.")

        # --- STEP 2: Get all keys from MinIO/S3 ---
        s3_keys = set()
        paginator = s3_client.get_paginator('list_objects_v2')

        try:
            for page in paginator.paginate(Bucket=BUCKET_NAME):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        s3_keys.add(obj['Key'])
            print(f"📦 Found {len(s3_keys)} physical files in the MinIO bucket.")
        except Exception as e:
            print(f"❌ Error communicating with MinIO: {e}")
            return

        # --- STEP 3: Set math ---
        healthy_keys = db_keys.intersection(s3_keys)
        ghost_keys = db_keys - s3_keys
        orphan_keys = s3_keys - db_keys

        # --- STEP 4: Print the Results ---
        print("\n" + "=" * 45)
        print(f"✅ Healthy Files (Synced):     {len(healthy_keys)}")
        print(f"👻 Ghost Records (Missing DB): {len(ghost_keys)}")
        print(f"👽 Orphan Files (Extra MinIO): {len(orphan_keys)}")
        print("=" * 45)

        if ghost_keys:
            print("\n👻 GHOST RECORDS (These should be deleted from SQLite):")
            for key in ghost_keys:
                att = db_records[key]
                filename = getattr(att, 'filename', 'Unknown')
                print(f"   - DB ID: {att.id} | Name: {filename} | MinIO Key: {key}")

        if orphan_keys:
            print("\n👽 ORPHAN FILES (These should be deleted from MinIO):")
            for key in orphan_keys:
                print(f"   - MinIO Key: {key}")
    finally:
        db.close()


# ============================================================
#  ACTION: --prune-size  (Delete heavy attachments)
# ============================================================
def prune_large_files(size_limit_mb: float):
    db = SessionLocal()
    try:
        size_bytes_limit = size_limit_mb * 1024 * 1024

        print(f"\n🔍 Scanning MinIO for files larger than {size_limit_mb} MB...\n")

        attachments = db.query(DBAttachment).all()
        deleted_count = 0
        freed_bytes = 0

        for att in attachments:
            try:
                response = s3_client.head_object(Bucket=BUCKET_NAME, Key=att.object_name)
                file_size_bytes = response.get('ContentLength', 0)

                if file_size_bytes > size_bytes_limit:
                    file_size_mb = file_size_bytes / 1024 / 1024
                    print(f"🗑️ Deleting {att.filename} ({file_size_mb:.2f} MB)...")

                    # 1. Delete the physical file to save hard drive space
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=att.object_name)

                    # 2. Delete the database link so the UI doesn't show a broken attachment
                    db.delete(att)

                    freed_bytes += file_size_bytes
                    deleted_count += 1

            except Exception as e:
                # If the file is already missing from MinIO, clean up the ghost database row
                if "404" in str(e):
                    print(f"⚠️ Ghost file detected (missing from MinIO). Cleaning up DB link: {att.filename}")
                    db.delete(att)
                else:
                    print(f"⚠️ Error checking {att.filename}: {e}")

        db.commit()

        total_freed_mb = freed_bytes / 1024 / 1024
        print(f"\n✅ Pruning Complete!")
        print(f"❌ Deleted {deleted_count} heavy files.")
        print(f"💾 Freed up {total_freed_mb:.2f} MB of permanent storage.\n")
    finally:
        db.close()


# ============================================================
#  ACTION: --reset  (Full semester reset)
# ============================================================
def reset_semester():
    db = SessionLocal()
    try:
        print("\n🚨 STARTING SEMESTER RESET 🚨\n")

        # --- Intro step: Preserve User Community Scores ---
        print("💾 Step 0/3: Preserving user community scores...")
        users = db.query(DBUser).all()
        for user in users:
            semester_likes = db.query(DBAttachmentLike).join(
                DBAttachment, DBAttachmentLike.attachment_id == DBAttachment.id
            ).filter(DBAttachment.user_id == user.id).count()

            if semester_likes > 0:
                stat = db.query(DBUserStat).filter(DBUserStat.user_id == user.id).first()
                if not stat:
                    stat = DBUserStat(user_id=user.id, lifetime_likes=0)
                    db.add(stat)

                # Lock the active score into the permanent vault
                stat.lifetime_likes += semester_likes

        db.commit()
        print("   ✅ Scores safely transferred to lifetime vault.")

        # --- STEP 1: Delete all files from S3/MinIO ---
        print("🗑️  Step 1/3: Wiping S3 Bucket Attachments...")
        try:
            objects = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
            if 'Contents' in objects:
                for obj in objects['Contents']:
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=obj['Key'])
                print(f"   ✅ Deleted {len(objects['Contents'])} files from MinIO.")
            else:
                print("   ✅ Bucket is already empty.")
        except Exception as e:
            print(f"❌ S3 Deletion Failed: {e}")
            return

        # --- STEP 2: Clear Database Tables ---
        print("🧹 Step 2/3: Purging Old Semester Database Records...")

        db.query(DBAttachmentLike).delete()
        print("   ✅ Cleared attachment likes.")

        db.query(DBAttachment).delete()
        print("   ✅ Cleared attachment metadata.")

        db.query(DBUserAssignment).delete()
        print("   ✅ Cleared user assignment statuses (Done/Undone).")

        db.query(DBAssignment).delete()
        print("   ✅ Cleared all assignments.")

        db.query(DBUser).update({DBUser.followed_courses: '[]'})
        print("   ✅ Unenrolled all users from previous courses.")

        db.commit()
        print("   ✅ Database purge complete!")

        print("🎉 SEMESTER RESET SUCCESSFUL! 🎉")
    finally:
        db.close()


# ============================================================
#  ENTRY POINT
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="Teaspoon Course Maintenance Script - unified tools for auditing, pruning, and resetting."
    )
    parser.add_argument(
        "--prune",
        action="store_true",
        help="DANGER: Deep clean inactive courses and all related data. Without this flag, runs in dry-run mode."
    )
    parser.add_argument(
        "--audit",
        action="store_true",
        help="Run a two-way audit comparing DB attachments and MinIO files (finds ghosts & orphans)."
    )
    parser.add_argument(
        "--prune-size",
        type=float,
        metavar="MB",
        help="Delete attachments larger than the given size (in MB) from MinIO and DB."
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="DANGER: Full semester reset - wipes MinIO, purges assignments/attachments, unenrolls users."
    )
    args = parser.parse_args()

    # If no action flag is provided, default to dry-run of inactive courses (previous default behavior)
    any_action = args.audit or args.prune_size is not None or args.reset or args.prune

    if args.audit:
        audit_attachments()

    if args.prune_size is not None:
        prune_large_files(args.prune_size)

    if args.reset:
        reset_semester()

    if args.prune:
        audit_inactive_courses(execute=True)

    if not any_action:
        # Default: dry-run inactive-course audit (matches original behavior when no --prune given)
        dry_run_inactive_courses()


if __name__ == "__main__":
    main()