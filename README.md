# VANDEREIJT.COM Home Assistant Apps

Publieke Home Assistant App-repository van VANDEREIJT.COM.

## Family Hub

**VANDEREIJT.COM Family Hub** is een gezinsplanner voor Home Assistant met een eigen configuratie-interface en een full-screen dashboard voor een wanddisplay.

### Installeren

1. Open Home Assistant.
2. Ga naar **Instellingen → Apps → Installeer een app**.
3. Open rechtsboven **⋮ → Repositories**.
4. Voeg deze repository toe:

   `https://github.com/VANDEREIJTCOM/Family`

5. Zoek naar **VANDEREIJT.COM Family Hub** en installeer de app.
6. Start de app en open de webinterface om het gezin in te richten.

### Dashboard

Family Hub publiceert de kaart automatisch naar Home Assistant. Voeg éénmalig deze resource toe:

`/local/family-hub/family-hub-card.js`

Gebruik de kaart vervolgens in een Panel-view:

```yaml
type: custom:family-hub-card
config_url: /local/family-hub/settings.json
```

## Updates

Home Assistant leest de versie uit `vandereijt_family_hub/config.yaml`. Wanneer een nieuwe versie in deze repository staat, verschijnt deze als update in Home Assistant.

## Ontwikkeling

Zie `RELEASING.md` voor het releaseproces.
