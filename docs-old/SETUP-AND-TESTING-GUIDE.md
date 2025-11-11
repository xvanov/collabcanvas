# Setup & Testing Guide - PR-4 Material Estimation

## 🚀 Quick Start (Git Worktree Setup)

Since you're using git worktree, here's what you need:

### 1. Firebase Emulator Setup

**Start the Firebase emulators** (in a separate terminal):

```bash
cd /Users/kalin.ivanov/rep/collabcanvas-root/issue-21-construction-ai/collabcanvas
firebase emulators:start
```

This starts:
- ✅ Functions emulator: `http://127.0.0.1:5001`
- ✅ Firestore emulator: `http://localhost:8080`
- ✅ Auth emulator: `http://localhost:9099`
- ✅ RTDB emulator: `http://localhost:9000`
- ✅ Storage emulator: `http://localhost:9199`
- ✅ Emulator UI: `http://localhost:4000`

### 2. Run the Dev Server

**In another terminal:**

```bash
cd /Users/kalin.ivanov/rep/collabcanvas-root/issue-21-construction-ai/collabcanvas
npm run dev
```

Opens at: `http://localhost:5173`

---

## 🧪 Testing the AI Features

You now have **TWO AI assistants**:

### 🤖 **AI Canvas Assistant** (Purple - Bottom Left)
**Location:** Tools → AI Assistant  
**What to test:**

1. **Basic Shape Creation**
   ```
   "create a circle"
   "create a red rectangle"
   "add text saying Hello World"
   "create a blue line"
   ```

2. **Multiple Shapes**
   ```
   "create 3 circles"
   "create 5 red rectangles"
   ```

3. **Shape Manipulation** (select shapes first)
   ```
   "delete selected shapes"
   "duplicate selected shapes"
   "align selected shapes left"
   ```

4. **Color Changes** (select shapes first)
   ```
   "make selected shapes red"
   "change color to blue"
   ```

5. **Layer Operations**
   ```
   "create a layer called Walls"
   "move selected shapes to Walls layer"
   ```

**Expected behavior:**
- ✅ Chat scrolls as you add commands
- ✅ Shows success/failure for each command
- ✅ Displays created/modified/deleted shape counts
- ✅ Doesn't close after each command
- ✅ Clear history button works

---

### 🏗️ **Material Estimation AI** (Blue - Bottom Right)
**Location:** Advanced → Material Estimation  
**What to test:**

**Setup First:**
1. Upload a construction plan image (Tools → File Upload)
2. Set scale using Scale Tool (Tools → Scale Tool)
   - Draw a reference line on a known measurement
   - Enter the real-world length (e.g., "20 feet")

**Then test material estimation:**

#### Test 1: Wall Materials
```
1. Create a layer called "Walls"
2. Use the Polyline tool to draw wall segments
3. Open Material Estimation chat
4. Type: "Calculate materials for walls"
5. When asked, choose: "Lumber (16" spacing)"
```

**Expected:**
- ✅ Shows total linear feet found
- ✅ Lists framing materials (studs, plates, nails)
- ✅ Lists surface materials (drywall, screws, compound)
- ✅ Lists finish materials (primer, paint)
- ✅ Shows refinement options (switch to metal, change spacing)

#### Test 2: Refinements
```
After getting wall estimate:
"Switch to metal framing"
"Use 24 inch spacing"
```

**Expected:**
- ✅ Shows new calculation
- ✅ Displays material differences (e.g., "Studs: -15 pieces")
- ✅ Updates BOM panel

#### Test 3: Floor Materials
```
1. Create a layer called "Floor"
2. Use the Polygon tool to draw floor area
3. Type: "Calculate floor materials"
4. When asked, choose: "Epoxy Coating"
```

**Expected:**
- ✅ Shows total square feet found
- ✅ Lists epoxy materials (cleaner, etching, primer, base coat, top coat)
- ✅ All quantities calculated with waste factors

#### Test 4: BOM Panel
```
After any calculation:
1. Open Advanced → BOM Panel
2. View all materials
3. Filter by category (framing, surface, finish, flooring)
4. Click "Export CSV"
```

**Expected:**
- ✅ Shows all calculated materials
- ✅ Category filtering works
- ✅ CSV downloads with proper formatting
- ✅ Includes project metadata

---

## 🐛 Troubleshooting

### Issue: "CORS error" when using AI
**Solution:** Restart Firebase emulators after the CORS fix
```bash
# Stop emulator (Ctrl+C)
firebase emulators:start
```

### Issue: "No OPENAI_API_KEY" warning
**Check:** `collabcanvas/functions/.env` should have:
```
OPENAI_API_KEY=sk-...your-key...
```

