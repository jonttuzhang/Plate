import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '@/db/database';
import { useProfile } from '@/db/hooks';
import type { Profile, WorkoutSet } from '@/db/types';
import { useQuery } from '@/db/useQuery';
import {
  addSet,
  changeWeight,
  deleteSet,
  finishWorkout,
  getExercises,
  loadWorkoutView,
  removeExercise,
  toggleSetDone,
  updateSet,
  type ExerciseBlock,
} from '@/db/workouts';
import type { ExerciseInfo } from '@/domain/exercises';
import { fromDisplayWeight, stepWeight, toDisplayWeight, weightUnit } from '@/domain/units';
import { useI18n } from '@/i18n';
import { chooseAsync, confirmAsync } from '@/lib/dialogs';
import { formatDuration, formatNumber, parseDecimal } from '@/lib/format';
import { restTimer, useRestRemaining } from '@/lib/restTimer';
import { colors, radius, space, tap, type as typeScale } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { ProgressBar } from '@/ui/ProgressBar';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

type Editing = { setId: string; field: 'weight' | 'reps' } | null;

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const view = useQuery(['workouts', 'workout_sets'], () => loadWorkoutView(getDb(), id), [id]);
  const exercises = useQuery(['exercises'], () => getExercises(getDb(), lang), [lang]);
  const [editing, setEditing] = useState<Editing>(null);

  useEffect(() => restTimer.setMessage(t('workout.restOverTitle'), t('workout.restOverBody')), [t]);

  const byId = useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises]);
  if (!view || !profile || !exercises) return <Screen>{null}</Screen>;
  const { workout, blocks } = view;
  const editingSet = editing ? blocks.flatMap((b) => b.sets).find((s) => s.id === editing.setId) : undefined;

  const onFinish = async () => {
    const anyDone = blocks.some((b) => b.sets.some((s) => s.completed_at));
    const ok = anyDone
      ? await confirmAsync(t('workout.finishConfirmTitle'), t('workout.finishConfirm'), t('workout.finish'), t('common.cancel'))
      : await confirmAsync(t('workout.discardTitle'), t('workout.discardConfirm'), t('workout.discard'), t('common.cancel'), true);
    if (!ok) return;
    restTimer.stop();
    await finishWorkout(getDb(), workout.id);
    router.back();
  };

  const onToggle = async (set: WorkoutSet) => {
    setEditing(null);
    const done = await toggleSetDone(getDb(), set);
    if (done) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      if (set.is_warmup === 0) restTimer.start(profile.rest_seconds);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text variant="title">{t('workout.title')}</Text>
          <Elapsed startedAt={workout.started_at} />
        </View>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={onFinish} style={styles.finish}>
          <Text variant="headline" color="accentText">
            {t('workout.finish')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {blocks.length === 0 ? (
          <Text color="textSecondary" style={styles.empty}>
            {t('workout.empty')}
          </Text>
        ) : null}
        {blocks.map((block) => (
          <ExerciseCard
            key={block.position}
            block={block}
            exercise={byId.get(block.exerciseId)}
            profile={profile}
            editing={editing}
            onEdit={setEditing}
            onToggle={onToggle}
          />
        ))}
        <Button
          label={`+ ${t('workout.addExercise')}`}
          variant="secondary"
          onPress={() => router.push({ pathname: '/workout/pick', params: { workoutId: workout.id } })}
        />
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, space.md) }}>
        {editing && editingSet ? (
          <SetEditor key={editing.setId + editing.field} set={editingSet} field={editing.field} profile={profile} onField={(field) => setEditing({ setId: editingSet.id, field })} onClose={() => setEditing(null)} />
        ) : (
          <RestBar />
        )}
      </View>
    </Screen>
  );
}

function Elapsed({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <Text color="textSecondary" numeric>
      {formatDuration(now - Date.parse(startedAt))}
    </Text>
  );
}

