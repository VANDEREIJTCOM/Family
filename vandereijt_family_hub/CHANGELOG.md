## 0.17.1

- Onderhoudsmeldingen van Home Assistant kunnen automatisch een klusje bij Sterrenpakkers aanbieden, met een herkenbaar koffie-icoon en de actuele urgentie.
- Eén gelegenheid per onderhoudsmelding, ook over meerdere dagen/weken en herstarts. Vroege waarschuwingen, urgentie en bevestigde meldingen blijven bij hetzelfde klusje. Offline of onbekende sensoren worden niet als uitgevoerd behandeld.
- Een aanbod verdwijnt na twee minuten bevestigde afwezigheid van de melding. Een nieuwe onderhoudsronde krijgt een eigen klusje. Eerder gekozen werk en oudergoedkeuring blijven bewaard; er worden geen sterren automatisch toegekend.
- Instelbare bronregels via maintenance_task_setup; geen koffieapparaat- of gezinsnamen in productcode. Automatische taken blijven gescheiden van handmatig ingestelde klusjes en worden bij opslaan niet dubbel vastgelegd.

## 0.17.0

- Agenda-afhankelijke actieknoppen op Vandaag en Agenda. Een ingesteld trefwoord toont de actie de hele betreffende dag, ook voor afspraken van verborgen gezinsleden en gedeelde agenda’s. Dubbele afspraken leveren één knop op.
- Een gekoppeld Home Assistant-script start pas na een tik. Een actieve stand biedt een herstelknop, ook na afloop van de agendadag. Instelbare scriptkoppelingen houden verlichting en latere uitbreidingen zoals muziek centraal in Home Assistant.
- Afzonderlijke controle van de afspraken van vandaag blijft werken bij bladeren naar een andere week. Niet gekoppelde installaties krijgen geen extra knoppen of acties.

## 0.16.9

- Een afgewezen klusje heeft een wit, opnieuw aanklikbaar vakje. Bij opnieuw afvinken wordt eerst de serverreservering bevestigd; als iemand anders het klusje al koos, wordt niets afgevinkt en worden geen punten toegekend.
- Duidelijke knop **Terug naar Sterrenpakkers** bij een open gekozen of afgewezen klusje. De persoonlijke afgewezen herinnering verdwijnt na teruggeven; de beoordeling blijft in het ouderoverzicht bewaard. Teruggeven raakt nooit de reservering van een ander.

- De grabbelbak heet voortaan **Sterrenpakkers**, ook in de instellingen en op de teruggeefknop.

## 0.16.8

- Grabbelbak begint ingeklapt en opent of sluit via de volledige Grabbelbak-knop. De bonusster blijft bereikbaar.
- Stel het aantal deelnemers van een keuzeklusje in. Kies eerst je eigen foto en daarna ‘Samen met…’. Het klusje staat bij alle gekozen personen met de naam van de ander erbij. Punten en oudergoedkeuring gelden per persoon; de volledige groep wordt samen gereserveerd.
- Afgewezen klusjes krijgen weer een leeg vakje met ‘Afgewezen’. Een keuzeklusje komt terug in de grabbelbak; herstellen wordt bij een verbindingsprobleem veilig opnieuw geprobeerd.
- Klusjes op naam blijven standaard staan totdat ze zijn uitgevoerd en door een ouder goedgekeurd. De ingestelde dag is de startdag, zonder stapeling van dagelijkse exemplaren. Dit kan per klusje worden uitgezet. Bestaande vinkjes, taakrecords en verdiende sterren blijven behouden.

## 0.16.7

- Grabbelbak boven de persoonskolommen met icoon, punten en kiezen via profielfoto. Keuzeklusjes verschijnen alleen bij de gekozen persoon. Eén gedeeld plekje of één gelegenheid per persoon is instelbaar; serverreservering voorkomt dubbele keuzes. Open klusjes kunnen worden teruggelegd.

- Per klusje kiezen tussen iedere gekozen dag opnieuw en één keer binnen de gekozen dagen. Een weekendklus hoeft maar één keer per kalenderweek; een selectie specifieke datums vormt één gelegenheid. Dit geldt per persoon. Bestaande dagelijkse klusjes behouden hun gedrag.
- Eén taakrecord en ouderaanvraag per periode; zaterdag afgerond en goedgekeurd betekent zondag geen nieuwe klus. Een open aanvraag blijft dezelfde aanvraag en na afkeuren kan hetzelfde klusje opnieuw worden gedaan. Volgende week is er een nieuwe gelegenheid.
- Sterretje-knop boven Routines & klusjes met de echte kinderprofielfoto's. De bonusster wordt eerst door een ouder beoordeeld en telt pas daarna mee bij kind en gezin. Bevestigde bonus krijgt de speelse pop-up Sterretje voor een sterretje — Top gedaan! Verbindingsherstel en dubbele taps leveren geen extra sterren op.

