# Production Deployment Checklist - PR-4

## ✅ **Pre-Deployment Checks**

```bash
# 1. Build and test locally
npm run build
npm run lint  
npm run test:ci

# All should pass!
```

---

## 🔑 **Critical: Set OpenAI API Key in Production**

Your Firebase Functions need the API key in production:

```bash
cd collabcanvas

# Set the secret for OpenAI
firebase functions:secrets:set OPENAI_API_KEY

# When prompted, paste your OpenAI API key: sk-...
```

**Verify it's set:**
```bash
firebase functions:secrets:access OPENAI_API_KEY
```

---

## 📋 **Firebase Rules (Already Compatible!)**

### **Firestore Rules** ✅
Your current rules already support:
- ✅ Polyline shapes (PR-2)
- ✅ Polygon shapes (PR-2)
- ✅ Layer system
- ✅ All shape types

**No changes needed!**

### **Storage Rules** ✅
Already allows construction plan uploads:
```
match /construction-plans/{allPaths=**} {
  allow read, write: if request.auth != null;
}
```

**No changes needed!**

### **Database Rules** ✅
Already configured for presence and locks.

**No changes needed!**

---

## 🚀 **Deployment Commands**

### **Option 1: Deploy Everything**
```bash
cd collabcanvas
npm run deploy
```

This deploys:
- Hosting (frontend)
- Functions (AI commands)
- Rules (already compatible)

### **Option 2: Deploy Incrementally**
```bash
# 1. Deploy functions first (to test AI)
firebase deploy --only functions

# 2. Deploy hosting
firebase deploy --only hosting

# 3. Deploy rules (if modified)
firebase deploy --only firestore:rules,storage:rules,database:rules
```

---

## 🧪 **Post-Deployment Testing**

### **1. Test Material AI**
```
Open: https://your-app.web.app
Login
Upload construction plan
Advanced → AI Assistant
"Calculate materials for walls with metal framing"
```

### **2. Test Vision AI** 👁️
```
Upload plan to production
"How many doors in the plan?"
→ Should analyze image and count!
```

### **3. Test Multi-Area BOM**
```
"Calculate wall materials" → metal, FRP, 10ft
"Now estimate floor materials" → epoxy
Open BOM Panel
→ Should show combined materials
Export CSV
→ Download complete BOM
```

---

## ⚙️ **Environment Variables**

### **Functions (.env) - Already Set Locally**
```
OPENAI_API_KEY=sk-...
```

**In production:** Set via `firebase functions:secrets:set`

### **Frontend (.env) - No Changes Needed**
Your existing Firebase config works for PR-4.

---

## 📊 **What's Being Deployed**

### **New Firebase Functions:**
- `aiCommand` (existing - canvas AI)
- `materialEstimateCommand` (NEW - material estimation AI)

### **New Frontend Features:**
- Unified AI Chat (bottom-left)
- Material Estimation Panel (BOM display)
- Polyline/Polygon tools (PR-2)
- Scale tool (PR-1)
- File upload (PR-1)

---

## 🔍 **Deployment Verification**

After deploying, check Firebase Console:

### **Functions:**
```
Firebase Console → Functions
✅ aiCommand (deployed)
✅ materialEstimateCommand (deployed)
```

### **Usage:**
```
Firebase Console → Functions → Logs
- Watch for "🤖 OpenAI parsed..." logs
- Check for errors
```

### **Costs:**
```
Firebase Console → Usage
- Functions calls
- OpenAI API usage (track in OpenAI dashboard)
```

---

## 💰 **Cost Considerations**

### **OpenAI API Usage:**
- **GPT-4o** (Vision): ~$0.01-0.02 per image analysis
- **GPT-4o-mini** (Material specs): ~$0.0001 per request
- **GPT-3.5-turbo** (Canvas): ~$0.0002 per command

### **Firebase:**
- Functions: Free tier covers 2M invocations/month
- Storage: Free tier covers 5GB
- Firestore: Free tier covers 50k reads/day

**For typical use:** Very low cost (<$5/month for moderate use)

---

## 🚨 **Common Deployment Issues**

### **Issue: Functions fail with "OPENAI_API_KEY not found"**
**Fix:**
```bash
firebase functions:secrets:set OPENAI_API_KEY
# Paste your key
firebase deploy --only functions
```

### **Issue: Vision AI still shows "invalid_image_url"**
**Check:**
- Image uploaded to production Storage (not emulator)
- Image URL is publicly accessible
- CORS configured for Firebase Storage

### **Issue: CORS errors**
**Already fixed in code!** Both functions have `cors: true`

---

## ✅ **Deployment Checklist**

- [ ] All tests passing locally (522/522)
- [ ] Build successful (`npm run build`)
- [ ] Lint clean (`npm run lint`)
- [ ] OpenAI API key set in Firebase secrets
- [ ] Run `firebase deploy` or `npm run deploy`
- [ ] Test in production URL
- [ ] Verify Vision AI works with uploaded images
- [ ] Test multi-area BOM accumulation
- [ ] Export CSV and verify format

---

## 🎯 **Quick Deploy**

```bash
cd collabcanvas

# Set API key (one-time)
firebase functions:secrets:set OPENAI_API_KEY

# Deploy everything
npm run deploy

# Or use:
firebase deploy
```

**That's it!** No rule changes needed - everything is compatible with existing rules! 🎉

---

## 📝 **After Deployment**

1. Open your production URL
2. Upload a construction plan
3. Try: `"How many doors in the plan?"` ← Vision will work!
4. Try: `"Calculate materials for walls"`
5. Try: `"Now add floor materials"`
6. Check BOM Panel - should accumulate!
7. Export CSV

Vision AI will work perfectly in production since images will have public Firebase Storage URLs! 👁️✨
