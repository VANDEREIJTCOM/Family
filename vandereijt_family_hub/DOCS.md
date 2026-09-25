# VANDEREIJT.COM Family Hub – installatie en beheer

## Installatie

1. Voeg `https://github.com/VANDEREIJTCOM/Family` toe als Home Assistant App-repository.
2. Installeer **VANDEREIJT.COM Family Hub**.
3. Start de App.
4. Voeg onder **Gezin** de gezinsleden toe.
5. Druk **Opslaan**. Family Hub maakt ontbrekende lokale agenda's, takenlijsten en puntenhelpers automatisch aan.
6. Richt de gewenste functies in.
7. Open **Dashboard** en klik **Dashboard installeren / bijwerken**.

Daarna registreert Family Hub automatisch de Lovelace resource, de full-screen Family Hub-tab in Overzicht en optioneel het zijbalkdashboard.

## Beheer in 0.6

De beheerinterface bevat aparte onderdelen voor:
- gezin en Home Assistant-koppelingen;
- bestaande en publieke ICS/webcal-agenda's;
- routines en terugkerende taken;
- gedeelde lijstjes en maaltijdplanner;
- punten en beloningen;
- slim-huisstatus, meldingen en vertrekhulp;
- schermen, onderste navigatie en de indeling van Vandaag;
- achtergrond en screensaver;
- dashboardinstallatie.

## Automatisch aangemaakte Home Assistant-entiteiten

Wanneer nodig maakt Family Hub zelf native entiteiten aan:
- `calendar.*` via Local Calendar;
- `todo.*` via Local To-do;
- `input_number.*` voor punten.

Bestaande gekoppelde entiteiten worden niet vervangen.

## Externe agenda's

Een publieke ICS/webcal-link kan vanuit **Agenda's** rechtstreeks worden toegevoegd. Agenda's met provider-authenticatie, zoals privé Google- of Microsoft-agenda's, voeg je als Home Assistant-integratie toe; daarna verschijnen ze automatisch in de Family Hub-keuzelijsten.

## Schermindeling

Onder **Schermen & navigatie** bepaalt de administrator:
- welke Family Hub-schermen zichtbaar zijn;
- de volgorde in de onderste navigatiebalk;
- welke blokken op **Vandaag** staan;
- de volgorde van die blokken.

## Veiligheid

- De beheerinterface gebruikt Home Assistant Ingress en is alleen voor administrators zichtbaar.
- Family Hub gebruikt de Home Assistant API en WebSocket API.
- Family Hub overschrijft geen niet-Family-Hub dashboard/view met dezelfde naam.
- Gezinsdata wordt niet naar een VANDEREIJT.COM cloudservice verstuurd.