## 0.16.6

- Klusjes tonen een oranje aangevraagd vinkje en pas na ouderakkoord een groen vinkje. Afkeuren is duidelijk herkenbaar. Ook zelf toegevoegde klusjes kunnen ter controle worden aangeboden; de bestaande regel zonder automatische bonus blijft behouden.
- Blijvend ouderoverzicht met openstaande en eerdere beoordelingen op een optioneel gekoppeld HA-thuisscherm. Goedkeuren en Afkeuren tonen resultaat en vernieuwen de pushmelding op beide oudertelefoons. Oudermachtiging wordt op de server gecontroleerd op de ingelogde HA-gebruiker.
- Het actuele persoonlijke sterrensaldo staat bij de foto boven de routines.
- Een onvolledige routine verliest de verdiende ster bij kind en gezin. Opnieuw afronden herstelt de ster zonder extra saldo door herhaald uit- en aanvinken. Terugboekingen zijn bestand tegen herstarts; al bestede sterren leveren geen nieuwe sterren op via opnieuw aanvinken.
- Vinkjes reageren direct. Na een taakwijziging wordt niet meer op een volledige agendaverversing gewacht. Sterrencontrole start bij een HA-taakwijziging en bevestigde toekenningen komen rechtstreeks naar de pop-up.

## 0.16.5

- Routines en klusjes samen in persoonskolommen met de gekoppelde profielfoto. Alle routines van vandaag blijven bij hun persoon, met tijdvakgestuurd openklappen; klusjes en de persoonlijke plusknop staan eronder. Taken en Routines openen hetzelfde overzicht, ook op Vandaag verschijnt het blok één keer.
- Volgorde en plaatsing onder een ander gezinslid zijn instelbaar bij Gezin. Bestaande gezinsselectie, vinkjes, oudergoedkeuring en sterrenregistratie blijven behouden. Geen namen in de code.
- Optionele installatie-instellingen voor een eerste persoonsindeling en het vervangen van leesbare teksten, zonder IDs, koppelingen of afbeeldingen te wijzigen.
- Nieuw kiesbaar plaatje Sieraden omdoen: gouden ketting met gekleurde hanger en kralenarmband. Hetzelfde plaatje in beheer en dashboard, ook voor routinestappen.

## 0.16.4

- Personen bij Taken en Routines rechtstreeks aan- en uitvinken, ook in de blokken op Vandaag. De selectie wordt gedeeld tussen Taken en Routines; Iedereen en Standaard zijn direct beschikbaar.
- Per gezinslid instelbaar of die standaard aangevinkt staat. Zonder eigen keuze zijn kinderen aangevinkt en volwassenen uitgevinkt. Geen namen vastgelegd in de code; agenda, punten en gezinsprofielen houden hun eigen filter.
- Handmatige keuzes blijven tijdens verversen en wisselen tussen Taken en Routines staan; opnieuw openen van het dashboard begint met de ingestelde standaardselectie.

## 0.16.3

- Nieuw puntenscherm met naamloze portretten en echte persoonlijke saldi, één gezinspot en een balk richting 150 sterren. Geen herhaalde personenlijst per beloning.
- Beloningskaarten met eigen afbeeldingen: PNG, JPG en WebP uploaden bij de beloning in beheer; grote foto’s worden verkleind. Zonder foto blijft het gekozen icoon zichtbaar.
- Bestaande vaste beloningen voor iedereen zijn ook samen te kiezen uit de gezinspot. Persoonsgebonden beloningen en het persoonlijke rad blijven bereikbaar via het portret; reserveren en verzilveren blijven via de bestaande sterrenregistratie lopen.
- Routinestappen worden niet meer dubbel aangemaakt door gelijktijdige synchronisaties. Aanwezige stappen, vinkjes, UIDs en eerder toegekende sterren blijven behouden bij wijzigingen of herstart. Dashboard toont elke huidige stap-ID één keer, met behoud van een bestaand vinkje.

## 0.16.2

