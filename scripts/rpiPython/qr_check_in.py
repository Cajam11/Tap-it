import base64
import hashlib
import hmac
import json
import os
import sys
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


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent  # scripts/rpiPython -> scripts -> repo root
load_env_file(SCRIPT_DIR / ".env.local")
load_env_file(SCRIPT_DIR / ".env")
load_env_file(PROJECT_ROOT / ".env.local")
load_env_file(PROJECT_ROOT / ".env")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
QR_TOKEN_SECRET = os.getenv("QR_TOKEN_SECRET", "")

SCAN_COOLDOWN_SECONDS = 2
STATUS_SHOW_SECONDS = 3


class ScannerError(Exception):
    pass


def is_raspberry_pi() -> bool:
    try:
        return "Raspberry Pi" in Path("/proc/device-tree/model").read_text()
    except OSError:
        return False


class PiCamera2Capture:
    """Wraps picamera2 to mimic the cv2.VideoCapture interface."""

    def __init__(self, picam2: Any, rotation: int = 0) -> None:
        self._picam2 = picam2
        self._rotation = rotation

    def read(self) -> tuple[bool, np.ndarray | None]:
        try:
            frame = self._picam2.capture_array()            # RGB888
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)  # → BGR for OpenCV
            if self._rotation == 180:
                frame = cv2.rotate(frame, cv2.ROTATE_180)
            elif self._rotation == 90:
                frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            elif self._rotation == 270:
                frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)
            return True, frame
        except Exception:
            return False, None

    def release(self) -> None:
        try:
            self._picam2.stop()
            self._picam2.close()
        except Exception:
            pass

    def isOpened(self) -> bool:
        return True


def _import_picamera2() -> Any:
    """Import Picamera2, falling back to the system site-packages when needed.

    On Raspberry Pi OS, picamera2 is typically installed via apt and lives in
    /usr/lib/python3/dist-packages — outside a plain venv.  We try the normal
    import first, then add the system path as a fallback.
    """
    try:
        from picamera2 import Picamera2  # type: ignore[import] # noqa: PLC0415
        return Picamera2
    except ImportError:
        pass

    _SYSTEM_SITE = "/usr/lib/python3/dist-packages"
    if _SYSTEM_SITE not in sys.path:
        sys.path.insert(0, _SYSTEM_SITE)

    try:
        from picamera2 import Picamera2  # type: ignore[import] # noqa: PLC0415
        return Picamera2
    except ImportError:
        raise ScannerError(
            "picamera2 not found. Install it with: sudo apt install python3-picamera2"
        )


def _open_picamera2() -> PiCamera2Capture:
    Picamera2 = _import_picamera2()
    cam_info = Picamera2.global_camera_info()
    rotation = cam_info[0].get("Rotation", 0) if cam_info else 0
    picam2 = Picamera2()
    config = picam2.create_preview_configuration(
        main={"format": "RGB888", "size": (1280, 720)}
    )
    picam2.configure(config)
    picam2.start()
    time.sleep(0.5)  # allow sensor to warm up
    print(f"Using picamera2 (rotation={rotation}°)")
    return PiCamera2Capture(picam2, rotation)


def open_camera() -> cv2.VideoCapture | PiCamera2Capture:
    preferred_index_raw = os.getenv("SCANNER_CAMERA_INDEX", "").strip()
    preferred_index: int | None = None
    if preferred_index_raw:
        try:
            preferred_index = int(preferred_index_raw)
        except ValueError as exc:
            raise ScannerError("SCANNER_CAMERA_INDEX must be an integer") from exc

    on_pi = is_raspberry_pi()

    if on_pi and preferred_index is None:
        try:
            return _open_picamera2()
        except Exception as exc:
            print(f"picamera2 unavailable ({exc}), falling back to V4L2 …")

    indexes = list(range(0, 6))
    if preferred_index is not None:
        indexes = [preferred_index] + [idx for idx in indexes if idx != preferred_index]

    if sys.platform == "win32":
        backends: list[tuple[str, int | None]] = [
            ("CAP_DSHOW", cv2.CAP_DSHOW),
            ("CAP_MSMF", cv2.CAP_MSMF),
            ("DEFAULT", None),
        ]
    elif sys.platform.startswith("linux"):
        backends = [
            ("CAP_V4L2", cv2.CAP_V4L2),
            ("DEFAULT", None),
        ]
    else:  # macOS and others
        backends = [("DEFAULT", None)]

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
        "Cannot open camera."
        + (
            " On Raspberry Pi, ensure the camera ribbon is connected and"
            " python3-picamera2 is installed (sudo apt install python3-picamera2)."
            if on_pi
            else ""
        )
        + " Optionally set SCANNER_CAMERA_INDEX in .env.local."
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


