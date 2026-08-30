import time
import requests
from jarvis_trip.config import Config


class AmadeusClient:
    def __init__(self):
        self._token = None
        self._token_expiry = 0

    def _authenticate(self):
        if self._token and time.time() < self._token_expiry:
            return
        resp = requests.post(
            f"{Config.AMADEUS_BASE_URL}/v1/security/oauth2/token",
            data={
                "grant_type": "client_credentials",
                "client_id": Config.AMADEUS_API_KEY,
                "client_secret": Config.AMADEUS_API_SECRET,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = time.time() + data["expires_in"] - 60

    def _headers(self):
        self._authenticate()
        return {"Authorization": f"Bearer {self._token}"}

    def flight_inspiration(self, origin: str, max_price: float | None = None) -> list[dict]:
        params = {"origin": origin, "nonStop": "false", "maxPrice": int(max_price) if max_price else None}
        params = {k: v for k, v in params.items() if v is not None}
        resp = requests.get(
            f"{Config.AMADEUS_BASE_URL}/v1/shopping/flight-destinations",
            headers=self._headers(),
            params=params,
            timeout=30,
        )
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json().get("data", [])

    def flight_offers(self, origin: str, destination: str, departure_date: str,
                      return_date: str | None = None, adults: int = 1, max_results: int = 3) -> list[dict]:
        params = {
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": departure_date,
            "adults": adults,
            "nonStop": "false",
            "max": max_results,
            "currencyCode": "BRL",
        }
        if return_date:
            params["returnDate"] = return_date
        resp = requests.get(
            f"{Config.AMADEUS_BASE_URL}/v2/shopping/flight-offers",
            headers=self._headers(),
            params=params,
            timeout=30,
        )
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json().get("data", [])
