# VANDEREIJT.COM Home Assistant Apps

Publieke Home Assistant App-repository van VANDEREIJT.COM.

## VANDEREIJT.COM Family Hub

**for Home Assistant**

Family Hub brengt agenda, taken, routines, punten, beloningen, lijstjes, maaltijden en het slimme huis samen in één touch-first gezinsdashboard.

### Installeren

1. Open Home Assistant.
2. Ga naar **Instellingen → Apps → Installeer een app**.
3. Open **⋮ → Repositories**.
4. Voeg toe: `https://github.com/VANDEREIJTCOM/Family`
5. Installeer en start **VANDEREIJT.COM Family Hub**.
6. Richt het gezin en de gewenste functies in vanuit de Family Hub App.
7. Open **Dashboard** en klik **Dashboard installeren / bijwerken**.

Er zijn geen handmatige YAML- of Lovelace-resource-stappen nodig.

### Family Hub 0.6

- gezamenlijke en persoonlijke agenda
- taken en terugkerende slimme taken
- routines met visuele stappen
- punten en beloningen
- gedeelde lijstjes en boodschappen
- maaltijdplanner en ingrediënten
- ICS/webcal-agenda's
- vertrekhulp
- Home Assistant huisstatus en meldingen
- persoonlijke gezinsprofielen
- screensaver/fotolijst
- responsive mobiele weergave
- configureerbare onderste navigatie
- configureerbare indeling van het Vandaag-scherm

Family Hub gebruikt native Home Assistant-entiteiten waar dat logisch is en maakt ontbrekende lokale agenda's, takenlijsten en puntenhelpers automatisch aan.

## Updates

Home Assistant leest de versie uit `vandereijt_family_hub/config.yaml`. Zodra een nieuwe versie in deze repository staat, kan Home Assistant deze als App-update aanbieden. Een door Family Hub beheerd dashboard en kaart-resource worden bij het starten van de nieuwe versie automatisch gesynchroniseerd.

## Ontwikkeling

Zie `RELEASING.md` voor het releaseproces.
