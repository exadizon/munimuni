import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, useColorScheme, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { JournalEntry } from '../../../packages/core/src/journal';
import { countWords, formatLongDate, formatMonth, makeEntry, parseDateKey, toDateKey } from '../../../packages/core/src/journal';
import { exportEntries, loadState, saveState } from './storage';
import { palette } from './theme';
import { defaultPreferences, type Accent, type Appearance, type Preferences, type WritingFont, type WritingSize } from './types';

const today = toDateKey(new Date());
const accentOptions: Accent[] = ['neutral', 'blue', 'green', 'amber', 'rose', 'violet'];

type SaveState = 'opening' | 'saved' | 'saving';

export default function JournalApp() {
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme() === 'dark';
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [pending, setPending] = useState<JournalEntry[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveState>('opening');
  const [sheet, setSheet] = useState<'calendar' | 'settings' | null>(null);
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const colors = palette(preferences.appearance, systemScheme, preferences.accent);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currentEntry = entries.find((entry) => entry.date === selectedDate && !entry.deletedAt);

  useEffect(() => {
    void loadState().then((state) => {
      setEntries(state.entries);
      setPending(state.pending);
      setPreferences(state.preferences);
      setContent(state.entries.find((entry) => entry.date === today && !entry.deletedAt)?.content ?? '');
      setSaveStatus('saved');
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current || saveStatus === 'opening') return;
    void saveState({ entries, pending, preferences });
  }, [entries, pending, preferences, saveStatus]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const persistEntry = (date: string, text: string) => {
    const existing = entries.find((entry) => entry.date === date);
    const entry = existing
      ? { ...existing, content: text, updatedAt: new Date().toISOString(), version: existing.version + 1 }
      : makeEntry(date, text);
    setEntries((items) => [...items.filter((item) => item.date !== date), entry]);
    setPending((items) => [...items.filter((item) => item.date !== date), entry]);
    setSaveStatus('saved');
  };

  const changeContent = (text: string) => {
    setContent(text);
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistEntry(selectedDate, text), 700);
  };

  const selectDate = (date: string) => {
    clearTimeout(saveTimer.current);
    if (saveStatus === 'saving') persistEntry(selectedDate, content);
    setSelectedDate(date);
    setMonth(new Date(parseDateKey(date).getFullYear(), parseDateKey(date).getMonth(), 1));
    setContent(entries.find((entry) => entry.date === date && !entry.deletedAt)?.content ?? '');
    setSaveStatus('saved');
    setSheet(null);
  };

  const moveDay = (offset: number) => {
    const date = parseDateKey(selectedDate);
    selectDate(toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset)));
  };

  const shareExport = async (format: 'markdown' | 'text') => {
    try {
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error('No writable directory is available.');
      const uri = `${directory}munimuni-export.${format === 'markdown' ? 'md' : 'txt'}`;
      await FileSystem.writeAsStringAsync(uri, exportEntries(entries, format));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'Export Munimuni journal' });
      else Alert.alert('Export ready', 'Sharing is not available on this device.');
    } catch {
      Alert.alert('Export unavailable', 'We could not prepare your export. Your entries remain safely on this device.');
    }
  };

  const updatePreferences = (next: Partial<Preferences>) => setPreferences((current) => ({ ...current, ...next }));
  const entryDates = new Set(entries.filter((entry) => entry.content.trim() && !entry.deletedAt).map((entry) => entry.date));
  const wordCount = countWords(content);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topbar}>
        <Pressable style={styles.brand} onPress={() => selectDate(today)} accessibilityLabel="Go to today"><Text style={styles.brandMark}>m</Text><Text style={styles.brandName}>munimuni</Text></Pressable>
        <Pressable onPress={() => setSheet('settings')} accessibilityRole="button" accessibilityLabel="Open settings"><Text style={styles.settingsIcon}>☼</Text></Pressable>
      </View>
      <View style={styles.content}>
        <View style={styles.utilityRow}>
          <Pressable onPress={() => setSheet('calendar')} hitSlop={10}><Text style={styles.utilityAction}>☷  Calendar</Text></Pressable>
          <Pressable onPress={() => selectDate(today)} hitSlop={10}><Text style={styles.utilityAction}>Today</Text></Pressable>
        </View>
        <View style={styles.dateHeader}>
          <Pressable style={styles.dayButton} onPress={() => moveDay(-1)} accessibilityLabel="Previous day"><Text style={styles.dayButtonText}>‹</Text></Pressable>
          <Pressable onPress={() => setSheet('calendar')} style={styles.dateTitle}><Text style={styles.overline}>{selectedDate === today ? 'TODAY' : 'JOURNAL ENTRY'}</Text><Text style={styles.dateText}>{formatLongDate(selectedDate)}</Text></Pressable>
          <Pressable style={styles.dayButton} onPress={() => moveDay(1)} accessibilityLabel="Next day"><Text style={styles.dayButtonText}>›</Text></Pressable>
        </View>
        <View style={styles.editorMeta}><Text style={styles.metaText}>PLAIN TEXT</Text><Text style={styles.metaText}>{saveStatus === 'saving' ? 'SAVING LOCALLY' : 'SAVED ON THIS DEVICE'}</Text></View>
        <TextInput
          value={content}
          onChangeText={changeContent}
          placeholder="Begin wherever you are…"
          placeholderTextColor={colors.muted}
          multiline
          autoFocus
          textAlignVertical="top"
          accessibilityLabel={`Journal entry for ${formatLongDate(selectedDate)}`}
          style={[styles.editor, fontStyle(preferences.writingFont, preferences.writingSize)]}
        />
        <View style={styles.footer}><Text style={styles.metaText}>{wordCount} {wordCount === 1 ? 'WORD' : 'WORDS'}</Text><Text style={styles.metaText}>{currentEntry ? 'PRIVATE TO YOU' : 'A BLANK PAGE'}</Text></View>
        <Text style={styles.closing}>No need to write every day. The page will be here when you are.</Text>
      </View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Tab label="Today" active={selectedDate === today && sheet === null} onPress={() => selectDate(today)} styles={styles} />
        <Tab label="Calendar" active={sheet === 'calendar'} onPress={() => setSheet('calendar')} styles={styles} />
        <Tab label="Settings" active={sheet === 'settings'} onPress={() => setSheet('settings')} styles={styles} />
      </View>
      <BottomSheet visible={sheet === 'calendar'} onClose={() => setSheet(null)} title="Your journal" styles={styles}>
        <Calendar month={month} selectedDate={selectedDate} entryDates={entryDates} onMonth={(offset) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))} onSelect={selectDate} styles={styles} />
      </BottomSheet>
      <BottomSheet visible={sheet === 'settings'} onClose={() => setSheet(null)} title="Preferences" styles={styles}>
        <Settings preferences={preferences} onChange={updatePreferences} onExport={shareExport} styles={styles} />
      </BottomSheet>
    </View>
  );
}

