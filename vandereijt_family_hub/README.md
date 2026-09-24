# VANDEREIJT.COM Family Hub

**for Home Assistant**

Family Hub is een Home Assistant App voor een centraal gezinsdisplay met agenda's, taken, boodschappen, aanwezigheid, kleuren en een eigen achtergrond.

De App bestaat uit:
1. **Family Hub App** – beheer via Home Assistant Ingress.
2. **Family Hub Card** – de full-screen Lovelace-kaart voor het wanddisplay.

## Functies in v0.5.0

- Gezinssamenstelling beheren zonder YAML
- Kleur en MDI-icoon per gezinslid
- `person.*`, `calendar.*` en `todo.*` kiezen uit Home Assistant
- Weer- en boodschappen-entiteit kiezen
- Achtergrondfoto uploaden en lokaal opslaan
- Transparantie en accentkleur instellen
- Automatische publicatie van `settings.json`
- Automatische installatie en update van `family-hub-card.js`
- Dashboard volledig vanuit de Family Hub App installeren
- Automatische registratie van de dashboard-resource via de Home Assistant WebSocket API
- Automatische full-screen Panel-view
- Keuze om Family Hub wel of niet in de Home Assistant-zijbalk te tonen
- Automatische synchronisatie van een beheerd dashboard na OTA-updates
- Dashboard vanuit de App verwijderen zonder de Family Hub-instellingen te wissen
- Configuratie blijft in `/data` bewaard en valt onder Home Assistant App backups

## Dashboard

Open in de Family Hub App het tabblad **Dashboard**. Kies de gewenste naam en of het dashboard in de Home Assistant-zijbalk zichtbaar moet zijn. Klik daarna op **Dashboard installeren / bijwerken**.

Er zijn geen handmatige YAML-, Resource- of Dashboard-stappen nodig.

## Techniek

Family Hub gebruikt de door Home Assistant ondersteunde storage-mode Lovelace WebSocket API om resources en dashboards te beheren. De kaart zelf wordt lokaal gepubliceerd onder `/local/family-hub/`.
