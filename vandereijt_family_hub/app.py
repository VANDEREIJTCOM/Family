import base64
import json
import mimetypes
import os
import shutil
import time
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

PORT = 8099
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path("/data")
HA_CONFIG = Path("/homeassistant")
WWW_DIR = HA_CONFIG / "www" / "family-hub"
SETTINGS_FILE = DATA_DIR / "settings.json"
PUBLIC_SETTINGS = WWW_DIR / "settings.json"
CARD_SOURCE = BASE_DIR / "family-hub-card.js"
CARD_TARGET = WWW_DIR / "family-hub-card.js"
LEGACY_CARD_TARGET = HA_CONFIG / "www" / "family-hub-card.js"
STATIC_DIR = BASE_DIR / "static"
SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")

DEFAULTS = {
    "version": 1,
    "title": "Familie",
    "subtitle": "",
    "weather": "",
    "shopping_list": "",
    "show_household_status": True,
    "refresh_interval": 300,
    "max_tasks_per_member": 4,
    "background_url": "",
    "background_overlay": 82,
    "accent_color": "#2E6CA5",
    "members": [],
}


def ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    WWW_DIR.mkdir(parents=True, exist_ok=True)
    if CARD_SOURCE.exists():
        shutil.copy2(CARD_SOURCE, CARD_TARGET)
        if LEGACY_CARD_TARGET.exists():
            shutil.copy2(CARD_SOURCE, LEGACY_CARD_TARGET)


def normalize_settings(data):
    out = dict(DEFAULTS)
    if isinstance(data, dict):
        for key in DEFAULTS:
            if key in data:
                out[key] = data[key]
    members = []
    for idx, member in enumerate(out.get("members") or []):
        if not isinstance(member, dict):
            continue
        name = str(member.get("name", "")).strip()
        if not name:
            continue
        members.append({
            "id": str(member.get("id") or f"member_{idx+1}"),
            "name": name[:40],
            "color": str(member.get("color") or "#607d8b")[:20],
            "icon": str(member.get("icon") or "mdi:account")[:80],
            "calendar": str(member.get("calendar") or "")[:160],
            "todo": str(member.get("todo") or "")[:160],
            "person": str(member.get("person") or "")[:160],
        })
    out["members"] = members[:12]
    out["title"] = str(out.get("title") or "Familie")[:80]
    out["subtitle"] = str(out.get("subtitle") or "")[:120]
    out["weather"] = str(out.get("weather") or "")[:160]
    out["shopping_list"] = str(out.get("shopping_list") or "")[:160]
    out["accent_color"] = str(out.get("accent_color") or "#2E6CA5")[:20]
    if out["accent_color"].lower() == "#08a5c8":
        out["accent_color"] = "#2E6CA5"
    try:
        out["background_overlay"] = max(0, min(100, int(out.get("background_overlay", 82))))
    except (TypeError, ValueError):
        out["background_overlay"] = 82
    try:
        out["refresh_interval"] = max(60, min(3600, int(out.get("refresh_interval", 300))))
    except (TypeError, ValueError):
        out["refresh_interval"] = 300
    try:
        out["max_tasks_per_member"] = max(1, min(12, int(out.get("max_tasks_per_member", 4))))
    except (TypeError, ValueError):
        out["max_tasks_per_member"] = 4
    out["show_household_status"] = bool(out.get("show_household_status", True))
    out["version"] = 1
    return out


def load_settings():
    if SETTINGS_FILE.exists():
        try:
            return normalize_settings(json.loads(SETTINGS_FILE.read_text(encoding="utf-8")))
        except Exception as exc:
            print(f"[Family Hub] Could not read settings: {exc}", flush=True)
    return dict(DEFAULTS)


def publish_settings(settings):
    payload = dict(settings)
    tmp = PUBLIC_SETTINGS.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(PUBLIC_SETTINGS)


def save_settings(settings):
    settings = normalize_settings(settings)
    tmp = SETTINGS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(SETTINGS_FILE)
    publish_settings(settings)
    return settings


