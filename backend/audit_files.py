from main import SessionLocal, DBAttachment, s3_client, BUCKET_NAME


def audit_attachments():
    db = SessionLocal()
    print("🔍 Starting Two-Way Attachment Audit...")

    # --- STEP 1: Get all keys from the Database ---
    attachments = db.query(DBAttachment).all()

    # Create a dictionary to keep the DB object handy for printing later
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
        db.close()
        return

    # --- STEP 3: Set Math Magic! ---
    # In both DB and MinIO
    healthy_keys = db_keys.intersection(s3_keys)

    # In DB, but missing in MinIO
    ghost_keys = db_keys - s3_keys

    # In MinIO, but missing in DB
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
            filename = getattr(att, 'file_name', 'Unknown')
            print(f"   - DB ID: {att.id} | Name: {filename} | MinIO Key: {key}")

    if orphan_keys:
        print("\n👽 ORPHAN FILES (These should be deleted from MinIO):")
        for key in orphan_keys:
            print(f"   - MinIO Key: {key}")

    db.close()


if __name__ == "__main__":
    audit_attachments()