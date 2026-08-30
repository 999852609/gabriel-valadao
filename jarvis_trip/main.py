import logging
from datetime import datetime, timezone

from jarvis_trip.amadeus_client import AmadeusClient
from jarvis_trip.config import Config
from jarvis_trip.email_alert import send_alert
from jarvis_trip.history import save_alert
from jarvis_trip.price_filter import load_history, should_alert

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("jarvis_trip")


def run() -> None:
    log.info("Iniciando busca — origem: %s, teto: R$%.0f", Config.ORIGIN_AIRPORT, Config.MAX_PRICE_BRL)
    client = AmadeusClient()
    history = load_history()

    inspirations = client.flight_inspiration(Config.ORIGIN_AIRPORT, max_price=Config.MAX_PRICE_BRL)
    log.info("Flight Inspiration retornou %d destinos", len(inspirations))

    deals: list[dict] = []

    for item in inspirations:
        dest = item.get("destination", "")
        price_raw = float(item.get("price", {}).get("total", "0"))
        departure = item.get("departureDate", "")
        return_date = item.get("returnDate", "")

        alert_flag, reason = should_alert(dest, price_raw, history)
        if not alert_flag:
            continue

        log.info("Confirmando preço: %s -> %s (R$%.0f)", Config.ORIGIN_AIRPORT, dest, price_raw)
        offers = client.flight_offers(
            Config.ORIGIN_AIRPORT, dest, departure, return_date
        )

        if not offers:
            log.warning("Nenhuma oferta confirmada para %s", dest)
            continue

        best = offers[0]
        confirmed_price = float(best.get("price", {}).get("grandTotal", price_raw))

        alert_flag, reason = should_alert(dest, confirmed_price, history)
        if not alert_flag:
            log.info("Preço confirmado R$%.0f não passou no filtro para %s", confirmed_price, dest)
            continue

        duration = ""
        itineraries = best.get("itineraries", [])
        if itineraries:
            duration = itineraries[0].get("duration", "").replace("PT", "").lower()

        deal = {
            "origin": Config.ORIGIN_AIRPORT,
            "destination": dest,
            "price": f"{confirmed_price:.0f}",
            "departure_date": departure,
            "return_date": return_date,
            "duration": duration,
            "reason": reason,
        }
        deals.append(deal)

        save_alert({
            "destination": dest,
            "price": confirmed_price,
            "departure_date": departure,
            "return_date": return_date,
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
