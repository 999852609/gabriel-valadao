from datetime import datetime, timedelta
import requests
from jarvis_trip.config import Config


class FlightClient:
    def __init__(self):
        self._headers = {"apikey": Config.TEQUILA_API_KEY}

    def search_cheap_flights(self, origin: str, max_price: float | None = None) -> list[dict]:
        date_from = datetime.now().strftime("%d/%m/%Y")
        date_to = (datetime.now() + timedelta(days=60)).strftime("%d/%m/%Y")
        return_from = (datetime.now() + timedelta(days=1)).strftime("%d/%m/%Y")
        return_to = (datetime.now() + timedelta(days=67)).strftime("%d/%m/%Y")

        params = {
            "fly_from": origin,
            "date_from": date_from,
            "date_to": date_to,
            "return_from": return_from,
            "return_to": return_to,
            "flight_type": "round",
            "nights_in_dst_from": 2,
            "nights_in_dst_to": 14,
            "curr": "BRL",
            "locale": "pt",
            "limit": 50,
            "sort": "price",
            "one_for_city": 1,
        }
        if max_price:
            params["price_to"] = int(max_price)

        resp = requests.get(
            f"{Config.TEQUILA_BASE_URL}/v2/search",
            headers=self._headers,
            params=params,
            timeout=30,
        )
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json().get("data", [])

    @staticmethod
    def parse_flight(raw: dict) -> dict:
        routes = raw.get("route", [])
        outbound = [r for r in routes if r.get("return") == 0]
        inbound = [r for r in routes if r.get("return") == 1]

        def format_dt(iso: str) -> str:
            try:
                return datetime.fromisoformat(iso).strftime("%d/%m/%Y %H:%M")
            except (ValueError, TypeError):
                return iso

        stops_out = max(0, len(outbound) - 1)
        stops_in = max(0, len(inbound) - 1)
        stops_label = ""
        if stops_out == 0 and stops_in == 0:
            stops_label = "Direto"
        else:
            stops_label = f"{stops_out} parada(s) ida, {stops_in} volta"

        return {
            "origin": raw.get("flyFrom", ""),
            "destination": raw.get("flyTo", ""),
            "city_to": raw.get("cityTo", ""),
            "country_to": raw.get("countryTo", {}).get("name", ""),
            "price": raw.get("price", 0),
            "departure_date": format_dt(raw.get("local_departure", "")),
            "return_date": format_dt(raw.get("local_arrival", "")) if inbound else "",
            "nights": raw.get("nightsInDest", ""),
            "stops": stops_label,
            "booking_link": raw.get("deep_link", ""),
        }
