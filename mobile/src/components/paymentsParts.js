/**
 * Shared parts of the Payments screens.
 *
 * Both the multi-pay and history screens sit on the same header + segmented
 * control; the geometry comes from design/spec/03-payments-multi-pay.json and
 * 04-payments-history.json.
 */
import { Pressable, View } from 'react-native';
import { colors } from '../theme/tokens';
import { T } from './Abs';
import { Icon } from './Icon';

/** "Payments" title at y=68.7 plus the 350-wide segmented control at y=104. */
export function PaymentsHeader({ active = 0, onChange, batchLabel = 'Dec batch' }) {
  return (
    <>
      <T t="Payments" x={20} y={68.7} w={140} h={24} fs={20} fw="Semi Bold" ls={-0.5} />

      {/* batch pill — 90x26 r13 at x=280 y=70 */}
      {batchLabel ? (
        <>
          <View style={{ position: 'absolute', left: 280, top: 70, width: 90, height: 26, borderRadius: 13, backgroundColor: colors.tint }} />
          <T t={batchLabel} x={280} y={78} w={90} h={11} fs={9.5} fw="Semi Bold" color={colors.greenText} align="center" />
        </>
      ) : null}

      {/* segmented control — 350x38 r11 track, 171x30 r8.5 thumb at x=+4 */}
      <View style={{ position: 'absolute', left: 20, top: 104, width: 350, height: 38, borderRadius: 11, backgroundColor: colors.trackAlt }} />
      <View style={{ position: 'absolute', left: 20 + 4 + active * 171, top: 108, width: 171, height: 30, borderRadius: 8.5, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E4EAEE' }} />
      <Pressable
        onPress={() => onChange?.(0)}
        style={{ position: 'absolute', left: 24, top: 108, width: 171, height: 30 }}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 0 }}
      >
        <T
          t="Multi-pay"
          x={0}
          y={7.6}
          w={171}
          h={15}
          fs={12}
          fw={active === 0 ? 'Semi Bold' : 'Medium'}
          ls={-0.05}
          color={active === 0 ? colors.ink : '#7A8794'}
          align="center"
        />
      </Pressable>
      <Pressable
        onPress={() => onChange?.(1)}
        style={{ position: 'absolute', left: 195, top: 108, width: 171, height: 30 }}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 1 }}
      >
        <T
          t="Donation history"
          x={0}
          y={7.6}
          w={171}
          h={15}
          fs={12}
          fw={active === 1 ? 'Semi Bold' : 'Medium'}
          ls={-0.05}
          color={active === 1 ? colors.ink : '#7A8794'}
          align="center"
        />
      </Pressable>
    </>
  );
}

/** 20px checkbox at an exact position. */
export function Tick({ x, y, checked, size = 20 }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: 6,
        borderWidth: checked ? 0 : 1.5,
        borderColor: colors.checkboxBorder,
        backgroundColor: checked ? colors.green : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <Icon name="check" size={12} color={colors.white} strokeWidth={2.4} /> : null}
    </View>
  );
}

/** The circular calendar glyph drawn in the date fields. */
export function CalendarGlyph({ x, y }) {
  return (
    <View style={{ position: 'absolute', left: x, top: y }}>
      <Icon name="calendar" size={15} color="#94A3B8" strokeWidth={2} />
    </View>
  );
}
