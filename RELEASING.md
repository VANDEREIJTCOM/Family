# Family Hub publiceren

Family Hub gebruikt Home Assistant's native App repository-updateproces.

## Nieuwe versie uitbrengen

1. Werk de code in `vandereijt_family_hub/` bij.
2. Verhoog `version:` in `vandereijt_family_hub/config.yaml`, bijvoorbeeld van `0.3.2` naar `0.3.3`.
3. Werk `vandereijt_family_hub/CHANGELOG.md` bij.
4. Commit en push naar de standaardbranch van de publieke GitHub-repository.
5. Home Assistant-instanties die deze repository hebben toegevoegd, zien de nieuwe versie als App-update zodra Supervisor de repository opnieuw controleert.

## Belangrijk

- Verlaag of hergebruik een gepubliceerd versienummer niet.
- Gebruik bij voorkeur Semantic Versioning: `MAJOR.MINOR.PATCH`.
- Test eerst op een eigen Home Assistant-installatie.
- Maak voor grotere releases desgewenst ook een GitHub Release/tag aan; dit is niet nodig voor de native App-update-detectie zolang de app lokaal door Home Assistant uit de repository wordt gebouwd.

## Later: vooraf gebouwde images

Voor grotere publieke distributie kan de App worden uitgebreid met multi-architecture images in GHCR. Dan hoeft elke Home Assistant-installatie de container niet zelf te bouwen. De officiële Home Assistant builder/publishing-workflow kan hiervoor worden toegevoegd.
