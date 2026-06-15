from main import SessionLocal, DBCourse, DBAssignment, DBAttachment, DBUserAssignment, DBUser, DBAttachmentLike, \
    DBUserStat, s3_client, BUCKET_NAME
'''import re
import PyPDF2
from sqlalchemy.orm import Session'''

'''CATALOG_PDF_PATH = "catalog.pdf"


def fix_hebrew(text):
    """Reverses Hebrew text visually extracted from PDFs and fixes brackets."""
    text = text.strip()
    if any('\u0590' <= c <= '\u05FF' for c in text):
        text = text[::-1]
        text = text.translate(str.maketrans('()[]{}', ')(][}{'))
    return text


def extract_courses_from_pdf(pdf_path):
    courses = {}
    course_pattern = re.compile(r'\b(0\d{3}0\d{3})\b')
    bad_keywords = ["קדם", "צמוד", "זיכוי", "מומלץ", "שעות", "הרצאה", "תרגול", "מעבדה", "סילבוס", "פקולט"]

    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        start_page = 72
        end_page = min(308, len(reader.pages))

        for page_num in range(start_page, end_page):
            text = reader.pages[page_num].extract_text()
            if not text:
                continue

            for line in text.split('\n'):
                line = line.strip()
                match = course_pattern.search(line)
                if not match: continue

                raw_code = match.group(1)
                if not (line.startswith(raw_code) or line.endswith(raw_code)): continue
                if any(word in line for word in bad_keywords): continue

                remainder = line.replace(raw_code, '').strip()
                chunks = re.split(r'\s{2,}|\b\d+\.\d+\b', remainder)
                valid_chunks = [c for c in chunks if re.search(r'[a-zA-Z\u0590-\u05FF]', c)]

                if not valid_chunks: continue

                name_str = max(valid_chunks, key=len)
                clean_name = fix_hebrew(name_str)
                clean_name = re.sub(r'[^a-zA-Z\u0590-\u05FF0-9\s\"\'״]', ' ', clean_name)
                clean_name = re.sub(r'(?<=\s\d)\s+\d+[\s\d]*$', '', clean_name)
                clean_name = re.sub(r'\s+\d+\s+\d+[\s\d]*$', '', clean_name)
                clean_name = re.sub(r'\s+', ' ', clean_name).strip()
                clean_name = re.sub(r'^[\-\|\.\_]+', '', clean_name).strip()
                clean_name = re.sub(r'[\-\|\.\_]+$', '', clean_name).strip()

                if 3 < len(clean_name) < 80:
                    actual_code = raw_code[1:4] + raw_code[5:8]
                    courses[actual_code] = clean_name

    return courses'''


def reset_semester():
    db = SessionLocal()
    print("\n🚨 STARTING SEMESTER RESET 🚨\n")

    # --- Intro step: Preserve User Community Scores ---
    print("💾 Step 0/3: Preserving user community scores...")
    users = db.query(DBUser).all()
    for user in users:
        # Count their valid likes from this active semester
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

    # 2.1 Delete relational / child data first (to prevent foreign key errors)
    db.query(DBAttachmentLike).delete()
    print("   ✅ Cleared attachment likes.")

    db.query(DBAttachment).delete()
    print("   ✅ Cleared attachment metadata.")

    db.query(DBUserAssignment).delete()
    print("   ✅ Cleared user assignment statuses (Done/Undone).")

    # 2.2 Delete the core assignments
    db.query(DBAssignment).delete()
    print("   ✅ Cleared all assignments.")

    # 2.3 Unenroll all users from their old courses
    db.query(DBUser).update({DBUser.followed_courses: '[]'})
    print("   ✅ Unenrolled all users from previous courses.")

    # Commit all database changes
    db.commit()
    print("   ✅ Database purge complete!")

    # --- STEP 3: Smart Course Sync (aborted for now) ---
    '''print("📚 Step 3/3: Updating Course Catalog...")
    try:
        courses_data = extract_courses_from_pdf(CATALOG_PDF_PATH)

        # Load existing courses into a dictionary for instant lookup
        existing_courses = {c.code: c for c in db.query(DBCourse).all()}

        added_count = 0
        for code, parsed_name in courses_data.items():
            if code not in existing_courses:
                # Only insert if it doesn't already exist!
                new_course = DBCourse(code=code, name=parsed_name)
                db.add(new_course)
                added_count += 1

            # If the code IS in existing_courses, we literally do nothing.
            # This perfectly preserves their custom names and syllabus weights.

        db.commit()
        print(f"   ✅ Catalog updated! Added {added_count} new courses.")
        print(f"   🛡️  Preserved settings and names for {len(existing_courses)} existing courses.")

    except FileNotFoundError:
        print(f"❌ Error: Could not find '{CATALOG_PDF_PATH}'. Catalog update skipped.")
    except Exception as e:
        print(f"❌ Error during catalog sync: {e}")
        
    finally:
        db.close()
        print("\n🎉 SEMESTER RESET COMPLETE 🎉\n")'''

    db.close()
    print("🎉 SEMESTER RESET SUCCESSFUL! 🎉")


if __name__ == "__main__":
    reset_semester()