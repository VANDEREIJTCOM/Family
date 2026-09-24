# Changelog

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
