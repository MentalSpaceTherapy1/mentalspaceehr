# 🔐 Create Your First Admin User

Quick guide to create your first admin account for MentalSpace EHR.

---

## 📁 File Location

**Local machine:**
```
C:\Users\Elize\mentalspaceehr-fresh\infrastructure\create-admin-user.sh
```

---

## 🚀 Steps (5 minutes)

### Step 1: Upload to CloudShell

In your **AWS CloudShell** window:
1. Click **"Actions"** → **"Upload file"**
2. Navigate to: `C:\Users\Elize\mentalspaceehr-fresh\infrastructure\`
3. Select **`create-admin-user.sh`**
4. Click **Upload**

---

### Step 2: Run the Script

Copy-paste these commands into CloudShell:

```bash
chmod +x create-admin-user.sh
./create-admin-user.sh
```

---

### Step 3: Enter Your Details

The script will prompt you for:

```
Email address: your@email.com
First name: John
Last name: Doe
Temporary password (min 8 chars): ********
Confirm password: ********
```

**Password requirements:**
- ✅ At least **8 characters**
- ✅ At least **one uppercase letter** (A-Z)
- ✅ At least **one lowercase letter** (a-z)
- ✅ At least **one number** (0-9)
- ✅ At least **one special character** (!@#$%^&*)

**Example password:** `Admin123!`

---

### Step 4: Success Message

You'll see:

```
========================================
  🎉 Admin User Created!
========================================

Login Credentials:
  Email:    your@email.com
  Password: [hidden]
  Role:     admin

User Details:
  First Name: John
  Last Name:  Doe
  Status:     Confirmed
  Email Verified: Yes

Next steps:
1. Go to: http://localhost:8080
2. Click 'Sign In' tab
3. Enter email: your@email.com
4. Enter the password you just set
5. You'll be redirected to the admin dashboard

🎊 You can now login to your application!
```

---

### Step 5: Login to Your App

1. **Open:** http://localhost:8080
2. **Click:** "Sign In" tab (NOT Sign Up)
3. **Enter:**
   - Email: The email you just entered
   - Password: The password you just set
4. **Click:** "Sign In"
5. **Success!** You'll be redirected to the admin dashboard

---

## ✅ What This Creates

- ✅ **Admin user** with full system access
- ✅ **Email verified** (no verification email needed)
- ✅ **Account confirmed** and active immediately
- ✅ **Permanent password** (won't be asked to change it)
- ✅ **Role: admin** (access to all features)

---

## 🎯 Quick Reference

**File to upload:**
```
infrastructure/create-admin-user.sh
```

**Commands to run:**
```bash
chmod +x create-admin-user.sh
./create-admin-user.sh
```

**Login URL:**
```
http://localhost:8080
```

---

## ❓ Troubleshooting

### Error: "User already exists"

The email is already registered. Either:
- Use a different email, OR
- Delete the existing user in Cognito first:

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id us-east-1_ssisECEGa \
  --username your@email.com \
  --region us-east-1
```

Then run the script again.

---

### Error: "Password doesn't meet requirements"

Make sure your password has:
- At least 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Valid examples:**
- `Admin123!`
- `Pass1234!`
- `MyApp@2025`

**Invalid examples:**
- `admin123` (no uppercase, no special)
- `ADMIN123!` (no lowercase)
- `Admin!` (too short, no number)

---

### Error: "Permission denied"

Run:
```bash
chmod +x create-admin-user.sh
```

---

### Script runs but no output?

The script might be waiting for input. Type your details and press Enter after each field.

---

## 🎊 After Login

Once logged in as admin, you can:
- ✅ View the dashboard
- ✅ Manage clients
- ✅ Create appointments
- ✅ View notes and tasks
- ✅ Access all admin features
- ✅ **Create additional users** via the "Admin" menu

---

**Ready?** Upload the file to CloudShell and create your admin account! 🚀