- Taken en routines hebben elk een keuze voor één, twee of drie kolommen, ook per apparaat en schermprofiel. De startpagina gebruikt dezelfde indeling; smalle schermen blijven leesbaar onder elkaar.
- Geplande klusjes tonen uitsluitend de huidige configuratie voor vandaag en de juiste persoon. Oude uitvoeringen van verwijderde klusjes en andere dagen verdwijnen uit het dashboard; dubbele dagrecords verschijnen één keer. Openstaande zelf toegevoegde taken blijven zichtbaar.
- Klusjesmeldingen hebben Goedkeuren en Nog niet goed-knoppen. Een goedkeuring telt het ingestelde aantal sterren precies één keer bij het gezinslid én de gezinspot op. Eerdere tekstmeldingen worden bij de eerste synchronisatie vervangen.
- Kleurrijke, gedeelde kinderillustraties met zachte kleurovergangen, schaduw en herkenbare details; bestaande icoonkeuzes blijven werken. Kam en kledingkast toegevoegd.
- Een afgeronde routine blijft herkenbaar met een speelse illustratie en wisselende aanmoediging. Na bevestigde registratie blijft de verdiende ster ook in de ingeklapte titelbalk zichtbaar; handmatig openklappen blijft mogelijk.
- Nieuwe lege routines beginnen met één ster als afrondingsbeloning; bestaande ingestelde aantallen blijven behouden.

## 0.16.1

- Schoolicoon toont een herkenbaar schoolgebouw met dak, klok, ramen en deur, in beheer en dashboard. Bestaande selecties blijven behouden.

## 0.16.0

- Weekendfilter met zaterdag/zondag naast de werkweek.
- Eén gedeelde lokale iconenset voor beheer en dashboard; nieuwe keuzes vis, zon, rugzak, telefoon en spellen.
- Pop-ups alleen bij Goedemorgen (dagelijkse motivatie) en bevestigde sterren na een volledige routine; telanimatie toont het werkelijke vorige en nieuwe saldo.
- Klusjes en routines kunnen op één of meerdere specifieke datums worden gepland, met behoud van de wekelijkse planning.
- Routines direct verbergen/zichtbaar maken in beheer; dashboard toont alleen toepasselijke routines voor vandaag en het juiste gezinslid.
- Start- en eindtijd bepalen de standaard open/dicht-stand en prioriteit. Actieve routines staan bovenaan; na afloop ingeklapt en handmatig te openen.

## 0.15.2

- Verhelp stil afkappen na 40 routines: ruimte voor 500 routines, 1000 taken en 100 stappen per routine.
- Overschrijden geeft een duidelijke fout zonder gedeeltelijk opslaan; de beheerpagina controleert dat alle ingediende items terugkomen.

## 0.15.1

- Taaktekst verticaal gecentreerd naast het pictogram.
- Eén routinekop: klik op de volledige gekleurde titelbalk om in of uit te klappen, zonder los pijltje.

## 0.15.0

- Beheerfilters en kolommen per dag of persoon; schermen en uiterlijk samen met profielen per apparaat.
- Agenda-dagenstrook vastpakken en slepen, zonder zichtbare scrollbar.
- Identieke externe afspraken verschijnen samen met de betrokken personen; persoonlijke bronnen blijven behouden.
- Grote instelbare pictogrammen voor routines, stappen, klusjes en zelf toegevoegde taken.
- Korte gevarieerde feestjes bij bevestigde afronding en sterrenanimaties bij bevestigde punten; minder beweging wordt gerespecteerd.
- Routinemaker ondersteunt stappen slepen met muis/touch en verplaatsen met het toetsenbord; stap-ID, icoon en punten blijven behouden.

## 0.14.4

- Settings reach open Hub devices immediately through Home Assistant events.
- Read-only day agenda with horizontal date selection and a conditional Today button.
- Configurable task columns, collapsible completed routines, and parent-controlled bonuses for self-created tasks.
- Preserve reading position, reachable wall controls, saved text size and background photo; enter on Today.

# Changelog

## 0.14.3 — meer ruimte en bereikbare bediening

- Op wanddisplays kan de bovenste inhoud met een gewone veeg omlaag binnen handbereik worden gehaald. De onderste navigatie blijft staan en achtergrondverversingen behouden de positie.
- De extra losse knoppen boven de agenda zijn verwijderd; de bediening in het agendablok blijft beschikbaar.
- In de bijbehorende wandpagina vervalt de volledige FamilyHub-titelbalk, zodat de inhoud bovenaan begint.

## 0.14.2 — één navigatiebalk

- Eén onderste Hub-navigatiebalk met Home Assistant Thuis in het midden. De wandpagina kan haar eigen thuisroute meegeven.
- Personen en agenda’s filteren via de Filter-knop; selectie blijft zichtbaar in het uitklapmenu en de knoppen nemen geen vaste extra rij meer in.
- Gezin en Filter sluiten elkaar; het filter sluit met de sluitknop, Escape of een tik buiten het menu.

