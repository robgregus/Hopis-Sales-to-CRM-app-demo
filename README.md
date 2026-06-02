# Hopi’s Sales Call to CRM App Demo

A mobile-friendly web demo that records speech, summarizes the conversation, and displays structured CRM fields.

## What is included

- `index.html` — mobile-first interface with step cards and record buttons
- `styles.css` — clean, simplified UI
- `app.js` — speech recording, text-to-speech prompts, and summary flow
- `netlify/functions/summary.js` — serverless function that securely calls Claude API
- `netlify.toml` — Netlify configuration
- `.env` (local only) — for local testing with your API key

## Local Setup (Testing)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with your Claude API key:

   ```env
   CLAUDE_API_KEY=your_claude_api_key_here
   CLAUDE_MODEL=claude-3.5
   CLAUDE_API_URL=https://api.anthropic.com/v1/complete
   ```

3. Start the local server:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000` on your phone or desktop browser.

## Deployment to Netlify

1. Push your code to GitHub (if not already there).

2. Log in to [Netlify](https://app.netlify.com).

3. Click **Add new site > Import an existing project** and select your GitHub repo.

4. Configure build settings:
   - **Build command**: `npm install`
   - **Publish directory**: `.` (current directory)
   - **Functions directory**: `netlify/functions`

5. Set environment variables in Netlify:
   - Go to **Site settings > Build & deploy > Environment**
   - Add `CLAUDE_API_KEY` with your Anthropic API key
   - (Optional) Add `CLAUDE_MODEL` and `CLAUDE_API_URL` if needed

6. Click **Deploy**. Netlify will create a URL like `https://your-site-name.netlify.app`.

7. Share the URL with others. Your API key is secure on Netlify's servers and never exposed to the browser.

## How API Security Works

- The Netlify Function (`netlify/functions/summary.js`) reads your API key from the environment.
- The browser sends only transcripts to `/.netlify/functions/summary`.
- The function calls Claude and returns the structured summary.
- Your API key never leaves Netlify's servers.

## Notes

- For best results use a mobile browser that supports Web Speech API, such as Chrome on Android.
- You can edit any extracted fields before pressing `Next Step`.
- To update the deployed app, push changes to GitHub and Netlify will redeploy automatically.
