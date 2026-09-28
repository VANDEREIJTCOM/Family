# Changelog

## 0.8.1 — beheerinterface herstel en polish
- Beheerinterface gebruikt voortaan **unieke CSS- én JavaScript-bestanden per release**, zodat Home Assistant, browser- of serviceworker-cache geen oude beheerlaag kan combineren met nieuwe markup.
- Routinemanagement opnieuw visueel aangescherpt: echte kaarten, duidelijke hiërarchie, persoonchips, planning, stappen/punten en rustige statuslabels.
- Acties staan compact onder de kaart: **Bewerken**, **Kopiëren** en een subtiele verwijderactie.
- Bewerken/kopiëren/verwijderen krijgen nu expliciete eventbindings na iedere render in plaats van alleen één globale click-handler.
- Hetzelfde robuuste actiepatroon geldt voor terugkerende taken, lijstjes, beloningen en vertrekhulp.
- Responsive gedrag verbeterd voor brede desktopweergave én kleinere beheerpanelen.
- Extra validatie toegevoegd voor de versiegebonden beheerassets en directe managementbindings.


## 0.8.0 — product-UX en slimme routines
- Configuratieschermen voor routines, terugkerende taken, lijstjes, beloningen en vertrekhulp zijn compact overzichtsscherm + aparte editor geworden.
- Routines kunnen aan meerdere gezinsleden tegelijk worden gekoppeld.
- Routines kunnen worden bewerkt, gekopieerd, gepauzeerd en verwijderd zonder lange configuratiepagina's.
- Routine-templates toegevoegd voor ochtend, bedtijd, na school en sport.
- Routine-stappen worden automatisch in de takenlijst van ieder gekozen gezinslid gezet.
- Routines kunnen automatisch als agenda-afspraak bij ieder gekozen gezinslid verschijnen.
- Dashboard toont multi-persoonsroutines per persoon met eigen voortgang.
- Aanbevelingen toegevoegd: ochtendroutine voor kinderen zonder routine, bundelen van meerdere terugkerende taken en automatisch maken van vaak handmatig ingevoerde taken.
- Aanbevelingen zijn opt-in: de gebruiker kiest altijd zelf of een voorstel wordt toegepast.
- Zelfde compacte bewerk-/kopieer-/verwijderpatroon toegepast op terugkerende taken, lijstjes, beloningen en vertrekhulp.
- Technische Home Assistant-details blijven op de achtergrond; de beheer-App werkt primair met gezinsbegrippen.


## 0.7.1 — automatisch vernieuwen na updates
- Family Hub controleert automatisch of de draaiende App een nieuwere versie heeft dan de geladen beheerinterface.
- Na een update verschijnt kort **Family Hub is bijgewerkt** en wordt de beheerinterface vanzelf opnieuw geladen.
- Ook het Family Hub-dashboard controleert de gepubliceerde App-versie en vernieuwt zichzelf automatisch zodra de nieuwe kaartresource beschikbaar is.
- De openbare Family Hub-instellingen bevatten voortaan de actieve App-versie voor deze updatecontrole.
- Geen handmatige App-herstart, Ctrl+F5 of Home Assistant-herstart nodig na toekomstige Family Hub-updates.
- Updatecontroles blijven stil tijdens de korte periode waarin de App-container opnieuw opstart.


## 0.7.0 — Family-friendly setup
- Beheerinterface opnieuw ingericht voor niet-technische gezinsleden: gewone taal voorop, technische Home Assistant-koppelingen onder **Geavanceerd**.
- Routines hebben nu een visuele stappenbouwer: **+ Stap toevoegen**, stapnaam, icoonbibliotheek, optionele punten en omhoog/omlaag/verwijderen.
- Bij punten staat nu expliciet wat ze betekenen: punten worden verdiend wanneer een stap of taak wordt afgerond.
- Gemeenschappelijke visuele icoonbibliotheek toegevoegd voor gezinsleden, routines, stappen, taken, lijstjes, beloningen en vertrekhulp.
- Terugkerende taken gebruiken duidelijke labels zoals **Wat moet er gebeuren?**, **Wanneer klaar?** en **Punten voor afronden**.
- Vertrekhulp heeft nu een echte checklistbouwer in plaats van een technisch tekstvak met één regel per item.
- Bestaande Home Assistant agenda-/todo-koppelingen blijven beschikbaar, maar staan uit de weg voor gezinnen die Family Hub alles automatisch laten regelen.
- Entiteitkeuzes tonen vooral de vriendelijke Home Assistant-naam in plaats van technische entity-ID's.
- Teksten in Agenda's, Lijstjes, Punten en Huis & vertrek herschreven met voorbeelden uit het dagelijks gezinsleven.


