# VANDEREIJT.COM Home Assistant Apps

Publieke Home Assistant App-repository van VANDEREIJT.COM.

## VANDEREIJT.COM Family Hub

**for Home Assistant**

Family Hub brengt agenda, taken, routines, punten, beloningen, lijstjes, maaltijden en het slimme huis samen in één touch-first gezinsdashboard.

### Installeren

1. Open Home Assistant.
2. Ga naar **Instellingen → Apps → Installeer een app**.
3. Open **⋮ → Repositories**.
4. Voeg toe: `https://github.com/VANDEREIJTCOM/Family`
5. Installeer en start **VANDEREIJT.COM Family Hub**.
6. Richt het gezin en de gewenste functies in vanuit de Family Hub App.
7. Open **Dashboard** en klik **Dashboard installeren / bijwerken**.

Er zijn geen handmatige YAML- of Lovelace-resource-stappen nodig.

### Family Hub 0.6

- gezamenlijke en persoonlijke agenda
- taken en terugkerende slimme taken
- routines met visuele stappen
- punten en beloningen
- gedeelde lijstjes en boodschappen
- maaltijdplanner en ingrediënten
- ICS/webcal-agenda's
- vertrekhulp
- Home Assistant huisstatus en meldingen
- persoonlijke gezinsprofielen
- screensaver/fotolijst
- responsive mobiele weergave
- configureerbare onderste navigatie
- configureerbare indeling van het Vandaag-scherm

Family Hub gebruikt native Home Assistant-entiteiten waar dat logisch is en maakt ontbrekende lokale agenda's, takenlijsten en puntenhelpers automatisch aan.

## Home Assistant-opmaak en huiscontext (0.13)

De dashboardkaart volgt standaard de actieve Home Assistant-kleuren, achtergrond,
typografie en kaarten. Gezinskleuren en fout-/succeskleuren houden hun betekenis.
De gedeelde opmaak gebruikt leesbare tekstmaten en grotere aanraakvlakken.
Op grote schermen in portretstand sluiten tekst, navigatie en tussenruimte aan
op een wanddashboard, in plaats van de oorspronkelijke compacte bureaubladopmaak.
De weekagenda gebruikt op portretschermen leesbare dagblokken. In landscape blijft
de weekindeling naast elkaar beschikbaar. Met de optionele route `rooms` krijgt
de Huis-tab directe koppelingen naar de bestaande HA-bediening als er nog geen
losse huis-entiteiten zijn gekozen. Bestaande huis-entiteiten blijven zichtbaar.
Met `follow_ha_theme: false` op de kaart blijft de oorspronkelijke Family Hub-stijl beschikbaar.

Een optionele, alleen-lezen huiscontext toont op Vandaag relevante meldingen en
verwijst naar bestaande HA-bediening. Er worden geen apparaten gestart en geen
extra meldingen verstuurd. De kaart gebruikt de bestaande HA-stateverbinding.

```yaml
type: custom:family-hub-card
config_url: /local/family-hub/settings.json
follow_ha_theme: true
ha_context:
  enabled: true
  sources:
    attention: input_text.house_attention
    washer: input_text.washer_notice
    morningTime: input_datetime.wake_up
    morningOverride: input_boolean.alternative_wake_up
  players:
    - media_player.living_room
  routes:
    home: /home/today
    rooms: /home/rooms
    attention: /home/attention
    checks: /home/checks
    morning: /home/morning
    music: /home/music
```

De optionele bron `attention` heeft de vorm `{"v":2,"o":["open_item"]}`;
afgehandelde items staan niet in `o`. De wasbron gebruikt `{"s":"open"}` of
`{"s":"wachten"}`. De avondcheck verschijnt alleen in de avond/nacht.
Gepauzeerde muziek blijft tien minuten zichtbaar. Alleen relatieve HA-paden
zijn toegestaan. Niet-ingestelde bronnen veroorzaken geen foutmelding.

Controleer de wijziging met `node tests/ha-context.cjs` en
`node tests/ha-view-layout.cjs`, gevolgd door `python tests/build_runtime.py`
(de laatste controle vereist ook Node).

## Updates

Home Assistant leest de versie uit `vandereijt_family_hub/config.yaml`. Zodra een nieuwe versie in deze repository staat, kan Home Assistant deze als App-update aanbieden. Een door Family Hub beheerd dashboard en kaart-resource worden bij het starten van de nieuwe versie automatisch gesynchroniseerd.

## Ontwikkeling

Zie `RELEASING.md` voor het releaseproces.
