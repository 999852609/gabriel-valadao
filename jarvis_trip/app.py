import logging
from datetime import datetime, timezone
from flask import Flask, jsonify, render_template

from jarvis_trip.config import Config
from jarvis_trip.flight_client import FlightClient
from jarvis_trip.history import save_alert
from jarvis_trip.price_filter import load_history, should_alert

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("jarvis_trip")

app = Flask(__name__, template_folder="../templates", static_folder="../static")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/search")
def search_flights():
    log.info("Busca iniciada — origem: %s, teto: R$%.0f", Config.ORIGIN_AIRPORT, Config.MAX_PRICE_BRL)
    client = FlightClient()
    history = load_history()

    try:
        flights = client.search_cheap_flights(Config.ORIGIN_AIRPORT, max_price=Config.MAX_PRICE_BRL)
    except Exception as e:
        log.error("Erro na busca: %s", e)
        return jsonify({"error": str(e), "deals": []}), 500

    log.info("Google Flights retornou %d voos abaixo do teto", len(flights))

    deals = []
    for flight in flights:
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

    return jsonify({
        "deals": deals,
        "total_found": len(flights),
        "total_alerts": len(deals),
        "search_date": datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
        "origin": Config.ORIGIN_AIRPORT,
        "max_price": Config.MAX_PRICE_BRL,
    })


@app.route("/api/history")
def get_history():
    history = load_history()
    return jsonify({"history": history[-50:]})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
