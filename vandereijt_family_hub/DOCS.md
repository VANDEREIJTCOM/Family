# VANDEREIJT.COM Family Hub – installatie

## Installatie

1. Voeg de VANDEREIJT.COM App-repository toe aan Home Assistant:
   `https://github.com/VANDEREIJTCOM/Family`
2. Installeer **VANDEREIJT.COM Family Hub**.
3. Start de App.
4. Open **Family Hub** en richt gezin, koppelingen en uiterlijk in.
5. Open het tabblad **Dashboard**.
6. Kies of het dashboard in de Home Assistant-zijbalk moet verschijnen.
7. Klik **Dashboard installeren / bijwerken**.

Daarna is de installatie klaar. Family Hub registreert de kaart-resource, maakt het dashboard en de Panel-view aan en houdt deze bij toekomstige App-updates automatisch actueel.

## Dashboard verwijderen

Via hetzelfde tabblad **Dashboard** kan het door Family Hub beheerde dashboard weer worden verwijderd. De gezinssamenstelling en overige Family Hub-instellingen blijven daarbij bewaard.

## Veiligheid

- De beheerinterface gebruikt Home Assistant Ingress.
- Het beheer-paneel is alleen voor administrators zichtbaar.
- De App gebruikt `homeassistant_api` voor Home Assistant-entiteiten en de officiële WebSocket API voor het beheren van het eigen dashboard.
- Family Hub wijzigt geen andere dashboards.
- Als de URL `family-hub` al door een ander dashboard wordt gebruikt, weigert Family Hub die te overschrijven.
- Er worden geen gezinsgegevens naar externe diensten verzonden.

## Bij updates

Wanneer Family Hub het dashboard beheert, synchroniseert de App na een update automatisch de resource-URL naar de nieuwe App-versie. Hierdoor wordt de nieuwe JavaScript-kaart zonder handmatige cache- of Resource-aanpassingen geladen.
