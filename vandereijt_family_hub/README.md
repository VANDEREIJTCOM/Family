# VANDEREIJT.COM Family Hub

**for Home Assistant**

Family Hub maakt van Home Assistant een centrale gezinsomgeving voor een wanddisplay, tablet en telefoon. De App combineert gezinsplanning met het slimme huis, zonder dat gebruikers zelf Lovelace-resources of YAML hoeven te onderhouden.

## Family Hub 0.6

### Gezin
- Persoonlijk profiel per gezinslid
- Eigen kleur, Home Assistant-persoon, agenda en takenlijst
- Automatisch lokale agenda/takenlijst als er niets is gekoppeld
- Punten per gezinslid via een automatisch aangemaakte Home Assistant helper

### Agenda
- Gezamenlijke weekagenda
- Afspraken direct vanaf het Family Hub-scherm toevoegen
- Bestaande `calendar.*` entiteiten gebruiken
- Publieke ICS/webcal-agenda vanuit de beheer-App toevoegen
- Externe Google/Outlook/CalDAV-agenda's die al in Home Assistant staan blijven selecteerbaar

### Taken, routines en punten
- Losse taken
- Terugkerende slimme taken per weekdag
- Deadline, icoon en punten
- Routines met meerdere visuele stappen
- Dagelijkse automatische generatie van routine-stappen en slimme taken
- Beloningen met puntkosten en inwisselen via het scherm

### Lijsten en maaltijden
- Meerdere gedeelde lijstjes
- Automatisch aangemaakte Home Assistant To-do per lijst
- Boodschappenlijst
- Maaltijdplanner per dag
- Ingrediënten met één druk naar boodschappen

### Slim huis
- Configureerbaar huisstatusblok met willekeurige Home Assistant-entiteiten
- Contextuele meldingen op basis van geselecteerde entiteiten
- Aanwezigheid van gezinsleden
- Vertrekhulp: match afspraken zoals voetbal/school en toon vooraf een checklist

### Schermen
- Touch-first onderste navigatiebalk
- Admin bepaalt welke schermen zichtbaar zijn en in welke volgorde
- Admin bepaalt welke blokken en volgorde het startscherm **Vandaag** heeft
- Persoonlijke gezinsprofielen
- Responsive voor wanddisplay, tablet en telefoon
- Screensaver/fotolijst met klok en datum na inactiviteit

## Installatie

1. Voeg `https://github.com/VANDEREIJTCOM/Family` toe als Home Assistant App-repository.
2. Installeer **VANDEREIJT.COM Family Hub**.
3. Start de App en open de beheerinterface.
4. Voeg gezinsleden toe en druk **Opslaan**. Family Hub maakt ontbrekende agenda's, takenlijsten en puntenhelpers automatisch aan.
5. Configureer optioneel routines, taken, lijstjes, maaltijden, vertrekhulp, huisstatus en schermindeling.
6. Open **Dashboard** en klik **Dashboard installeren / bijwerken**.

Family Hub registreert de kaart-resource, maakt de full-screen Family Hub-tab in Overzicht en optioneel een apart zijbalkitem automatisch aan.

## Opslag

Family Hub bewaart zijn configuratie in de eigen App-data. De daadwerkelijke gezinsdata wordt waar mogelijk in native Home Assistant-entiteiten opgeslagen, waaronder `calendar.*`, `todo.*` en `input_number.*`.
