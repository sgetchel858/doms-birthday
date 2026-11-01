"""Generate postcard art with Higgsfield (gpt_image_2), styled after the approved anchor.

Idempotent: skips any postcard whose raw PNG already exists. Retries failures.
Usage: python3 work/make_postcards.py [id ...]   (no ids = everything in postcards.tsv)
"""
import json, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "work"
RAW = WORK / "raw"
OUT = ROOT / "assets" / "postcards"
ANCHOR = "d6c67de1-cd27-4bc8-a616-cd48e9ff9e44"  # uploaded work/anchor.jpg (approved Seville card); local-path uploads of the big PNG 520
STYLE = (WORK / "prompts" / "style.txt").read_text().strip()
MATCH = ("Match the reference image's art style exactly: the same layered cut-paper look, paper grain, "
         "pink and amethyst palette, golden-hour light and gold foil sparkles, but show a completely different scene.")

RAW.mkdir(exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
log = open(WORK / "batch.log", "a")

def say(msg):
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    print(line, flush=True); log.write(line + "\n"); log.flush()

def to_webp(pid):
    im = Image.open(RAW / f"{pid}.png").convert("RGB")
    im = im.resize((900, round(900 * im.height / im.width)), Image.LANCZOS)
    im.save(OUT / f"{pid}.webp", "WEBP", quality=82, method=6)

def make(pid, subject):
    png = RAW / f"{pid}.png"
    if png.exists():
        if not (OUT / f"{pid}.webp").exists(): to_webp(pid)
        return pid, "skip"
    prompt = f"{STYLE}\n{MATCH}\nSubject: {subject}"
    (WORK / "prompts" / f"{pid}.txt").write_text(prompt)
    for attempt in range(1, 4):
        r = subprocess.run(
            ["higgsfield", "generate", "create", "gpt_image_2", "--prompt", prompt,
             "--image", ANCHOR, "--aspect_ratio", "4:5", "--resolution", "2k", "--quality", "high",
             "--wait", "--wait-timeout", "15m", "--json"],
            capture_output=True, text=True)
        try:
            data = json.loads(r.stdout)
            item = data[0] if isinstance(data, list) else data
            url = item.get("result_url")
            if not url: raise ValueError(item.get("status") or r.stderr.strip()[-200:])
            urllib.request.urlretrieve(url, png)
            to_webp(pid)
            say(f"OK   {pid} (attempt {attempt})")
            return pid, "ok"
        except Exception as e:  # noqa: BLE001
            say(f"FAIL {pid} attempt {attempt}: {e!s:.120} | stderr: {r.stderr.strip()[-200:]}")
            time.sleep(5 * attempt)
    return pid, "failed"

rows = [l.split("\t", 1) for l in (WORK / "postcards.tsv").read_text().strip().splitlines()]
want = set(sys.argv[1:])
rows = [r for r in rows if not want or r[0] in want]
say(f"START {len(rows)} postcards")
with ThreadPoolExecutor(max_workers=5) as ex:
    results = list(ex.map(lambda r: make(*r), rows))
failed = [p for p, s in results if s == "failed"]
say(f"DONE ok={sum(s == 'ok' for _, s in results)} skip={sum(s == 'skip' for _, s in results)} failed={failed}")