## 0.14.1 — duidelijke keuzeklusjes

- Kluskaartjes tonen de ingestelde puntenwaarde en dat punten na ouderakkoord volgen. Keuzeklusjes zijn herkenbaar als vrijwillig.
- Dagstappen gebruiken kalenderdatums, zodat de weekgrens ook bij zomer-/wintertijd klopt.

## 0.14.0 — routines, klusjes en samen sparen

- Scrollvlakken blijven bestaan tijdens achtergrondverversingen; positie en aanraken worden behouden.
- Instelbare punten per volledig afgeronde routine, één keer per persoon en dag. Routines verschijnen alleen op geplande dagen en zijn inklapbaar.
- Klusjes op naam, voor allemaal of als keuzeklus: punten pas na ouderakkoord in Goedkeuren. Afzonderlijke telefoonontvangers voor klusjesmeldingen via de App-configuratie.
- Gezinsbeloningen hebben een eigen sterrenteller. Persoonlijk inwisselen verlaagt die niet; kiezen reserveert sterren en ouders boeken ze pas na uitvoering af. Standaardprijs: 150 sterren.
- Namen en navigatie onderaan; agenda heeft vorige/volgende dag naast het weekoverzicht.
- Bestaande saldi blijven intact. De nieuwe gezinspot start bij nul; historische punten worden niet gereconstrueerd. Reeds afgeronde onderdelen leveren niet opnieuw punten op.
- Puntenregistratie overleeft een herstart en onderbreking tijdens toekenning. Bij een conflicterend saldo volgt controle in plaats van een tweede boeking.

## 0.13.0 — één geheel met Home Assistant

- Instellingen bevat Beheerders: geef actieve HA-gebruikers apart Family Hub-beheerrechten. HA-rollen blijven behouden; HA-beheerders houden hersteltoegang. Beheer-API en UI controleren Ingress-identiteit en app-rechten aan de serverkant.

- Scrollpositie blijft behouden bij achtergrondverversingen; verversen wacht tot een veegbeweging klaar is. Bewust wisselen van pagina blijft direct werken.

- Taaktekst en vinkje werken direct voor open en afgeronde taken, zonder detailvenster; dubbele tikken tijdens opslaan worden tegengehouden en mislukte acties kunnen opnieuw worden geprobeerd.

- Leesbare tekstmaten, ruimere bediening en een afzonderlijke opmaak voor grote portretschermen.
- Leesbare dagblokken in de portretagenda, een ruimer maaltijdplan en directe HA-koppelingen vanuit de Huis-tab.
- Een optionele wandindeling houdt Family Hub-tabs apart van de gezamenlijke schermnavigatie; profielstatussen zijn begrijpelijk en vensters hebben herkenbare sluitbediening.
- De dashboardkaart volgt de actieve Home Assistant-kleuren, kaarten en typografie; de oorspronkelijke stijl blijft optioneel beschikbaar.
- Een optionele contextstrook op Vandaag toont relevante huiszaken en verwijst naar bestaande HA-pagina's: hulpvragen, was, afwijkende ochtend, avondcheck en actieve muziek.
- Context gebruikt uitsluitend de bestaande HA-stateverbinding en verandert geen apparaten, taken, punten, agenda's of routines.
- Gezin- en statuskleuren blijven herkenbaar. Bronnen en relatieve navigatiepaden zijn per kaart configureerbaar.
- Automatische controles dekken contextkeuze, veilige navigatie, gegroepeerde muziek en de volledige runtime-build met alle eerdere migraties.

## 0.12.0 — meerdere variabele beloningsradjes
- Onder **Punten & beloningen** kun je naast vaste beloningen nu ook **beloningsradjes** maken.
- Ieder rad krijgt een eigen puntenniveau, bijvoorbeeld **5, 10 of 20 punten**, zodat je meerdere radjes naast elkaar kunt gebruiken.
- Per rad stel je zelf de vakken/prijzen samen. Ieder gevuld vak heeft dezelfde kans en er zijn minimaal twee vakken nodig.
- Zodra een gezinslid genoeg doorlopende punten heeft, verschijnt het rad automatisch onder **Mijn beloningen** op diens persoonlijke kaart met de actie **Draai het rad**.
- Het rad draait zichtbaar op het scherm en laat daarna de gekozen prijs zien.
- De gekozen prijs wordt direct onderdeel van de bestaande oudergoedkeuring. De pushmelding toont dus zowel het rad als de gedraaide prijs en bevat **Akkoord** / **Afwijzen**.
- Punten worden pas na oudergoedkeuring afgetrokken. Bij afwijzen blijft het puntensaldo ongewijzigd.
- Tijdens een open aanvraag kan hetzelfde rad niet opnieuw worden gedraaid. Na goedkeuring en aftrek kan opnieuw worden gespaard voor hetzelfde rad.
- In het puntenlogboek staat bij goedkeuring ook welke prijs uit het rad is gewonnen.
- Bestaande vaste beloningen blijven ongewijzigd werken.