function Tab({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles> }) {
  return <Pressable onPress={onPress} style={styles.tab}><Text style={[styles.tabText, active && styles.tabActive]}>{label}</Text></Pressable>;
}

function BottomSheet({ visible, onClose, title, children, styles }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose} />
    <View style={styles.sheet}><View style={styles.sheetHeader}><View><Text style={styles.overline}>MUNIMUNI</Text><Text style={styles.sheetTitle}>{title}</Text></View><Pressable onPress={onClose} accessibilityLabel="Close"><Text style={styles.close}>×</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView></View>
  </Modal>;
}

function Calendar({ month, selectedDate, entryDates, onMonth, onSelect, styles }: { month: Date; selectedDate: string; entryDates: Set<string>; onMonth: (offset: number) => void; onSelect: (date: string) => void; styles: ReturnType<typeof makeStyles> }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dates = Array.from({ length: first + count }, (_, index) => index < first ? null : index - first + 1);
  return <View><View style={styles.monthHeader}><Text style={styles.monthText}>{formatMonth(month)}</Text><View style={styles.monthActions}><Pressable style={styles.circleButton} onPress={() => onMonth(-1)}><Text style={styles.circleText}>‹</Text></Pressable><Pressable style={styles.circleButton} onPress={() => onMonth(1)}><Text style={styles.circleText}>›</Text></Pressable></View></View><View style={styles.week}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}${index}`} style={styles.weekday}>{day}</Text>)}</View><View style={styles.days}>{dates.map((day, index) => { if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />; const date = toDateKey(new Date(month.getFullYear(), month.getMonth(), day)); const selected = date === selectedDate; return <Pressable key={date} style={[styles.dayCell, selected && styles.daySelected]} onPress={() => onSelect(date)}><Text style={[styles.dayNumber, selected && styles.daySelectedText]}>{day}</Text>{entryDates.has(date) && <View style={[styles.entryDot, selected && styles.entryDotSelected]} />}</Pressable>; })}</View><Text style={styles.calendarNote}>• Days with entries</Text></View>;
}

function Settings({ preferences, onChange, onExport, styles }: { preferences: Preferences; onChange: (next: Partial<Preferences>) => void; onExport: (format: 'markdown' | 'text') => void; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.settings}><Group label="Appearance" styles={styles}><Choice values={['system', 'light', 'dark'] as Appearance[]} selected={preferences.appearance} onSelect={(appearance) => onChange({ appearance })} styles={styles} /></Group><Group label="Accent color" styles={styles}><View style={styles.swatches}>{accentOptions.map((accent) => <Pressable key={accent} onPress={() => onChange({ accent })} accessibilityLabel={`${accent} accent`} style={[styles.swatch, { backgroundColor: palette('light', false, accent).accent }, preferences.accent === accent && styles.swatchActive]} />)}</View></Group><Group label="Writing font" styles={styles}><Choice values={['serif', 'sans', 'mono'] as WritingFont[]} selected={preferences.writingFont} onSelect={(writingFont) => onChange({ writingFont })} styles={styles} /></Group><Group label="Writing size" styles={styles}><Choice values={['small', 'medium', 'large'] as WritingSize[]} selected={preferences.writingSize} onSelect={(writingSize) => onChange({ writingSize })} styles={styles} /></Group><Group label="Data" styles={styles}><Pressable onPress={() => onExport('markdown')} style={styles.export}><Text style={styles.exportText}>Export Markdown</Text><Text style={styles.exportText}>↗</Text></Pressable><Pressable onPress={() => onExport('text')} style={styles.export}><Text style={styles.exportText}>Export plain text</Text><Text style={styles.exportText}>↗</Text></Pressable></Group><Text style={styles.note}>Your entries are saved on this device first. Sign-in and secure server sync will be available when the mobile API is configured.</Text></View>;
}

function Group({ label, children, styles }: { label: string; children: React.ReactNode; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.group}><Text style={styles.groupLabel}>{label.toUpperCase()}</Text>{children}</View>; }
function Choice<T extends string>({ values, selected, onSelect, styles }: { values: T[]; selected: T; onSelect: (value: T) => void; styles: ReturnType<typeof makeStyles> }) { return <View style={styles.choices}>{values.map((value) => <Pressable key={value} onPress={() => onSelect(value)} style={[styles.choice, selected === value && styles.choiceActive]}><Text style={[styles.choiceText, selected === value && styles.choiceTextActive]}>{value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}</View>; }

function fontStyle(font: WritingFont, size: WritingSize) { const scale = size === 'small' ? 18 : size === 'large' ? 26 : 21; return { fontFamily: font === 'mono' ? Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) : font === 'sans' ? undefined : Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }), fontSize: font === 'mono' ? scale - 5 : font === 'sans' ? scale - 2 : scale, lineHeight: font === 'mono' ? 28 : Math.round(scale * 1.65) }; }

function makeStyles(c: ReturnType<typeof palette>) { return StyleSheet.create({ screen: { flex: 1, backgroundColor: c.bg }, topbar: { height: 62, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.faint, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { flexDirection: 'row', alignItems: 'center' }, brandMark: { width: 26, height: 26, borderWidth: 1, borderColor: c.accent, borderRadius: 13, textAlign: 'center', color: c.accent, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 19, fontStyle: 'italic', lineHeight: 24, marginRight: 8 }, brandName: { color: c.ink, fontSize: 15, letterSpacing: .5 }, settingsIcon: { color: c.muted, fontSize: 22 }, content: { flex: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 80 }, utilityRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }, utilityAction: { color: c.accent, fontSize: 11, letterSpacing: .3 }, dateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }, dayButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, dayButtonText: { color: c.muted, fontSize: 30, fontWeight: '300' }, dateTitle: { flex: 1, alignItems: 'center' }, overline: { color: c.accent, fontSize: 10, letterSpacing: 1.4, fontWeight: '500' }, dateText: { color: c.ink, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 27, marginTop: 7, textAlign: 'center' }, editorMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 16 }, metaText: { color: c.muted, fontSize: 9, letterSpacing: .7 }, editor: { flex: 1, minHeight: 280, color: c.ink, padding: 0 }, footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.faint }, closing: { color: c.muted, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 22, paddingHorizontal: 15 }, tabBar: { flexDirection: 'row', backgroundColor: c.bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.faint, minHeight: 62 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 }, tabText: { color: c.muted, fontSize: 11 }, tabActive: { color: c.accent }, backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,.24)' }, sheet: { maxHeight: '82%', backgroundColor: c.panel, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.faint, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, paddingBottom: 34, position: 'absolute', bottom: 0, left: 0, right: 0 }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }, sheetTitle: { color: c.ink, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 24, marginTop: 6 }, close: { color: c.muted, fontSize: 30, lineHeight: 30 }, monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }, monthText: { color: c.ink, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 20 }, monthActions: { flexDirection: 'row', gap: 8 }, circleButton: { width: 32, height: 32, borderWidth: 1, borderColor: c.faint, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, circleText: { color: c.muted, fontSize: 24, lineHeight: 26 }, week: { flexDirection: 'row' }, weekday: { width: '14.2857%', color: c.muted, fontSize: 10, textAlign: 'center', marginBottom: 9 }, days: { flexDirection: 'row', flexWrap: 'wrap' }, dayCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 30 }, daySelected: { backgroundColor: c.accent }, dayNumber: { color: c.muted, fontSize: 13 }, daySelectedText: { color: c.paper }, entryDot: { position: 'absolute', bottom: 6, width: 3, height: 3, borderRadius: 2, backgroundColor: c.accent }, entryDotSelected: { backgroundColor: c.paper }, calendarNote: { color: c.muted, fontSize: 10, marginTop: 20 }, settings: { paddingBottom: 4 }, group: { marginBottom: 29 }, groupLabel: { color: c.muted, fontSize: 10, letterSpacing: 1.1, marginBottom: 11 }, choices: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' }, choice: { borderWidth: 1, borderColor: c.faint, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 4 }, choiceActive: { borderColor: c.accent, backgroundColor: c.soft }, choiceText: { color: c.muted, fontSize: 12 }, choiceTextActive: { color: c.accent }, swatches: { flexDirection: 'row', gap: 16, padding: 5 }, swatch: { width: 22, height: 22, borderRadius: 11 }, swatchActive: { borderWidth: 3, borderColor: c.panel }, export: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.faint }, exportText: { color: c.accent, fontSize: 13 }, note: { color: c.muted, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }), fontSize: 13, lineHeight: 20, fontStyle: 'italic', marginTop: 8 } }); }
