# Changelog

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
