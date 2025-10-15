# ⚡ Quick Start: CloudShell Deployment

**Deploy 15 Lambda functions in ~15 minutes with ZERO local IAM setup!**

---

## ✅ Files Ready

✅ **[infrastructure/lambda-functions.zip](infrastructure/lambda-functions.zip)** (229 KB)
✅ **[infrastructure/cloudshell-deploy.sh](infrastructure/cloudshell-deploy.sh)** (15 KB)

---

## 🚀 5-Step Deployment

### Step 1: Open AWS CloudShell

👉 **Click here:** https://console.aws.amazon.com/cloudshell/home?region=us-east-1

Wait 10 seconds for CloudShell to load.

---

### Step 2: Upload Files

In CloudShell window:

1. Click **"Actions"** → **"Upload file"**
2. Upload `infrastructure/lambda-functions.zip`
3. Click **"Actions"** → **"Upload file"** again
4. Upload `infrastructure/cloudshell-deploy.sh`

---

### Step 3: Extract & Run

Copy-paste these commands into CloudShell:

```bash
# Extract Lambda functions
unzip lambda-functions.zip

# Make script executable
chmod +x cloudshell-deploy.sh

# Deploy!
./cloudshell-deploy.sh
```

---

### Step 4: Wait for Deployment

The script will:
- ✅ Auto-detect all AWS configuration (~15 seconds)
- ✅ Create IAM role if needed (~10 seconds)
- ✅ Create database layer if needed (~30 seconds)
- ✅ Deploy 15 Lambda functions (~10-15 minutes)

**Total time:** 10-15 minutes

---

### Step 5: Verify Success

You should see:

```
🎉 All Phase 1 functions deployed successfully!

========================================
  Deployment Summary
========================================
✅ Succeeded: 15
Total: 15
```

Verify with:

```bash
aws lambda list-functions --region us-east-1 \
  --query "Functions[?starts_with(FunctionName, 'mentalspace-')].FunctionName" \
  --output table
```

**Expected:** 15 functions listed

---

## 📖 Full Documentation

**Need more details?** See:
- **[infrastructure/CLOUDSHELL_DEPLOYMENT_GUIDE.md](infrastructure/CLOUDSHELL_DEPLOYMENT_GUIDE.md)** - Complete guide with troubleshooting

---

## ❓ Troubleshooting

### "Permission denied" error?

```bash
chmod +x cloudshell-deploy.sh
```

### "File not found" error?

```bash
ls -la
unzip lambda-functions.zip
```

### Deployment fails?

Check [CLOUDSHELL_DEPLOYMENT_GUIDE.md](infrastructure/CLOUDSHELL_DEPLOYMENT_GUIDE.md) - Section "Troubleshooting"

---

## ✅ After Deployment

Once all 15 functions are deployed:

### Next: Configure API Gateway

See [MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md](MANUAL_LAMBDA_DEPLOYMENT_GUIDE.md) - Section 6

OR use automated API Gateway setup (coming next!)

---

## 🎯 Summary

| Step | Time | Action |
|------|------|--------|
| 1 | 1 min | Open CloudShell |
| 2 | 2 min | Upload 2 files |
| 3 | 30 sec | Extract & run script |
| 4 | 10-15 min | Wait for deployment |
| 5 | 30 sec | Verify |
| **TOTAL** | **15-20 min** | **15 functions deployed!** |

---

**Ready?** → https://console.aws.amazon.com/cloudshell/home?region=us-east-1

Let's deploy! 🚀
