from datetime import datetime, timedelta
import requests
from jarvis_trip.config import Config

POPULAR_DESTINATIONS = [
    "SAO", "GIG", "BSB", "SSA", "REC", "FOR", "CWB", "POA", "BEL", "MAO",
    "FLN", "NAT", "MCZ", "CGR", "VCP", "SDU", "CNF", "SLZ", "THE", "AJU",
    "GRU", "MIA", "EZE", "SCL", "BOG", "LIM", "CUN", "MEX", "LIS", "MAD",
]


class FlightClient:
    def search_cheap_flights(self, origin: str, max_price: float | None = None) -> list[dict]:
        date_from = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        date_to = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")

        deals = []
        for dest in POPULAR_DESTINATIONS:
            if dest == origin:
                continue
            result = self._search_route(origin, dest, date_from, date_to)
            if not result:
                continue
            if max_price and result["price"] > max_price:
                continue
            deals.append(result)

        deals.sort(key=lambda x: x["price"])
        return deals

    def _search_route(self, origin: str, dest: str, outbound: str, return_date: str) -> dict | None:
        params = {
            "engine": "google_flights",
            "departure_id": origin,
            "arrival_id": dest,
            "outbound_date": outbound,
            "return_date": return_date,
            "currency": "BRL",
            "hl": "pt",
            "gl": "br",
            "type": "1",
            "api_key": Config.SERPAPI_KEY,
        }
        try:
            resp = requests.get("https://serpapi.com/search", params=params, timeout=30)
            if resp.status_code != 200:
                return None
            data = resp.json()
        except (requests.RequestException, ValueError):
            return None

        best = data.get("best_flights", [])
        other = data.get("other_flights", [])
        all_flights = best + other
        if not all_flights:
            return None

        cheapest = min(all_flights, key=lambda f: f.get("price", 99999))
        legs = cheapest.get("flights", [])
        if not legs:
            return None

        first_leg = legs[0]
        last_leg = legs[-1]
        stops = max(0, len(legs) - 1)
        duration = cheapest.get("total_duration", 0)
        hours, minutes = divmod(duration, 60)

        return {
            "origin": origin,
            "destination": dest,
            "city_to": last_leg.get("arrival_airport", {}).get("name", dest),
            "country_to": "",
            "price": cheapest.get("price", 0),
            "departure_date": first_leg.get("departure_airport", {}).get("time", outbound),
            "return_date": return_date,
            "duration": f"{hours}h{minutes:02d}m" if duration else "",
            "stops": "Direto" if stops == 0 else f"{stops} parada(s)",
            "booking_link": data.get("search_metadata", {}).get("google_flights_url", ""),
        }
