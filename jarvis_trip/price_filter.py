import json
import os
from jarvis_trip.config import Config


def load_history() -> list[dict]:
    if not os.path.exists(Config.HISTORY_FILE):
        return []
    with open(Config.HISTORY_FILE) as f:
        return json.load(f)


def average_price_for_route(history: list[dict], destination: str) -> float | None:
    prices = [r["price"] for r in history if r["destination"] == destination]
    if len(prices) < 3:
        return None
    return sum(prices) / len(prices)


def should_alert(destination: str, price: float, history: list[dict]) -> tuple[bool, str]:
    reasons = []

    if price <= Config.MAX_PRICE_BRL:
        reasons.append(f"Preço R${price:.0f} abaixo do teto R${Config.MAX_PRICE_BRL:.0f}")

    avg = average_price_for_route(history, destination)
    if avg is not None:
        drop = ((avg - price) / avg) * 100
        if drop >= Config.PRICE_DROP_PERCENT:
            reasons.append(f"{drop:.0f}% abaixo da média histórica (R${avg:.0f})")

    if not reasons:
        return False, ""
    return True, " | ".join(reasons)
