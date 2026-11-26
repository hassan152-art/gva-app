/**
 * Profile tab: who you are, your totals, change password, account links and
 * log out. Built on the same Page layout as the other tabs, so the top safe
 * area, side gutters and bottom spacing match exactly.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Text } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/ui';
import { Box, Page, SectionLabel, Stat, font } from '../../components/donor/Kit';
import { colors } from '../../theme/tokens';
import { pkr, useCachedState } from '../../lib/donorApp';

function PasswordField({ label, value, onChangeText, secure, right }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text variant="tiny" color={colors.ink2} style={[font.semi, { marginBottom: 6 }]}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.fieldBorder,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          placeholder="••••••••"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          style={{ flex: 1, fontSize: 15, color: colors.ink, fontFamily: font.regular.fontFamily, paddingVertical: 0, outlineStyle: 'none' }}
        />
        {right}
      </View>
    </View>
  );
}

function Row({ icon, label, onPress, tone = colors.green, bg = colors.tint, last }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.hairline2,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={tone} strokeWidth={2} />
      </View>
      <Text variant="caption" color={tone === colors.heart ? colors.heart : colors.ink} style={[font.semi, { flex: 1 }]}>
        {label}
      </Text>
      {tone === colors.heart ? null : <Icon name="chevron" size={16} color={colors.muted2} strokeWidth={2} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signedIn, signOut, refreshUser } = useAuth();
  const { showToast } = useToast();

  // Last loaded data shows instantly; it refreshes quietly in the background.
  const [profile, setProfile] = useCachedState(`profile:${user?.id}`);
  const [donor, setDonor] = useCachedState(`profile:donor:${user?.id}`);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) return; // logged out: nothing to load
    try {
      const [res, me] = await Promise.all([api.profile(), api.appMe().catch(() => null)]);
      setProfile(res);
      setDonor(me);
    } catch {
      // Keep what we had (or the session user) so the screen still renders.
    }
  }, [signedIn, setProfile, setDonor]);

  useEffect(() => {
    load();
  }, [load]);

  async function logOut() {
    await signOut();
    // A fresh set of tabs, so nothing from this account stays mounted.
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
  const dash = '—';

  return (
    <Page title="Profile" subtitle={donor?.sponsorCode ? `Sponsor ID ${donor.sponsorCode}` : 'Your account'} tab="profile">
      <Box style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.greenDeep, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="h2" color={colors.white} style={font.bold}>
            {initial}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" style={font.bold} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="tiny" color={colors.muted} numberOfLines={1}>
            {email}
          </Text>
          {memberSince ? (
            <Text variant="tiny" color={colors.muted2} style={{ marginTop: 1 }}>
              Member since {memberSince}
            </Text>
          ) : null}
        </View>
      </Box>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Stat icon="users" label="Sponsored" value={donor ? String(donor.children.length) : dash} tone="green" />
        <Stat icon="coins" label="Total given" value={donor ? pkr(donor.totals?.paidPkr || 0) : dash} tone="blue" />
        <Stat icon="clock" label="Pending" value={donor ? String(donor.requests?.pending || 0) : dash} tone="orange" />
      </View>

      <SectionLabel icon="lock">Change password</SectionLabel>
      <Box>
        <Text variant="tiny" color={colors.muted}>
          At least 8 characters, with a number. Choose something you have not used before.
        </Text>
        <PasswordField label="Current password" value={current} onChangeText={setCurrent} secure />
        <PasswordField
          label="New password"
          value={next}
          onChangeText={setNext}
          secure={!showNext}
          right={
            <Pressable onPress={() => setShowNext((v) => !v)} hitSlop={12} accessibilityLabel={showNext ? 'Hide password' : 'Show password'}>
              <Icon name={showNext ? 'eyeoff' : 'eye'} size={18} color={colors.muted} strokeWidth={1.8} />
            </Pressable>
          }
        />
        <PasswordField label="Confirm new password" value={confirm} onChangeText={setConfirm} secure={!showNext} />
        <Button label={busy ? 'Updating…' : 'Update password'} onPress={submit} loading={busy} height={48} style={{ marginTop: 16 }} />
      </Box>

      <SectionLabel icon="user">Account</SectionLabel>
      <Box style={{ paddingVertical: 2 }}>
        <Row icon="receipt" label="My donations" onPress={() => router.navigate('/donations')} />
        <Row icon="clock" label="My requests" onPress={() => router.push('/requests')} tone={colors.orangeInk} bg={colors.orangeTint} />
        <Row icon="help" label="Complaints & help" onPress={() => router.navigate('/tickets')} tone="#2563EB" bg="#EEF4FF" last />
      </Box>

      <Box style={{ marginTop: 12, paddingVertical: 2 }}>
        <Row icon="x" label="Log out" onPress={logOut} tone={colors.heart} bg="#FEE2E2" last />
      </Box>
    </Page>
  );
}