## 0.11.0 — beloningen aanvragen met oudergoedkeuring
- Verdiende beloningen verschijnen nu automatisch op de **persoonlijke pagina** van het gezinslid zodra voldoende punten zijn behaald.
- Met **Verzilveren** wordt de beloning niet meer direct afgeboekt. Family Hub maakt eerst een goedkeuringsaanvraag.
- Geselecteerde ouderapparaten ontvangen via de Home Assistant Companion App een pushbericht met de acties **Akkoord** en **Afwijzen**.
- Bij een doorlopende beloning worden punten pas na **Akkoord** afgetrokken. Bij dag-, week- en maandbeloningen wordt de beloning pas na goedkeuring als behaald gemarkeerd.
- Tijdens een open aanvraag staat op de Hub **Aangevraagd · wacht op ouder**, zodat dezelfde beloning niet dubbel kan worden aangevraagd.
- Onder **Instellingen → Meldingen** staat nu een lijst met beschikbare `notify.mobile_app_*`-apparaten. Meerdere oudertelefoons/tablets kunnen worden geselecteerd.
- De nieuwe meldingenpagina bevat ook een **Test pushbericht**-knop en een schakelaar voor oudergoedkeuring van beloningen.
- Family Hub luistert rechtstreeks naar het Home Assistant-event `mobile_app_notification_action` om de gekozen actie veilig en eenmalig te verwerken.


## 0.10.1 — stabiele snelle gezinskiezer
- De snelle **Gezin**-kiezer wordt niet meer opnieuw opgebouwd bij iedere Home Assistant state-update. Daardoor stopt het knipperen/opnieuw verschijnen zolang de kiezer openstaat.
- Ook de 30-seconden klok-refresh en de periodieke Family Hub-datarefresh laten de open gezinskiezer met rust. De actuele Home Assistant-data blijft op de achtergrond wel bijgewerkt.
- De profielfoto's/cirkels worden niet meer door een horizontale scroll-container afgeknipt. De transparante kiezer gebruikt nu zichtbare overflow en kan indien nodig netjes over meerdere regels verdelen.
- De klikbare zone blijft beperkt tot de personen zelf; de transparante ruimte rond de kiezer blokkeert het dashboard erachter niet.


## 0.10.0 — puntenbeheer, puntenlogboek en snelle gezinsnavigatie
- De overlappende **Verwijderen**-actie bij externe agenda's is hersteld. Pauzeren, Bewerken en Verwijderen hebben nu ieder een eigen duidelijke knop.
- Onder **Punten & beloningen** staat nu het actuele puntensaldo van ieder gezinslid.
- Per gezinslid zijn snelle **−1 / +1**-knoppen beschikbaar en via **Aanpassen** kun je punten toevoegen, aftrekken of het saldo exact instellen, met een optionele reden.
- Family Hub houdt vanaf deze versie een **puntenlogboek** bij met datum/tijd, gezinslid, verschil, oud en nieuw saldo, bron en reden.
- Het puntenlogboek luistert rechtstreeks naar wijzigingen van de Home Assistant-puntenhelpers. Daardoor worden ook puntenwijzigingen vastgelegd die via taken, routines, beloningen of rechtstreeks vanuit Home Assistant ontstaan.
- Handmatige correcties vanuit de instellingen krijgen een eigen duidelijke logboekreden en worden niet dubbel gelogd.
- De **Gezin**-knop in de onderste navigatie opent nu eerst een snelle, speelse personenkiezer boven de navigatie. De profielfoto's/namen staan zonder paneelachtergrond direct boven de knop.
- Een tik op een gezinslid opent meteen diens persoonlijke overzicht. Via **Overzicht** blijft de bestaande pagina met alle gezinsleden bereikbaar.


