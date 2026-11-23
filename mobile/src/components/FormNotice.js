/**
 * Inline form banner for validation and API errors.
 */
import { View } from 'react-native';
import { colors, radii } from '../theme/tokens';
import { T } from './Abs';
import { Text } from './Text';
import { Icon } from './Icon';

export function FormNotice({ title, message, variant = 'error', x = 20, y, w = 350, inline = false, style }) {
  if (!message && !title) return null;

  const isError = variant === 'error';
  const bg = isError ? '#FEF2F2' : colors.tint;
  const border = isError ? '#FECACA' : colors.tintBorder;
  const iconColor = isError ? colors.heart : colors.green;
  const titleColor = isError ? '#991B1B' : colors.greenText;
  const bodyColor = isError ? '#B91C1C' : colors.ink2;

  const boxStyle = {
    borderRadius: radii.inner,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: bg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...(inline
      ? { alignSelf: 'stretch', marginBottom: 12 }
      : { position: 'absolute', left: x, top: y, width: w }),
    ...style,
  };

  return (
    <View style={boxStyle} accessibilityRole="alert">
      <View style={{ marginTop: 1, marginRight: 10 }}>
        <Icon name={isError ? 'alertcircle' : 'check'} size={18} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        {title ? (
          inline ? (
            <Text variant="label" color={titleColor} style={{ fontSize: 11.5, marginBottom: message ? 4 : 0 }}>
              {title}
            </Text>
          ) : (
            <T t={title} x={0} y={0} w={w - 44} h={14} fs={11.5} fw="Semi Bold" color={titleColor} style={{ position: 'relative' }} />
          )
        ) : null}
        {message ? (
          inline ? (
            <Text variant="tiny" color={bodyColor} style={{ fontSize: 10.5, lineHeight: 15 }}>
              {message}
            </Text>
          ) : (
            <T
              t={message}
              x={0}
              y={title ? 16 : 0}
              w={w - 44}
              h={title ? 28 : 14}
              fs={10.5}
              color={bodyColor}
              style={{ position: 'relative' }}
            />
          )
        ) : null}
      </View>
    </View>
  );
}
