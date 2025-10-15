# 🔐 Grant Administrator Access

Your user account exists but doesn't have the administrator role in the database yet. This guide will add it.

---

## 🎯 The Problem

You only see **Dashboard** and **Tasks** in the sidebar because:

1. The sidebar checks if you have the `administrator` role
2. Your Cognito user has `custom:role=admin` ✅
3. BUT your database `user_roles` table doesn't have an `administrator` record yet ❌

The full application has **30+ admin features** that will appear once the role is added!

---

## ⚡ Quick Fix (5 minutes)

### Step 1: Upload Script to CloudShell

**File to upload:**
```
C:\Users\Elize\mentalspaceehr-fresh\infrastructure\grant-admin-via-lambda.sh
```

1. Open **AWS CloudShell** (us-east-1 region)
2. Click **"Actions"** → **"Upload file"**
3. Select `grant-admin-via-lambda.sh`

---

### Step 2: Run the Script

In CloudShell:

```bash
# Make executable
chmod +x grant-admin-via-lambda.sh

# Run script
./grant-admin-via-lambda.sh
```

---

### Step 3: Enter Your Email

When prompted:

```
Enter user email to grant admin access:
Email: ejoseph@chctherapy.com
```

Press Enter.

---

### Step 4: Confirm

The script will show:

```
✅ Found user:
   ID: <your-user-id>
   Email: ejoseph@chctherapy.com
   Name: <your-name>

⚠️  This will grant ADMINISTRATOR access to:
   ejoseph@chctherapy.com (<your-name>)

Continue? (y/n):
```

Type **`y`** and press Enter.

---

### Step 5: Success!

You'll see:

```
✅ Administrator role granted!

✅ User roles: administrator

🎉 Success!

Next steps:
1. Refresh your browser (Ctrl+Shift+R or F5)
2. You should now see the full Admin menu in the sidebar
3. All 30+ administrative features will be available
```

---

### Step 6: Refresh Your Browser

Go back to your application at http://localhost:8080 and:

1. Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
2. Or press **F5**

---

## 🎨 What You'll See After

Your sidebar will now show:

### Main Menu
- ✅ Dashboard
- ✅ My Schedule
- ✅ Schedule
- ✅ Clients
- ✅ Billing
- ✅ Messages
- ✅ Waitlist
- ✅ Clinical Notes
- ✅ Tasks

### 🛡️ Administration (NEW!)

**Billing & Revenue** (9 items)
- Billing Hub
- Eligibility Verification
- Claims Management
- Payment Processing
- Client Statements
- Fee Schedules
- Charge Management
- Payroll
- Reports & Analytics

**System & Users** (3 items)
- User Management
- Practice Settings
- BAA Management

**Client Services** (3 items)
- Client Portal
- Service Codes
- Locations

**Clinical Operations** (4 items)
- Clinician Schedules
- Supervision Management
- AI Clinical Notes
- AI Quality Metrics

**Documents & Assessments** (3 items)
- Document Library
- Clinical Assessments
- Document Management

**Compliance & Security** (3 items)
- Compliance Dashboard
- Compliance Rules
- Audit Logs

**Communications** (2 items)
- Reminder Settings
- Appointment Notifications

**Telehealth** (2 items)
- Telehealth Settings
- Telehealth Consents

### Settings
- ✅ Profile
- ✅ Security (MFA)

---

## ❓ Troubleshooting

### Error: "User not found"

This means you haven't logged in to the application yet.

**Fix:**
1. Go to http://localhost:8080
2. Log in with:
   - Email: `ejoseph@chctherapy.com`
   - Password: `AdminPass123!`
3. Complete login flow
4. Run the script again

---

### Error: "Lambda function not found"

The `mentalspace-query-database` Lambda wasn't deployed.

**Check:**
```bash
aws lambda get-function \
  --function-name mentalspace-query-database \
  --region us-east-1
```

If not found, you need to deploy it from your infrastructure.

---

### Still Not Seeing Admin Menu

1. **Hard refresh** your browser:
   - Windows/Linux: **Ctrl+Shift+R**
   - Mac: **Cmd+Shift+R**
   - Chrome: **Ctrl+F5**

2. **Clear cache and cookies**:
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cookies" and "Cached images and files"

3. **Log out and log back in**:
   - Click "Sign Out" in sidebar
   - Log in again with `ejoseph@chctherapy.com`

4. **Check browser console**:
   - Press **F12** to open DevTools
   - Look for any errors in Console tab
   - Look for `[useCurrentUserRoles]` logs

---

## 🔍 How It Works

The script:

1. **Looks up your user** in the `users` table by email
2. **Checks if you already have** the `administrator` role
3. **Inserts the role** into the `user_roles` table:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('<your-user-id>', 'administrator')
   ```
4. **Verifies** the role was added successfully

The frontend (`useCurrentUserRoles` hook):
- Calls the `get-user-roles` Lambda function
- Receives your roles from the database
- The `AppSidebar` component checks `userIsAdmin`
- If true, shows all 30+ admin menu items

---

## 🎊 Summary

**File to upload:**
- `infrastructure/grant-admin-via-lambda.sh`

**Command to run:**
```bash
chmod +x grant-admin-via-lambda.sh
./grant-admin-via-lambda.sh
```

**Email to enter:**
```
ejoseph@chctherapy.com
```

**Result:**
- ✅ Administrator role added to database
- ✅ Full admin menu visible (30+ features)
- ✅ Complete application access!

---

**Ready to grant admin access?** Upload the script to CloudShell and run it! 🚀
