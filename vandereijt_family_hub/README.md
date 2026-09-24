# VANDEREIJT.COM Family Hub

**for Home Assistant**

Family Hub is een Home Assistant App voor een centraal gezinsdisplay met agenda's, taken, boodschappen, aanwezigheid, kleuren en een eigen achtergrond.

## Functies in v0.5.1

- Gezinssamenstelling beheren zonder YAML
- Kleur en MDI-icoon per gezinslid
- `person.*`, `calendar.*` en `todo.*` kiezen uit Home Assistant
- Weer- en boodschappen-entiteit kiezen
- Achtergrondfoto uploaden en lokaal opslaan
- Transparantie en accentkleur instellen
- Automatische publicatie van `settings.json`
- Automatische registratie en update van `family-hub-card.js`
- Family Hub automatisch als full-screen tab toevoegen aan het bestaande **Overzicht**
- Optioneel een apart Family Hub-dashboard in de Home Assistant-zijbalk tonen
- Automatische synchronisatie na OTA-updates
- Family Hub-tab en zijbalkdashboard vanuit de App verwijderen zonder gezinsinstellingen te wissen
- Configuratie blijft in `/data` bewaard en valt onder Home Assistant App backups

## Dashboard

Open in de Family Hub App het tabblad **Dashboard**. Kies de gewenste naam en of je Family Hub daarnaast apart in de Home Assistant-zijbalk wilt zien. Klik vervolgens op **Dashboard installeren / bijwerken**.

Family Hub voegt altijd een full-screen tab aan **Overzicht** toe. Alleen wanneer de zijbalkoptie is aangevinkt, wordt daarnaast een apart Family Hub-dashboard aangemaakt.

Er zijn geen handmatige YAML-, Resource- of Dashboard-stappen nodig.