function ExerciseCard(props: {
  block: ExerciseBlock;
  exercise: ExerciseInfo | undefined;
  profile: Profile;
  editing: Editing;
  onEdit: (e: Editing) => void;
  onToggle: (set: WorkoutSet) => void;
}) {
  const { block, exercise, profile, editing, onEdit, onToggle } = props;
  const { t, lang } = useI18n();
  const unit = profile.unit_system;
  const fmt = (kg: number) => formatNumber(toDisplayWeight(kg, unit), lang, 2);
  const name = exercise?.name ?? '…';
  const working = block.last.filter((s) => s.is_warmup === 0);
  const lastText = working.length ? t('workout.lastTime', { sets: working.map((s) => `${fmt(s.weight_kg)}×${s.reps}`).join(', ') }) : t('workout.firstTime');

  const onMenu = async () => {
    const choice = await chooseAsync(name, [t('workout.settingsTitle'), t('workout.removeExercise')], t('common.cancel'), 1);
    if (choice === 0) router.push({ pathname: '/workout/exercise', params: { id: block.exerciseId } });
    if (choice === 1 && (await confirmAsync(t('workout.removeExercise'), t('workout.removeExerciseConfirm', { name }), t('common.delete'), t('common.cancel'), true))) {
      await removeExercise(getDb(), block.sets[0]!.workout_id, block.exerciseId);
    }
  };

  let workingIndex = 0;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text variant="headline">{name}</Text>
          <Text variant="footnote" color="textSecondary">
            {lastText}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.edit')} hitSlop={12} onPress={onMenu} style={styles.menu}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {block.sets.map((set) => {
        const label = set.is_warmup ? t('workout.warmup') : String(++workingIndex);
        const done = set.completed_at !== null;
        const active = (field: 'weight' | 'reps') => editing?.setId === set.id && editing.field === field;
        return (
          <Pressable
            key={set.id}
            onLongPress={async () => {
              if (await confirmAsync(t('workout.deleteSet'), t('workout.deleteSetConfirm'), t('common.delete'), t('common.cancel'), true)) await deleteSet(getDb(), set.id);
            }}
            style={styles.setRow}
          >
            <Text variant="headline" color={set.is_warmup ? 'carbs' : 'textSecondary'} style={styles.setNo}>
              {label}
            </Text>
            <Chip
              text={`${fmt(set.weight_kg)} ${t(weightUnit(unit) === 'kg' ? 'common.kg' : 'common.lb')}`}
              active={active('weight')}
              done={done}
              onPress={() => onEdit(active('weight') ? null : { setId: set.id, field: 'weight' })}
              label={t('workout.weight')}
            />
            <Text color="textSecondary">×</Text>
            <Chip text={String(set.reps)} active={active('reps')} done={done} onPress={() => onEdit(active('reps') ? null : { setId: set.id, field: 'reps' })} label={t('workout.reps')} />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: done }}
              accessibilityLabel={`${label}: ${fmt(set.weight_kg)} × ${set.reps}`}
              onPress={() => onToggle(set)}
              style={[styles.check, done && styles.checkDone]}
            >
              <Ionicons name="checkmark" size={28} color={done ? colors.accentText : colors.textTertiary} />
            </Pressable>
          </Pressable>
        );
      })}

      <Pressable accessibilityRole="button" onPress={() => addSet(getDb(), block.sets[0]!.workout_id, block.exerciseId)} style={styles.addSet}>
        <Text color="accent">+ {t('workout.addSet')}</Text>
      </Pressable>
    </View>
  );
}

function Chip({ text, active, done, onPress, label }: { text: string; active: boolean; done: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="headline" color={done ? 'textSecondary' : 'text'} numeric numberOfLines={1}>
        {text}
      </Text>
    </Pressable>
  );
}

