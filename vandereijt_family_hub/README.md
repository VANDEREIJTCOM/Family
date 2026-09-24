# VANDEREIJT.COM Family Hub

Een Home Assistant App voor het centraal configureren van een gezinsdisplay met agenda's, taken, boodschappen, aanwezigheid, kleuren en een achtergrondfoto.

De App bevat twee delen:

1. **Family Hub App** – beheer via Home Assistant Ingress.
2. **Family Hub Card** – de full-screen Lovelace-kaart voor het wanddisplay.

De App kopieert de Lovelace-kaart en de actuele configuratie automatisch naar `/config/www/family-hub/`.

## Functies in v0.4.0

- Gezinssamenstelling beheren zonder YAML
- Kleur en MDI-icoon per gezinslid
- `person.*`, `calendar.*` en `todo.*` kiezen uit Home Assistant
- Weer- en boodschappen-entiteit kiezen
- Achtergrondfoto uploaden en lokaal opslaan
- Transparantie/achtergronddekking instellen
- Hoofdkleur instellen
- Automatische publicatie van `settings.json`
- Automatische installatie/update van `family-hub-card.js`
- Configuratie blijft in `/data` bewaard en valt onder Home Assistant App backups

## Dashboard

Voeg éénmalig de resource toe:

```text
/local/family-hub/family-hub-card.js
```

Gebruik daarna in een Panel-view:

```yaml
type: custom:family-hub-card
config_url: /local/family-hub/settings.json
```

Daarna gebeurt de verdere inrichting vanuit de Family Hub App.

## Migratie

Bij een bestaande v0.1/v0.2-installatie wordt `/config/www/family-hub-card.js` automatisch naar de nieuwe kaart bijgewerkt als dat bestand al aanwezig is. Daardoor kan de bestaande Lovelace resource blijven staan.
