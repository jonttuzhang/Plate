/**
 * English is the source of truth: `fi.ts` must have exactly the same keys (type-checked).
 * Placeholders: `{name}`. Plurals: 'one form|other form', chosen by the `n` parameter.
 */
export const en = {
  common: {
    done: 'Done',
    cancel: 'Cancel',
    back: 'Back',
  },
  home: {
    today: 'Today',
    workout: 'Workout',
    noWorkout: 'No workout yet today',
    food: 'Food',
    noFood: 'Nothing logged yet today',
    comingSoon: 'Logging arrives in the next milestones.',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageSystem: 'Use the phone language',
    diagnostics: 'Diagnostics',
    database: 'Local database',
    databaseOk: 'Version {version}, 1 table|Version {version}, {n} tables',
    databaseError: 'Could not open',
    server: 'Server',
    serverOk: 'Reachable',
    serverOffline: 'Not reachable',
    serverNotConfigured: 'Not configured (.env missing)',
    checking: 'Checking…',
    version: 'App version',
  },
  languages: {
    en: 'English',
    fi: 'Suomi',
  },
};