/** Bottom panel with big −/+ buttons for the selected set's weight or reps. */
function SetEditor({ set, field, profile, onField, onClose }: { set: WorkoutSet; field: 'weight' | 'reps'; profile: Profile; onField: (f: 'weight' | 'reps') => void; onClose: () => void }) {
  const { t, lang } = useI18n();
  const unit = profile.unit_system;
  const isWeight = field === 'weight';
  const display = isWeight ? toDisplayWeight(set.weight_kg, unit) : set.reps;
  const [text, setText] = useState(formatNumber(display, lang, 2));
  useEffect(() => setText(formatNumber(display, lang, 2)), [display, lang]);

  const step = async (dir: 1 | -1) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (isWeight) await changeWeight(getDb(), set, stepWeight(set.weight_kg, profile.weight_increment_kg, dir, unit));
    else await updateSet(getDb(), set.id, { reps: Math.max(0, set.reps + dir) });
  };
  const commitText = async () => {
    const value = parseDecimal(text);
    if (value === null || value < 0) return setText(formatNumber(display, lang, 2));
    if (isWeight) await changeWeight(getDb(), set, fromDisplayWeight(value, unit));
    else await updateSet(getDb(), set.id, { reps: Math.round(value) });
  };

  return (
    <View style={styles.editor}>
      <View style={styles.editorTabs}>
        {(['weight', 'reps'] as const).map((f) => (
          <Pressable key={f} onPress={() => onField(f)} style={[styles.editorTab, field === f && styles.editorTabActive]}>
            <Text variant="headline" color={field === f ? 'text' : 'textSecondary'}>
              {f === 'weight' ? t('workout.weight') : t('workout.reps')}
            </Text>
          </Pressable>
        ))}
        <Pressable onPress={() => updateSet(getDb(), set.id, { is_warmup: set.is_warmup ? 0 : 1 })} style={[styles.editorTab, set.is_warmup === 1 && styles.editorTabActive]}>
          <Text variant="headline" color={set.is_warmup ? 'carbs' : 'textSecondary'}>
            {t('workout.markWarmup')}
          </Text>
        </Pressable>
      </View>
      <View style={styles.stepper}>
        <StepButton icon="remove" onPress={() => step(-1)} />
        <View style={styles.valueBox}>
          <TextInput
            value={text}
            onChangeText={setText}
            onEndEditing={commitText}
            onSubmitEditing={commitText}
            keyboardType={isWeight ? 'decimal-pad' : 'number-pad'}
            selectTextOnFocus
            style={styles.valueInput}
          />
          <Text color="textSecondary">{isWeight ? t(weightUnit(unit) === 'kg' ? 'common.kg' : 'common.lb') : t('workout.reps')}</Text>
        </View>
        <StepButton icon="add" onPress={() => step(1)} />
      </View>
      <Button label={t('common.done')} variant="secondary" onPress={onClose} />
    </View>
  );
}

function StepButton({ icon, onPress }: { icon: 'add' | 'remove'; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={icon === 'add' ? '+' : '−'} onPress={onPress} style={({ pressed }) => [styles.stepButton, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={32} color={colors.text} />
    </Pressable>
  );
}

function RestBar() {
  const { t } = useI18n();
  const { remaining, total } = useRestRemaining();
  if (remaining === null) return null;
  return (
    <View style={styles.rest}>
      <View style={styles.restRow}>
        <Text variant="headline">{t('workout.rest')}</Text>
        <Text variant="title" numeric style={styles.flex}>
          {' '}
          {formatDuration(remaining * 1000)}
        </Text>
        <SmallButton label="−15" onPress={() => restTimer.adjust(-15)} />
        <SmallButton label="+15" onPress={() => restTimer.adjust(15)} />
        <SmallButton label={t('workout.restSkip')} onPress={() => restTimer.stop()} />
      </View>
      <ProgressBar ratio={total ? remaining / total : 0} color={colors.accent} />
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.small, pressed && { opacity: 0.6 }]}>
      <Text variant="headline" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.sm },
  finish: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: space.lg, minHeight: tap.min, justifyContent: 'center' },
  content: { padding: space.lg, paddingTop: space.sm, gap: space.md, paddingBottom: space.xxl },
  empty: { textAlign: 'center', marginVertical: space.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.xs, marginBottom: space.xs },
  menu: { minWidth: tap.min, minHeight: tap.min - space.md, alignItems: 'flex-end' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: tap.primary },
  setNo: { width: 24, textAlign: 'center' },
  chip: { flex: 1, minHeight: tap.min, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  chipActive: { borderWidth: 2, borderColor: colors.accent },
  check: { width: tap.primary, height: tap.primary - space.sm, borderRadius: radius.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.accent },
  addSet: { minHeight: tap.min, justifyContent: 'center', alignItems: 'center' },
  editor: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, gap: space.md },
  editorTabs: { flexDirection: 'row', gap: space.sm },
  editorTab: { minHeight: tap.min - space.sm, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center' },
  editorTabActive: { backgroundColor: colors.surfaceRaised },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepButton: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, alignItems: 'center' },
  valueInput: { ...typeScale.largeTitle, color: colors.text, textAlign: 'center', minWidth: 120, fontVariant: ['tabular-nums'] },
  rest: { marginHorizontal: space.lg, padding: space.md, gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.lg },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  small: { minHeight: tap.min, minWidth: tap.min, paddingHorizontal: space.sm, alignItems: 'center', justifyContent: 'center' },
});