## 0.9.9 — beheer van ingevoerde externe agenda's
- Onder **Agenda's** staat nu een overzicht van alle Home Assistant **Remote Calendar**-agenda's.
- Per agenda zie je naam, status, bronhost, calendar-entity, SSL-status en aan welke gezinsleden de agenda gekoppeld is.
- Een koppeling kan **gepauzeerd** en later hervat worden zonder de gezinskoppeling te verliezen.
- Een agenda kan vanuit Family Hub worden **bewerkt**: naam, iCal/ICS-link en SSL-controle. Family Hub controleert de nieuwe bron eerst en bewaart de koppelingen met gezinsleden.
- Omdat Home Assistant Remote Calendar zelf geen reconfigure-flow voor de bron-URL aanbiedt, vervangt Family Hub bij een echte wijziging de config-entry veilig. Als dat mislukt probeert Family Hub automatisch de oorspronkelijke agenda te herstellen.
- Een agenda kan **verwijderd** worden. Daarbij worden Family Hub-koppelingen naar die calendar-entity automatisch leeggemaakt; de externe bronagenda (Google/Outlook/etc.) wordt nooit verwijderd.
- Geheime iCal-links worden niet in het overzicht getoond. De volledige URL wordt alleen lokaal opgehaald wanneer je expliciet op **Bewerken** klikt.
- Ook bestaande Remote Calendar-agenda's die eerder rechtstreeks in Home Assistant zijn toegevoegd verschijnen in het overzicht.


## 0.9.8 — scherpere tekst en volledig werkend gezinsfilter
- De lettergrootte-slider gebruikt nu **echte gehele pixelgroottes**. Family Hub zoomt de interface niet en gebruikt geen decimale lettergroottes meer. Hierdoor blijft tekst op wanddisplays scherper, ook bij bijvoorbeeld 120%.
- De slider blijft van 80% tot 140% werken, maar vertaalt iedere basislettergrootte naar de dichtstbijzijnde hele pixelwaarde.
- Het gezinsfilter is gecorrigeerd voor automatisch gegenereerde agenda-items. Routines en terugkerende taken werden eerder na het filteren opnieuw aan de agenda toegevoegd, waardoor uitgezette gezinsleden toch zichtbaar bleven.
- Dezelfde correctie werkt door op **Vandaag**, **Agenda** en **Vertrekhulp**, omdat deze schermen dezelfde gecombineerde agenda gebruiken.
- Taken, routines, punten en gezinskaarten blijven de bestaande filtering gebruiken.


## 0.9.7 — instelbare lettergrootte
- Onder **Uiterlijk → Kleuren & leesbaarheid** staat nu een slider **Lettergrootte**.
- De schaal loopt van **80% tot 140%** in stappen van 5%; **100%** is de bestaande Family Hub-weergave.
- De gekozen schaal wordt centraal opgeslagen en geldt voor de volledige Family Hub, inclusief navigatie, agenda, taken, routines, punten, legenda's, profielschermen en screensaver.
- Alleen tekst schaalt mee; kaartafmetingen, marges en iconen blijven zoveel mogelijk gelijk zodat het dashboard niet onnodig groot wordt.
- De beheerinterface toont de gekozen waarde direct naast de slider.


## 0.9.6 — klikbare kleurlegenda en gezinsfilter
- Op alle schermen waar informatie van meerdere gezinsleden door elkaar kan staan — **Vandaag, Agenda, Taken, Routines, Punten en Gezin** — staat nu bovenaan een compacte legenda met de ingestelde kleur van ieder gezinslid.
- De legenda is direct een filter: klik op een naam/kleur om dat gezinslid tijdelijk uit het huidige scherm te verbergen of weer te tonen.
- De knop **Iedereen** schakelt alle gezinsleden direct weer in.
- Uitgeschakelde personen worden visueel gedimd en doorgestreept, zodat duidelijk blijft welk filter actief is.
- De legenda blijft bovenaan zichtbaar tijdens scrollen.
- Het filter is bewust tijdelijk. Bij navigeren naar een ander Family Hub-scherm, of wanneer je later terugkomt op een scherm, staat standaard **iedereen weer aan**.
- De filtering werkt door in afspraken, vertrekhulp, taken, routines, beloningen en gezinskaarten; de onderliggende Home Assistant-data wordt niet aangepast.


## 0.9.5 — agenda's actief verversen
- Home Assistant Remote Calendar bewaart de opgehaalde ICS-data standaard veel langer dan de Family Hub-interface. Daardoor kon Family Hub wel iedere 2 minuten opnieuw tekenen, maar bleef een wijziging in Google Agenda nog uit de Home Assistant-cache komen.
- Family Hub vraagt gekoppelde agenda-entiteiten nu actief om een update via `homeassistant.update_entity` vóór het opnieuw ophalen van afspraken.
- Standaard gebeurt deze bronverversing iedere **5 minuten**. Dit interval is instelbaar onder **Agenda's** van 1 minuut tot 1 uur.
- De gewone Family Hub-verversing blijft standaard iedere 2 minuten lopen voor taken, punten, statussen en reeds beschikbare agenda-data.
- In het Family Hub-agendascherm staat nu een **↻**-knop om alle gekoppelde agenda's direct handmatig te vernieuwen.
- Bij het openen/herladen van Family Hub wordt een gekoppelde externe agenda meteen één keer actief ververst.


