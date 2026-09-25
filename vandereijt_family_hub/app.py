import base64
import json
import mimetypes
import os
import re
import shutil
import threading
import time
import urllib.error
import urllib.request

import websocket
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

PORT = 8099
APP_VERSION = "0.6.2"
HA_WS_URL = "ws://supervisor/core/websocket"
DASHBOARD_URL_PATH = "family-hub"
DASHBOARD_VIEW_PATH = "family"
CARD_RESOURCE_BASE = "/local/family-hub/family-hub-card.js"
CARD_RESOURCE_URL = f"{CARD_RESOURCE_BASE}?v={APP_VERSION}"
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
RUNTIME_FILE = DATA_DIR / "runtime.json"
SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")

DEFAULT_NAVIGATION = [
    {"id": "home", "label": "Vandaag", "icon": "mdi:home", "enabled": True},
    {"id": "calendar", "label": "Agenda", "icon": "mdi:calendar-month", "enabled": True},
    {"id": "tasks", "label": "Taken", "icon": "mdi:check-circle-outline", "enabled": True},
    {"id": "routines", "label": "Routines", "icon": "mdi:progress-check", "enabled": True},
    {"id": "lists", "label": "Lijsten", "icon": "mdi:format-list-checks", "enabled": True},
    {"id": "meals", "label": "Eten", "icon": "mdi:silverware-fork-knife", "enabled": True},
    {"id": "rewards", "label": "Punten", "icon": "mdi:star-circle", "enabled": True},
    {"id": "profiles", "label": "Gezin", "icon": "mdi:account-group", "enabled": True},
    {"id": "house", "label": "Huis", "icon": "mdi:home-automation", "enabled": True},
]

DEFAULT_HOME_SECTIONS = [
    "departures",
    "today",
    "tasks",
    "routines",
    "meals",
    "notifications",
    "house_status",
]

DEFAULTS = {
    "version": 2,
    "title": "Familie",
    "subtitle": "",
    "weather": "",
    "shopping_list": "",
    "meals_todo": "",
    "show_household_status": True,
    "refresh_interval": 120,
    "max_tasks_per_member": 4,
    "background_url": "",
    "background_overlay": 82,
    "accent_color": "#2E6CA5",
    "dashboard_managed": False,
    "dashboard_show_sidebar": True,
    "dashboard_title": "Family Hub",
    "idle_minutes": 5,
    "idle_show_clock": True,
    "members": [],
    "navigation": DEFAULT_NAVIGATION,
    "home_sections": DEFAULT_HOME_SECTIONS,
    "routines": [],
    "smart_tasks": [],
    "rewards": [],
    "lists": [],
    "departure_rules": [],
    "home_entities": [],
    "notification_entities": [],
    "photos": [],
}



def ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    WWW_DIR.mkdir(parents=True, exist_ok=True)
    if CARD_SOURCE.exists():
        shutil.copy2(CARD_SOURCE, CARD_TARGET)
        if LEGACY_CARD_TARGET.exists():
            shutil.copy2(CARD_SOURCE, LEGACY_CARD_TARGET)


def _clean_id(value, fallback):
    value = re.sub(r"[^a-zA-Z0-9_-]+", "_", str(value or "")).strip("_")
    return (value or fallback)[:80]


