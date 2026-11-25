/**
 * Payment page — used for a new sponsorship (kind=sponsorship&orphan=ID) and
 * for monthly donations for children already sponsored (kind=payment).
 *
 * Shows the bank / wallet account that is active in the admin panel, lets the
 * donor pick the months, attach the slip and send it for approval.
 */
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../api/client';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { Box, ChildPhoto, ChoiceChip, Empty, ErrorNote, Loading, Page, SectionLabel, Steps, font, shadow } from '../components/donor/Kit';
import { useToast } from '../hooks/useToast';
import { colors } from '../theme/tokens';
import { MONTHS, appendFile, pickFile, pkr } from '../lib/donorApp';

function CopyRow({ label, value, last }) {
  const { showToast } = useToast();
  if (!value) return null;
  const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: 'rgba(255,255,255,0.16)',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="tiny" color="rgba(255,255,255,0.75)">
          {label}
        </Text>
        <Text variant="bodyStrong" color={colors.white} selectable style={[font.bold, { marginTop: 2, letterSpacing: 0.4 }]}>
          {value}
        </Text>
      </View>
      {canCopy ? (
        <Pressable
          onPress={() => navigator.clipboard.writeText(value).then(() => showToast({ message: `${label} copied`, tone: 'success' }))}
          accessibilityRole="button"
          accessibilityLabel={`Copy ${label}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Icon name="copy" size={13} color={colors.white} strokeWidth={2} />
          <Text variant="tiny" color={colors.white} style={font.bold}>
            Copy
          </Text>
        </Pressable>
      ) : (
        <Text variant="tiny" color="rgba(255,255,255,0.75)">
          Hold to copy
        </Text>
      )}
    </View>
  );
}

function Num({ n, children, right }) {
  return (
    <SectionLabel right={right}>
      <Text variant="label" color={colors.green} style={font.bold}>
        {n}.{' '}
      </Text>
      {children}
    </SectionLabel>
  );
}

export default function GiveScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const kind = params.kind === 'payment' ? 'payment' : 'sponsorship';
  const now = new Date();
  const [account, setAccount] = useState(undefined);
  const [children, setChildren] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [monthly, setMonthly] = useState(30000);
  const [year, setYear] = useState(now.getFullYear());
  const [months, setMonths] = useState(new Set([now.getMonth() + 1]));
  const [amount, setAmount] = useState('');
  const [amountEdited, setAmountEdited] = useState(false);
  const [note, setNote] = useState('');
  const [slip, setSlip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api
      .paymentAccount()
      .then((r) => setAccount(r.account))
      .catch(() => setAccount(null));
    (async () => {
      try {
        if (kind === 'sponsorship') {
          const c = await api.appOrphan(params.orphan);
          setChildren([{ id: c.id, code: c.code, name: c.name, photoUrl: c.photoThumbnailUrl || c.photoUrl }]);
          setSelected(new Set([c.id]));
          setMonthly(c.monthlyPkr || 30000);
        } else {
          const me = await api.appMe();
          setChildren(me.children || []);
          setMonthly(me.children?.length ? me.monthlyPkr / me.children.length : 30000);
          const pre = params.orphan ? String(params.orphan).split(',') : (me.children || []).map((c) => c.id);
          setSelected(new Set(pre));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [kind, params.orphan]);

  const suggested = useMemo(() => Math.round(selected.size * months.size * monthly), [selected, months, monthly]);
  useEffect(() => {
    if (!amountEdited) setAmount(String(suggested || ''));
  }, [suggested, amountEdited]);

  const toggle = (set, setter, v) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    setter(n);
  };

  async function attach() {
    try {
      const f = await pickFile();
      if (f) setSlip(f);
    } catch (e) {
      setError(e.message);
    }
  }

  async function submit() {
    setError(null);
    if (!selected.size) return setError('Choose at least one child');
    if (!months.size) return setError('Choose the month(s) you are paying for');
    const amt = Number(String(amount).replace(/[^\d]/g, ''));
    if (!amt) return setError('Enter the amount you sent');
    if (!slip) return setError('Attach the payment slip or screenshot');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('kind', kind);
      form.append('orphanIds', JSON.stringify([...selected]));
      form.append('year', String(year));
      form.append('months', JSON.stringify([...months].sort((a, b) => a - b)));
      form.append('amountPkr', String(amt));
      if (note.trim()) form.append('note', note.trim());
      await appendFile(form, 'slip', slip);
      const r = await api.sendRequest(form);
      setDone(r.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Page title="Request sent" tab="donations">
        <View style={{ alignItems: 'center', marginTop: 30 }}>
          <LinearGradient
            colors={[colors.greenLight, colors.greenDeep]}
            style={[{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }, shadow.lift]}
          >
            <Icon name="check" size={46} color={colors.white} strokeWidth={2.6} />
          </LinearGradient>
          <Text variant="h1" style={[font.bold, { marginTop: 20, textAlign: 'center' }]}>
            Request received
          </Text>
          <Text variant="body" color={colors.ink2} style={{ marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            {done}
          </Text>
          <Text variant="caption" color={colors.muted} style={{ marginTop: 6, textAlign: 'center' }}>
            You can follow it under My requests.
          </Text>
        </View>
        <View style={{ gap: 10, marginTop: 28 }}>
          <Button label="My requests" icon="clock" onPress={() => router.replace('/requests')} />
          <Button label="Back to home" kind="secondary" onPress={() => router.replace('/')} />
        </View>
      </Page>
    );
  }

  const step = !selected.size || !months.size ? 0 : !slip ? 1 : 2;
  const title = kind === 'sponsorship' ? 'Sponsor this child' : 'Pay monthly donation';
  return (
    <Page title={title} subtitle="Send the money, then upload the slip" back tab={kind === 'sponsorship' ? 'children' : 'donations'}>
      <Box style={{ marginTop: 8, paddingVertical: 12 }}>
        <Steps steps={['Choose', 'Pay', 'Upload slip']} current={step} />
      </Box>
      <ErrorNote message={error} />

      {/* 1. Children */}
      <Num n={1}>{kind === 'sponsorship' ? 'Child' : 'Children'}</Num>
      {!loaded ? <Loading /> : null}
      {loaded && kind === 'payment' && !children.length ? (
        <Empty
          title="You don't sponsor a child yet"
          text="Choose a child first — after approval you can pay monthly donations here."
          action={<Button label="See children" onPress={() => router.replace('/orphans/all')} />}
        />
      ) : null}
      {children.map((c) => {
        const on = selected.has(c.id);
        return (
          <Pressable
            key={c.id}
            onPress={kind === 'payment' ? () => toggle(selected, setSelected, c.id) : undefined}
            accessibilityRole={kind === 'payment' ? 'checkbox' : undefined}
            accessibilityState={kind === 'payment' ? { checked: on } : undefined}
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 10,
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: on ? colors.green : colors.hairline,
                backgroundColor: on ? colors.tint2 : colors.surface,
                marginBottom: 8,
              },
              shadow.card,
            ]}
          >
            <ChildPhoto uri={c.photoUrl} name={c.name} size={50} radius={14} />
            <View style={{ flex: 1 }}>
              <Text variant="tiny" color={colors.greenText} style={font.bold}>
                {c.code}
              </Text>
              <Text variant="caption" color={colors.ink} style={font.semi} numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="tiny" color={colors.muted}>
                {pkr(monthly)} / month
              </Text>
            </View>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? colors.green : colors.canvas,
                borderWidth: on ? 0 : 1,
                borderColor: colors.hairline,
              }}
            >
              {on ? <Icon name="check" size={14} color={colors.white} strokeWidth={2.6} /> : null}
            </View>
          </Pressable>
        );
      })}

      {/* 2. Months */}
      <Num
        n={2}
        right={
          <View style={{ flexDirection: 'row', marginBottom: -8 }}>
            {[now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <ChoiceChip key={y} label={String(y)} on={year === y} onPress={() => setYear(y)} />
            ))}
          </View>
        }
      >
        Months
      </Num>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {MONTHS.map((m, i) => {
          const on = months.has(i + 1);
          return (
            <Pressable
              key={m}
              onPress={() => toggle(months, setMonths, i + 1)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${m} ${year}`}
              style={{
                width: '23.5%',
                marginBottom: 8,
                paddingVertical: 10,
                borderRadius: 14,
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: on ? colors.green : colors.hairline,
                backgroundColor: on ? colors.green : colors.surface,
              }}
            >
              <Text variant="caption" color={on ? colors.white : colors.ink2} style={on ? font.bold : font.medium}>
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 3. Account */}
      <Num n={3}>Send your donation to</Num>
      {account === undefined ? (
        <Loading />
      ) : account ? (
        <LinearGradient
          colors={[colors.greenDeep, colors.green, colors.greenLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[{ borderRadius: 22, padding: 18 }, shadow.lift]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="wallet" size={21} color={colors.white} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color={colors.white} style={font.bold}>
                {account.label}
              </Text>
              {account.bankName || account.branch ? (
                <Text variant="tiny" color="rgba(255,255,255,0.8)">
                  {[account.bankName !== account.label ? account.bankName : null, account.branch].filter(Boolean).join(' · ') || ' '}
                </Text>
              ) : null}
            </View>
          </View>
          <CopyRow label="Account title" value={account.accountTitle} />
          <CopyRow label="Account number" value={account.accountNumber} last={!account.iban} />
          <CopyRow label="IBAN" value={account.iban} last />
          {account.instructions ? (
            <View style={{ marginTop: 10, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8 }}>
              <Icon name="alertcircle" size={15} color={colors.white} />
              <Text variant="tiny" color={colors.white} style={{ flex: 1, lineHeight: 17 }}>
                {account.instructions}
              </Text>
            </View>
          ) : null}
        </LinearGradient>
      ) : (
        <ErrorNote message="Payment details are not available right now. Please contact us from Help." />
      )}

      {/* Amount */}
      <Box style={{ marginTop: 14, backgroundColor: colors.tint2, borderColor: colors.tintBorder }}>
        <Text variant="tiny" color={colors.muted}>
          Amount you sent (PKR)
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text variant="h2" color={colors.greenText} style={[font.bold, { marginRight: 6 }]}>
            PKR
          </Text>
          <TextInput
            value={amount}
            onChangeText={(t) => {
              setAmountEdited(true);
              setAmount(t.replace(/[^\d]/g, ''));
            }}
            keyboardType="number-pad"
            placeholder="30000"
            placeholderTextColor={colors.placeholder}
            style={{ flex: 1, height: 44, fontSize: 24, color: colors.ink, fontFamily: font.bold.fontFamily, outlineStyle: 'none' }}
            accessibilityLabel="Amount"
          />
          <Icon name="wallet" size={18} color={colors.muted2} />
        </View>
        <View style={{ height: 1, backgroundColor: colors.tintBorder, marginVertical: 8 }} />
        <Text variant="tiny" color={colors.muted}>
          {selected.size} child{selected.size === 1 ? '' : 'ren'} × {months.size} month{months.size === 1 ? '' : 's'} × {pkr(monthly)} ={' '}
          <Text variant="tiny" color={colors.greenText} style={font.bold}>
            {pkr(suggested)}
          </Text>
        </Text>
      </Box>

      {/* 4. Slip */}
      <Num n={4}>Payment slip / screenshot</Num>
      <Pressable
        onPress={attach}
        accessibilityRole="button"
        accessibilityLabel={slip ? 'Change the slip' : 'Upload the slip'}
        style={{
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: slip ? colors.green : colors.fieldBorder,
          borderRadius: 18,
          padding: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: slip ? colors.tint2 : colors.canvas,
        }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: slip ? colors.green : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={slip ? 'check' : 'upload'} size={22} color={slip ? colors.white : colors.green} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={colors.ink} style={font.bold} numberOfLines={1}>
            {slip ? slip.name || 'Slip attached' : 'Tap to upload the screenshot'}
          </Text>
          <Text variant="tiny" color={colors.muted} style={{ marginTop: 2 }}>
            {slip ? 'Tap to change' : 'JPG, PNG or PDF'}
          </Text>
        </View>
      </Pressable>

      <SectionLabel icon="note">Note for our team (optional)</SectionLabel>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Sent from Meezan Bank, ref 12345"
        placeholderTextColor={colors.placeholder}
        multiline
        style={{
          minHeight: 76,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.fieldBorder,
          padding: 12,
          fontSize: 15,
          color: colors.ink,
          textAlignVertical: 'top',
          fontFamily: font.regular.fontFamily,
        }}
        accessibilityLabel="Note"
      />
      <Text variant="tiny" color={colors.muted} style={{ marginTop: 6 }}>
        You will see this note later in My requests and Donations.
      </Text>

      <Button label="Send for approval" icon="arrow" onPress={submit} loading={busy} disabled={!account} style={{ marginTop: 20 }} />
      <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 10 }}>
        <Icon name="shield" size={13} color={colors.muted} />
        <Text variant="tiny" color={colors.muted} style={{ textAlign: 'center', flexShrink: 1 }}>
          Our team checks every slip. {kind === 'sponsorship' ? 'Once approved, the child is added to your account.' : 'Once approved, the months show as paid.'}
        </Text>
      </View>
      <Pressable onPress={() => Linking.openURL('https://gazavirtualadoption.org')} style={{ marginTop: 6 }}>
        <Text variant="tiny" color={colors.muted2} style={{ textAlign: 'center' }}>
          gazavirtualadoption.org
        </Text>
      </Pressable>
    </Page>
  );
}
