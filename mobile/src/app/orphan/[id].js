/**
 * Child details — public. "Sponsor now" asks guests to sign in / create an
 * account first and then continues to the payment page.
 */
import { useCallback, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { Text } from '../../components/Text';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/ui';
import { Box, ChildPhoto, ErrorNote, Loading, Page, StatusPill, font, shadow } from '../../components/donor/Kit';
import { colors, layout } from '../../theme/tokens';
import { pkr, setAfterLogin } from '../../lib/donorApp';

function Fact({ icon, label, value }) {
  return (
    <View style={{ width: '50%', padding: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.canvas, borderRadius: 14, padding: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} color={colors.green} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="tiny" color={colors.muted} numberOfLines={1}>
            {label}
          </Text>
          <Text variant="caption" color={colors.ink} style={[font.semi, { marginTop: 1 }]} numberOfLines={2}>
            {value || '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function OrphanDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { signedIn } = useAuth();
  const { width } = useWindowDimensions();
  const photoW = Math.min(width, layout.width) - 40;
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api
      .appOrphan(id)
      .then(setC)
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when sign-in state changes
  }, [id, signedIn]);
  useFocusEffect(load);

  function sponsorNow() {
    const next = `/give?kind=sponsorship&orphan=${id}`;
    if (!signedIn) {
      setAfterLogin(next);
      router.push('/sign-in');
      return;
    }
    router.push(next);
  }

  return (
    <Page title="Child details" subtitle={c ? [c.code, c.listName].filter(Boolean).join(' · ') : undefined} back tab="children">
      <ErrorNote message={error} />
      {!c && !error ? <Loading /> : null}
      {c ? (
        <>
          <View style={[{ marginTop: 8, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.surface }, shadow.card]}>
            <ChildPhoto uri={c.photoUrl || c.photoThumbnailUrl} name={c.name} width={photoW} height={Math.round(photoW * 1.05)} radius={0} />
            {c.isMine ? (
              <View style={{ position: 'absolute', top: 12, right: 12 }}>
                <StatusPill status="approved" label="Your child" size="lg" />
              </View>
            ) : null}
          </View>

          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text variant="h1" style={[font.bold, { textAlign: 'center' }]}>
              {c.name}
            </Text>
            {c.nameAr && c.nameAr !== c.name ? (
              <Text variant="body" color={colors.ink2} style={{ textAlign: 'center', marginTop: 4, writingDirection: 'rtl' }}>
                {c.nameAr}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginHorizontal: -5 }}>
            <Fact icon="user" label="Age" value={c.age != null ? `${c.age} years` : null} />
            <Fact icon="users" label="Gender" value={c.sex} />
            <Fact icon="pin" label="Location" value={c.location} />
            <Fact icon="shield" label="Partner" value={c.organization || 'GVA'} />
          </View>

          <LinearGradient
            colors={[colors.greenDeep, colors.green]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="heart" size={22} color={colors.white} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="tiny" color="rgba(255,255,255,0.85)">
                Monthly kafalat
              </Text>
              <Text variant="h2" color={colors.white} style={font.bold}>
                {pkr(c.monthlyPkr)}
              </Text>
              <Text variant="tiny" color="rgba(255,255,255,0.85)">
                Food, schooling and care every month
              </Text>
            </View>
          </LinearGradient>

          <View style={{ marginTop: 16 }}>
            {c.isMine ? (
              <Button label="Pay monthly donation" icon="wallet" onPress={() => router.push(`/give?kind=payment&orphan=${c.id}`)} />
            ) : c.myRequest?.status === 'pending' ? (
              <Box style={{ backgroundColor: colors.orangeTint, borderColor: colors.orangeBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="clock" size={18} color={colors.orangeInk} strokeWidth={2} />
                  <Text variant="bodyStrong" color={colors.orangeText} style={font.bold}>
                    Your request is waiting for approval
                  </Text>
                </View>
                <Text variant="caption" color={colors.orangeTextSoft} style={{ marginTop: 6 }}>
                  Our team is checking your payment slip. You will see this child under your children once approved.
                </Text>
                <Button label="View my requests" kind="secondary" onPress={() => router.push('/requests')} style={{ marginTop: 12 }} />
              </Box>
            ) : c.available ? (
              <>
                <Button label="Sponsor now" icon="heart" onPress={sponsorNow} />
                {!signedIn ? (
                  <Text variant="tiny" color={colors.muted} style={{ marginTop: 8, textAlign: 'center' }}>
                    You will be asked to sign in or create an account first.
                  </Text>
                ) : null}
              </>
            ) : (
              <Box style={{ backgroundColor: colors.canvas }}>
                <Text variant="bodyStrong" style={font.bold}>
                  This child already has a sponsor
                </Text>
                <Button label="See other children" kind="secondary" onPress={() => router.push('/orphans/all')} style={{ marginTop: 12 }} />
              </Box>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 18 }}>
            <Icon name="lock" size={13} color={colors.muted2} />
            <Text variant="tiny" color={colors.muted2} style={{ textAlign: 'center' }}>
              Personal details are shared only with the child&apos;s sponsor.
            </Text>
          </View>
        </>
      ) : null}
    </Page>
  );
}