def normalize_settings(data):
    src = data if isinstance(data, dict) else {}
    out = dict(DEFAULTS)
    for key in DEFAULTS:
        if key in src:
            out[key] = src[key]

    members = []
    for idx, member in enumerate(src.get("members") or []):
        if not isinstance(member, dict):
            continue
        name = str(member.get("name") or "").strip()
        if not name:
            continue
        members.append({
            "id": _clean_id(member.get("id"), f"member_{idx+1}"),
            "name": name[:40],
            "color": str(member.get("color") or "#607d8b")[:20],
            "icon": str(member.get("icon") or "mdi:account")[:80],
            "calendar": str(member.get("calendar") or "")[:160],
            "todo": str(member.get("todo") or "")[:160],
            "person": str(member.get("person") or "")[:160],
            "points_entity": str(member.get("points_entity") or "")[:160],
            "role": "child" if str(member.get("role") or "").lower() == "child" else "adult",
        })
    out["members"] = members[:16]

    nav_by_id = {item["id"]: dict(item) for item in DEFAULT_NAVIGATION}
    navigation = []
    seen = set()
    for item in src.get("navigation") or DEFAULT_NAVIGATION:
        if not isinstance(item, dict):
            continue
        nav_id = str(item.get("id") or "")
        if nav_id not in nav_by_id or nav_id in seen:
            continue
        base = nav_by_id[nav_id]
        base["label"] = str(item.get("label") or base["label"])[:24]
        base["icon"] = str(item.get("icon") or base["icon"])[:80]
        base["enabled"] = bool(item.get("enabled", True))
        navigation.append(base)
        seen.add(nav_id)
    for item in DEFAULT_NAVIGATION:
        if item["id"] not in seen:
            navigation.append(dict(item))
    out["navigation"] = navigation

    valid_sections = set(DEFAULT_HOME_SECTIONS)
    home_sections = []
    section_source = src.get("home_sections") if "home_sections" in src else DEFAULT_HOME_SECTIONS
    for section in section_source or []:
        if section in valid_sections and section not in home_sections:
            home_sections.append(section)
    out["home_sections"] = home_sections

    routines = []
    for idx, routine in enumerate(src.get("routines") or []):
        if not isinstance(routine, dict):
            continue
        title = str(routine.get("title") or "").strip()
        if not title:
            continue
        steps = []
        for step_idx, step in enumerate(routine.get("steps") or []):
            if isinstance(step, str):
                step = {"title": step}
            if not isinstance(step, dict):
                continue
            step_title = str(step.get("title") or "").strip()
            if not step_title:
                continue
            steps.append({
                "id": _clean_id(step.get("id"), f"step_{step_idx+1}"),
                "title": step_title[:80],
                "icon": str(step.get("icon") or "mdi:check-circle-outline")[:80],
                "points": max(0, min(100, int(step.get("points") or 0))),
            })
        routines.append({
            "id": _clean_id(routine.get("id"), f"routine_{idx+1}"),
            "title": title[:80],
            "member_id": str(routine.get("member_id") or "")[:80],
            "icon": str(routine.get("icon") or "mdi:progress-check")[:80],
            "days": [int(x) for x in (routine.get("days") or [0,1,2,3,4,5,6]) if str(x).isdigit() and 0 <= int(x) <= 6],
            "time": str(routine.get("time") or "07:00")[:5],
            "todo_entity": str(routine.get("todo_entity") or "")[:160],
            "steps": steps[:20],
        })
    out["routines"] = routines[:40]

    smart_tasks = []
    for idx, task in enumerate(src.get("smart_tasks") or []):
        if not isinstance(task, dict):
            continue
        title = str(task.get("title") or "").strip()
        if not title:
            continue
        smart_tasks.append({
            "id": _clean_id(task.get("id"), f"task_{idx+1}"),
            "title": title[:100],
            "member_id": str(task.get("member_id") or "")[:80],
            "icon": str(task.get("icon") or "mdi:checkbox-marked-circle-outline")[:80],
            "points": max(0, min(500, int(task.get("points") or 0))),
            "days": [int(x) for x in (task.get("days") or [0,1,2,3,4,5,6]) if str(x).isdigit() and 0 <= int(x) <= 6],
            "due_time": str(task.get("due_time") or "")[:5],
            "enabled": bool(task.get("enabled", True)),
        })
    out["smart_tasks"] = smart_tasks[:100]

    rewards = []
    for idx, reward in enumerate(src.get("rewards") or []):
        if not isinstance(reward, dict):
            continue
        title = str(reward.get("title") or "").strip()
        if not title:
            continue
        rewards.append({
            "id": _clean_id(reward.get("id"), f"reward_{idx+1}"),
            "title": title[:100],
            "cost": max(1, min(100000, int(reward.get("cost") or 1))),
            "icon": str(reward.get("icon") or "mdi:gift")[:80],
            "member_id": str(reward.get("member_id") or "")[:80],
        })
    out["rewards"] = rewards[:100]

    lists = []
    for idx, item in enumerate(src.get("lists") or []):
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        lists.append({
            "id": _clean_id(item.get("id"), f"list_{idx+1}"),
            "title": title[:80],
            "icon": str(item.get("icon") or "mdi:format-list-checks")[:80],
            "color": str(item.get("color") or "#2E6CA5")[:20],
            "todo_entity": str(item.get("todo_entity") or "")[:160],
        })
    out["lists"] = lists[:30]

    rules = []
    for idx, rule in enumerate(src.get("departure_rules") or []):
        if not isinstance(rule, dict):
            continue
        match = str(rule.get("match") or "").strip()
        if not match:
            continue
        checklist = [str(x).strip()[:80] for x in (rule.get("checklist") or []) if str(x).strip()]
        rules.append({
            "id": _clean_id(rule.get("id"), f"departure_{idx+1}"),
            "match": match[:80],
            "lead_minutes": max(0, min(360, int(rule.get("lead_minutes") or 45))),
            "checklist": checklist[:20],
            "icon": str(rule.get("icon") or "mdi:bag-personal")[:80],
        })
    out["departure_rules"] = rules[:30]

    out["home_entities"] = [str(x)[:160] for x in (src.get("home_entities") or []) if str(x).strip()][:40]
    out["notification_entities"] = [str(x)[:160] for x in (src.get("notification_entities") or []) if str(x).strip()][:40]
    out["photos"] = [str(x)[:300] for x in (src.get("photos") or []) if str(x).strip()][:50]

    out["title"] = str(src.get("title") or "Familie")[:80]
    out["subtitle"] = str(src.get("subtitle") or "")[:120]
    out["weather"] = str(src.get("weather") or "")[:160]
    out["shopping_list"] = str(src.get("shopping_list") or "")[:160]
    out["meals_todo"] = str(src.get("meals_todo") or "")[:160]
    out["accent_color"] = str(src.get("accent_color") or "#2E6CA5")[:20]
    if out["accent_color"].lower() == "#08a5c8":
        out["accent_color"] = "#2E6CA5"
    for key, default, low, high in (
        ("background_overlay", 82, 0, 100),
        ("refresh_interval", 120, 30, 3600),
        ("max_tasks_per_member", 4, 1, 20),
        ("idle_minutes", 5, 0, 120),
    ):
        try:
            out[key] = max(low, min(high, int(src.get(key, default))))
        except (TypeError, ValueError):
            out[key] = default

    out["show_household_status"] = bool(src.get("show_household_status", True))
    out["idle_show_clock"] = bool(src.get("idle_show_clock", True))
    out["dashboard_managed"] = bool(src.get("dashboard_managed", False))
    out["dashboard_show_sidebar"] = bool(src.get("dashboard_show_sidebar", True))
    out["dashboard_title"] = str(src.get("dashboard_title") or "Family Hub")[:80]
    out["version"] = 2
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
    result["all"] = []
    for state in ha_states():
        entity_id = state.get("entity_id", "")
        domain = entity_id.split(".", 1)[0] if "." in entity_id else ""
        attrs = state.get("attributes") or {}
        item = {
            "entity_id": entity_id,
            "name": attrs.get("friendly_name") or entity_id,
            "state": state.get("state", ""),
            "domain": domain,
            "unit": attrs.get("unit_of_measurement") or "",
            "icon": attrs.get("icon") or "",
        }
        if domain in wanted:
            result[domain].append(item)
        if domain not in {"automation", "script", "scene", "update", "button"}:
            result["all"].append(item)
    for key in result:
        result[key].sort(key=lambda x: str(x["name"]).lower())
    return result



