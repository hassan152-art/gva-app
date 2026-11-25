/**
 * Profile tab.
 *
 * Not on the design board, so it is composed entirely from the board's own
 * component language: the same 20pt gutter and 350pt content column, the same
 * card (18-20r, 1px #E6EAEF), the same 111.33x78 stat tiles as Home, the same
 * 48pt field with a 12r radius, the same primary button (350x54, 14r) and the
 * same tab bar with Profile active.
 *
 * Everything sits on the 8pt rhythm used across the screen set.
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/fonts';
import { T } from '../components/Abs';
import { Icon } from '../components/Icon';
import { HomeIndicator, StatusBarMock, TabBar , navigateTab } from '../components/chrome';
import { api } from '../api/client';
import { formatAmount } from '../lib/format';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

const FIELD = { w: 310, h: 48, r: 12 };

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [donor, setDonor] = useState(null);
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const [res, me] = await Promise.all([api.profile(), api.appMe().catch(() => null)]);
      setProfile(res);
      setDonor(me);
    } catch {
      // Fall back to the session user so the screen still renders.
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function logOut() {
    await signOut();
    router.replace('/');
  }

  async function submit() {
    if (!current) return showToast({ message: 'Enter your current password', tone: 'error' });
    if (next.length < 8 || !/\d/.test(next)) {
      return showToast({ message: 'At least 8 characters, with a number', tone: 'error' });
    }
    if (next !== confirm) return showToast({ message: 'The new passwords do not match', tone: 'error' });

    setBusy(true);
    try {
      await api.changePassword({ currentPassword: current, newPassword: next, confirmPassword: confirm });
      setCurrent('');
      setNext('');
      setConfirm('');
      showToast({ message: 'Password updated', tone: 'success' });
      await refreshUser().catch(() => {});
    } catch (err) {
      showToast({ message: err.message || 'Could not update your password', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  const name = profile?.user?.fullName || user?.fullName || '';
  const email = profile?.user?.email || user?.email || '';
  const initial = profile?.user?.initial || user?.initial || (name ? name[0].toUpperCase() : '');
  const memberSince = profile?.user?.memberSince || '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center' }}>
      <View style={{ width: 390, flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ minHeight: 1030, paddingBottom: 140 }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 1030 }}>
            <T t="Profile" x={20} y={68.7} w={140} h={24} fs={20} fw="Semi Bold" ls={-0.5} />

            {/* identity card — 350x96 r20 at y=112 */}
            <View style={{ position: 'absolute', left: 20, top: 108, width: 350, height: 92, borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <View style={{ position: 'absolute', left: 36, top: 130, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.greenDeep }} />
            <T t={initial} x={36} y={145} w={48} h={20} fs={17} fw="Semi Bold" color={colors.white} align="center" />
            <T t={name} x={98} y={130} w={250} h={22} fs={17} fw="Semi Bold" ls={-0.3} />
            <T t={email} x={98} y={154} w={250} h={15} fs={11} color={colors.muted} />
            {memberSince ? (
              <T t={`Member since ${memberSince}`} x={98} y={172} w={250} h={13} fs={10} color={colors.muted2} />
            ) : null}

            {/* three stat tiles, same treatment as Home */}
            <Stat x={20} label="SPONSORED" value={donor ? String(donor.children.length) : '—'} icon="users" />
            <Stat x={139.33} label="TOTAL GIVEN" value={donor ? formatAmount(donor.totals?.paidPkr || 0) : '—'} suffix="PKR" icon="coins" />
            <Stat x={258.67} label="PENDING" value={donor ? String(donor.requests?.pending || 0) : '—'} icon="clock" />

            {/* change password */}
            <T t="Change password" x={20} y={296} w={220} h={19} fs={16} fw="Semi Bold" ls={-0.25} />
            <T t="Choose something you have not used before" x={20} y={318} w={280} h={13} fs={11} color={colors.muted} />

            <View style={{ position: 'absolute', left: 20, top: 334, width: 350, height: 306, borderRadius: 20, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />

            <FieldLabel t="Current password" y={350} />
            <FieldBox top={366}>
              <Entry value={current} onChangeText={setCurrent} placeholder="••••••••" secureTextEntry />
            </FieldBox>

            <FieldLabel t="New password" y={426} />
            <FieldBox top={442}>
              <Entry value={next} onChangeText={setNext} placeholder="••••••••" secureTextEntry={!showNext} />
              <Pressable
                onPress={() => setShowNext((v) => !v)}
                hitSlop={12}
                accessibilityLabel={showNext ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', left: 276, top: 10, width: 32, height: 28, alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name={showNext ? 'eyeoff' : 'eye'} size={18} color="#8A94A0" strokeWidth={1.7} />
              </Pressable>
            </FieldBox>

            <FieldLabel t="Confirm new password" y={502} />
            <FieldBox top={518}>
              <Entry value={confirm} onChangeText={setConfirm} placeholder="••••••••" secureTextEntry={!showNext} />
            </FieldBox>

            {/* update button — 310x44 r12 inside the card, on the 8pt rhythm */}
            <Pressable
              onPress={submit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Update password"
              style={{ position: 'absolute', left: 40, top: 578, width: 310, height: 44, borderRadius: 12, backgroundColor: colors.green, opacity: busy ? 0.7 : 1 }}
            />
            <T
              t={busy ? 'Updating…' : 'Update password'}
              x={40}
              y={591}
              w={310}
              h={16}
              fs={12.5}
              fw="Semi Bold"
              color={colors.white}
              align="center"
              pointerEvents="none"
            />

            {/* account actions */}
            <T t="Account" x={20} y={666} w={220} h={19} fs={16} fw="Semi Bold" ls={-0.25} />

            <View style={{ position: 'absolute', left: 20, top: 690, width: 350, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <View style={{ position: 'absolute', left: 34, top: 706, width: 24, height: 24, borderRadius: 8, backgroundColor: colors.tint }} />
            <View style={{ position: 'absolute', left: 39, top: 711 }}>
              <Icon name="users" size={14} color={colors.greenInk} strokeWidth={2} />
            </View>
            <T t="My donations" x={70} y={708} w={220} h={15} fs={12} fw="Semi Bold" />
            <Pressable onPress={() => router.push('/donations')} style={{ position: 'absolute', left: 20, top: 690, width: 350, height: 56 }} accessibilityLabel="Go to my donations" />
            <View style={{ position: 'absolute', left: 330, top: 707 }}>
              <Icon name="chevron" size={14} color={colors.muted2} strokeWidth={2} />
            </View>

            <View style={{ position: 'absolute', left: 20, top: 754, width: 350, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <View style={{ position: 'absolute', left: 34, top: 770, width: 24, height: 24, borderRadius: 8, backgroundColor: colors.tint }} />
            <View style={{ position: 'absolute', left: 39, top: 775 }}>
              <Icon name="card" size={14} color={colors.greenInk} strokeWidth={2} />
            </View>
            <T t="My requests" x={70} y={772} w={220} h={15} fs={12} fw="Semi Bold" />
            <Pressable onPress={() => router.push('/requests')} style={{ position: 'absolute', left: 20, top: 754, width: 350, height: 56 }} accessibilityLabel="Go to my requests" />
            <View style={{ position: 'absolute', left: 330, top: 771 }}>
              <Icon name="chevron" size={14} color={colors.muted2} strokeWidth={2} />
            </View>

            <View style={{ position: 'absolute', left: 20, top: 818, width: 350, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <View style={{ position: 'absolute', left: 34, top: 834, width: 24, height: 24, borderRadius: 8, backgroundColor: colors.tint }} />
            <View style={{ position: 'absolute', left: 39, top: 839 }}>
              <Icon name="help" size={14} color={colors.greenInk} strokeWidth={2} />
            </View>
            <T t="Complaints & help" x={70} y={836} w={220} h={15} fs={12} fw="Semi Bold" />
            <Pressable onPress={() => router.push('/tickets')} style={{ position: 'absolute', left: 20, top: 818, width: 350, height: 56 }} accessibilityLabel="Go to complaints" />
            <View style={{ position: 'absolute', left: 330, top: 835 }}>
              <Icon name="chevron" size={14} color={colors.muted2} strokeWidth={2} />
            </View>

            <View style={{ position: 'absolute', left: 20, top: 882, width: 350, height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <View style={{ position: 'absolute', left: 34, top: 898, width: 24, height: 24, borderRadius: 8, backgroundColor: '#FEE2E2' }} />
            <View style={{ position: 'absolute', left: 39, top: 903 }}>
              <Icon name="x" size={14} color={colors.heart} strokeWidth={2} />
            </View>
            <T t="Log out" x={70} y={900} w={220} h={15} fs={12} fw="Semi Bold" color={colors.heart} />
            <Pressable
              onPress={logOut}
              style={{ position: 'absolute', left: 20, top: 882, width: 350, height: 56 }}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            />

            {loading ? (
              <View style={{ position: 'absolute', left: 0, top: 380, width: 390, alignItems: 'center' }}>
                <ActivityIndicator color={colors.green} />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <StatusBarMock />
        <TabBar
          active="profile"
          onNavigate={(key) => navigateTab(router, key)}
        />
        <HomeIndicator />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ parts */

function Stat({ x, label, value, suffix, icon }) {
  return (
    <>
      <View style={{ position: 'absolute', left: x, top: 198, width: 111.33, height: 78, borderRadius: 16, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
      <T t={label} x={x + 12} y={211.2} w={80} h={11} fs={9} fw="Semi Bold" ls={0.4} color="#8A949E" />
      <View style={{ position: 'absolute', left: x + 86, top: 209 }}>
        <Icon name={icon} size={13} color={colors.greenInk} strokeWidth={1.9} />
      </View>
      <T t={value} x={x + 12} y={237.5} w={80} h={22} fs={18} fw="Semi Bold" ls={-0.5} tabular />
      {suffix ? <T t={suffix} x={x + 90} y={245.9} w={24} h={10} fs={8.5} fw="Bold" ls={0.4} color="#8C969F" /> : null}
    </>
  );
}

function FieldLabel({ t, y }) {
  return <T t={t} x={40} y={y} w={200} h={12} fs={10} fw="Semi Bold" ls={0.1} color={colors.ink2} />;
}

function FieldBox({ top, children }) {
  return (
    <View style={{ position: 'absolute', left: 40, top, width: FIELD.w, height: FIELD.h, borderRadius: FIELD.r, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }}>
      {children}
    </View>
  );
}

function Entry({ value, onChangeText, placeholder, secureTextEntry }) {
  const empty = value.length === 0;
  return (
    <View style={{ position: 'absolute', left: 14, top: 0, width: 260, height: FIELD.h, justifyContent: 'center' }}>
      {empty ? (
        <T
          t={placeholder}
          x={0}
          y={0}
          w={240}
          h={16}
          fs={13}
          fw="Medium"
          ls={1.6}
          color={colors.ink}
          style={{ position: 'relative' }}
        />
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        allowFontScaling={false}
        spellCheck={false}
        placeholder=""
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          fontFamily: fonts.medium,
          fontSize: 13,
          letterSpacing: secureTextEntry ? 1.6 : 0,
          color: colors.ink,
          paddingTop: 0,
          paddingBottom: 0,
          outlineStyle: 'none',
        }}
      />
    </View>
  );
}
