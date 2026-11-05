"""Shared helpers for the research-data ingestion pipeline.

Every network response is cached under data-staging/raw/ and logged to
data-staging/evidence/retrieval-log.jsonl with URL, timestamp, HTTP status,
size and SHA-256, so each derived value can be traced to its source.
Nothing here writes outside data-staging/ (which is gitignored).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STAGING = ROOT / "data-staging"
RAW = STAGING / "raw"
LOG = STAGING / "evidence" / "retrieval-log.jsonl"

# Generic client identity. No personal e-mail is sent unless the operator sets
# INGEST_CONTACT_EMAIL in a local .env (see .env.example).
USER_AGENT = "IbrahimTahaAxiom-Ingest/0.1 (research data pipeline; +https://github.com/3boalazm/-Ibrahim-Taha-Axiom)"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _log(entry: dict) -> None:
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def cached_entry(dest: Path) -> dict | None:
    """Return the most recent successful log entry for a cached file."""
    if not LOG.exists():
        return None
    rel = dest.relative_to(STAGING).as_posix()
    hit = None
    for line in LOG.read_text(encoding="utf-8").splitlines():
        e = json.loads(line)
        if e.get("dest") == rel and e.get("status") == 200:
            hit = e
    return hit


def fetch(url: str, dest: Path, *, source_id: str, method: str,
          headers: dict | None = None, refresh: bool = False,
          retries: int = 4, pause: float = 1.0) -> tuple[int, bytes | None, dict]:
    """GET a URL politely, cache the body at `dest`, log provenance.

    Returns (status, body_or_None, log_entry). Cached files are reused unless
    refresh=True; the original retrieval timestamp is kept in that case.
    """
    dest = Path(dest)
    if dest.exists() and not refresh:
        entry = cached_entry(dest)
        if entry:
            return 200, dest.read_bytes(), entry
    hdrs = {"User-Agent": USER_AGENT}
    hdrs.update(headers or {})
    status, body, err = None, None, None
    for attempt in range(retries):
        req = urllib.request.Request(url, headers=hdrs)
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                status, body = r.status, r.read()
            break
        except urllib.error.HTTPError as e:
            status, err = e.code, str(e)
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(pause * (2 ** attempt) * 3)
                continue
            break
        except (urllib.error.URLError, TimeoutError) as e:
            status, err = -1, str(e)
            if attempt < retries - 1:
                time.sleep(pause * (2 ** attempt))
                continue
            break
    entry = {
        "url": url, "retrieved_at": now_iso(), "status": status,
        "source_id": source_id, "method": method,
        "dest": dest.relative_to(STAGING).as_posix(),
    }
    if body is not None and status == 200:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        entry["bytes"] = len(body)
        entry["sha256"] = hashlib.sha256(body).hexdigest()
    else:
        entry["error"] = err
    _log(entry)
    time.sleep(pause)
    return status or -1, body if status == 200 else None, entry


def fetch_json(url: str, dest: Path, **kw):
    status, body, entry = fetch(url, dest, **kw)
    data = json.loads(body.decode("utf-8")) if body else None
    return status, data, entry


def slug(text: str, maxlen: int = 60) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()
    return t[:maxlen].rstrip("-") or "x"


def norm_title(text: str | None) -> str:
    """Normalisation for title comparison only (never for display)."""
    if not text:
        return ""
    t = unicodedata.normalize("NFKC", text)
    t = re.sub(r"<[^>]+>", " ", t)            # strip JATS/HTML tags
    t = t.lower().replace("’", "'").replace("–", "-").replace("—", "-")
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def norm_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    d = doi.strip()
    d = re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)", "", d, flags=re.I)
    return d.lower() or None


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def read_json(path: Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))
