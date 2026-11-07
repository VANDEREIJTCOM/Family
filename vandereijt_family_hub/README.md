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


### Routines en klusjes per persoon

Taken en Routines openen één dagoverzicht. Per persoon staat de gekoppelde Home Assistant-profielfoto boven alle routines van vandaag, gevolgd door een apart Klusjes-vak. De plusknop kiest die persoon alvast; opslaan gebruikt de bestaande HA-takenlijst. Een routine met start- en eindtijd opent in dat tijdvak en blijft daarbuiten handmatig uitklapbaar.

Bij **Gezin** bepaalt **Volgorde bij routines** de volgorde van links naar rechts. **Onder deze persoon tonen** plaatst een gezinslid onder de volledige lijst van een ander, ook als die ander is uitgevinkt. De bestaande weergavekeuze bepaalt één, twee of drie kolommen; kleine schermen stapelen de kolommen.

Voor een eerste installatie kan de add-onconfiguratie `activity_member_order` (lijst member-IDs) en `activity_member_stacks` (lijst `member-ID=kolom-ID`) gebruiken. Dit wordt één keer overgenomen; latere keuzes bij Gezin blijven leidend. `display_text_replacements` bevat optionele `oude tekst=nieuwe tekst`-regels voor leesbare titels en labels. Identifiers, entiteiten, URLs en voortgang worden niet vervangen. Laat deze lijsten leeg als ze niet nodig zijn.


### Klusjes beoordelen en sterren corrigeren

Een afgevinkt klusje is eerst een aanvraag (oranje). Na ouderakkoord wordt het vinkje groen en worden de ingestelde sterren bij persoon en gezin geboekt. Afkeuren toont dat het klusje opnieuw moet. Zelfbedachte taken hebben zonder ingestelde ouderbonus nul sterren; goedkeuren bevestigt dan alleen de uitvoering. Pushberichten gaan naar `chore_push_targets`; na een beslissing wordt dezelfde melding op beide telefoons bijgewerkt.

Het element `family-hub-approvals` kan met `{actions: true}` als ouderoverzicht worden opgenomen. Voor de bestaande `custom:ha-family-home`-kaart schakelt `chore_approvals: true` dit overzicht op de startpagina in. Openstaande aanvragen en eerdere beoordelingen komen uit het blijvende register. De app maakt een ontbrekend HA-script `script.family_hub_chore_decision` aan via de ondersteunde scriptconfiguratie-API; een bestaande gebruikersdefinitie wordt nooit overschreven. Geef niet-beherende ouderaccounts zo nodig alleen de klusjesbevoegdheid via `chore_approver_user_ids` (HA-user-IDs). De server controleert de echte HA-eventcontext en actieve gebruikersstatus. Een child-account kan deze bevoegdheid niet krijgen door een ID in het verzoek te zetten. HA-rollen blijven ongewijzigd.

Bij het uitvinken van een routinestap wordt een eerder toegekende routinester teruggeboekt bij persoon en gezin. Herhaald uit- en aanvinken kan geen extra saldo opleveren. Als sterren intussen besteed zijn, gaat het zichtbare saldo niet onder nul; het tekort wordt met volgende verdiende sterren verrekend. De optelling en terugboeking worden eerst in het register vastgelegd, zodat een onderbroken verbinding of herstart geen dubbele afschrijving geeft.

Live vernieuwing gebruikt de standaard HA-state-events van `sensor.family_hub_settings`, `sensor.family_hub_progress` en `sensor.family_hub_chore_result`. Hierdoor werken snelle updates en bevestigingen ook voor niet-beherende ouder- en displayaccounts; aangepaste eventabonnementen met HA-beheerrechten zijn niet nodig. De resultaatsensor bevat geen goedkeuringssleutels of private meldtokens.


### Eén klusje over meerdere dagen

Bij een klusje kiest **Hoe vaak binnen de gekozen dagen?** tussen **Iedere gekozen dag opnieuw** (standaard) en **Eén keer binnen de gekozen dagen**. Voor weekdagen geldt één gelegenheid per kalenderweek; voor specifieke datums één gelegenheid over de hele selectie. Dit werkt per gezinslid. Na zaterdag uitvoeren ontstaat zondag geen tweede taak; na akkoord verdwijnt de afgehandelde weekendklus op de volgende dag. Een open aanvraag blijft herkenbaar, en afkeuren laat hetzelfde taakje opnieuw doen. De volgende week begint een nieuwe gelegenheid.

### Bonusster aanvragen

**Sterretje** boven het gecombineerde overzicht opent de kinderprofielfoto's. Foto kiezen vraagt precies één bonusster aan. De server gebruikt de ingestelde persoonlijke puntenkoppeling, controleert ouderakkoord via hetzelfde beveiligde kanaal als klusjes en negeert een door de browser opgegeven puntenbedrag. Eén aanvraag-ID kan maar één keer worden beloond. Bij bevestigde toekenning verschijnt de bonusanimatie; vóór akkoord verandert geen saldo.


### Grabbelbak

Kies bij **Voor wie?** de optie **Grabbelbak · zelf kiezen**. Het klusje blijft boven de persoonskolommen staan, met zijn ingestelde icoon en sterrenwaarde. Een gezinslid kiest het klusje en vervolgens een profielfoto; alleen bij die persoon verschijnt het onder Klusjes. Open werk kan worden teruggelegd. Na afvinken volgen de bestaande oudercontrole en sterrenregistratie.

**Eén plekje** reserveert het klusje voor één persoon tegelijk. **Iedereen mag dit voor zichzelf kiezen** biedt ieder gezinslid een eigen gelegenheid, bijvoorbeeld de eigen kamer. De reservering volgt de gekozen herhaling (dagelijks of eenmaal in de periode). De server schrijft de keuze vast voordat hij de taak aanmaakt; gelijktijdige keuzes, herstarts en herhaalde verzoeken maken geen dubbele gedeelde reservering of extra sterren. Reeds afgeronde en aangevraagde oude klusjes blijven behouden; onbeantwoorde lege keuzelijsten worden niet meer automatisch onder iedereen aangemaakt.
