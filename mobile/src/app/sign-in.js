/**
 * Sign in — social-first layout with filled email fields (Finimize / Credit Karma, Mobbin).
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, space } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { AuthShell, AuthFooterLink } from '../components/auth/AuthShell';
import { SocialAuthRow } from '../components/auth/SocialAuth';
import { Button, Checkbox, Field, LabeledDivider } from '../components/ui';
import { Text } from '../components/Text';
import { useToast } from '../hooks/useToast';

export default function SignInScreen() {
  const router = useRouter();
  const { fromSplash } = useLocalSearchParams();
  const { signIn } = useAuth();
  const entranceFromSplash = fromSplash === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function submit() {
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      // AuthGate (app/_layout.js) sends the donor back to where they came from.
    } catch (err) {
      showToast({ message: err.message || 'Unable to sign in', tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      entranceFromSplash={entranceFromSplash}
      showBack={!entranceFromSplash}
      title="Welcome back"
      subtitle="Sign in to follow the children you sponsor."
      footer={
        <AuthFooterLink
          prompt="New here?"
          actionLabel="Create an account"
          onPress={() => router.push('/sign-up')}
        />
      }
    >
      <SocialAuthRow label="Continue with Apple" kind="apple" onPress={() => {}} />
      <SocialAuthRow label="Continue with Google" kind="google" onPress={() => {}} />

      <LabeledDivider label="Or continue with email" style={{ marginBottom: space.lg, marginTop: space.sm }} />

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        filled
        style={{ marginBottom: space.base }}
      />

      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry={!reveal}
        autoComplete="current-password"
        filled
        trailing={
          <Pressable
            onPress={() => setReveal((v) => !v)}
            hitSlop={12}
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
          >
            <Icon name={reveal ? 'eyeoff' : 'eye'} size={20} color={colors.muted2} strokeWidth={1.7} />
          </Pressable>
        }
        style={{ marginBottom: space.md }}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Checkbox checked={remember} onPress={() => setRemember((v) => !v)} size={20} />
          <Pressable onPress={() => setRemember((v) => !v)} hitSlop={8}>
            <Text variant="body" color={colors.ink2} style={{ marginLeft: space.sm, fontSize: 15 }}>
              Remember me
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/sign-up')} hitSlop={8}>
          <Text variant="label" color={colors.green} style={{ fontSize: 15 }}>
            Forgot password?
          </Text>
        </Pressable>
      </View>

      <Button label="Sign in" onPress={submit} loading={busy} height={56} radius={radii.chip} />
    </AuthShell>
  );
}
