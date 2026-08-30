import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Template
from jarvis_trip.config import Config

EMAIL_TEMPLATE = """\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 24px; color: #fff;">
      <h1 style="margin: 0; font-size: 22px;">&#9992; Jarvis Trip — Alerta de Voo</h1>
      <p style="margin: 8px 0 0; opacity: 0.9;">{{ alert_count }} oportunidade{{ 's' if alert_count > 1 else '' }} encontrada{{ 's' if alert_count > 1 else '' }}</p>
    </div>
    <div style="padding: 24px;">
      {% for deal in deals %}
      <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="margin-bottom: 8px;">
          <h2 style="margin: 0; color: #1a73e8; font-size: 18px;">{{ deal.origin }} &rarr; {{ deal.city_to }}, {{ deal.country_to }}</h2>
          <span style="font-size: 24px; font-weight: bold; color: #2e7d32;">R$ {{ deal.price }}</span>
        </div>
        <p style="margin: 4px 0; color: #555;">
          <strong>Ida:</strong> {{ deal.departure_date }}
          {% if deal.return_date %} &nbsp;|&nbsp; <strong>Volta:</strong> {{ deal.return_date }}{% endif %}
        </p>
        {% if deal.nights %}<p style="margin: 4px 0; color: #555;"><strong>Noites:</strong> {{ deal.nights }}</p>{% endif %}
        <p style="margin: 4px 0; color: #555;"><strong>Paradas:</strong> {{ deal.stops }}</p>
        <p style="margin: 8px 0 0; color: #777; font-size: 13px;">{{ deal.reason }}</p>
        {% if deal.booking_link %}
        <a href="{{ deal.booking_link }}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #1a73e8; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">Ver e reservar</a>
        {% endif %}
      </div>
      {% endfor %}
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
        Pesquisa feita em {{ search_date }} &bull; Jarvis Trip
      </p>
    </div>
  </div>
</body>
</html>
"""


def send_alert(deals: list[dict], search_date: str) -> None:
    html = Template(EMAIL_TEMPLATE).render(
        deals=deals, alert_count=len(deals), search_date=search_date
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Jarvis Trip — {len(deals)} voo{'s' if len(deals) > 1 else ''} barato{'s' if len(deals) > 1 else ''}"
    msg["From"] = Config.SMTP_USER
    msg["To"] = Config.ALERT_EMAIL_TO

    plain = "\n".join(
        f"{d['origin']} -> {d['city_to']}: R${d['price']} ({d['departure_date']})"
        for d in deals
    )
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
        server.starttls()
        server.login(Config.SMTP_USER, Config.SMTP_PASSWORD)
        server.sendmail(Config.SMTP_USER, Config.ALERT_EMAIL_TO, msg.as_string())