## 0.9.4 — externe agenda activeren en koppelen
- Na het toevoegen van een Remote Calendar wacht Family Hub nu tot Home Assistant daadwerkelijk een `calendar.*` entity heeft aangemaakt.
- Als de configuratie-entry bestaat maar de agenda-entity nog niet geladen is, probeert Family Hub de Remote Calendar-integratie automatisch opnieuw te laden.
- Een nieuw aangemaakte maar uitgeschakelde calendar-entity wordt automatisch ingeschakeld.
- Bij opnieuw toevoegen van een reeds bestaande agenda probeert Family Hub de bestaande Remote Calendar-entry nu te herstellen in plaats van alleen “bestaat al” te melden.
- Als de naam van de externe agenda exact overeenkomt met een gezinslid (bijvoorbeeld **Pascal**), koppelt Family Hub de nieuwe agenda automatisch aan dat gezinslid.
- De beheerinterface haalt daarna zowel de Home Assistant-entiteiten als de bijgewerkte Family Hub-instellingen opnieuw op, zodat de agenda direct in de keuzelijst verschijnt.


## 0.9.3 — diagnose externe agenda
- Family Hub controleert een externe agenda-link nu eerst zelf voordat Home Assistant Remote Calendar wordt gestart.
- De controle onderscheidt DNS-problemen, SSL-certificaatfouten, time-outs, HTTP 401/403/404, webpagina's in plaats van ICS en ongeldige ICS-inhoud.
- Geheime agenda-URL's worden niet in foutmeldingen of logs uitgeschreven; alleen host/statusinformatie wordt gebruikt.
- Gekopieerde links met HTML-entiteiten zoals `&amp;`, omringende quotes of verborgen witruimte worden automatisch opgeschoond.
- Nieuwe optie **SSL-certificaat controleren**. Deze staat standaard en aanbevolen aan; uitschakelen is alleen bedoeld voor een vertrouwde eigen server met een zelfondertekend certificaat.
- Als Family Hub een geldige ICS-feed kan ophalen maar Home Assistant alsnog `cannot_connect` geeft, wordt dit nu expliciet gemeld met de bereikbaarheidstest.


## 0.9.2 — volledig scherm voor wanddisplays
- Nieuwe instelling **Family Hub schermvullend weergeven** onder **Schermen & navigatie**.
- In volledig-schermmodus wordt de Home Assistant-zijbalk verborgen via de ingebouwde kioskmodus van Home Assistant.
- De Lovelace-bovenbalk en de gereserveerde ruimte erboven worden alleen voor de Family Hub-view verborgen, zodat de Hub het hele browservenster benut.
- De Family Hub-kaart gebruikt in deze modus de volledige viewporthoogte.
- Onderaan de Family Hub-navigatie verschijnt automatisch een vaste knop **Home Assistant** met het Home Assistant-icoon.
- De knop **Home Assistant** schakelt de schermvullende modus eerst uit en opent daarna het normale Home Assistant Overzicht.
- Bij het verlaten of verwijderen van de Family Hub-view wordt de kioskmodus netjes hersteld, zodat andere Home Assistant-schermen normaal blijven werken.


## 0.9.1 — punten en externe agenda
- De puntenstrook bovenaan **Punten & beloningen** toont nu expliciet de punten van **vandaag**. Daardoor klopt Lonneke bijvoorbeeld met haar dagbeloning en wordt het doorlopende saldo niet meer als dagtotaal gepresenteerd.
- De externe-agenda-wizard wacht nu maximaal 50 seconden op Home Assistant; de Remote Calendar-integratie kan zelf tot 30 seconden nodig hebben om een ICS-feed te lezen.
- De backend wacht langer op de Remote Calendar-configuratiestap, zodat een geldige maar tragere agenda niet voortijdig wordt afgebroken.
- Validatiefouten van een externe agenda komen als duidelijke Family Hub-melding terug in plaats van als alleen een generieke mislukte netwerkrequest.
- Externe-agendafouten worden ook in het Family Hub App-log geschreven voor verdere diagnose.


