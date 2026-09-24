# VANDEREIJT.COM Home Assistant Apps

Publieke Home Assistant App-repository van VANDEREIJT.COM.

## VANDEREIJT.COM Family Hub

**Family Hub** is een gezinsplanner voor Home Assistant met een eigen beheerinterface en een full-screen wanddisplay.

### Installeren

1. Open Home Assistant.
2. Ga naar **Instellingen → Apps → Installeer een app**.
3. Open rechtsboven **⋮ → Repositories**.
4. Voeg deze repository toe:

   `https://github.com/VANDEREIJTCOM/Family`

5. Zoek naar **VANDEREIJT.COM Family Hub** en installeer de App.
6. Start de App en open **Family Hub** in de zijbalk.
7. Richt het gezin in en open daarna het tabblad **Dashboard**.
8. Kies of het dashboard in de Home Assistant-zijbalk moet staan en klik **Dashboard installeren / bijwerken**.

Family Hub regelt daarna zelf:
- de Lovelace JavaScript-resource;
- het Family Hub-dashboard;
- de full-screen Panel-view;
- de sidebar-instelling;
- cache-versies van de kaart bij toekomstige updates.

Er hoeft geen YAML of dashboard-resource handmatig te worden toegevoegd.

## Updates

Home Assistant leest de versie uit `vandereijt_family_hub/config.yaml`. Zodra een nieuwe versie in deze repository staat, kan Home Assistant die als App-update aanbieden. Een door Family Hub beheerd dashboard wordt na de App-update automatisch gesynchroniseerd.

## Ontwikkeling

Zie `RELEASING.md` voor het releaseproces.
