# RFID Authentication Setup

This flow is:

```txt
ESP32 + PN532 -> POST /api/rfid-auth/ -> Django saves RFIDLog
React login page -> polls /api/rfid-events/ -> POST /api/rfid-session/ -> redirects
```

The ESP32 cannot redirect a browser directly. The React page must be open and listening.

## 1. Backend

From `serverroombackend`:

```powershell
..\.venv313\Scripts\python.exe manage.py migrate
..\.venv313\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

Use `0.0.0.0`, not `127.0.0.1`, so the ESP32 can reach the PC at:

```txt
http://192.168.22.46:8000
```

Endpoints:

- `POST /api/rfid-auth/` receives ESP32 scans and writes `RFIDLog`
- `GET /api/rfid-events/?limit=8` lets React poll latest scans
- `POST /api/rfid-session/` creates a browser login session after an authorized scan

RFID rules:

- `A35F0580` returns admin access, then logs into `admin` with `admin123`
- `0DEC633B` returns user access, then logs into `aribi@gmail.com` with `rayen123`
- Any other UID returns denied

Django debug output prints:

- raw request data
- normalized UID
- authorization result
- session creation result

## 2. ESP32

Use [esp32_pn532_rfid_auth.ino](esp32_pn532_rfid_auth.ino).

Expected Serial Monitor output:

```txt
[RFID] Raw bytes: A3 5F 05 80
[RFID] Formatted UID: A35F0580
[HTTP] JSON payload: {"uid":"A35F0580"}
[HTTP] Response code: 200
[HTTP] Backend response: {"status":"authorized","role":"admin","redirect":"/admin-dashboard","openDoor":true}
```

If response code is negative, it is a network problem. Check:

- ESP32 and PC are on the same WiFi network
- PC IP is still `192.168.22.46`
- Windows Firewall allows inbound TCP `8000`
- Django is running with `0.0.0.0:8000`

## 3. React Client

From `rfid-frontend`:

```powershell
npm install
npm run dev
```

Open:

```txt
http://127.0.0.1:5173/
```

Default API URL:

```txt
http://192.168.22.46:8000/api
```

Override if needed:

```powershell
$env:VITE_API_BASE_URL="http://192.168.22.46:8000/api"
npm run dev
```

Open browser DevTools Console. You should see:

```txt
[RFID EVENTS] Poll response: 200 [...]
[RFID LOGIN] Latest event received: {...}
[RFID SESSION] Requesting browser session: {uid: "A35F0580"}
[RFID SESSION] Stored session for: {...}
[RFID LOGIN] Redirecting to: /admin-dashboard
```

## 4. Manual API Tests

From another PowerShell window:

```powershell
Invoke-RestMethod `
  -Uri "http://192.168.22.46:8000/api/rfid-auth/" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"uid":"A35F0580"}'
```

Expected:

```json
{
  "status": "authorized",
  "role": "admin",
  "redirect": "/admin-dashboard",
  "openDoor": true
}
```

Then check events:

```powershell
Invoke-RestMethod "http://192.168.22.46:8000/api/rfid-events/?limit=3"
```

Then check browser session creation:

```powershell
Invoke-RestMethod `
  -Uri "http://192.168.22.46:8000/api/rfid-session/" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"uid":"A35F0580"}'
```

Expected response includes `access`, `refresh`, `session_id`, and `user`.

## 5. Common Fixes

- UID shows `A3 5F 05 80`: remove spaces before sending. The ESP32 sketch does this.
- UID shows lowercase: convert to uppercase. The ESP32 sketch and Django serializer both do this.
- ESP32 gets connection refused: Django is not running on `0.0.0.0:8000`, or firewall blocked it.
- ESP32 gets `404`: wrong URL. It must be `/api/rfid-auth/`.
- React does nothing: React page is not open, wrong API URL, or DevTools shows CORS/network errors.
- Browser is blocked by CORS: confirm `SimpleCorsMiddleware` is in Django `MIDDLEWARE`.
- CSRF errors: these RFID endpoints use DRF `APIView` with token/JWT auth classes and `AllowAny`; do not call Django admin/session endpoints from ESP32.
