import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const PORT = 42813;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

function loadEnvFile(name) {
  try {
    const text = readFileSync(resolve(process.cwd(), name), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // File is optional.
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first.",
  );
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Authorization failed. You can close this tab.");
    server.close();
    process.exit(1);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const payload = await tokenResponse.json();
  if (!tokenResponse.ok || !payload.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      "Google did not return a refresh token. Sign in as the school mailbox and try again.",
    );
    server.close();
    console.error(payload);
    process.exit(1);
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Authorized. You can close this tab and return to the terminal.");
  server.close();
  console.log("Add this line to .env.local:");
  console.log(`GMAIL_REFRESH_TOKEN=${payload.refresh_token}`);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Sign in as the school mailbox (dev at setonschool.net), not a personal Gmail.");
  console.log("Redirect URI in Google Cloud must be exactly:");
  console.log(REDIRECT_URI);
  console.log("");
  console.log(authUrl.toString());
});
