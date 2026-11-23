/**
 * 06 · Stripe checkout — hosted payment surface.
 *
 * Geometry from design/spec/06-stripe-checkout.json.
 *
 * NOTE: this screen is a faithful UI recreation. The payment gateway is NOT
 * wired up: the Pay button is deliberately a stub. See the handler below.
 */
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/tokens';
import { T } from '../../components/Abs';
import { Icon, LogoMark, AppleMark, GoogleG, VisaMark, MastercardMark } from '../../components/Icon';
import { HomeIndicator, StatusBarMock } from '../../components/chrome';

const AMOUNT = 'PKR 30,000';

export default function StripeCheckoutScreen() {
  const router = useRouter();

  /**
   * Payment gateway integration point.
   *
   * The gateway is not connected in this build, so this handler intentionally
   * does nothing. When a gateway (Stripe Checkout, or a local PSP) is chosen,
   * create a payment intent on the backend and start the hosted flow here.
   */
  function handlePay() {}

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ width: 390, height: 844, alignSelf: 'center' }}>
        <StatusBarMock />

        {/* ---- hosted-checkout chrome bar: rules at y=52 and y=96.5 ---- */}
        <View style={{ position: 'absolute', left: 0, top: 52, width: 390, height: 1, backgroundColor: colors.hairline2 }} />
        <View style={{ position: 'absolute', left: 0, top: 96.5, width: 390, height: 1, backgroundColor: colors.hairline2 }} />

        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back" style={{ position: 'absolute', left: 20, top: 64, width: 24, height: 24 }}>
          <Icon name="chevleft" size={18} color={colors.ink} strokeWidth={1.9} />
        </Pressable>

        {/* lock + merchant host */}
        <Icon name="lock" size={12} color="#5B6773" strokeWidth={1.9} style={{ position: 'absolute', left: 104, top: 69 }} />
        <T t="gazavirtualadoption.org" x={120} y={68.5} w={150} h={13} fs={11} fw="Medium" color={colors.ink2} />

        {/* Test mode pill — 64x20 r10 at x=306 */}
        <View style={{ position: 'absolute', left: 306, top: 64, width: 64, height: 20, borderRadius: 10, backgroundColor: colors.orangeTint, borderWidth: 1, borderColor: colors.orangeBorder }} />
        <T t="Test mode" x={306} y={69.4} w={64} h={11} fs={9} fw="Bold" ls={0.1} color={colors.orangeInk} align="center" />

        {/* ---- merchant + amount ---- */}
        <View style={{ position: 'absolute', left: 344, top: 108 }}>
          <LogoMark size={26} />
        </View>
        <T t="Gaza Virtual Adoption" x={20} y={112.4} w={200} h={17} fs={14} fw="Semi Bold" ls={-0.25} />
        <T t="AMOUNT DUE" x={20} y={143.2} w={100} h={11} fs={9} fw="Bold" ls={1.3} color="#8A949E" />
        <T t={AMOUNT} x={20} y={156.9} w={280} h={39} fs={32} fw="Semi Bold" ls={-1.15} tabular />

        {/* ---- order summary card — 350x68 r18 at y=208 ---- */}
        <View style={{ position: 'absolute', left: 20, top: 208, width: 350, height: 68, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
        <View style={{ position: 'absolute', left: 36, top: 226, width: 32, height: 32, borderRadius: 10, backgroundColor: colors.tint }} />
        <View style={{ position: 'absolute', left: 44, top: 234 }}>
          <Icon name="users" size={16} color={colors.greenInk} strokeWidth={1.85} />
        </View>
        <T t="Monthly sponsorship × 3 orphans" x={80} y={226.8} w={210} h={14} fs={11.5} fw="Semi Bold" ls={-0.15} />
        <T t="Ahmad, Fatima, Omar · Dec batch" x={80} y={244.1} w={200} h={11} fs={9.4} color={colors.muted} />
        <T t={AMOUNT} x={250} y={227.5} w={104} h={13} fs={11} fw="Semi Bold" ls={-0.1} align="right" tabular />
        <T t="See details" x={290} y={244.1} w={64} h={11} fs={9.2} fw="Semi Bold" color={colors.green} align="right" />
        <View style={{ position: 'absolute', left: 297.8, top: 255.6, width: 56.17, height: 1, backgroundColor: '#BFDCCB' }} />

        {/* ---- express wallets — 169x48 at y=292 ---- */}
        <Pressable onPress={handlePay} accessibilityLabel="Pay with Apple Pay" style={{ position: 'absolute', left: 20, top: 292, width: 169, height: 48, borderRadius: 10, backgroundColor: '#000000' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 20, top: 306.9, width: 169, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <AppleMark height={17} color={colors.white} />
          <T t="Pay" x={0} y={0} w={32} h={18} fs={15} fw="Medium" ls={-0.2} color={colors.white} style={{ position: 'relative', marginLeft: 4 }} />
        </View>

        <Pressable onPress={handlePay} accessibilityLabel="Pay with Google Pay" style={{ position: 'absolute', left: 201.5, top: 292.5, width: 168, height: 47, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#D5DBE1' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: 201.5, top: 307.7, width: 168, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <GoogleG size={17} />
          <T t="Pay" x={0} y={0} w={30} h={16} fs={13.4} fw="Semi Bold" ls={-0.1} color="#5F6368" style={{ position: 'relative', marginLeft: 3 }} />
        </View>

        {/* ---- "Or pay with card" divider at y=364 ---- */}
        <View style={{ position: 'absolute', left: 20, top: 364, width: 123, height: 1, backgroundColor: colors.hairline }} />
        <View style={{ position: 'absolute', left: 247, top: 364, width: 123, height: 1, backgroundColor: colors.hairline }} />
        <T t="Or pay with card" x={0} y={357.8} w={390} h={12} fs={9.8} fw="Medium" color="#7A8794" align="center" />

        {/* ---- card form ---- */}
        <Label t="Card number" y={380.4} w={65} />
        <Field top={396}>
          <T t="4242 4242 4242 4242" x={14} y={16.3} w={150} h={16} fs={13} fw="Medium" ls={0.2} tabular />
          {/* brand marks, right-aligned inside the field */}
          <View style={{ position: 'absolute', left: 270, top: 17.4, flexDirection: 'row', alignItems: 'center' }}>
            <MastercardMark height={13.2} />
            <View style={{ marginLeft: 4 }}>
              <VisaMark height={10} />
            </View>
          </View>
        </Field>

        <Label t="Expiry date" y={456.4} w={56} />
        <Field top={472} w={169}>
          <T t="12 / 34" x={14} y={16.3} w={120} h={16} fs={13} fw="Medium" ls={0.2} tabular />
        </Field>

        <Label t="CVC" y={456.4} w={22} x={201} />
        <View style={{ position: 'absolute', left: 217.8, top: 456.3, width: 12.4, height: 12.4, borderRadius: 6.2, borderWidth: 1, borderColor: colors.checkboxBorder, alignItems: 'center', justifyContent: 'center' }}>
          <T t="?" x={0} y={1.1} w={12.4} h={9} fs={7.6} fw="Bold" color="#8A94A0" align="center" />
        </View>
        <Field top={472} x={201} w={169}>
          <T t="123" x={14} y={16.3} w={80} h={16} fs={13} fw="Medium" ls={1} tabular />
        </Field>

        <Label t="Country or postal code" y={532.4} w={113} />
        <Field top={548}>
          <T t="Pakistan" x={14} y={16.3} w={200} h={16} fs={13} fw="Medium" />
          <Icon name="chevdown" size={14} color={colors.muted2} strokeWidth={2} style={{ position: 'absolute', left: 322, top: 17 }} />
        </Field>

        <Label t="Email for receipt" y={608.4} w={81} />
        <Field top={624}>
          <T t="you@example.com" x={14} y={16.3} w={250} h={16} fs={13} color={colors.placeholder} />
        </Field>

        {/* ---- Pay: rendered enabled, but the gateway is not wired up ---- */}
        <Pressable
          onPress={handlePay}
          accessibilityLabel={`Pay ${AMOUNT}`}
          style={{ position: 'absolute', left: 20, top: 692, width: 350, height: 52, borderRadius: 14, backgroundColor: colors.green }}
        />
        <T
          t={`Pay ${AMOUNT}`}
          x={20}
          y={709.1}
          w={350}
          h={18}
          fs={14.5}
          fw="Semi Bold"
          ls={-0.2}
          color={colors.white}
          align="center"
          pointerEvents="none"
        />

        {/* ---- trust footer ---- */}
        <Icon name="lock" size={11} color="#8A94A0" strokeWidth={2} style={{ position: 'absolute', left: 140, top: 761 }} />
        <T t="Secured by Stripe" x={155.8} y={760.4} w={100} h={12} fs={10} fw="Medium" color={colors.muted} />
        <T t="Powered by Stripe" x={0} y={777.2} w={390} h={11} fs={9} color={colors.muted2} align="center" />
      </View>

      <HomeIndicator />
    </View>
  );
}

/* ------------------------------------------------------------------ parts */

function Label({ t, y, w, x = 20 }) {
  return <T t={t} x={x} y={y} w={w} h={12} fs={10} fw="Semi Bold" ls={0.1} color={colors.ink2} />;
}

function Field({ top, x = 20, w = 350, children }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top,
        width: w,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.surface,
      }}
    >
      {children}
    </View>
  );
}
