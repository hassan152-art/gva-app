/**
 * Create account — scrollable filled form + compact social row (Mindvalley, Mobbin).
 */
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, layout, radii, space } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { Text } from '../components/Text';
import { FormNotice } from '../components/FormNotice';
import { useAuth } from '../hooks/useAuth';
import { AuthShell, AuthFooterLink } from '../components/auth/AuthShell';
import { SocialAuthIcons } from '../components/auth/SocialAuth';
import { Button, Checkbox, Field, LabeledDivider } from '../components/ui';
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  formatPhoneDisplay,
  getPhoneCountry,
  PHONE_COUNTRIES,
  sanitizePhoneDigits,
} from '../lib/phoneCountries';
import { firstValidationMessage, validateSignUpForm } from '../lib/validateSignUp';
import { ApiError } from '../api/client';

export default function SignUpScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [busy, setBusy] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const phoneCountry = useMemo(() => getPhoneCountry(phoneCountryCode), [phoneCountryCode]);
  const phoneDisplay = formatPhoneDisplay(phoneDigits, phoneCountry);

  function clearFieldError(key) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function onPhoneChange(text) {
    clearFieldError('phone');
    setPhoneDigits(sanitizePhoneDigits(text, phoneCountry));
  }

  function selectCountry(code) {
    const next = getPhoneCountry(code);
    setPhoneCountryCode(code);
    setPhoneDigits((prev) => sanitizePhoneDigits(prev, next));
    setCountryOpen(false);
    clearFieldError('phone');
  }

  async function submit() {
    setBanner(null);
    const errors = validateSignUpForm({
      fullName,
      email,
      phoneCountry,
      phoneDigits,
      password,
      confirm,
      consent,
    });
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setBanner({
        title: 'Check the form',
        message: firstValidationMessage(errors),
      });
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phoneCountry.toDisplayPhone(phoneDigits),
        password,
      });
      // AuthGate (app/_layout.js) sends the donor back to where they came from.
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFieldErrors(err.errors);
        setBanner({
          title: 'Could not create account',
          message: err.message || firstValidationMessage(err.errors),
        });
      } else {
        setBanner({
          title: err instanceof ApiError && err.code === 'NETWORK' ? 'Connection problem' : 'Something went wrong',
          message: err.message || 'Could not create your account',
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const passwordHint = fieldErrors.password || 'At least 8 characters, with a number';

  return (
    <>
      <AuthShell
        showBack
        title="Let's get you started"
        subtitle="Create your account to sponsor a child in Gaza with a monthly gift."
        footer={
          <AuthFooterLink prompt="Already have an account?" actionLabel="Sign in" onPress={() => router.push('/sign-in')} />
        }
      >
        <Field
          label="Full name"
          value={fullName}
          onChangeText={(v) => {
            clearFieldError('fullName');
            setFullName(v);
          }}
          placeholder="First and last name"
          autoCapitalize="words"
          filled
          error={fieldErrors.fullName}
          style={{ marginBottom: space.base }}
        />

        <Field
          label="Email"
          value={email}
          onChangeText={(v) => {
            clearFieldError('email');
            setEmail(v);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          filled
          error={fieldErrors.email}
          style={{ marginBottom: space.base }}
        />

        <Field
          label="Phone"
          value={phoneDisplay}
          onChangeText={onPhoneChange}
          placeholder={phoneCountry.placeholder}
          keyboardType="phone-pad"
          filled
          error={fieldErrors.phone}
          prefix={
            <Pressable
              onPress={() => setCountryOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Country code ${phoneCountry.dial}`}
              style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8, marginRight: 4, borderRightWidth: 1, borderRightColor: colors.hairline }}
            >
              <Text variant="bodyStrong" tabular style={{ fontSize: 17 }}>
                {phoneCountry.dial}
              </Text>
              <Icon name="chevdown" size={11} color={colors.muted2} strokeWidth={2} style={{ marginLeft: 4 }} />
            </Pressable>
          }
          style={{ marginBottom: space.base }}
        />

        <Field
          label="Password"
          value={password}
          onChangeText={(v) => {
            clearFieldError('password');
            setPassword(v);
          }}
          placeholder="Create a password"
          secureTextEntry={!showPass}
          filled
          error={fieldErrors.password}
          hint={passwordHint}
          trailing={
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={12} accessibilityLabel={showPass ? 'Hide password' : 'Show password'}>
              <Icon name={showPass ? 'eyeoff' : 'eye'} size={20} color={colors.muted2} strokeWidth={1.7} />
            </Pressable>
          }
          style={{ marginBottom: space.base }}
        />

        <Field
          label="Confirm password"
          value={confirm}
          onChangeText={(v) => {
            clearFieldError('confirm');
            setConfirm(v);
          }}
          placeholder="Repeat your password"
          secureTextEntry={!showConfirm}
          filled
          error={fieldErrors.confirm}
          trailing={
            <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={12} accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}>
              <Icon name={showConfirm ? 'eyeoff' : 'eye'} size={20} color={colors.muted2} strokeWidth={1.7} />
            </Pressable>
          }
          style={{ marginBottom: space.lg }}
        />

        <Pressable
          onPress={() => {
            clearFieldError('consent');
            setConsent((v) => !v);
          }}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg }}
        >
          <Checkbox checked={consent} onPress={() => setConsent((v) => !v)} size={20} style={{ marginTop: 1 }} />
          <Text variant="body" color={colors.ink2} style={{ flex: 1, marginLeft: space.sm, fontSize: 14, lineHeight: 20 }}>
            I agree to the{' '}
            <Text variant="label" color={colors.green} style={{ fontSize: 14 }}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text variant="label" color={colors.green} style={{ fontSize: 14 }}>
              Privacy Policy
            </Text>
          </Text>
        </Pressable>
        {fieldErrors.consent ? (
          <Text variant="tiny" color={colors.heart} style={{ marginTop: -space.md, marginBottom: space.md, marginLeft: 28 }}>
            {fieldErrors.consent}
          </Text>
        ) : null}

        {banner ? <FormNotice title={banner.title} message={banner.message} inline /> : null}

        <Button label="Create account" onPress={submit} loading={busy} height={56} radius={radii.chip} style={{ marginBottom: space.lg }} />

        <LabeledDivider label="or" style={{ marginBottom: space.lg }} />
        <SocialAuthIcons onApple={() => {}} onGoogle={() => {}} />
      </AuthShell>

      <CountryPicker visible={countryOpen} selected={phoneCountryCode} onSelect={selectCountry} onClose={() => setCountryOpen(false)} />
    </>
  );
}

function CountryPicker({ visible, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(17,24,39,0.45)' }} onPress={onClose}>
        <Pressable
          style={{
            marginTop: 'auto',
            maxHeight: '62%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: 28,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.hairline }} />
          </View>
          <Text variant="h3" style={{ marginHorizontal: layout.gutter, marginBottom: 8 }}>
            Country code
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {PHONE_COUNTRIES.map((c) => {
              const active = c.code === selected;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => onSelect(c.code)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: layout.gutter,
                    paddingVertical: 14,
                    backgroundColor: active ? colors.tint : colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{c.flag}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text variant="bodyStrong">{c.label}</Text>
                    <Text variant="tiny" color={colors.muted}>
                      {c.dial}
                    </Text>
                  </View>
                  {active ? <Icon name="check" size={18} color={colors.green} strokeWidth={2.2} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
