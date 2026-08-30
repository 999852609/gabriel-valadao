# Jarvis Trip — Alerta de Precos de Voos

Sistema automatizado que busca diariamente os voos mais baratos saindo de GYN (Goiania) via Google Flights e envia alertas por e-mail.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edite .env com suas credenciais
```

### Credenciais necessarias

1. **SerpApi** — cadastre-se gratis em [serpapi.com](https://serpapi.com) (pode usar conta Google), copie a API Key do dashboard
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

## Destinos monitorados

30 destinos populares (nacionais e internacionais): SAO, GIG, BSB, SSA, REC, FOR, CWB, POA, BEL, MAO, FLN, NAT, MCZ, CGR, MIA, EZE, SCL, BOG, LIM, CUN, MEX, LIS, MAD e mais.

## Estrutura

```
jarvis_trip/
  config.py          # Configuracoes via .env
  flight_client.py   # Cliente SerpApi / Google Flights
  price_filter.py    # Logica de filtro de preco
  email_alert.py     # Template e envio de e-mail
  history.py         # Persistencia do historico (JSON)
  main.py            # Orquestrador principal
data/
  alert_history.json # Historico de alertas (gerado automaticamente)
```