def ha_api(method, path, payload=None):
    if not SUPERVISOR_TOKEN:
        raise RuntimeError("Home Assistant API token ontbreekt")
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"http://supervisor/core/api/{path.lstrip('/')}",
        data=body,
        method=method.upper(),
        headers={
            "Authorization": f"Bearer {SUPERVISOR_TOKEN}",
            "Content-Type": "application/json",
            "HA-Frontend-Base": "http://homeassistant.local",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Home Assistant API {exc.code}: {detail[:300]}") from exc


def _entity_slug(value):
    value = str(value or "").lower().strip()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def _find_member_entity(domain, name):
    expected_slug = _entity_slug(name)
    for state in ha_states():
        entity_id = str(state.get("entity_id") or "")
        if not entity_id.startswith(domain + "."):
            continue
        friendly = str((state.get("attributes") or {}).get("friendly_name") or "")
        if friendly == name or entity_id == f"{domain}.{expected_slug}":
            return entity_id
    return ""


def _wait_for_member_entity(domain, name, timeout=12):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if entity_id := _find_member_entity(domain, name):
            return entity_id
        time.sleep(0.6)
    return ""


def _create_local_config_entry(handler, data):
    flow = ha_api("POST", "config/config_entries/flow", {"handler": handler})
    if flow.get("type") == "abort":
        return flow
    flow_id = flow.get("flow_id")
    if not flow_id:
        raise RuntimeError(f"Kon {handler} configuratie niet starten")
    result = ha_api("POST", f"config/config_entries/flow/{flow_id}", data)
    if result.get("type") not in ("create_entry", "abort"):
        raise RuntimeError(
            f"Onverwacht resultaat bij {handler}: {result.get('type') or 'onbekend'}"
        )
    return result


def ensure_local_calendar(member_name):
    display_name = f"Family Hub {member_name}"
    if entity_id := _find_member_entity("calendar", display_name):
        return entity_id
    result = _create_local_config_entry(
        "local_calendar",
        {"calendar_name": display_name, "import": "create_empty"},
    )
    if result.get("type") == "abort":
        print(
            f"[Family Hub] Local calendar already exists for {member_name}: {result.get('reason')}",
            flush=True,
        )
    entity_id = _wait_for_member_entity("calendar", display_name)
    if not entity_id:
        raise RuntimeError(f"Lokale agenda voor {member_name} is aangemaakt maar de entity werd niet gevonden")
    return entity_id


def ensure_local_todo(member_name):
    display_name = f"Family Hub {member_name}"
    if entity_id := _find_member_entity("todo", display_name):
        return entity_id
    result = _create_local_config_entry(
        "local_todo",
        {"todo_list_name": display_name},
    )
    if result.get("type") == "abort":
        print(
            f"[Family Hub] Local todo already exists for {member_name}: {result.get('reason')}",
            flush=True,
        )
    entity_id = _wait_for_member_entity("todo", display_name)
    if not entity_id:
        raise RuntimeError(f"Lokale takenlijst voor {member_name} is aangemaakt maar de entity werd niet gevonden")
    return entity_id


def provision_member_lists(settings):
    """Create local HA calendar/todo entities for members that have no link."""
    settings = normalize_settings(settings)
    provisioned = []
    warnings = []

    for member in settings.get("members", []):
        name = member.get("name") or "Gezinslid"

        if not member.get("calendar"):
            try:
                member["calendar"] = ensure_local_calendar(name)
                provisioned.append({"member": name, "type": "calendar", "entity_id": member["calendar"]})
            except Exception as exc:
                warnings.append(f"Agenda {name}: {exc}")

        if not member.get("todo"):
            try:
                member["todo"] = ensure_local_todo(name)
                provisioned.append({"member": name, "type": "todo", "entity_id": member["todo"]})
            except Exception as exc:
                warnings.append(f"Taken {name}: {exc}")

    return settings, provisioned, warnings


def sync_member_lists(delay=10):
    """Provision defaults for existing members after an App upgrade/start."""
    time.sleep(delay)
    settings = load_settings()
    if not settings.get("members"):
        return
    try:
        updated, provisioned, warnings = provision_member_lists(settings)
        if provisioned:
            save_settings(updated)
            print(
                f"[Family Hub] Provisioned {len(provisioned)} member calendar/todo entities",
                flush=True,
            )
        for warning in warnings:
            print(f"[Family Hub] Provision warning: {warning}", flush=True)
    except Exception as exc:
        print(f"[Family Hub] Member list provisioning failed: {exc}", flush=True)



class HomeAssistantWebSocket:
    """Small synchronous client for the Supervisor-proxied HA WebSocket API."""

    def __init__(self):
        self.ws = None
        self.next_id = 1

    def __enter__(self):
        if not SUPERVISOR_TOKEN:
            raise RuntimeError("Home Assistant API token ontbreekt")
        self.ws = websocket.create_connection(HA_WS_URL, timeout=12)
        hello = json.loads(self.ws.recv())
        if hello.get("type") != "auth_required":
            raise RuntimeError("Onverwachte Home Assistant WebSocket-handshake")
        self.ws.send(json.dumps({"type": "auth", "access_token": SUPERVISOR_TOKEN}))
        auth = json.loads(self.ws.recv())
        if auth.get("type") != "auth_ok":
            raise RuntimeError(auth.get("message") or "Home Assistant WebSocket-authenticatie mislukt")
        return self

    def __exit__(self, exc_type, exc, tb):
        if self.ws is not None:
            try:
                self.ws.close()
            except Exception:
                pass

    def call(self, message):
        message = dict(message)
        message["id"] = self.next_id
        request_id = self.next_id
        self.next_id += 1
        self.ws.send(json.dumps(message))
        while True:
            raw = self.ws.recv()
            if not raw:
                raise RuntimeError("Home Assistant WebSocket-verbinding verbroken")
            response = json.loads(raw)
            if response.get("id") != request_id or response.get("type") != "result":
                continue
            if not response.get("success"):
                error = response.get("error") or {}
                raise RuntimeError(error.get("message") or error.get("code") or "Home Assistant API-fout")
            return response.get("result")



def load_runtime():
    if RUNTIME_FILE.exists():
        try:
            data = json.loads(RUNTIME_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}
    return {}


def save_runtime(runtime):
    tmp = RUNTIME_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(runtime, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(RUNTIME_FILE)


def _friendly_entity(domain, friendly_name):
    return _find_member_entity(domain, friendly_name)


def ensure_named_todo(display_name):
    if entity_id := _friendly_entity("todo", display_name):
        return entity_id
    result = _create_local_config_entry("local_todo", {"todo_list_name": display_name})
    if result.get("type") not in ("create_entry", "abort"):
        raise RuntimeError(f"Kon takenlijst '{display_name}' niet aanmaken")
    entity_id = _wait_for_member_entity("todo", display_name)
    if not entity_id:
        raise RuntimeError(f"Takenlijst '{display_name}' is aangemaakt maar de entity werd niet gevonden")
    return entity_id


def ensure_points_helper(member_name):
    display_name = f"Family Hub punten {member_name}"
    with HomeAssistantWebSocket() as ha:
        items = ha.call({"type": "input_number/list"}) or []
        for item in items:
            if item.get("name") == display_name:
                return f"input_number.{item.get('id')}"
        created = ha.call({
            "type": "input_number/create",
            "name": display_name,
            "icon": "mdi:star-circle",
            "initial": 0,
            "min": 0,
            "max": 100000,
            "step": 1,
            "mode": "box",
            "unit_of_measurement": "punten",
        }) or {}
        helper_id = created.get("id")
        if not helper_id:
            raise RuntimeError(f"Puntenhelper voor {member_name} kon niet worden aangemaakt")
        return f"input_number.{helper_id}"


def provision_family_features(settings):
    settings, provisioned, warnings = provision_member_lists(settings)

    for member in settings.get("members", []):
        if not member.get("points_entity"):
            try:
                member["points_entity"] = ensure_points_helper(member["name"])
                provisioned.append({
                    "member": member["name"],
                    "type": "points",
                    "entity_id": member["points_entity"],
                })
            except Exception as exc:
                warnings.append(f"Punten {member['name']}: {exc}")

    if not settings.get("shopping_list"):
        try:
            settings["shopping_list"] = ensure_named_todo("Family Hub Boodschappen")
            provisioned.append({"type": "shopping", "entity_id": settings["shopping_list"]})
        except Exception as exc:
            warnings.append(f"Boodschappen: {exc}")

    if not settings.get("meals_todo"):
        try:
            settings["meals_todo"] = ensure_named_todo("Family Hub Maaltijden")
            provisioned.append({"type": "meals", "entity_id": settings["meals_todo"]})
        except Exception as exc:
            warnings.append(f"Maaltijden: {exc}")

    lists = list(settings.get("lists") or [])
    if settings.get("shopping_list") and not any(x.get("id") == "shopping" for x in lists):
        lists.insert(0, {
            "id": "shopping",
            "title": "Boodschappen",
            "icon": "mdi:cart-outline",
            "color": "#43A66B",
            "todo_entity": settings["shopping_list"],
        })
    for item in lists:
        if not item.get("todo_entity"):
            try:
                item["todo_entity"] = ensure_named_todo(f"Family Hub {item['title']}")
                provisioned.append({
                    "type": "list",
                    "title": item["title"],
                    "entity_id": item["todo_entity"],
                })
            except Exception as exc:
                warnings.append(f"Lijst {item.get('title')}: {exc}")
    settings["lists"] = lists

    member_names = {m.get("id"): m.get("name") for m in settings.get("members", [])}
    for routine in settings.get("routines", []):
        if not routine.get("todo_entity"):
            try:
                who = member_names.get(routine.get("member_id")) or "Gezin"
                routine["todo_entity"] = ensure_named_todo(
                    f"Family Hub Routine {who} - {routine['title']}"
                )
                provisioned.append({
                    "type": "routine",
                    "title": routine["title"],
                    "entity_id": routine["todo_entity"],
                })
            except Exception as exc:
                warnings.append(f"Routine {routine.get('title')}: {exc}")

    return normalize_settings(settings), provisioned, warnings


def _service_payload(result, entity_id):
    roots = [
        result,
        (result or {}).get("response") if isinstance(result, dict) else None,
        (result or {}).get("service_response") if isinstance(result, dict) else None,
        (result or {}).get("response_data") if isinstance(result, dict) else None,
    ]
    for root in [x for x in roots if isinstance(x, dict)]:
        if entity_id in root:
            return root[entity_id]
        response = root.get("response")
        if isinstance(response, dict) and entity_id in response:
            return response[entity_id]
    return {}


def ha_service(domain, service, service_data=None, entity_id=None, return_response=False):
    message = {
        "type": "call_service",
        "domain": domain,
        "service": service,
        "service_data": service_data or {},
        "return_response": bool(return_response),
    }
    if entity_id:
        message["target"] = {"entity_id": entity_id}
    with HomeAssistantWebSocket() as ha:
        return ha.call(message) or {}


def get_todo_items(entity_id, statuses=None):
    result = ha_service(
        "todo",
        "get_items",
        {"status": statuses or ["needs_action", "completed"]},
        entity_id,
        True,
    )
    payload = _service_payload(result, entity_id)
    return payload.get("items") or [] if isinstance(payload, dict) else []


def clear_todo(entity_id):
    try:
        items = get_todo_items(entity_id)
    except Exception:
        return
    for item in items:
        key = item.get("uid") or item.get("summary")
        if not key:
            continue
        try:
            ha_service("todo", "remove_item", {"item": key}, entity_id)
        except Exception:
            pass


def add_todo_item(entity_id, title, description="", due_date=None, due_time=None):
    data = {"item": title}
    if description:
        data["description"] = description
    if due_date and due_time:
        data["due_datetime"] = f"{due_date} {due_time}:00"
    elif due_date:
        data["due_date"] = due_date
    ha_service("todo", "add_item", data, entity_id)


def sync_generated_content():
    settings = load_settings()
    runtime = load_runtime()
    today = time.strftime("%Y-%m-%d")
    weekday = time.localtime().tm_wday
    changed = False

    members = {m.get("id"): m for m in settings.get("members", [])}

    for routine in settings.get("routines", []):
        entity = routine.get("todo_entity")
        if not entity or weekday not in (routine.get("days") or []):
            continue
        key = f"routine:{routine.get('id')}:{today}"
        if runtime.get(key):
            continue
        try:
            clear_todo(entity)
            member = members.get(routine.get("member_id")) or {}
            points_entity = member.get("points_entity") or ""
            for step in routine.get("steps", []):
                meta = {
                    "kind": "routine_step",
                    "routine_id": routine.get("id"),
                    "step_id": step.get("id"),
                    "member_id": routine.get("member_id"),
                    "points": step.get("points", 0),
                    "points_entity": points_entity,
                    "date": today,
                }
                add_todo_item(
                    entity,
                    step.get("title") or "Stap",
                    "FH_META:" + json.dumps(meta, separators=(",", ":")),
                    today,
                    None,
                )
            runtime[key] = int(time.time())
            changed = True
        except Exception as exc:
            print(f"[Family Hub] Routine sync failed for {routine.get('title')}: {exc}", flush=True)

    for task in settings.get("smart_tasks", []):
        if not task.get("enabled", True) or weekday not in (task.get("days") or []):
            continue
        member = members.get(task.get("member_id"))
        if not member or not member.get("todo"):
            continue
        key = f"smarttask:{task.get('id')}:{today}"
        if runtime.get(key):
            continue
        try:
            meta = {
                "kind": "smart_task",
                "task_id": task.get("id"),
                "member_id": task.get("member_id"),
                "points": task.get("points", 0),
                "points_entity": member.get("points_entity") or "",
                "date": today,
            }
            add_todo_item(
                member["todo"],
                task.get("title") or "Taak",
                "FH_META:" + json.dumps(meta, separators=(",", ":")),
                today,
                task.get("due_time") or None,
            )
            runtime[key] = int(time.time())
            changed = True
        except Exception as exc:
            print(f"[Family Hub] Smart task sync failed for {task.get('title')}: {exc}", flush=True)

    # Keep only about 45 days of generation markers.
    cutoff = time.time() - (45 * 86400)
    for key, value in list(runtime.items()):
        if isinstance(value, (int, float)) and value < cutoff:
            runtime.pop(key, None)
            changed = True

    if changed:
        save_runtime(runtime)


def family_scheduler_loop():
    time.sleep(12)
    while True:
        try:
            settings = load_settings()
            updated, provisioned, warnings = provision_family_features(settings)
            if provisioned:
                save_settings(updated)
                print(f"[Family Hub] Provisioned {len(provisioned)} Family Hub entities", flush=True)
            for warning in warnings:
                print(f"[Family Hub] Provision warning: {warning}", flush=True)
            sync_generated_content()
        except Exception as exc:
            print(f"[Family Hub] Background sync failed: {exc}", flush=True)
        time.sleep(60)


def create_remote_calendar(name, url):
    result = _create_local_config_entry(
        "remote_calendar",
        {
            "calendar_name": str(name or "Externe agenda")[:80],
            "url": str(url or "").strip(),
            "verify_ssl": True,
        },
    )
    if result.get("type") == "create_entry":
        return result
    if result.get("type") == "abort":
        raise RuntimeError(f"Agenda bestaat al: {result.get('reason') or 'onbekend'}")
    raise RuntimeError("Deze agenda vraagt extra authenticatie. Voeg die eerst als integratie toe in Home Assistant.")


def family_hub_view(title="Family Hub"):
    return {
        "title": title,
        "path": DASHBOARD_VIEW_PATH,
        "panel": True,
        "cards": [
            {
                "type": "custom:family-hub-card",
                "config_url": "/local/family-hub/settings.json",
            }
        ],
    }


def family_hub_dashboard_config(title="Family Hub"):
    return {"views": [family_hub_view(title)]}


def _is_family_hub_view(view):
    try:
        cards = view.get("cards") or []
        return (
            view.get("path") == DASHBOARD_VIEW_PATH
            and cards
            and cards[0].get("type") == "custom:family-hub-card"
        )
    except (AttributeError, IndexError, TypeError):
        return False


def _is_family_hub_config(config):
    try:
        views = config.get("views") or []
        return len(views) == 1 and _is_family_hub_view(views[0])
    except (AttributeError, IndexError, TypeError):
        return False


def _find_family_hub_resource(resources):
    for resource in resources or []:
        url = str(resource.get("url") or "")
        if url.split("?", 1)[0] == CARD_RESOURCE_BASE:
            return resource
    return None


def _find_family_hub_dashboard(dashboards):
    for dashboard in dashboards or []:
        if dashboard.get("url_path") == DASHBOARD_URL_PATH:
            return dashboard
    return None


def _find_overview_view(config):
    for idx, view in enumerate((config or {}).get("views") or []):
        if view.get("path") == DASHBOARD_VIEW_PATH:
            return idx, view
    return None, None


def _load_overview_config(ha):
    try:
        return ha.call({"type": "lovelace/config", "force": True}) or {}
    except RuntimeError as exc:
        if "No config found" in str(exc) or "config_not_found" in str(exc):
            raise RuntimeError(
                "Het standaard Overzicht gebruikt nog een automatisch gegenereerde indeling. "
                "Maak of bewerk één keer een view in Overzicht zodat Home Assistant deze opslaat; "
                "daarna kan Family Hub veilig een view toevoegen zonder je bestaande Overzicht te vervangen."
            ) from exc
        raise


def _ensure_resource(ha):
    info = ha.call({"type": "lovelace/info"}) or {}
    if info.get("resource_mode") != "storage":
        raise RuntimeError(
            "Family Hub kan dashboardbronnen alleen automatisch beheren wanneer Home Assistant resources in storage-modus gebruikt."
        )
    resources = ha.call({"type": "lovelace/resources/list"}) or []
    resource = _find_family_hub_resource(resources)
    if resource:
        resource_id = resource.get("id")
        if not resource_id:
            raise RuntimeError("Bestaande Family Hub resource heeft geen geldig ID")
        if resource.get("url") != CARD_RESOURCE_URL or resource.get("type") != "module":
            ha.call(
                {
                    "type": "lovelace/resources/update",
                    "resource_id": resource_id,
                    "url": CARD_RESOURCE_URL,
                    "res_type": "module",
                }
            )
    else:
        ha.call(
            {
                "type": "lovelace/resources/create",
                "url": CARD_RESOURCE_URL,
                "res_type": "module",
            }
        )


def _install_overview_view(ha, title):
    config = _load_overview_config(ha)
    views = list(config.get("views") or [])
    index, existing = _find_overview_view(config)
    view = family_hub_view(title)
    if existing is not None and not _is_family_hub_view(existing):
        raise RuntimeError(
            "In Overzicht bestaat al een andere view met pad 'family'. Family Hub overschrijft die niet."
        )
    if index is None:
        views.append(view)
    else:
        views[index] = view
    updated = dict(config)
    updated["views"] = views
    ha.call({"type": "lovelace/config/save", "config": updated})


def _remove_overview_view(ha):
    config = _load_overview_config(ha)
    views = list(config.get("views") or [])
    index, existing = _find_overview_view(config)
    if existing is None:
        return
    if not _is_family_hub_view(existing):
        raise RuntimeError("De view 'family' in Overzicht wordt niet door Family Hub beheerd.")
    del views[index]
    updated = dict(config)
    updated["views"] = views
    ha.call({"type": "lovelace/config/save", "config": updated})


def _read_sidebar_dashboard_config(ha):
    try:
        return ha.call({"type": "lovelace/config", "url_path": DASHBOARD_URL_PATH}) or {}
    except RuntimeError as exc:
        if "No config found" in str(exc) or "config_not_found" in str(exc):
            return {}
        raise


def _ensure_sidebar_dashboard(ha, title):
    dashboards = ha.call({"type": "lovelace/dashboards/list"}) or []
    dashboard = _find_family_hub_dashboard(dashboards)
    if dashboard:
        existing_config = _read_sidebar_dashboard_config(ha)
        if existing_config and not _is_family_hub_config(existing_config):
            raise RuntimeError(
                "Er bestaat al een ander dashboard met URL 'family-hub'. Family Hub overschrijft dat dashboard niet."
            )
        dashboard_id = dashboard.get("id")
        if not dashboard_id:
            raise RuntimeError("Bestaand Family Hub dashboard heeft geen geldig ID")
        # Deliberately omit 'icon': older/newer Home Assistant schemas differ here.
        ha.call(
            {
                "type": "lovelace/dashboards/update",
                "dashboard_id": dashboard_id,
                "title": title,
                "show_in_sidebar": True,
                "require_admin": False,
            }
        )
    else:
        ha.call(
            {
                "type": "lovelace/dashboards/create",
                "url_path": DASHBOARD_URL_PATH,
                "title": title,
                "show_in_sidebar": True,
                "require_admin": False,
                "mode": "storage",
            }
        )
    ha.call(
        {
            "type": "lovelace/config/save",
            "url_path": DASHBOARD_URL_PATH,
            "config": family_hub_dashboard_config(title),
        }
    )


def _remove_sidebar_dashboard(ha):
    dashboards = ha.call({"type": "lovelace/dashboards/list"}) or []
    dashboard = _find_family_hub_dashboard(dashboards)
    if not dashboard:
        return
    config = _read_sidebar_dashboard_config(ha)
    if config and not _is_family_hub_config(config):
        raise RuntimeError("Het dashboard 'family-hub' wordt niet door Family Hub beheerd.")
    dashboard_id = dashboard.get("id")
    if not dashboard_id:
        raise RuntimeError("Family Hub dashboard heeft geen geldig ID")
    ha.call({"type": "lovelace/dashboards/delete", "dashboard_id": dashboard_id})


def dashboard_status():
    settings = load_settings()
    status = {
        "available": False,
        "installed": False,
        "overview_installed": False,
        "sidebar_installed": False,
        "managed": bool(settings.get("dashboard_managed")),
        "show_in_sidebar": False,
        "title": settings.get("dashboard_title", "Family Hub"),
        "url": f"/lovelace/{DASHBOARD_VIEW_PATH}",
        "sidebar_url": f"/{DASHBOARD_URL_PATH}/{DASHBOARD_VIEW_PATH}",
        "resource_registered": False,
        "resource_mode": None,
        "error": None,
    }
    try:
        with HomeAssistantWebSocket() as ha:
            info = ha.call({"type": "lovelace/info"}) or {}
            status["resource_mode"] = info.get("resource_mode")
            resources = ha.call({"type": "lovelace/resources/list"}) or []
            status["resource_registered"] = bool(_find_family_hub_resource(resources))

            try:
                overview = ha.call({"type": "lovelace/config", "force": True}) or {}
                _, overview_view = _find_overview_view(overview)
                status["overview_installed"] = bool(
                    overview_view and _is_family_hub_view(overview_view)
                )
            except RuntimeError:
                status["overview_installed"] = False

            dashboards = ha.call({"type": "lovelace/dashboards/list"}) or []
            dashboard = _find_family_hub_dashboard(dashboards)
            if dashboard:
                sidebar_config = _read_sidebar_dashboard_config(ha)
                if not sidebar_config or _is_family_hub_config(sidebar_config):
                    status["sidebar_installed"] = True
                    status["show_in_sidebar"] = bool(
                        dashboard.get("show_in_sidebar", True)
                    )
                    status["title"] = dashboard.get("title") or status["title"]

            status["installed"] = status["overview_installed"]
            status["available"] = True
    except Exception as exc:
        status["error"] = str(exc)
    return status


def install_dashboard(title="Family Hub", show_in_sidebar=True):
    title = str(title or "Family Hub").strip()[:80] or "Family Hub"
    show_in_sidebar = bool(show_in_sidebar)
    ensure_dirs()

    with HomeAssistantWebSocket() as ha:
        _ensure_resource(ha)
        _install_overview_view(ha, title)
        if show_in_sidebar:
            _ensure_sidebar_dashboard(ha, title)
        else:
            _remove_sidebar_dashboard(ha)

    settings = load_settings()
    settings["dashboard_managed"] = True
    settings["dashboard_show_sidebar"] = show_in_sidebar
    settings["dashboard_title"] = title
    settings = save_settings(settings)
    return settings, dashboard_status()


def remove_dashboard():
    with HomeAssistantWebSocket() as ha:
        _remove_overview_view(ha)
        _remove_sidebar_dashboard(ha)

    settings = load_settings()
    settings["dashboard_managed"] = False
    settings["dashboard_show_sidebar"] = False
    settings = save_settings(settings)
    return settings, dashboard_status()


def sync_managed_dashboard(delay=8):
    """Keep managed Overview/sidebar entries current after an OTA App update."""
    time.sleep(delay)
    settings = load_settings()
    if not settings.get("dashboard_managed"):
        return
    try:
        install_dashboard(
            settings.get("dashboard_title", "Family Hub"),
            settings.get("dashboard_show_sidebar", True),
        )
        print("[Family Hub] Managed Overview view/dashboard synchronized", flush=True)
    except Exception as exc:
        print(f"[Family Hub] Managed dashboard sync failed: {exc}", flush=True)


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
    server_version = f"VANDEREIJT.COM-Family-Hub/{APP_VERSION}"

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
                "version": APP_VERSION,
                "card_installed": CARD_TARGET.exists(),
                "legacy_card_updated": LEGACY_CARD_TARGET.exists(),
                "settings_published": PUBLIC_SETTINGS.exists(),
                "homeassistant_api": bool(SUPERVISOR_TOKEN),
                "card_resource": "/local/family-hub/family-hub-card.js",
                "settings_url": "/local/family-hub/settings.json",
                "dashboard": dashboard_status(),
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
                settings, provisioned, provision_warnings = provision_family_features(settings)
                settings = save_settings(settings)
                persisted = load_settings()
                if len(persisted.get("members", [])) != len(settings.get("members", [])):
                    raise RuntimeError("Controle na opslaan mislukt: gezinsleden niet correct bewaard")
                print(
                    f"[Family Hub] Settings saved: received_members={len(incoming_members) if isinstance(incoming_members, list) else 'invalid'} persisted_members={len(persisted.get('members', []))}",
                    flush=True,
                )
                return self._json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "settings": persisted,
                        "saved_members": len(persisted.get("members", [])),
                        "provisioned": provisioned,
                        "warnings": provision_warnings,
                    },
                )
            except Exception as exc:
                return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})


        if path == "/api/external-calendar":
            try:
                name = str(payload.get("name") or "Externe agenda").strip()
                url = str(payload.get("url") or "").strip()
                if not url:
                    raise ValueError("Vul een ICS/webcal URL in")
                result = create_remote_calendar(name, url)
                return self._json(HTTPStatus.OK, {"ok": True, "result": result})
            except Exception as exc:
                return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

        if path == "/api/provision":
            try:
                current = load_settings()
                updated, provisioned, warnings = provision_family_features(current)
                updated = save_settings(updated)
                sync_generated_content()
                return self._json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "settings": updated,
                        "provisioned": provisioned,
                        "warnings": warnings,
                    },
                )
            except Exception as exc:
                return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

        if path == "/api/dashboard/install":
            try:
                title = payload.get("title") or "Family Hub"
                show_in_sidebar = payload.get("show_in_sidebar", True)
                settings, status = install_dashboard(title, show_in_sidebar)
                return self._json(
                    HTTPStatus.OK,
                    {"ok": True, "settings": settings, "dashboard": status},
                )
            except Exception as exc:
                print(f"[Family Hub] Dashboard install error: {exc}", flush=True)
                return self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})

        if path == "/api/dashboard/remove":
            try:
                settings, status = remove_dashboard()
                return self._json(
                    HTTPStatus.OK,
                    {"ok": True, "settings": settings, "dashboard": status},
                )
            except Exception as exc:
                print(f"[Family Hub] Dashboard remove error: {exc}", flush=True)
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
    print(f"[Family Hub] v{APP_VERSION} listening on {PORT}", flush=True)
    print(f"[Family Hub] Card: {CARD_TARGET}", flush=True)
    threading.Thread(target=family_scheduler_loop, daemon=True).start()
    threading.Thread(target=sync_managed_dashboard, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
