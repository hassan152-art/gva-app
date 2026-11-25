/**
 * One complaint: the conversation with the team, attachments, and a reply box.
 * Replying to a resolved complaint opens it again.
 */
import { useCallback, useState } from "react";
import { Linking, Pressable, TextInput, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { api } from "../../api/client";
import { Text } from "../../components/Text";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/ui";
import {
  ErrorNote,
  Loading,
  Page,
  StatusPill,
  font,
  shadow,
} from "../../components/donor/Kit";
import { colors } from "../../theme/tokens";
import { appendFile, fmtDate, pickFile, viewUrl } from "../../lib/donorApp";

export default function TicketScreen() {
  const { id } = useLocalSearchParams();
  const [t, setT] = useState(null);
  const [error, setError] = useState(null);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api
        .ticket(id)
        .then(setT)
        .catch((e) => setError(e.message));
    }, [id]),
  );

  async function send() {
    if (!reply.trim() && !file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("body", reply.trim());
      await appendFile(form, "attachment", file);
      setT(await api.replyTicket(id, form));
      setReply("");
      setFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      title={t ? t.ticketNo : "Complaint"}
      subtitle={t?.subject}
      back
      tab="help"
    >
      <ErrorNote message={error} />
      {!t && !error ? <Loading /> : null}
      {t ? (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <StatusPill status={t.status} />
            <Text variant="tiny" color={colors.muted}>
              Opened {fmtDate(t.createdAt)}
              {t.child ? ` · ${t.child.code}` : ""}
            </Text>
          </View>

          <View style={{ marginTop: 14 }}>
            {t.thread.map((m) => {
              const mine = m.role === "donor";
              return (
                <View
                  key={m.id}
                  style={{
                    alignItems: mine ? "flex-end" : "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={[
                      shadow.card,
                      {
                        maxWidth: "85%",
                        borderRadius: 16,
                        borderTopRightRadius: mine ? 4 : 16,
                        borderTopLeftRadius: mine ? 16 : 4,
                        padding: 12,
                        backgroundColor: mine ? colors.green : colors.surface,
                        borderWidth: mine ? 0 : 1,
                        borderColor: colors.hairline2,
                      },
                    ]}
                  >
                    {!mine ? (
                      <Text
                        variant="tiny"
                        color={colors.greenText}
                        style={[font.bold, { marginBottom: 2 }]}
                      >
                        Support team
                      </Text>
                    ) : null}
                    <Text
                      variant="caption"
                      color={mine ? colors.white : colors.ink}
                    >
                      {m.body}
                    </Text>
                    {m.attachmentUrl ? (
                      <Text
                        variant="tiny"
                        color={mine ? colors.white : colors.green}
                        style={[
                          font.bold,
                          { marginTop: 6, textDecorationLine: "underline" },
                        ]}
                        onPress={() =>
                          Linking.openURL(viewUrl(m.attachmentUrl))
                        }
                      >
                        View attachment
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    variant="tiny"
                    color={colors.muted2}
                    style={{ marginTop: 3 }}
                  >
                    {fmtDate(m.createdAt)}
                  </Text>
                </View>
              );
            })}
          </View>

          {t.status === "resolved" || t.status === "closed" ? (
            <Text
              variant="tiny"
              color={colors.greenText}
              style={{ marginBottom: 8 }}
            >
              This complaint is {t.status}. Reply below if you still need help —
              it will open again.
            </Text>
          ) : null}

          <View
            style={[
              {
                borderWidth: 1,
                borderColor: colors.fieldBorder,
                borderRadius: 18,
                padding: 12,
                backgroundColor: colors.surface,
              },
              shadow.card,
            ]}
          >
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Write a reply"
              placeholderTextColor={colors.placeholder}
              multiline
              style={{
                minHeight: 60,
                fontSize: 15,
                color: colors.ink,
                textAlignVertical: "top",
                fontFamily: font.regular.fontFamily,
                outlineStyle: "none",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <Pressable
                onPress={async () => {
                  const f = await pickFile().catch(() => null);
                  if (f) setFile(f);
                }}
                accessibilityRole="button"
                accessibilityLabel="Attach a file"
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Icon
                  name={file ? "check" : "image"}
                  size={18}
                  color={colors.green}
                />
                <Text
                  variant="tiny"
                  color={colors.ink2}
                  numberOfLines={1}
                  style={{ maxWidth: 160 }}
                >
                  {file ? file.name || "Attached" : "Attach"}
                </Text>
              </Pressable>
              <Button
                label="Send"
                height={40}
                full={false}
                onPress={send}
                loading={busy}
                disabled={!reply.trim() && !file}
              />
            </View>
          </View>
        </>
      ) : null}
    </Page>
  );
}