def get_active_membership(user_id: str) -> dict[str, Any] | None:
    endpoint = f"{SUPABASE_URL}/rest/v1/user_memberships"
    now_iso = datetime.now(timezone.utc).isoformat()

    params = {
        "select": "id,end_date,status,entries_remaining,membership:memberships(billing_cycle)",
        "user_id": f"eq.{user_id}",
        "status": "eq.active",
        "or": f"(end_date.is.null,end_date.gt.{now_iso})",
        "order": "start_date.desc",
        "limit": "1",
    }

    response = requests.get(endpoint, headers=get_headers(), params=params, timeout=5)
    if response.status_code >= 400:
        raise ScannerError(f"Membership query failed: {response.text}")

    rows = response.json()
    return rows[0] if rows else None


def ensure_user_verified(user_id: str) -> None:
    endpoint = f"{SUPABASE_URL}/rest/v1/profiles"
    params = {
        "select": "is_verified",
        "id": f"eq.{user_id}",
        "limit": "1",
    }

    response = requests.get(endpoint, headers=get_headers(), params=params, timeout=5)
    if response.status_code >= 400:
        raise ScannerError(f"Profile verification query failed: {response.text}")

    rows = response.json()
    if not rows or rows[0].get("is_verified") is not True:
        raise ScannerError("User is not verified")


def check_in_with_membership(user_id: str) -> dict[str, Any]:
    endpoint = f"{SUPABASE_URL}/rest/v1/rpc/check_in_with_membership"
    payload = {"p_user_id": user_id}

    response = requests.post(endpoint, headers=get_headers(), json=payload, timeout=5)
    if response.status_code >= 400:
        raise ScannerError(f"Check-in RPC failed: {response.text}")

    data = response.json()
    return data if isinstance(data, dict) else {}


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


def draw_panel(
    frame: np.ndarray,
    message: str,
    is_success: bool,
    avatar: np.ndarray | None,
    name: str,
    detail: str,
) -> None:
    panel_color = (22, 22, 22)
    status_color = (0, 200, 0) if is_success else (0, 0, 255)

    cv2.rectangle(frame, (12, 12), (frame.shape[1] - 12, 90), panel_color, -1)
    cv2.putText(frame, "CHECK-IN", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (220, 220, 220), 2, cv2.LINE_AA)
    cv2.putText(frame, message[:38], (20, 72), cv2.FONT_HERSHEY_SIMPLEX, 0.65, status_color, 2, cv2.LINE_AA)

    cv2.rectangle(frame, (12, 100), (260, 255), panel_color, -1)
    if avatar is not None:
        frame[115:235, 24:144] = avatar

    if name:
        cv2.putText(frame, name[:18], (154, 172), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (240, 240, 240), 2, cv2.LINE_AA)
    if detail:
        cv2.putText(frame, detail[:18], (154, 206), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (130, 230, 130), 2, cv2.LINE_AA)


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
    last_scan_at = 0.0
    state = make_state("Ready for check-in")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            now = time.time()
            frame_h, frame_w = frame.shape[:2]

            cv2.putText(frame, "CHECK-IN", (20, frame_h - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (90, 240, 90), 2, cv2.LINE_AA)

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

                    ensure_user_verified(user_id)
                    expire_overdue_memberships(user_id)
                    active_membership = get_active_membership(user_id)
                    if not active_membership:
                        raise ScannerError("Membership is not active")

                    if has_open_entry(user_id):
                        raise ScannerError("User already checked in")

                    result = check_in_with_membership(user_id)

                    profile = get_profile(user_id)
                    state["avatar"] = fetch_avatar_image(profile.get("avatar_url"))
                    state["name"] = str(profile.get("full_name") or "Unknown")
                    state["message"] = "Successful"
                    state["is_success"] = True
                    remaining = result.get("remaining")
                    state["detail"] = f"Remaining: {remaining}" if remaining is not None else "Check-in"
                    state["until"] = now + STATUS_SHOW_SECONDS
                except Exception as exc:
                    state["message"] = f"Denied: {str(exc)}"
                    state["is_success"] = False
                    state["detail"] = ""
                    state["until"] = now + STATUS_SHOW_SECONDS

            if now > state["until"] and state["message"] != "Ready for check-in":
                state = make_state("Ready for check-in")

            draw_panel(
                frame,
                state["message"],
                bool(state["is_success"]),
                state["avatar"],
                str(state["name"]),
                str(state["detail"]),
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

            cv2.imshow("Tap-it Check-In Scanner", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
