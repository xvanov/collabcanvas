# Vision AI Setup & Limitation

## ⚠️ **Current Limitation**

**Vision AI (GPT-4o) requires publicly accessible image URLs.** It cannot access:
- ❌ Local Firebase Storage Emulator (`http://127.0.0.1:9199`)
- ❌ Localhost URLs
- ❌ Private network URLs

## 🔧 **Solutions**

### **Option 1: Deploy to Production (Recommended)**
Vision AI will work when you deploy to Firebase Hosting:
```bash
npm run deploy
```

Then the images will be at:
```
https://firebasestorage.googleapis.com/...
```

OpenAI can access these! ✅

### **Option 2: Use Base64 Encoding (Complex)**
Convert image to base64 data URI before sending to OpenAI.
- Requires fetching image from emulator
- Converting to base64
- Sending inline to OpenAI
- Increases payload size significantly

### **Option 3: Use Public Image Host**
Upload plan to a public URL temporarily:
- Imgur
- CloudFlare Images
- Any CDN

---

## 🧪 **Testing Vision AI**

### **In Production:**
```
1. Deploy: npm run deploy
2. Upload construction plan
3. Ask: "How many doors in the plan?"
4. GPT-4 Vision analyzes and responds!
```

### **In Local Development:**
Vision queries will fail with "invalid_image_url" error.

**Use these instead:**
- Manual door/window input: `"Add trim for 11 doors"`
- Direct specifications: `"metal, FRP, 10ft, 11 doors"`
- Test other AI features (material parsing works!)

---

## 📋 **What Works in Local Dev**

✅ **Material AI (GPT-4o-mini)**
- "Calculate materials for walls"
- "Metal 24, FRP, 12ft, R-19"
- "Remove drywall"
- "Add insulation"

✅ **Canvas AI (GPT-3.5-turbo)**
- "Create 3 blue circles"
- "Align selected left"

✅ **Keyword Fallback**
- Fast local parsing
- Works offline
- "epoxy", "lumber 16", "10 feet"

❌ **Vision AI (GPT-4o)**
- Needs production deployment
- Requires public URLs

---

## 🚀 **Future Enhancement**

We could add base64 conversion for local dev:
```typescript
// Fetch image from emulator
const response = await fetch(localImageUrl);
const blob = await response.blob();
const base64 = await blobToBase64(blob);

// Send to OpenAI
analyzePlanImage(query, `data:image/jpeg;base64,${base64}`);
```

This would make vision work locally but adds complexity.

---

## 💡 **For Now**

**Local Development:**
- Use direct input: `"Add trim for 11 doors and 4 windows"`
- Test material calculations and refinements
- Test Canvas AI

**Production:**
- Vision AI will work perfectly
- Deploy and test full vision features
- "How many doors?" will analyze the plan image

