import React from 'react';
import { View } from 'react-native';
import colors from '../theme/colors';

export default function GradientBackground({ children, style }) {
  let LinearGradient = null;
  try {
    // Dynamically require so the app doesn't crash if the package isn't installed
    // eslint-disable-next-line global-require
    LinearGradient = require('react-native-linear-gradient').default;
  } catch (_) {
    LinearGradient = null;
  }

  if (LinearGradient) {
    return (
      <LinearGradient
        colors={[colors.bg, colors.bgSecondary || '#E9EEF8']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[{ flex: 1 }, style]}
      >
        {children}
      </LinearGradient>
    );
  }
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}