## 0.6.7
- Fix voor taak-/afspraakvensters die tijdens Home Assistant state-updates opnieuw werden gerenderd.
- Een open **Voor wie**-keuzelijst blijft nu open en selecteerbaar.
- Tekstvelden in modals behouden focus tijdens achtergrondupdates.
- Toetsaanslagen vanuit Family Hub-formulieren lekken niet meer door naar Home Assistant-snelzoeken/apparaten zoeken.
- Klok- en dataverversingen renderen niet over een geopend formulier heen.
- Screensaver wordt niet geactiveerd zolang een invoervenster openstaat.


## 0.6.6
- Fix voor een JavaScript-initialisatiefout in de beheerinterface: `ensureSettingsShape(value=settings)` kon `settings` benaderen vóór initialisatie.
- `ensureSettingsShape` heeft geen default-parameter meer en `settings` wordt veilig gestart met een expliciete lege waarde.
- Nieuwe unieke beheerasset `family-hub-admin-0.6.6.js`.
- Hierdoor worden navigatie, gezinsbeheer en opslaan weer gebonden zodra de beheerinterface opent.
- Extra runtime-validatie toegevoegd zodat deze specifieke initialisatiefout niet opnieuw ongemerkt door alleen een syntaxcheck kan glippen.


## 0.6.5
- De beheerinterface gebruikt nu een volledig nieuwe assetnaam: `family-hub-admin-0.6.5.js`.
- Hiermee kan Home Assistant/Chrome geen oude `app.js` meer hergebruiken onder een nieuwe querystring.
- De robuuste settings-initialisatie en fouttolerante eventbinding uit 0.6.3/0.6.4 blijven behouden.
- In F12 moet nu expliciet `[Family Hub] beheerinterface 0.6.5 start` verschijnen.


## 0.6.4
- Beheerinterface-assets worden nu expliciet met `no-store` geserveerd.
- Nieuwe assetversie voorkomt dat Home Assistant/Chrome een eerdere 0.6.3 `app.js` blijft uitvoeren.
- De beheerinterface meldt in de console expliciet `Family Hub beheerinterface 0.6.4 start`.
- Script wordt met `defer` geladen zodat de DOM volledig beschikbaar is vóór initialisatie.
- Dit lost de resterende `addEventListener`- en `settings.members`-fouten uit een oude gecachte admin-JS op.


## 0.6.3
- Fix voor de beheerinterface waarbij één ontbrekend DOM-element de volledige initialisatie kon afbreken met `Cannot read properties of null (reading 'addEventListener')`.
- Eventbinding is nu fouttolerant: ontbrekende velden worden gelogd maar blokkeren het laden van opgeslagen gezinsleden niet meer.
- Opslaan toont en logt nu de daadwerkelijke foutmelding, zodat configuratieproblemen direct zichtbaar zijn.
- Family Hub ruimt oude/dubbele Lovelace-resources zoals oudere `family-hub-card.js` registraties automatisch op.
- De dashboardkaart voorkomt een harde CustomElementRegistry-crash als een oude resource tijdens dezelfde browser-sessie nog geladen is.
- Dit lost tevens de situatie op waarbij een oude Family Hub v0.3-kaart naast de nieuwe kaart geladen werd.


## 0.6.2
- Home Assistant Ingress-fix: API-root wordt nu afgeleid van het daadwerkelijk geladen `static/app.js`-bestand in plaats van de zichtbare browser-URL.
- Hierdoor werken `/api/settings`, `/api/entities` en opslaan betrouwbaar vanuit de Home Assistant App-route.
- **+ Gezinslid** gebruikt altijd een geldige settings-structuur en geeft direct visuele feedback.
- Backend-calls krijgen een timeout met een duidelijke foutmelding in plaats van eindeloos laden.
- De beheerinterface toont nu expliciet **Family Hub 0.6.2**, zodat eenvoudig te controleren is welke frontendversie actief is.


