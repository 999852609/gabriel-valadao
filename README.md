# Jarvis Trip — Alerta de Preços de Voos

Sistema automatizado que busca diariamente os voos mais baratos saindo de GYN (Goiânia) e envia alertas por e-mail.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edite .env com suas credenciais
```

### Credenciais necessárias

1. **Amadeus API** — crie uma conta gratuita em [developers.amadeus.com](https://developers.amadeus.com) e gere API Key + Secret
2. **Gmail App Password** — ative verificação em 2 etapas e gere uma senha de app em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

## Uso

```bash
# Executar manualmente
python -m jarvis_trip.main

# Agendar via cron (1x ao dia às 8h)
# crontab -e
# 0 8 * * * cd /caminho/do/projeto && python -m jarvis_trip.main
```

## Configuração (.env)

| Variável | Descrição | Default |
|---|---|---|
| `ORIGIN_AIRPORT` | Aeroporto de origem (IATA) | `GYN` |
| `MAX_PRICE_BRL` | Teto de preço em R$ para disparar alerta | `800` |
| `PRICE_DROP_PERCENT` | % de queda vs. média histórica para alertar | `20` |

## Estrutura

```
jarvis_trip/
  config.py          # Configurações via .env
  amadeus_client.py  # Cliente Amadeus API (OAuth2 + endpoints)
  price_filter.py    # Lógica de filtro de preço
  email_alert.py     # Template e envio de e-mail
  history.py         # Persistência do histórico (JSON)
  main.py            # Orquestrador principal
data/
  alert_history.json # Histórico de alertas (gerado automaticamente)
```
