# 🚀 DEPLOY NOW - Fix API Errors

## ⚡ Super Quick Guide (5 minutes)

### Step 1: Upload to CloudShell

1. Open **AWS CloudShell** (us-east-1 region)
2. Click **"Actions"** → **"Upload file"**
3. Select this file:
   ```
   C:\Users\Elize\mentalspaceehr-fresh\infrastructure\crud-deployment.zip
   ```
4. Wait for upload to complete

---

### Step 2: Extract Files

In CloudShell, run:

```bash
unzip crud-deployment.zip
ls
```

You should see:
- `deploy-crud-lambdas.sh`
- `update-api-gateway-routes.sh`
- `query-database/` folder
- `insert-database/` folder
- `update-database/` folder
- `delete-database/` folder

---

### Step 3: Deploy Lambda Functions

```bash
chmod +x deploy-crud-lambdas.sh
./deploy-crud-lambdas.sh
```

⏱️ **Takes ~3 minutes**

Wait for:
```
🎉 All CRUD Functions Deployed!
```

---

### Step 4: Update API Gateway

```bash
chmod +x update-api-gateway-routes.sh
./update-api-gateway-routes.sh
```

⏱️ **Takes ~2 minutes**

Wait for:
```
🎉 API Gateway Updated Successfully!
```

---

### Step 5: Test Your Application

1. Go to http://localhost:8080
2. Press **Ctrl+Shift+R** (hard refresh)
3. Click on **My Schedule** in the sidebar
4. **NO MORE ERRORS!** ✅

---

## ✅ Done!

Your application is now fully functional:
- ✅ Admin menu visible (30+ features)
- ✅ Database queries working
- ✅ No more "Failed to fetch" errors
- ✅ All CRUD operations functional

---

## 📦 What Was Deployed

**4 New Lambda Functions:**
1. `mentalspace-query-database` - SELECT queries
2. `mentalspace-insert-database` - INSERT operations
3. `mentalspace-update-database` - UPDATE operations
4. `mentalspace-delete-database` - DELETE operations

**4 New API Routes:**
- `GET /query/{table}` → query-database
- `POST /insert/{table}` → insert-database
- `PUT /update/{table}` → update-database
- `POST /delete/{table}` → delete-database

---

## ❓ If Something Goes Wrong

**Check the upload:**
```bash
ls -la
# Should show all files extracted
```

**Check Lambda deployment:**
```bash
aws lambda list-functions --region us-east-1 | grep database
# Should show 4 database functions
```

**Check API Gateway:**
```bash
aws apigatewayv2 get-routes --api-id g4fv3te9nf --region us-east-1 | grep table
# Should show 4 routes with {table}
```

**View Lambda logs (if errors):**
```bash
aws logs tail /aws/lambda/mentalspace-query-database --follow --region us-east-1
```

---

**Ready? Upload crud-deployment.zip to CloudShell and run the 2 scripts!** 🎉
