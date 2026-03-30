import base64
import hashlib
import hmac
import json
import os
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

import cv2
import numpy as np
import requests


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_env_file(PROJECT_ROOT / ".env.local")
load_env_file(PROJECT_ROOT / ".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
QR_TOKEN_SECRET = os.getenv("QR_TOKEN_SECRET", "")

SCAN_COOLDOWN_SECONDS = 2
STATUS_SHOW_SECONDS = 3


class ScannerError(Exception):
    pass


def open_camera() -> cv2.VideoCapture:
    preferred_index_raw = os.getenv("SCANNER_CAMERA_INDEX", "").strip()
    preferred_index = None
    if preferred_index_raw:
        try:
            preferred_index = int(preferred_index_raw)
        except ValueError as exc:
            raise ScannerError("SCANNER_CAMERA_INDEX must be an integer") from exc

    indexes = list(range(0, 6))
    if preferred_index is not None:
        indexes = [preferred_index] + [idx for idx in indexes if idx != preferred_index]

    backends = [
        ("CAP_DSHOW", cv2.CAP_DSHOW),
        ("CAP_MSMF", cv2.CAP_MSMF),
        ("DEFAULT", None),
    ]

    for idx in indexes:
        for backend_name, backend in backends:
            cap = cv2.VideoCapture(idx, backend) if backend is not None else cv2.VideoCapture(idx)
            if cap.isOpened():
                ok, _ = cap.read()
                if ok:
                    print(f"Using camera index {idx} via {backend_name}")
                    return cap
            cap.release()

    raise ScannerError(
        "Cannot open webcam. Set SCANNER_CAMERA_INDEX in .env.local (example: SCANNER_CAMERA_INDEX=1)."
    )


def require_env() -> None:
    missing = []
    if not SUPABASE_URL:
        missing.append("NEXT_PUBLIC_SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not QR_TOKEN_SECRET:
        missing.append("QR_TOKEN_SECRET")

    if missing:
        raise ScannerError(f"Missing environment variables: {', '.join(missing)}")


def b64url_decode(input_value: str) -> bytes:
    padding = "=" * (-len(input_value) % 4)
    return base64.urlsafe_b64decode(input_value + padding)


def verify_qr_token(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 2:
        raise ScannerError("Invalid token format")

    payload_part, signature_part = parts

    expected_signature = hmac.new(
        QR_TOKEN_SECRET.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    try:
        received_signature = b64url_decode(signature_part)
    except Exception as exc:
        raise ScannerError("Invalid signature encoding") from exc

    if not hmac.compare_digest(expected_signature, received_signature):
        raise ScannerError("Invalid signature")

    try:
        payload = json.loads(b64url_decode(payload_part).decode("utf-8"))
    except Exception as exc:
        raise ScannerError("Invalid payload") from exc

    if not isinstance(payload, dict):
        raise ScannerError("Payload is not an object")

    for key in ["sub", "iat", "exp", "jti"]:
        if key not in payload:
            raise ScannerError(f"Missing token field: {key}")

    now_seconds = int(time.time())
    if int(payload["exp"]) <= now_seconds:
        raise ScannerError("Token expired")

    return payload


def get_headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def expire_overdue_memberships(user_id: str) -> None:
    endpoint = f"{SUPABASE_URL}/rest/v1/user_memberships"
    now_iso = datetime.now(timezone.utc).isoformat()

    params = {
        "user_id": f"eq.{user_id}",
        "status": "eq.active",
        "end_date": f"lte.{now_iso}",
    }

    payload = {"status": "expired"}
    requests.patch(endpoint, headers=get_headers(), params=params, json=payload, timeout=5)


def get_active_membership(user_id: str) -> bool:
    endpoint = f"{SUPABASE_URL}/rest/v1/user_memberships"
    now_iso = datetime.now(timezone.utc).isoformat()

    params = {
        "select": "id,end_date,status",
        "user_id": f"eq.{user_id}",
        "status": "eq.active",
        "or": f"(end_date.is.null,end_date.gt.{now_iso})",
        "order": "start_date.desc",
        "limit": "1",
    }

    response = requests.get(endpoint, headers=get_headers(), params=params, timeout=5)
    if response.status_code >= 400:
        raise ScannerError(f"Membership query failed: {response.text}")

    data = response.json()
    return len(data) > 0


def has_open_entry(user_id: str) -> bool:
    endpoint = f"{SUPABASE_URL}/rest/v1/entries"
    params = {
        "select": "id",
        "user_id": f"eq.{user_id}",
        "check_out": "is.null",
        "is_valid": "eq.true",
        "limit": "1",
    }

    response = requests.get(endpoint, headers=get_headers(), params=params, timeout=5)
    if response.status_code >= 400:
        raise ScannerError(f"Entries query failed: {response.text}")

    return len(response.json()) > 0


def insert_entry(user_id: str) -> None:
    endpoint = f"{SUPABASE_URL}/rest/v1/entries"
    payload = {
        "user_id": user_id,
        "check_in": datetime.now(timezone.utc).isoformat(),
        "is_valid": True,
    }

    response = requests.post(
        endpoint,
        headers={**get_headers(), "Prefer": "return=minimal"},
        json=payload,
        timeout=5,
    )

    if response.status_code >= 400:
        raise ScannerError(f"Insert entry failed: {response.text}")


def get_profile(user_id: str) -> dict[str, Any]:
    endpoint = f"{SUPABASE_URL}/rest/v1/profiles"
    params = {
        "select": "full_name,avatar_url",
        "id": f"eq.{user_id}",
        "limit": "1",
    }

    response = requests.get(endpoint, headers=get_headers(), params=params, timeout=5)
    if response.status_code >= 400:
        raise ScannerError(f"Profile query failed: {response.text}")

    rows = response.json()
    return rows[0] if rows else {"full_name": "Unknown", "avatar_url": None}


def fetch_avatar_image(avatar_url: str | None) -> np.ndarray | None:
    if not avatar_url:
        return None

    try:
        response = requests.get(avatar_url, timeout=4)
        if response.status_code >= 400:
            return None

        image_data = np.frombuffer(response.content, dtype=np.uint8)
        image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
        if image is None:
            return None

        return cv2.resize(image, (120, 120))
    except Exception:
        return None


def draw_status(frame: np.ndarray, message: str, is_success: bool) -> None:
    color = (0, 200, 0) if is_success else (0, 0, 255)
    cv2.rectangle(frame, (20, 20), (780, 80), (20, 20, 20), -1)
    cv2.putText(frame, message, (30, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2, cv2.LINE_AA)


def draw_avatar(frame: np.ndarray, avatar: np.ndarray | None, name: str) -> None:
    cv2.rectangle(frame, (20, 100), (260, 250), (20, 20, 20), -1)
    if avatar is not None:
        frame[115:235, 30:150] = avatar

    cv2.putText(frame, name[:18], (160, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, "ENTRY LOGGED", (160, 210), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 200, 0), 2, cv2.LINE_AA)


def main() -> None:
    require_env()
    cap = open_camera()

    detector = cv2.QRCodeDetector()
    last_scan_at = 0.0
    last_status = "Waiting for QR code..."
    last_success = False
    status_until = 0.0
    last_avatar = None
    last_name = ""

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            now = time.time()

            value, points, _ = detector.detectAndDecode(frame)
            if points is not None and len(points) > 0:
                pts = points.astype(int).reshape(-1, 2)
                for i in range(len(pts)):
                    cv2.line(frame, tuple(pts[i]), tuple(pts[(i + 1) % len(pts)]), (255, 255, 0), 2)

            if value and now - last_scan_at >= SCAN_COOLDOWN_SECONDS:
                last_scan_at = now
                try:
                    payload = verify_qr_token(value)
                    user_id = str(payload["sub"])

                    expire_overdue_memberships(user_id)
                    if not get_active_membership(user_id):
                        raise ScannerError("Membership is not active")

                    if has_open_entry(user_id):
                        raise ScannerError("User already checked in")

                    insert_entry(user_id)

                    profile = get_profile(user_id)
                    last_avatar = fetch_avatar_image(profile.get("avatar_url"))
                    last_name = str(profile.get("full_name") or "Unknown")

                    last_status = "Successful"
                    last_success = True
                    status_until = now + STATUS_SHOW_SECONDS
                except Exception as exc:
                    last_status = f"Denied: {str(exc)}"
                    last_success = False
                    status_until = now + STATUS_SHOW_SECONDS

            if now <= status_until:
                draw_status(frame, last_status, last_success)
                if last_success:
                    draw_avatar(frame, last_avatar, last_name)
            else:
                draw_status(frame, "Waiting for QR code...", False)

            cv2.putText(
                frame,
                "Press Q to quit",
                (20, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (200, 200, 200),
                2,
                cv2.LINE_AA,
            )

            cv2.imshow("Tap-it QR Entry Scanner", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