## 0.6.1
- Fix voor de beheer-App wanneer Home Assistant Ingress de App zonder afsluitende slash opent.
- API-calls gebruiken nu expliciet het actuele Ingress-basispad.
- Instellingen worden eerst geladen voordat bewerken wordt vrijgegeven.
- **+ Gezinslid** kan niet meer crashen op een nog niet geladen/null configuratie.
- Opslaan gebruikt een veilige lokale basisconfiguratie als bescherming tegen een onvolledige init.
- Het laden van instellingen en Home Assistant-entiteiten is gescheiden, zodat een trage entitylijst de gezinsconfiguratie niet blokkeert.
- Duidelijkere verbindingsstatus in de beheer-App.


## 0.6.0 — Full Family Hub
- Volledig nieuwe touch-first Family Hub-interface met een vaste, configureerbare navigatiebalk onderaan.
- Admin bepaalt welke schermen zichtbaar zijn en in welke volgorde ze in de navigatie staan.
- Admin bepaalt ook welke blokken op het startscherm **Vandaag** zichtbaar zijn en in welke volgorde.
- Persoonlijke profielpagina's per gezinslid met afspraken, taken, routines en punten.
- Routines met visuele stappen, voortgang, dagen, tijden en punten per stap.
- Slimme terugkerende taken met gezinslid, weekdagen, deadline, icoon en punten.
- Punten worden opgeslagen in automatisch aangemaakte Home Assistant `input_number` helpers.
- Beloningen met puntkosten en inwisselen vanaf het Family Hub-scherm.
- Meerdere gedeelde lijstjes, ieder als native Home Assistant To-do.
- Automatische boodschappenlijst en maaltijdplanner met ingrediënten naar boodschappen.
- Externe publieke ICS/webcal-agenda's vanuit de Family Hub App toevoegen.
- Vertrekhulp op basis van afspraken en configureerbare checklists.
- Configureerbaar slim-huisblok met Home Assistant-entiteiten.
- Contextuele meldingen op basis van geselecteerde Home Assistant-entiteiten.
- Screensaver/fotolijst na inactiviteit met klok, datum, achtergrond en optionele foto-URL's.
- Responsive weergave voor wanddisplay, tablet en telefoon.
- Family Hub maakt benodigde lokale agenda's, takenlijsten, routine-lijsten, lijstjes, maaltijdlijst en puntenhelpers automatisch aan.
- Routines en terugkerende taken worden door de App dagelijks automatisch klaar gezet.
- Bestaande Home Assistant agenda's en To-do's blijven selecteerbaar en worden niet vervangen.


## 0.5.3
- Nieuwe gezinsleden krijgen automatisch een lokale Home Assistant-agenda en lokale takenlijst wanneer geen bestaande `calendar.*` of `todo.*` is gekozen.
- Bestaande gezinsleden met lege agenda/taken-koppelingen worden na de App-update automatisch aangevuld.
- De afspraak- en taakdialogen tonen voortaan altijd de gezinsleden; ontbrekende koppelingen worden duidelijk gemarkeerd in plaats van een lege **Voor wie**-lijst.
- Na opslaan worden automatisch aangemaakte agenda's en takenlijsten direct opnieuw uit Home Assistant ingelezen.
- Bestaande externe agenda's en takenlijsten blijven gewoon te selecteren en worden niet vervangen.


## 0.5.2
- Fix: de Family Hub-view gebruikt nu de native Home Assistant `panel: true`-instelling in plaats van een ongeldig view-type.
- Fix: de kaart uit de Home Assistant kaartkiezer vult automatisch `config_url: /local/family-hub/settings.json` in.
- De Family Hub-kaart werkt daardoor ook als een gebruiker hem handmatig uit de kaartkiezer toevoegt.
- Bestaande door Family Hub beheerde Overzicht-tabs worden bij **Dashboard installeren / bijwerken** automatisch naar de correcte panelconfiguratie hersteld.


