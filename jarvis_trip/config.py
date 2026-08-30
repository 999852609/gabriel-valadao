import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    AMADEUS_API_KEY = os.environ["AMADEUS_API_KEY"]
    AMADEUS_API_SECRET = os.environ["AMADEUS_API_SECRET"]
    AMADEUS_BASE_URL = "https://test.api.amadeus.com"

    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.environ["SMTP_USER"]
    SMTP_PASSWORD = os.environ["SMTP_PASSWORD"]
    ALERT_EMAIL_TO = os.environ["ALERT_EMAIL_TO"]

    ORIGIN_AIRPORT = os.getenv("ORIGIN_AIRPORT", "GYN")
    MAX_PRICE_BRL = float(os.getenv("MAX_PRICE_BRL", "800"))
    PRICE_DROP_PERCENT = float(os.getenv("PRICE_DROP_PERCENT", "20"))

    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    HISTORY_FILE = os.path.join(DATA_DIR, "alert_history.json")
