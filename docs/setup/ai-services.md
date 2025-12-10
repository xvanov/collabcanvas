# AI Services Setup Guide

CollabCanvas uses multiple AI services for different features. This guide covers setting up all AI integrations.

---

## OpenAI Setup (Required)

### Prerequisites

- OpenAI account with API access
- Firebase Blaze (pay-as-you-go) plan for secrets management

### Step 1: Upgrade to Blaze Plan

Firebase requires a **Blaze (pay-as-you-go) plan** to use secrets management:

1. Go to [Firebase Console Usage Details](https://console.firebase.google.com/)
2. Select your project
3. Click **"Upgrade to Blaze"**
4. Follow the billing setup process

### Step 2: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-`)

### Step 3: Set the Firebase Secret

```bash
# Set the OpenAI API key as a Firebase secret
npx firebase functions:secrets:set OPENAI_API_KEY

# When prompted, paste your OpenAI API key
```

### Step 4: Deploy Functions

```bash
npx firebase deploy --only functions
```

### Verify Setup

```bash
# Check if the secret exists
firebase functions:secrets:access OPENAI_API_KEY

# Check function status
firebase functions:list
```

---

## Vision AI (GPT-4o) Limitations

### Current Limitation

Vision AI requires **publicly accessible image URLs**. It cannot access:
- Local Firebase Storage Emulator (`http://127.0.0.1:9199`)
- Localhost URLs
- Private network URLs

### Solutions

**Option 1: Deploy to Production (Recommended)**

Vision AI works when deployed to Firebase Hosting:
```bash
npm run deploy
```

Images will be at: `https://firebasestorage.googleapis.com/...`

**Option 2: Use Base64 Encoding**

Convert image to base64 data URI before sending to OpenAI. This increases payload size significantly.

### What Works in Local Development

| Feature | Status | Notes |
|---------|--------|-------|
| Material AI (GPT-4o-mini) | Works | Material calculations |
| Canvas AI (GPT-3.5-turbo) | Works | Shape creation commands |
| Keyword Fallback | Works | Fast local parsing |
| Vision AI (GPT-4o) | Production Only | Needs public URLs |

---

## Home Depot Pricing Integration (Optional)

Adds real-time pricing from Home Depot to your Bill of Materials.

### Prerequisites

- SerpAPI account with Home Depot API access
- 250 free searches available (or paid plan)

### Step 1: Create SerpAPI Account

1. Sign up at [https://serpapi.com/](https://serpapi.com/)
2. Navigate to your dashboard
3. Copy your API key

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Home Depot Pricing Integration
SERP_API_KEY=your_api_key_here
```

### Step 3: Test API Connection

```bash
# Test with curl
curl "https://serpapi.com/search.json?engine=home_depot&q=2x4+lumber&api_key=YOUR_API_KEY"
```

### Verify Integration

1. Start the application
2. Generate a BOM with common materials
3. Check that pricing data appears in the Material Panel
4. Verify product links open correctly

### API Usage Limits

| Plan | Searches/Month | Best For |
|------|----------------|----------|
| Free | 250 | Testing and development |
| Paid | 1,000+ | Production use |

---

## AI Features Summary

### Material AI (GPT-4o-mini)
- Calculate materials for walls
- Parse material specifications
- BOM generation

**Example commands:**
- "Calculate materials for walls"
- "Metal 24, FRP, 12ft, R-19"
- "Add insulation"

### Canvas AI (GPT-3.5-turbo)
- Create shapes via natural language
- Manipulate canvas elements

**Example commands:**
- "Create 3 blue circles"
- "Align selected left"

### Vision AI (GPT-4o)
- Analyze construction plans
- Count elements in images
- Extract details from drawings

**Example commands:**
- "How many doors in the plan?"
- "Identify windows in this drawing"

---

## Cost Considerations

### OpenAI API Usage

| Model | Approximate Cost |
|-------|-----------------|
| GPT-4o (Vision) | ~$0.01-0.02 per image |
| GPT-4o-mini (Material) | ~$0.0001 per request |
| GPT-3.5-turbo (Canvas) | ~$0.0002 per command |

### Firebase

| Service | Free Tier |
|---------|-----------|
| Functions | 2M invocations/month |
| Storage | 5GB |
| Firestore | 50k reads/day |

**For typical use:** Very low cost (<$5/month for moderate use)

---

## Troubleshooting

### "OPENAI_API_KEY not found"
- Verify key is set: `firebase functions:secrets:access OPENAI_API_KEY`
- Redeploy functions: `firebase deploy --only functions`

### "invalid_image_url" Error
- Ensure images are uploaded to production Storage
- Check image URLs are publicly accessible
- Deploy to production for Vision AI testing

### CORS Errors
- Both functions have `cors: true` configured
- Check Firebase hosting settings for your domain

### No Search Results (Home Depot)
- Some materials may not have exact matches
- Try more generic search terms
- Check if material names are too specific

---

## Security Notes

- Never commit API keys to version control
- Use environment variables and Firebase secrets
- Rotate keys periodically
- Only authenticated users can access AI features
