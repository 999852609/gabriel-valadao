import logging
from datetime import datetime, timezone

from jarvis_trip.config import Config
from jarvis_trip.email_alert import send_alert
from jarvis_trip.flight_client import FlightClient
from jarvis_trip.history import save_alert
from jarvis_trip.price_filter import load_history, should_alert

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("jarvis_trip")


def run() -> None:
    log.info("Iniciando busca — origem: %s, teto: R$%.0f", Config.ORIGIN_AIRPORT, Config.MAX_PRICE_BRL)
    client = FlightClient()
    history = load_history()

    raw_flights = client.search_cheap_flights(Config.ORIGIN_AIRPORT, max_price=Config.MAX_PRICE_BRL)
    log.info("Kiwi retornou %d voos", len(raw_flights))

    deals: list[dict] = []

    for raw in raw_flights:
        flight = client.parse_flight(raw)
        dest = flight["destination"]
        price = flight["price"]

        alert_flag, reason = should_alert(dest, price, history)
        if not alert_flag:
            continue

        flight["reason"] = reason
        deals.append(flight)

        save_alert({
            "destination": dest,
            "city": flight["city_to"],
            "price": price,
            "departure_date": flight["departure_date"],
            "return_date": flight["return_date"],
            "search_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        })

    if deals:
        search_date = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
        send_alert(deals, search_date)
        log.info("Alerta enviado com %d destino(s)", len(deals))
    else:
        log.info("Nenhuma oportunidade encontrada hoje")


if __name__ == "__main__":
    run()
