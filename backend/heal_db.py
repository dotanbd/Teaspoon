from models import SessionLocal
from main import DBAssignment, DBSummary, DBUserCourse, DBSemester
from sqlalchemy import text

db = SessionLocal()

# 1. Grab all valid semesters from the DB
valid_semesters = db.query(DBSemester).all()
valid_codes = [s.code for s in valid_semesters]

print(f"🔍 Found {len(valid_codes)} valid semesters: {valid_codes}")

if not valid_codes:
    print("❌ ERROR: No semesters found in the database. Please create one in the Admin Panel first.")
    exit()

# We will attach all orphaned data to the currently active semester (position 0)
active_sem_code = next((s.code for s in valid_semesters if s.position == 0), valid_codes[0])
print(f"🩹 Attaching all orphaned data to: {active_sem_code}")

# 2. Heal Assignments
orphaned_assignments = db.query(DBAssignment).filter(
    (DBAssignment.semester_code.notin_(valid_codes)) | (DBAssignment.semester_code == None)
).all()

for a in orphaned_assignments:
    a.semester_code = active_sem_code
print(f"✅ Fixed {len(orphaned_assignments)} orphaned assignments.")

# 3. Heal Summaries
orphaned_summaries = db.query(DBSummary).filter(
    (DBSummary.semester_code.notin_(valid_codes)) | (DBSummary.semester_code == None)
).all()

for s in orphaned_summaries:
    s.semester_code = active_sem_code
print(f"✅ Fixed {len(orphaned_summaries)} orphaned summaries.")

# 4. Heal User Courses (Must use raw SQL to bypass SQLAlchemy's NULL trap!)
# We use text() to safely execute the raw SQLite command
query = text(f"""
    UPDATE user_courses 
    SET semester_code = '{active_sem_code}' 
    WHERE semester_code IS NULL OR semester_code NOT IN {tuple(valid_codes) if len(valid_codes) > 1 else f"('{valid_codes[0]}')"}
""")
db.execute(query)
print("✅ Fixed user_courses associations.")

# 5. Save everything!
db.commit()
print("🎉 Database perfectly healed and synced!")