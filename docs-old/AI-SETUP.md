# AI Assistant Setup Guide

## Setting up OpenAI API Key in Firebase

To enable the AI assistant functionality, you need to set up your OpenAI API key. There are two methods depending on your Firebase plan.

### Step 1: Upgrade to Blaze Plan
Firebase requires a **Blaze (pay-as-you-go) plan** to use secrets management:

1. Go to [Firebase Console Usage Details](https://console.firebase.google.com/project/collabcanvas-dev/usage/details)
2. Click **"Upgrade to Blaze"**
3. Follow the billing setup process

### Step 2: Set the Secret
After upgrading, run the following command:

```bash
# Set the OpenAI API key as a Firebase secret
npx firebase functions:secrets:set OPENAI_API_KEY

# When prompted, paste your OpenAI API key
```

### Step 3: Deploy Functions
```bash
npx firebase deploy --only functions
```

## Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-`)

## Testing the Setup

1. Open your deployed app
2. Try using the AI assistant (click the AI button in the toolbar)
3. Type a command like "create a red circle"
4. The AI should process the command and create the shape

## Troubleshooting

### CORS Error
The function now has CORS configuration, but if you still see CORS errors, check that your domain is allowed in the Firebase hosting settings.

### API Key Error
Make sure the secret is set correctly:
```bash
# Check if the secret exists (Blaze plan only)
firebase functions:secrets:access OPENAI_API_KEY
```

### Function Not Deployed
Ensure the function is deployed:
```bash
# Check function status
firebase functions:list
```

## Cost Considerations

- **Firebase Blaze Plan**: Pay-as-you-go, includes free tier for most usage
- **OpenAI API**: Charged per token (simple commands use minimal tokens)
- **Alternative**: Use environment variables to avoid Blaze plan requirement

## Security Notes

- The OpenAI API key is stored securely as a Firebase secret (Method 1) or environment variable (Method 2)
- Only authenticated users can access the AI assistant
- The function validates user authentication before processing commands
- API usage is logged for monitoring

## Recommendation

For production use, **Method 1 (Firebase Secrets)** is recommended as it's more secure and doesn't require storing secrets in your codebase. The Blaze plan includes generous free tier limits that should cover most development and testing needs.
