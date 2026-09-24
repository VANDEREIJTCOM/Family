# VANDEREIJT.COM Family Hub – installatie

## Installeren als lokale Home Assistant App

Deze ontwikkelversie kan lokaal worden getest op Home Assistant OS.

1. Kopieer de map `vandereijt_family_hub` naar `/addons/` op Home Assistant.
2. Ga naar **Instellingen → Apps → App installeren**.
3. Open rechtsboven het menu en kies **Controleren op updates / opnieuw laden**.
4. Onder **Lokale apps** verschijnt **VANDEREIJT.COM Family Hub**.
5. Installeer en start de App.
6. Open de webinterface van de App en richt het gezin in.

De App heeft schrijftoegang tot de Home Assistant configuratiemap nodig om de dashboardkaart, instellingen en achtergrondfoto onder `/config/www/family-hub/` te plaatsen.

## Eenmalige Lovelace-koppeling

Voor een nieuwe installatie voeg je onder **Instellingen → Dashboards → Bronnen** deze JavaScript-module toe:

```text
/local/family-hub/family-hub-card.js
```

Maak daarna een dashboard/view met type **Panel (1 kaart)** en voeg een handmatige kaart toe:

```yaml
type: custom:family-hub-card
config_url: /local/family-hub/settings.json
```

## Beheer

Open daarna de **Family Hub App** om gezinsleden, kleuren, agenda's, takenlijsten, personen, weer, boodschappen en uiterlijk te wijzigen. De Lovelace-kaart leest de instellingen automatisch opnieuw in.

## Veiligheid

- De beheerinterface gebruikt Home Assistant Ingress.
- Het sidebar-paneel is alleen voor administrators zichtbaar.
- De App vraagt alleen `homeassistant_api` toegang en schrijft alleen naar de gemounte Home Assistant-configuratiemap en de eigen `/data` map.
- Er worden geen gegevens naar externe diensten verzonden.


## Migratie vanaf v0.1/v0.2

Als `/config/www/family-hub-card.js` al bestaat, werkt de App dit legacy-bestand bij naar v0.3.0. Je bestaande dashboardresource `/local/family-hub-card.js` mag dan blijven staan. Pas alleen de kaartconfiguratie aan naar:

```yaml
type: custom:family-hub-card
config_url: /local/family-hub/settings.json
```

De gezinssamenstelling in oude YAML is daarna niet meer nodig; de App-configuratie is leidend.
