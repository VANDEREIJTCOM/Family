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


## Routines, klusjes en gezinspot (0.14)

Stel per routine het totaal bij afronden in. De oude stapwaarden worden alleen voor de overgang bewaard; er volgen geen losse stapbeloningen meer. Vernieuw alle dashboards na de update. Bestaande puntensaldi blijven behouden, al afgeronde onderdelen worden niet opnieuw betaald.

Klusjes kunnen op naam staan, voor iedereen gelden of als keuzeklus beschikbaar zijn. Elke deelnemer krijgt een eigen afvinkmogelijkheid; een ouder controleert deze onder Goedkeuren voordat persoonlijke punten en gezinssterren worden geboekt. Handmatig toegevoegde losse taken behouden hun bestaande gedrag.

Maak bij beloningen de keuze **Gezin** om samen te sparen. De aparte gezinspot begint vanaf deze versie bij nul en bevat nieuw toegekende routine- en kluspunten. Persoonlijke bestedingen verlagen hem niet. Kiezen reserveert de prijs (standaard 150 sterren); alleen een Hub-beheerder kan na uitvoering verzilveren of annuleren. De privéregistratie staat in `/data/family-progress.json` en valt onder de App-back-up.

Voor telefoonmeldingen bij klusjes stel je in de Home Assistant App-configuratie `chore_push_targets` in op de gewenste Companion `mobile_app_...`-servicenamen. Deze lijst staat los van algemene beloningsmeldingen. Zonder ontvangers blijft Goedkeuren beschikbaar. Er wordt geen testmelding verstuurd.
