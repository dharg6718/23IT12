Notification Priority Service

Simple instructions to run and use the service ().

What this is
- A small Node + Express service that fetches notifications from a remote API
- It can return the raw JSON from the remote API, or a processed list of top-priority notifications

Prerequisites
- Node.js (version 18 or newer)
- npm

Install
1. Open a terminal in the project folder.
2. Run:

```
npm install
```

Start the server

```
npm start
# or
node app.js
```

Basic endpoints (use GET)
- `GET /health` — check server is running.
- `GET /raw-notifications` — returns the exact JSON returned by the remote API.
  - Add header `Authorization: Bearer <YOUR_TOKEN>` OR append `?token=<YOUR_TOKEN>` to the URL.
- `GET /notifications` — returns processed JSON with `count` and `notifications`.
- `GET /priority-notifications?limit=10` — returns top-priority notifications (default 10).
- `GET /mock-notifications` — local sample JSON (no token needed).

Use in Postman
1. Create a new GET request.
2. Paste one of these URLs:
   - `http://localhost:3000/raw-notifications`
   - `http://localhost:3000/notifications`
   - `http://localhost:3000/priority-notifications?limit=10`
   - `http://localhost:3000/mock-notifications`
3. In the Headers tab add (only if calling raw/notifications/priority):
   - Key: `Authorization`
   - Value: `Bearer <>`
4. Click Send and view the JSON in the response.

If you get 401 / "invalid authorization token"
- The token is expired or not valid for this API.
- Check you included the word `Bearer` before the token.
- Ask whoever issued the token which audience/issuer the token is for — it must match the API.
- If you can, give the token issuer URL or the client credentials and I can try fetching a new token.

Quick curl examples

```
curl -H "Authorization: Bearer <YOUR_TOKEN>" http://localhost:3000/raw-notifications
curl http://localhost:3000/mock-notifications
```

Notes
- Do not commit real tokens or secrets. Use `.env` for credentials if needed.
- There is a helper script `scripts/render.js` to make a PNG from the JSON, but you do not need it to view the API output in a browser or Postman.

If you want, paste the token issuer or how you got the token and I will help fix the 401 error.
