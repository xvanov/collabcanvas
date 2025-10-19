# AI Assistant Setup Guide

## Setting up OpenAI API Key in Firebase

To enable the AI assistant functionality, you need to set up your OpenAI API key as a Firebase secret.

### Step 1: Get your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-`)

### Step 2: Set the Secret in Firebase

Run the following command in your terminal from the `collabcanvas` directory:

```bash
# Set the OpenAI API key as a Firebase secret
firebase functions:secrets:set OPENAI_API_KEY

# When prompted, paste your OpenAI API key
```

### Step 3: Deploy the Functions

After setting the secret, deploy your functions:

```bash
# Deploy the functions with the new secret
firebase deploy --only functions
```

### Step 4: Verify the Setup

1. Open your deployed app
2. Try using the AI assistant (click the AI button in the toolbar)
3. Type a command like "create a red circle"
4. The AI should process the command and create the shape

### Troubleshooting

If you encounter issues:

1. **CORS Error**: The function now has CORS configuration, but if you still see CORS errors, check that your domain is allowed in the Firebase hosting settings.

2. **API Key Error**: Make sure the secret is set correctly:
   ```bash
   # Check if the secret exists
   firebase functions:secrets:access OPENAI_API_KEY
   ```

3. **Function Not Deployed**: Ensure the function is deployed:
   ```bash
   # Check function status
   firebase functions:list
   ```

### Security Notes

- The OpenAI API key is stored securely as a Firebase secret
- Only authenticated users can access the AI assistant
- The function validates user authentication before processing commands
- API usage is logged for monitoring

### Cost Considerations

- OpenAI API calls are charged per token
- Simple commands like "create a circle" use minimal tokens
- Monitor your OpenAI usage in the OpenAI dashboard
- Consider implementing rate limiting for production use
