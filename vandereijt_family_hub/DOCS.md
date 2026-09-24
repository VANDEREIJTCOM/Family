# VANDEREIJT.COM Family Hub – installatie

## Installatie

1. Voeg de VANDEREIJT.COM App-repository toe aan Home Assistant: `https://github.com/VANDEREIJTCOM/Family`
2. Installeer **VANDEREIJT.COM Family Hub**.
3. Start de App.
4. Richt gezin, koppelingen en uiterlijk in.
5. Open het tabblad **Dashboard**.
6. Kies of Family Hub **ook apart in de zijbalk** moet verschijnen.
7. Klik **Dashboard installeren / bijwerken**.

Family Hub registreert automatisch de kaart-resource en voegt een full-screen **Family Hub-tab toe aan het bestaande Overzicht**. Als de zijbalkoptie aan staat, wordt daarnaast een apart Family Hub-dashboard gemaakt.

## Dashboard verwijderen

Via hetzelfde tabblad kan Family Hub de door de App beheerde Overzicht-tab en het eventuele zijbalkdashboard weer verwijderen. Gezinssamenstelling en overige Family Hub-instellingen blijven bewaard.

## Veiligheid

- De beheerinterface gebruikt Home Assistant Ingress.
- Het beheer-paneel is alleen voor administrators zichtbaar.
- De App gebruikt `homeassistant_api` en de Home Assistant WebSocket API.
- Bestaande niet-Family-Hub views of dashboards worden niet overschreven.
- Er worden geen gezinsgegevens naar externe diensten verzonden.