def ha_states():
    if not SUPERVISOR_TOKEN:
        return []
    req = urllib.request.Request(
        "http://supervisor/core/api/states",
        headers={
            "Authorization": f"Bearer {SUPERVISOR_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        print(f"[Family Hub] Home Assistant API error: {exc}", flush=True)
        return []


def grouped_entities():
    wanted = {"calendar", "todo", "person", "weather"}
    result = {domain: [] for domain in wanted}
    for state in ha_states():
        entity_id = state.get("entity_id", "")
        domain = entity_id.split(".", 1)[0] if "." in entity_id else ""
        if domain not in wanted:
            continue
        attrs = state.get("attributes") or {}
        result[domain].append({
            "entity_id": entity_id,
            "name": attrs.get("friendly_name") or entity_id,
            "state": state.get("state", ""),
        })
    for domain in wanted:
        result[domain].sort(key=lambda x: str(x["name"]).lower())
    return result


def save_background(data_url):
    if not data_url:
        for path in WWW_DIR.glob("background.*"):
            try:
                path.unlink()
            except OSError:
                pass
        return ""
    if not isinstance(data_url, str) or not data_url.startswith("data:image/"):
        raise ValueError("Ongeldige afbeelding")
    header, encoded = data_url.split(",", 1)
    mime = header.split(";", 1)[0].split(":", 1)[1].lower()
    exts = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }
    ext = exts.get(mime)
    if not ext:
        raise ValueError("Gebruik JPG, PNG of WebP")
    raw = base64.b64decode(encoded, validate=True)
    if len(raw) > 12 * 1024 * 1024:
        raise ValueError("Afbeelding is groter dan 12 MB")
    for path in WWW_DIR.glob("background.*"):
        try:
            path.unlink()
        except OSError:
            pass
    path = WWW_DIR / f"background.{ext}"
    path.write_bytes(raw)
    return f"/local/family-hub/background.{ext}?v={int(time.time())}"


class Handler(BaseHTTPRequestHandler):
    server_version = "VANDEREIJT.COM-Family-Hub/0.4.0"

    def log_message(self, fmt, *args):
        print("[Family Hub] " + fmt % args, flush=True)

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path, content_type=None):
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        raw = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path == "/":
            return self._file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
        if path == "/api/settings":
            return self._json(HTTPStatus.OK, {"ok": True, "settings": load_settings()})
        if path == "/api/entities":
            return self._json(HTTPStatus.OK, {"ok": True, "entities": grouped_entities()})
        if path == "/api/status":
            return self._json(HTTPStatus.OK, {
                "ok": True,
                "version": "0.4.0",
                "card_installed": CARD_TARGET.exists(),
                "legacy_card_updated": LEGACY_CARD_TARGET.exists(),
                "settings_published": PUBLIC_SETTINGS.exists(),
                "homeassistant_api": bool(SUPERVISOR_TOKEN),
                "card_resource": "/local/family-hub/family-hub-card.js",
                "settings_url": "/local/family-hub/settings.json",
            })
        if path.startswith("/static/"):
            rel = path[len("/static/"):]
            if ".." in rel or rel.startswith("/"):
                return self.send_error(HTTPStatus.BAD_REQUEST)
            return self._file(STATIC_DIR / rel)
        self.send_error(HTTPStatus.NOT_FOUND)

    def _read_request_body(self, max_bytes=16 * 1024 * 1024):
        transfer_encoding = self.headers.get("Transfer-Encoding", "").lower()
        content_length = self.headers.get("Content-Length")

        if "chunked" in transfer_encoding:
            body = bytearray()
            while True:
                size_line = self.rfile.readline(128)
                if not size_line:
                    raise ValueError("Onvolledige chunked request")
                size_text = size_line.strip().split(b";", 1)[0]
                try:
                    size = int(size_text, 16)
                except ValueError as exc:
                    raise ValueError("Ongeldige chunkgrootte") from exc
                if size == 0:
                    while True:
                        trailer = self.rfile.readline(8192)
                        if trailer in (b"\r\n", b"\n", b""):
                            break
                    break
                if len(body) + size > max_bytes:
                    raise OverflowError("Verzoek te groot")
                chunk = self.rfile.read(size)
                if len(chunk) != size:
                    raise ValueError("Onvolledige chunk")
                body.extend(chunk)
                ending = self.rfile.read(2)
                if ending not in (b"\r\n", b"\n"):
                    raise ValueError("Ongeldige chunkafsluiting")
            return bytes(body)

        if content_length is None:
            raise ValueError("Request bevat geen Content-Length of chunked encoding")
        try:
            length = int(content_length)
        except ValueError as exc:
            raise ValueError("Ongeldige Content-Length") from exc
        if length > max_bytes:
            raise OverflowError("Verzoek te groot")
        if length < 0:
            raise ValueError("Ongeldige Content-Length")
        return self.rfile.read(length)

    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        try:
            raw_body = self._read_request_body()
        except OverflowError:
            return self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "Verzoek te groot"})
        except Exception as exc:
            print(f"[Family Hub] POST body error: {exc}; headers={dict(self.headers)}", flush=True)
            return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

        if not raw_body:
            return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Lege request ontvangen; instellingen zijn niet opgeslagen"})
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception as exc:
            print(f"[Family Hub] JSON error: {exc}; bytes={len(raw_body)}", flush=True)
            return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Ongeldige JSON"})

        if path == "/api/settings":
            try:
                settings = payload.get("settings", payload)
                current = load_settings()
                if "background_data" in payload:
                    settings = dict(settings)
                    settings["background_url"] = save_background(payload.get("background_data"))
                elif "background_url" not in settings:
                    settings = dict(settings)
                    settings["background_url"] = current.get("background_url", "")
                incoming_members = settings.get("members", []) if isinstance(settings, dict) else []
                settings = save_settings(settings)
                persisted = load_settings()
                if len(persisted.get("members", [])) != len(settings.get("members", [])):
                    raise RuntimeError("Controle na opslaan mislukt: gezinsleden niet correct bewaard")
                print(
                    f"[Family Hub] Settings saved: received_members={len(incoming_members) if isinstance(incoming_members, list) else 'invalid'} persisted_members={len(persisted.get('members', []))}",
                    flush=True,
                )
                return self._json(HTTPStatus.OK, {"ok": True, "settings": persisted, "saved_members": len(persisted.get("members", []))})
            except Exception as exc:
                return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

        if path == "/api/background/remove":
            try:
                current = load_settings()
                current["background_url"] = save_background("")
                current = save_settings(current)
                return self._json(HTTPStatus.OK, {"ok": True, "settings": current})
            except Exception as exc:
                return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

        self.send_error(HTTPStatus.NOT_FOUND)


def main():
    ensure_dirs()
    current = load_settings()
    save_settings(current)
    print(f"[Family Hub] v0.4.0 listening on {PORT}", flush=True)
    print(f"[Family Hub] Card: {CARD_TARGET}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