### Issue: AI commands fail silently
**Check Firebase Functions logs:**
```bash
# In emulator terminal, you'll see logs
# Look for errors from aiCommand function
```

### Issue: Material estimation says "no measurements found"
**Checklist:**
- [ ] Scale is set (ScaleTool shows the reference line)
- [ ] Layer name contains "wall" or "floor"
- [ ] Shapes are polylines (for walls) or polygons (for floors)
- [ ] Shapes are on the correct layer

---

## 📊 What Each AI Can Do

### General AI Assistant Capabilities
| Command Type | Example | What Happens |
|-------------|---------|--------------|
| CREATE | "create a circle" | Creates shape at default position |
| MOVE | "move selected shapes" | Moves shapes (needs clarification) |
| DELETE | "delete all circles" | Removes matching shapes |
| ALIGN | "align selected left" | Aligns selected shapes |
| COLOR | "make it red" | Changes color of selected shapes |
| DUPLICATE | "duplicate selected" | Copies selected shapes |
| LAYER | "create layer Walls" | Creates new layer |
| EXPORT | "export as PNG" | Exports canvas |

### Material Estimation AI Capabilities
| Feature | Example | Output |
|---------|---------|--------|
| Wall Calculation | "calculate materials for walls" | Framing, drywall, paint, trim |
| Floor Calculation | "calculate floor materials" | Epoxy, tile, carpet, or hardwood |
| Framing Comparison | "switch to metal framing" | Shows material differences |
| Spacing Options | "use 24 inch spacing" | Recalculates with new spacing |
| Floor Types | "compare tile flooring" | Shows alternative materials |
| BOM Export | Click "Export CSV" in panel | Downloads material list |

---

## 🎯 Test Scenarios

### Scenario 1: Complete Wall Estimation
1. Upload construction plan
2. Set scale (e.g., 20 feet reference)
3. Create "Walls" layer
4. Draw polylines along walls (total ~80 feet)
5. Material Estimation: "Calculate materials for walls"
6. Choose "Lumber 16" spacing"
7. Review BOM
8. Try "Switch to metal framing"
9. Export CSV

### Scenario 2: Multi-Room Floor
1. Create "Kitchen Floor" layer
2. Draw polygon (500 sqft)
3. Create "Bathroom Floor" layer  
4. Draw polygon (100 sqft)
5. Material Estimation: "Calculate epoxy for all floors"
6. Review consolidated BOM
7. Export CSV

### Scenario 3: General AI Commands
1. "create 5 blue circles"
2. Select all circles
3. "align selected shapes left"
4. "change color to red"
5. "duplicate selected shapes"
6. Review chat history
7. Clear history

---

## 📝 Expected Results

### Material Estimation Accuracy
- **Lumber 16" spacing, 20ft wall, 8ft height:**
  - Studs: ~18-20 pieces
  - Plates: ~44 linear feet
  - Drywall: ~5 sheets
  - Paint: ~1 gallon

- **Epoxy 500 sqft floor:**
  - Cleaner: ~3 gallons
  - Etching: ~4 gallons
  - Primer: ~2 gallons
  - Base coat: ~3 gallons
  - Top coat: ~2 gallons

### CSV Export Format
```csv
# Project: Material Estimate
# Generated: [timestamp]

Category,Item,Quantity,Unit,Notes
framing,2x4 Studs (8'),18,piece,16" on center spacing
framing,2x4 Plates,44,linear-feet,Top and bottom plates
surface,1/2" Drywall Sheets (4'x8'),5,piece,
...
```

---

## 🔧 Developer Notes

### Firebase Emulator Ports
- Functions: `5001` (for AI commands)
- Firestore: `8080` (for shapes/layers)
- RTDB: `9000` (for presence/locks)
- Auth: `9099` (for user auth)
- Storage: `9199` (for images)

### Environment Variables Needed
**Frontend** (`collabcanvas/.env`):
- `VITE_FIREBASE_*` - Firebase config
- `VITE_USE_EMULATORS=true` - Enable emulators

**Functions** (`collabcanvas/functions/.env`):
- `OPENAI_API_KEY=sk-...` - Required for AI

### Key Files Modified
- ✅ `functions/src/aiCommand.ts` - CORS fix
- ✅ `components/AICommandInput.tsx` - Chat interface
- ✅ `firebase.json` - Functions emulator port added

---

## ✅ Verification Checklist

Before testing:
- [ ] Firebase emulators running
- [ ] Dev server running (`npm run dev`)
- [ ] Functions built (`cd functions && npm run build`)
- [ ] OpenAI API key in `functions/.env`
- [ ] Logged in to the app
- [ ] No CORS errors in browser console

The chat interfaces are ready! Test both AI assistants and let me know if anything needs adjustment.

