# Code overview - simple QR code entry scanner implemented in `qr_entry_scanner.py`.
It captures images or video frames, detects and decodes QR codes, and logs or sends
scanned entries for further processing (e.g., attendance or access control).
Runs on Windows, macOS, and Raspberry Pi (CSI camera via libcamera).

# Python libraries used

- `opencv-python` — image processing, QR detection, and GUI display (OpenCV)
- `numpy` — numerical operations and image arrays
- `requests` — HTTP requests to send scan results to Supabase
- `picamera2` — Raspberry Pi CSI camera capture via libcamera (system apt package: `sudo apt install python3-picamera2`)

# Details

- **Token verification:** HMAC-SHA256 signed two-part token (`payload.signature`); verifies signature and expiration; payload must include `sub`, `iat`, `exp`, and `jti`.
- **Supabase usage:** Uses REST endpoints and an RPC to query/update `user_memberships`, `entries`, and `profiles`, and to perform a check-in operation.
- **Check-in flow (left):** expires overdue memberships, ensures active membership, calls `check_in_with_membership` RPC, and shows remaining entries or check-in confirmation.
- **Check-out flow (right):** finds an open `entries` row, patches `check_out` and `duration_min`, and displays the session duration.
- **Camera & UI:** platform-aware camera selection (see below); draws QR bounding boxes and shows a split-screen interface with side panels (avatar, name, status). Press `q` to quit.
- **Camera selection:** on Raspberry Pi, uses `picamera2` (libcamera) for the CSI camera module automatically — set `SCANNER_CAMERA_INDEX` to bypass this and force a specific USB camera index. On Linux (non-Pi) uses `CAP_V4L2`; on Windows uses `CAP_DSHOW`/`CAP_MSMF`; on macOS uses the default backend.
- **Raspberry Pi camera:** `picamera2` is imported lazily and falls back to `/usr/lib/python3/dist-packages` if not found in the venv. Camera rotation is read from libcamera metadata and applied automatically (IMX219 reports 180°).
- **Environment variables:** loaded from the script's own directory first (`QRcode/.env.local`), then from the parent project root — so the file can live either inside the `QRcode` folder (standalone Pi setup) or at the repo root (Next.js monorepo on Windows/macOS).
- **Avatar handling:** downloads remote avatar images, decodes to OpenCV arrays, and resizes to 120×120 for display.
- **Timing & UX constants:** `SCAN_COOLDOWN_SECONDS` (2s) prevents rapid duplicate scans; `STATUS_SHOW_SECONDS` (3s) controls status panel visibility.
- **Error handling & security:** uses `ScannerError` for operational failures and displays concise user-facing messages; relies on signed tokens and a service-role key — keep secrets secure.
- **Runtime notes:** runs a blocking GUI loop with `cv2.imshow`; requires a display (local monitor, VNC, or X11 forwarding); network calls use short timeouts (~5s) and can raise on HTTP errors.
- **Running on headless Pi:** use VNC (`sudo raspi-config nonint do_vnc 0`) or X11 forwarding (`ssh -X`), then run with `DISPLAY=:0 .venv/bin/python qr_entry_scanner.py`.
