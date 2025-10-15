# 📊 Apply Database Migrations

Apply all 143 database migrations to your Aurora PostgreSQL database.

---

## ⚡ Quick Steps (10 minutes)

### Step 1: Upload Files to CloudShell

You need to upload TWO things to CloudShell:

**1. Migration Script**
- File: `C:\Users\Elize\mentalspaceehr-fresh\infrastructure\apply-migrations.sh`

**2. All Migration Files**
- Folder: `C:\Users\Elize\mentalspaceehr-fresh\supabase\migrations\`
- Zip this folder first!

---

### How to Create ZIP of Migrations

On your local machine (PowerShell):

```powershell
cd C:\Users\Elize\mentalspaceehr-fresh
Compress-Archive -Path supabase -DestinationPath migrations.zip -Force
```

---

### Step 2: Upload to CloudShell

In your **AWS CloudShell**:

1. Click **"Actions"** → **"Upload file"**
2. Upload: `infrastructure\apply-migrations.sh`
3. Click **"Actions"** → **"Upload file"** again
4. Upload: `migrations.zip` (you just created)

---

### Step 3: Extract and Run

Copy-paste these commands into CloudShell:

```bash
# Extract migrations
unzip -o migrations.zip

# Make script executable
chmod +x apply-migrations.sh

# Run migration script
./apply-migrations.sh
```

---

### Step 4: Confirm

The script will ask:

```
⚠️  This will apply 143 migrations to Aurora PostgreSQL
Continue? (y/n):
```

Type **`y`** and press Enter

---

### Step 5: Wait for Completion

You'll see:

```
→ Applying migrations via Lambda...
This may take 5-10 minutes for 143 migrations...
```

Wait patiently...

---

### Step 6: Success!

```
========================================
  Migration Results
========================================

Status: success
Total migrations: 143
✅ Applied: 143
⏭️  Skipped (already applied): 0
❌ Failed: 0

🎉 All migrations applied successfully!

Next steps:
1. Refresh your app at http://localhost:8080
2. All database tables should now be available
3. Test creating clients, appointments, notes, etc.
```

---

## 🎯 What This Does

The script:
1. ✅ Reads all 143 SQL migration files
2. ✅ Packages them into JSON
3. ✅ Sends to `mentalspace-apply-migrations-to-aurora` Lambda
4. ✅ Lambda applies each migration to Aurora PostgreSQL
5. ✅ Tracks applied migrations (won't re-apply if you run again)
6. ✅ Shows detailed results

---

## 📋 Migrations Include

These 143 migrations create:
- ✅ All database tables (users, clients, appointments, notes, etc.)
- ✅ Indexes for performance
- ✅ Foreign keys and constraints
- ✅ Row-level security policies
- ✅ Database functions and triggers
- ✅ Views for reporting
- ✅ Enums and custom types

---

## ❓ Troubleshooting

### Error: "Lambda function not found"

The `apply-migrations-to-aurora` function wasn't deployed.

**Check if it exists:**
```bash
aws lambda get-function \
  --function-name mentalspace-apply-migrations-to-aurora \
  --region us-east-1
```

**If not found**, deploy it:
```bash
cd lambda/apply-migrations-to-aurora
zip -r /tmp/apply-migrations.zip .
aws lambda create-function \
  --function-name mentalspace-apply-migrations-to-aurora \
  --runtime nodejs20.x \
  --role arn:aws:iam::706704660887:role/MentalSpaceLambdaExecutionRole \
  --handler index.handler \
  --zip-file fileb:///tmp/apply-migrations.zip \
  --timeout 600 \
  --memory-size 512 \
  --region us-east-1
```

---

### Error: "Migration directory not found"

You didn't extract the migrations.zip file.

**Fix:**
```bash
unzip -o migrations.zip
ls supabase/migrations/  # Should show 143 .sql files
```

---

### Some Migrations Failed

Check the error messages. Common issues:
- **"relation already exists"** - Table was created manually, safe to ignore
- **"syntax error"** - Migration SQL has issues, might need fixing
- **"permission denied"** - Lambda role needs more database permissions

**To re-run just the failed ones:**
The script automatically skips already-applied migrations, so you can just run it again!

---

### Timeout Error

If Lambda times out (takes > 10 minutes):

**Option 1: Apply in batches**
Split the 143 migrations into smaller batches and apply separately.

**Option 2: Increase Lambda timeout**
```bash
aws lambda update-function-configuration \
  --function-name mentalspace-apply-migrations-to-aurora \
  --timeout 900 \
  --region us-east-1
```

---

## ✅ After Migrations

Once all 143 migrations are applied:

### Test Your App

1. **Refresh:** http://localhost:8080
2. **Try creating:**
   - New client
   - New appointment
   - Clinical note
   - Task
3. **Check if data persists** (refresh page, data still there)

---

### Verify Database Tables

In CloudShell:

```bash
aws rds-data execute-statement \
  --resource-arn "arn:aws:rds:us-east-1:706704660887:cluster:mentalspaceehrstack-database" \
  --secret-arn "arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD" \
  --database mentalspaceehr \
  --sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" \
  --region us-east-1
```

Should show 50+ tables!

---

## 🎊 Summary

**Files to upload:**
1. `infrastructure/apply-migrations.sh`
2. `migrations.zip` (supabase folder zipped)

**Commands to run:**
```bash
unzip -o migrations.zip
chmod +x apply-migrations.sh
./apply-migrations.sh
```

**Result:**
- ✅ 143 migrations applied
- ✅ Full database schema ready
- ✅ App fully functional!

---

**Ready to apply migrations?** Create the migrations.zip and upload both files to CloudShell! 🚀
