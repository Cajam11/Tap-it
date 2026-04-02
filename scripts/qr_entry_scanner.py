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


def get_open_entry(user_id: str) -> dict[str, Any] | None:
    endpoint = f"{SUPABASE_URL}/rest/v1/entries"
    params = {
        "select": "id,check_in",
        "user_id": f"eq.{user_id}",
        "check_out": "is.null",
        "is_valid": "eq.true",
        "order": "check_in.desc",
        "limit": "1",
    }

    response = requests.get(endpoint, headers=get_headers(), params=params, timeout=5)
    if response.status_code >= 400:
        raise ScannerError(f"Entries query failed: {response.text}")

    rows = response.json()
    return rows[0] if rows else None


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


def checkout_entry(entry_id: str, check_in_iso: str) -> int:
    endpoint = f"{SUPABASE_URL}/rest/v1/entries"
    now_dt = datetime.now(timezone.utc)
    check_in_dt = datetime.fromisoformat(check_in_iso.replace("Z", "+00:00"))
    duration_minutes = max(0, int((now_dt - check_in_dt).total_seconds() // 60))

    payload = {
        "check_out": now_dt.isoformat(),
        "duration_min": duration_minutes,
    }

    params = {
        "id": f"eq.{entry_id}",
    }

    response = requests.patch(
        endpoint,
        headers={**get_headers(), "Prefer": "return=minimal"},
        params=params,
        json=payload,
        timeout=5,
    )

    if response.status_code >= 400:
        raise ScannerError(f"Checkout update failed: {response.text}")

    return duration_minutes


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


def draw_side_panel(
    frame: np.ndarray,
    x1: int,
    x2: int,
    title: str,
    message: str,
    is_success: bool,
    avatar: np.ndarray | None,
    name: str,
    detail: str,
) -> None:
    panel_color = (22, 22, 22)
    status_color = (0, 200, 0) if is_success else (0, 0, 255)

    cv2.rectangle(frame, (x1 + 12, 12), (x2 - 12, 90), panel_color, -1)
    cv2.putText(frame, title, (x1 + 20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (220, 220, 220), 2, cv2.LINE_AA)
    cv2.putText(frame, message[:38], (x1 + 20, 72), cv2.FONT_HERSHEY_SIMPLEX, 0.65, status_color, 2, cv2.LINE_AA)

    cv2.rectangle(frame, (x1 + 12, 100), (x1 + 260, 255), panel_color, -1)
    if avatar is not None:
        frame[115:235, x1 + 24:x1 + 144] = avatar

    if name:
        cv2.putText(frame, name[:18], (x1 + 154, 172), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (240, 240, 240), 2, cv2.LINE_AA)
    if detail:
        cv2.putText(frame, detail[:18], (x1 + 154, 206), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (130, 230, 130), 2, cv2.LINE_AA)


def make_state(message: str, is_success: bool = False, ttl: float = 0.0) -> dict[str, Any]:
    return {
        "message": message,
        "is_success": is_success,
        "until": ttl,
        "avatar": None,
        "name": "",
        "detail": "",
    }


def main() -> None:
    require_env()
    cap = open_camera()

    detector = cv2.QRCodeDetector()
    last_scan_at_left = 0.0
    last_scan_at_right = 0.0
    left_state = make_state("Ready for check-in")
    right_state = make_state("Ready for check-out")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            now = time.time()
            frame_h, frame_w = frame.shape[:2]
            mid_x = frame_w // 2

            cv2.line(frame, (mid_x, 0), (mid_x, frame_h), (160, 160, 160), 2)
            cv2.putText(frame, "CHECK-IN", (20, frame_h - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (90, 240, 90), 2, cv2.LINE_AA)
            cv2.putText(frame, "CHECK-OUT", (mid_x + 20, frame_h - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (90, 180, 255), 2, cv2.LINE_AA)

            value, points, _ = detector.detectAndDecode(frame)
            side = None
            if points is not None and len(points) > 0:
                pts = points.astype(int).reshape(-1, 2)
                for i in range(len(pts)):
                    cv2.line(frame, tuple(pts[i]), tuple(pts[(i + 1) % len(pts)]), (255, 255, 0), 2)

                center_x = int(np.mean(pts[:, 0]))
                side = "left" if center_x < mid_x else "right"

            if value and side == "left" and now - last_scan_at_left >= SCAN_COOLDOWN_SECONDS:
                last_scan_at_left = now
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
                    left_state["avatar"] = fetch_avatar_image(profile.get("avatar_url"))
                    left_state["name"] = str(profile.get("full_name") or "Unknown")
                    left_state["message"] = "Successful"
                    left_state["is_success"] = True
                    left_state["detail"] = "Check-in"
                    left_state["until"] = now + STATUS_SHOW_SECONDS
                except Exception as exc:
                    left_state["message"] = f"Denied: {str(exc)}"
                    left_state["is_success"] = False
                    left_state["detail"] = ""
                    left_state["until"] = now + STATUS_SHOW_SECONDS

            if value and side == "right" and now - last_scan_at_right >= SCAN_COOLDOWN_SECONDS:
                last_scan_at_right = now
                try:
                    payload = verify_qr_token(value)
                    user_id = str(payload["sub"])

                    open_entry = get_open_entry(user_id)
                    if not open_entry:
                        raise ScannerError("No open check-in found")

                    duration_minutes = checkout_entry(str(open_entry["id"]), str(open_entry["check_in"]))
                    profile = get_profile(user_id)

                    right_state["avatar"] = fetch_avatar_image(profile.get("avatar_url"))
                    right_state["name"] = str(profile.get("full_name") or "Unknown")
                    right_state["message"] = "Successful"
                    right_state["is_success"] = True
                    right_state["detail"] = f"{duration_minutes} min"
                    right_state["until"] = now + STATUS_SHOW_SECONDS
                except Exception as exc:
                    right_state["message"] = f"Denied: {str(exc)}"
                    right_state["is_success"] = False
                    right_state["detail"] = ""
                    right_state["until"] = now + STATUS_SHOW_SECONDS

            if now > left_state["until"] and left_state["message"] != "Ready for check-in":
                left_state = make_state("Ready for check-in")

            if now > right_state["until"] and right_state["message"] != "Ready for check-out":
                right_state = make_state("Ready for check-out")

            draw_side_panel(
                frame,
                0,
                mid_x,
                "LEFT - CHECK IN",
                left_state["message"],
                bool(left_state["is_success"]),
                left_state["avatar"],
                str(left_state["name"]),
                str(left_state["detail"]),
            )

            draw_side_panel(
                frame,
                mid_x,
                frame_w,
                "RIGHT - CHECK OUT",
                right_state["message"],
                bool(right_state["is_success"]),
                right_state["avatar"],
                str(right_state["name"]),
                str(right_state["detail"]),
            )

            cv2.putText(
                frame,
                "Press Q to quit",
                (20, frame_h - 54),
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
