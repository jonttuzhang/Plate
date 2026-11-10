import type { Dictionary } from './index';

export const fi: Dictionary = {
  common: {
    done: 'Valmis',
    cancel: 'Peruuta',
    back: 'Takaisin',
  },
  home: {
    today: 'Tänään',
    workout: 'Treeni',
    noWorkout: 'Ei treeniä vielä tänään',
    food: 'Ruoka',
    noFood: 'Ei vielä kirjauksia tänään',
    comingSoon: 'Kirjaaminen tulee seuraavissa vaiheissa.',
  },
  settings: {
    title: 'Asetukset',
    language: 'Kieli',
    languageSystem: 'Käytä puhelimen kieltä',
    diagnostics: 'Diagnostiikka',
    database: 'Paikallinen tietokanta',
    databaseOk: 'Versio {version}, 1 taulu|Versio {version}, {n} taulua',
    databaseError: 'Avaaminen epäonnistui',
    server: 'Palvelin',
    serverOk: 'Yhteys toimii',
    serverOffline: 'Ei yhteyttä',
    serverNotConfigured: 'Ei määritetty (.env puuttuu)',
    checking: 'Tarkistetaan…',
    version: 'Sovelluksen versio',
  },
  languages: {
    en: 'English',
    fi: 'Suomi',
  },
};