## 0.9.0 — interactieve Family Hub
- Dashboardinformatie is veel vaker direct aanklikbaar: agenda-items, taken, personen, routines, maaltijden, meldingen en huisstatus leiden naar detail of de juiste Family Hub-weergave.
- Klik op een persoon om direct naar de persoonlijke kaart te gaan.
- Taken openen nu een detailvenster; het vinkje is een aparte actie.
- Afgeronde taken blijven dezelfde dag zichtbaar met afgevinkte styling en kunnen weer opengezet worden.
- Bij terugzetten worden eerder toegekende punten ook teruggedraaid.
- Routinestappen blijven zichtbaar nadat ze zijn afgerond en kunnen eveneens worden teruggezet.
- De gezinsagenda projecteert routines en terugkerende taken rechtstreeks vanuit hun weekschema, zodat alle ingestelde dagen in huidige en toekomstige weken zichtbaar zijn.
- Terugkerende taken hebben een optie **Ook tonen in de gezinsagenda**.
- Agenda-items openen een detailvenster en kunnen direct doorlinken naar het betreffende gezinslid.
- Huis-entiteiten en meldingen openen de normale Home Assistant meer-info.
- Beloningen ondersteunen nu vier puntmodellen: **Iedere dag**, **Iedere week**, **Iedere maand** en **Doorlopend sparen**.
- Dag/week/maandbeloningen tellen alleen punten die in de huidige periode daadwerkelijk zijn verdiend en starten vanzelf opnieuw in de volgende periode.
- Een periodieke beloning kan één keer per periode als behaald worden gemarkeerd zonder punten van andere spaardoelen af te trekken.
- Doorlopend sparen houdt het bestaande gedrag: punten blijven staan en worden bij inwisselen afgetrokken.
- Beloningskaarten tonen per kind de actuele voortgang, bijvoorbeeld **7/10 ★**, en daarna **Behaald ✓**.
- Externe agenda's geven begrijpelijke foutmeldingen terug vanuit Home Assistant in plaats van alleen een generieke 400-fout.
- Google Agenda-deellinks worden herkend; Family Hub legt direct uit dat het **Geheim adres in iCal-indeling** of openbare iCal-adres nodig is.


## 0.8.3 — item-autosave
- Gezinsleden worden automatisch opgeslagen zodra hun gegevens bruikbaar zijn; bestaande gezinsleden worden stil op de achtergrond bijgewerkt.
- Nieuw aangemaakte gezinsleden krijgen één bevestiging zodra ze daadwerkelijk zijn opgeslagen.
- Routines, terugkerende taken, lijstjes, beloningen en vertrekhulp slaan direct op vanuit hun eigen editor.
- De editor-knop heet weer **Opslaan**; een tweede klik op de hoofdknop is niet meer nodig.
- Verwijderen van deze items wordt direct opgeslagen.
- Item-opslag gebruikt een aparte section-endpoint zodat half ingevulde algemene instellingen niet per ongeluk worden meegeschreven.
- De hoofdknop rechtsboven is alleen actief als er nog algemene instellingen niet zijn opgeslagen.
- Gelijktijdige gezinslid-autosaves worden veilig opnieuw aangeboden zodat snelle invoer niet verloren gaat.
- Bij een mislukte item-save wordt een nieuw item teruggedraaid en blijft de editor open voor een nieuwe poging.
- Unieke 0.8.3 CSS/JS-assets voorkomen stale beheerbestanden.


## 0.8.2 — één concept, één keer opslaan
- Alle invoer in de beheerinterface wordt direct in een lokale **conceptstatus** bijgehouden.
- Bij **+ Gezinslid** blijven eerder ingevulde gezinsleden volledig staan; tussentijds opslaan is niet meer nodig.
- Wisselen tussen beheerpagina's bewaart alle nog niet opgeslagen invoer.
- Verversen van Home Assistant-entiteiten bewaart het actieve concept voordat onderdelen opnieuw worden gerenderd.
- Routine-, taak-, lijst-, beloning- en vertrekhulp-editors gebruiken **Toepassen**: ze wijzigen alleen het lokale concept.
- Verwijderen van beheeritems blijft eveneens een conceptwijziging totdat rechtsboven op **Opslaan** wordt geklikt.
- Daardoor is er voortaan één duidelijke opslagactie: stel meerdere onderdelen in en klik daarna één keer op **Opslaan**.
- Onvolledige gezinsleden mogen tijdens het configureren bestaan; validatie gebeurt pas bij de uiteindelijke opslag.
- Slimme aanbevelingen worden niet toegepast zolang er niet-opgeslagen wijzigingen zijn, zodat een oud backendmodel nooit een lokaal concept kan overschrijven.


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
