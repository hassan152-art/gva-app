/**
 * 05 · Payment proof sheet.
 *
 * A bottom sheet over the multi-pay screen: scrim from y=0, white sheet from
 * y=300 with 26r top corners, grabber at y=312, content per
 * design/spec/05-payment-proof-sheet.json.
 *
 * It is fully functional: the drop zone opens a document picker and the submit
 * button posts multipart to POST /payments; the API uploads proof files to
 * Cloudious (Drive folder GVA-APP) and stores the returned URL.
 */
import { useState } from 'react';
import { Modal, Platform, Pressable, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/tokens';
import { fonts } from '../theme/fonts';
import { T } from './Abs';
import { Icon } from './Icon';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import { formatAmount } from '../lib/format';

export function ProofSheet({ visible, onClose, allocations, total, count, onSubmitted }) {
  const [proof, setProof] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  async function pickFile() {
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled) return;
      const file = res.assets?.[0];
      if (!file) return;
      setProof(file);
    } catch (err) {
      setError(err.message || 'Could not open the file picker');
    }
  }

  async function submit() {
    setError(null);
    if (!proof) {
      setError('Attach your transfer screenshot first');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('allocations', JSON.stringify(allocations));
      form.append('method', 'bank_transfer');
      if (note.trim()) form.append('note', note.trim());

      if (Platform.OS === 'web') {
        // On web the picker hands back a blob URL; fetch it back into a Blob.
        const blob = await fetch(proof.uri).then((r) => r.blob());
        form.append('proof', blob, proof.name || 'proof.png');
      } else {
        form.append('proof', {
          uri: proof.uri,
          name: proof.name || 'proof.png',
          type: proof.mimeType || 'image/png',
        });
      }

      await api.submitPayment(form);
      setProof(null);
      setNote('');
      showToast({ message: 'Payment proof submitted', tone: 'success' });
      onSubmitted?.();
    } catch (err) {
      setError(err.message || 'Could not submit the payment');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {/* scrim */}
        <Pressable onPress={onClose} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, opacity: 0.42 }} />

        {/* The sheet is pinned to the top of the (centred) 390pt column so its
            geometry matches the design frame exactly on every viewport. */}
        <View style={{ width: 390, flex: 1, position: 'relative' }}>
          <View style={{ position: 'absolute', left: 0, top: 300, width: 390, bottom: -800, backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}>
            {/* Coordinates below are frame-space minus the sheet top (300),
                from design/spec/05-payment-proof-sheet.json. */}
            <View style={{ position: 'absolute', left: 163, top: 12, width: 64, height: 5, borderRadius: 2.5, backgroundColor: '#E3E8EC' }} />

            <T t="Submit payment proof" x={20} y={40.4} w={260} h={22} fs={18} fw="Semi Bold" ls={-0.4} />

            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              style={{ position: 'absolute', left: 337, top: 36.4, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.trackAlt, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="x" size={14} color={colors.muted} strokeWidth={2} />
            </Pressable>

            <Pressable
              onPress={pickFile}
              style={{
                position: 'absolute',
                left: 20,
                top: 78,
                width: 350,
                height: 88,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: proof ? colors.green : '#D9E7DE',
                borderStyle: 'dashed',
                backgroundColor: '#FAFCFB',
              }}
            />
            <View style={{ position: 'absolute', left: 155, top: 96, width: 80, height: 34, borderRadius: 10, backgroundColor: colors.tint }} />
            <View style={{ position: 'absolute', left: 186, top: 104 }}>
              <Icon name="upload" size={18} color={colors.greenInk} strokeWidth={2} />
            </View>
            <T
              t={proof ? truncate(proof.name, 42) : 'Tap to upload your transfer screenshot'}
              x={20}
              y={138.7}
              w={350}
              h={13}
              fs={10.5}
              fw="Semi Bold"
              color="#3F4E45"
              align="center"
            />
            <T t="PNG or JPG · up to 5 MB" x={20} y={153} w={350} h={12} fs={9.5} color={colors.muted2} align="center" />

            <T t="Payment method" x={20} y={185.5} w={200} h={13} fs={11} fw="Semi Bold" />
            <T t="1 selected" x={280} y={187} w={74} h={12} fs={9.5} fw="Medium" color={colors.muted2} align="right" />
            <View style={{ position: 'absolute', left: 20, top: 206, width: 350, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <View style={{ position: 'absolute', left: 32, top: 218, width: 24, height: 24, borderRadius: 8, backgroundColor: colors.successTint }} />
            <View style={{ position: 'absolute', left: 37, top: 223 }}>
              <Icon name="wallet" size={14} color={colors.greenInk} strokeWidth={2} />
            </View>
            <T t="Bank transfer" x={68} y={220.8} w={150} h={14} fs={11.5} fw="Semi Bold" />
            <T t={`PKR ${formatAmount(total)}`} x={250} y={221} w={86} h={14} fs={11.5} fw="Semi Bold" color={colors.greenText} align="right" tabular />
            <Pressable onPress={() => {}} accessibilityLabel="Change payment method" style={{ position: 'absolute', left: 330, top: 219, width: 24, height: 24 }}>
              <Icon name="x" size={12} color="#94A3B8" strokeWidth={2} />
            </Pressable>

            <T t="Note for the team (optional)" x={20} y={267.5} w={250} h={13} fs={11} fw="Semi Bold" />
            <View style={{ position: 'absolute', left: 20, top: 288, width: 350, height: 54, borderRadius: 12, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surface }} />
            <NoteInput value={note} onChangeText={setNote} />

            {error ? (
              <T t={error} x={20} y={350} w={350} h={13} fs={10} color={colors.heart} />
            ) : null}

            <Pressable
              onPress={submit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Submit for verification"
              style={{ position: 'absolute', left: 20, top: 360, width: 350, height: 50, borderRadius: 14, backgroundColor: colors.green, opacity: busy ? 0.7 : 1 }}
            />
            <View style={{ position: 'absolute', left: 140, top: 373 }}>
              <Icon name="check" size={16} color={colors.white} strokeWidth={2.3} />
            </View>
            <T
              t={busy ? 'Submitting…' : 'Submit for verification'}
              x={165}
              y={377.3}
              w={190}
              h={16}
              fs={13}
              fw="Semi Bold"
              color={colors.white}
              pointerEvents="none"
            />
            <T t="Our team verifies within 24 hours" x={0} y={420.4} w={390} h={13} fs={9.8} color={colors.muted2} align="center" />

            <View style={{ position: 'absolute', left: 129, top: 531, width: 132, height: 5, borderRadius: 2.5, backgroundColor: colors.homeIndicator }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NoteInput({ value, onChangeText }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder="Add a reference number or message…"
      placeholderTextColor={colors.placeholder}
      allowFontScaling={false}
      multiline
      style={{
        position: 'absolute',
        left: 34,
        top: 298,
        width: 322,
        height: 44,
        fontFamily: fonts.regular,
        fontSize: 10.5,
        color: colors.ink,
        paddingTop: 0,
        paddingBottom: 0,
        outlineStyle: 'none',
      }}
    />
  );
}

function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default ProofSheet;
