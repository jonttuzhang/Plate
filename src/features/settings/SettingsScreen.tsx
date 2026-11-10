import Constants from 'expo-constants';
import { useEffect, useState } from 'react';

import { useQuery } from '@/db/useQuery';
import { languages, setLanguage, useI18n, type Language } from '@/i18n';
import { checkServer, type ServerStatus } from '@/lib/supabase';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

import { getDatabaseInfo } from './diagnostics';

const check = (selected: boolean) => (selected ? <Text color="accent">✓</Text> : null);

export function SettingsScreen() {
  const { t, selected } = useI18n();
  const database = useQuery([], getDatabaseInfo);
  const [server, setServer] = useState<ServerStatus | 'checking'>('checking');

  useEffect(() => {
    let active = true;
    void checkServer().then((status) => active && setServer(status));
    return () => {
      active = false;
    };
  }, []);

  const databaseText = database.error
    ? `${t('settings.databaseError')}: ${database.error.message}`
    : database.data
      ? t('settings.databaseOk', { version: database.data.version, n: database.data.tables })
      : t('settings.checking');

  const serverText = {
    checking: t('settings.checking'),
    ok: t('settings.serverOk'),
    offline: t('settings.serverOffline'),
    notConfigured: t('settings.serverNotConfigured'),
  }[server];

  const choose = (language: Language | null) => () => void setLanguage(language);

  return (
    <Screen topInset={false}>
      <Text variant="caption" color="textSecondary">
        {t('settings.language').toUpperCase()}
      </Text>
      <Card>
        <ListRow title={t('settings.languageSystem')} trailing={check(selected === null)} onPress={choose(null)} />
        {languages.map((language) => (
          <ListRow
            key={language}
            separator
            title={t(`languages.${language}`)}
            trailing={check(selected === language)}
            onPress={choose(language)}
          />
        ))}
      </Card>

      <Text variant="caption" color="textSecondary">
        {t('settings.diagnostics').toUpperCase()}
      </Text>
      <Card>
        <ListRow title={t('settings.database')} value={databaseText} />
        <ListRow separator title={t('settings.server')} value={serverText} />
        <ListRow separator title={t('settings.version')} value={Constants.expoConfig?.version ?? ''} />
      </Card>
    </Screen>
  );
}
