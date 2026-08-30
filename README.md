# Jarvis Trip — Alerta de Precos de Voos

Sistema automatizado que busca diariamente os voos mais baratos saindo de GYN (Goiania) e envia alertas por e-mail.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edite .env com suas credenciais
```

### Credenciais necessarias

1. **Kiwi Tequila API** — crie uma conta gratuita em [tequila.kiwi.com](https://tequila.kiwi.com), crie uma "Solution" e copie a API Key
2. **Gmail App Password** — ative verificacao em 2 etapas e gere uma senha de app em [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

## Uso

```bash
# Executar manualmente
python -m jarvis_trip.main

# Agendar via cron (1x ao dia as 8h)
# crontab -e
# 0 8 * * * cd /caminho/do/projeto && python -m jarvis_trip.main
```

## Configuracao (.env)

| Variavel | Descricao | Default |
|---|---|---|
| `ORIGIN_AIRPORT` | Aeroporto de origem (IATA) | `GYN` |
| `MAX_PRICE_BRL` | Teto de preco em R$ para disparar alerta | `800` |
| `PRICE_DROP_PERCENT` | % de queda vs. media historica para alertar | `20` |

## Estrutura

```
jarvis_trip/
  config.py          # Configuracoes via .env
  flight_client.py   # Cliente Kiwi Tequila API (busca de voos)
  price_filter.py    # Logica de filtro de preco
  email_alert.py     # Template e envio de e-mail
  history.py         # Persistencia do historico (JSON)
  main.py            # Orquestrador principal
data/
  alert_history.json # Historico de alertas (gerado automaticamente)
```
