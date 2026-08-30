import json
import os
from datetime import datetime, timezone
from jarvis_trip.config import Config


def save_alert(alert: dict) -> None:
    os.makedirs(Config.DATA_DIR, exist_ok=True)
    history = []
    if os.path.exists(Config.HISTORY_FILE):
        with open(Config.HISTORY_FILE) as f:
            history = json.load(f)

    alert["recorded_at"] = datetime.now(timezone.utc).isoformat()
    history.append(alert)

    with open(Config.HISTORY_FILE, "w") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