## 0.5.1
- Fix voor de dashboardinstallatie-fout waarbij Home Assistant `Invalid format for dictionary value @ data['icon']` kon geven.
- Family Hub wordt nu automatisch als full-screen tab aan het bestaande **Overzicht** toegevoegd.
- De optie **Ook apart tonen in de zijbalk** maakt daarnaast een apart Family Hub-dashboard in de zijbalk; uitgevinkt blijft alleen de tab in Overzicht bestaan.
- Installatie is veilig/idempotent: bestaande niet-Family-Hub views of dashboards worden niet overschreven.
- Installatiestatus maakt nu onderscheid tussen Overzicht, zijbalk en de kaart-resource.
- Branding-assets opnieuw op maat gemaakt voor Home Assistant: 128x128 app-icoon en compact 250x100 productlogo.


## 0.5.0
- Dashboardinstallatie volledig vanuit de Family Hub App.
- Family Hub registreert de Lovelace JavaScript-resource automatisch via de Home Assistant WebSocket API.
- Met één knop wordt een full-screen Panel-dashboard aangemaakt of bijgewerkt.
- In de App kies je of het Family Hub-dashboard in de Home Assistant-zijbalk zichtbaar is.
- Na OTA-updates wordt een beheerd dashboard automatisch gesynchroniseerd en krijgt de kaart-resource automatisch een nieuwe cache-versie.
- Dashboard kan vanuit de App weer veilig worden verwijderd zonder de Family Hub-instellingen te wissen.
- Nieuw blauw/geel VANDEREIJT.COM app-icoon en een witte productbanner voor de App-detailpagina.
- Handmatige YAML- en resource-installatiestappen zijn verwijderd.


## 0.4.1
- Officieel VANDEREIJT.COM app-icoon toegevoegd voor de Home Assistant Apps-lijst.
- VANDEREIJT.COM logo toegevoegd voor de App-detailpagina.
- Branding-assets worden nu rechtstreeks met de App meegeleverd.


## 0.4.0
- Nieuwe productnaam: **VANDEREIJT.COM Family Hub** met slogan **for Home Assistant**.
- Home Assistant-menu blijft bewust **Family Hub**.
- Beheerinterface omgezet naar de actuele VANDEREIJT.COM huisstijl.
- Exacte merkkleuren toegepast: navy `#0A1628`, blauw `#2E6CA5`, donkerblauw `#23527D` en geel `#FFDD00`.
- Lato als merklettertype en het officiële gele VANDEREIJT.COM beeldmerk toegevoegd.
- Oude standaardaccentkleur wordt bij upgrade automatisch gemigreerd naar het merkblauw; eigen gekozen kleuren blijven behouden.
- Dashboardkaart voorzien van subtiele VANDEREIJT.COM-productbranding en bijgewerkte versie-informatie.


## 0.3.2
- Fix voor instellingen opslaan via Home Assistant Ingress wanneer requests chunked worden doorgestuurd.
- Lege POST requests worden niet meer stilletjes als standaardinstellingen opgeslagen.
- Backend verifieert na opslaan hoeveel gezinsleden werkelijk persistent zijn opgeslagen.
- UI toont na opslaan expliciet het aantal opgeslagen gezinsleden.
- Cache-busting voor de beheerinterface.


## 0.3.1

- Fix: gezinsleden worden bij Opslaan rechtstreeks uit het formulier verzameld.
- Fix: browser-autofill, plakken en velden die nog focus hebben kunnen niet meer verloren gaan.
- Validatie: een gezinslid zonder naam wordt niet stilletjes verwijderd; de App toont nu een duidelijke melding.
- Extra synchronisatie voor gewijzigde gezinsvelden.

## 0.3.0

- Omgebouwd van losse HACS/Lovelace-card naar Home Assistant App + card.
- Eigen beheerinterface via Ingress.
- Gezinssamenstelling en kleuren vanuit de App beheren.
- Home Assistant-entiteiten automatisch ophalen en selecteren.
- Achtergrondfoto uploaden.
- Accentkleur en achtergronddekking instellen.
- Card en `settings.json` automatisch publiceren naar `/config/www/family-hub/`.
- Lovelace-card kan configuratie via `config_url` laden.
