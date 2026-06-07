import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  TouchableOpacity,
  type StyleProp,
  type TouchableOpacityProps,
  type ViewStyle,
} from "react-native";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

let reducedMotionValue = false;
let isReducedMotionSubscribed = false;
const reducedMotionListeners = new Set<(enabled: boolean) => void>();

const publishReducedMotion = (enabled: boolean) => {
  reducedMotionValue = enabled;
  reducedMotionListeners.forEach((listener) => listener(enabled));
};

const ensureReducedMotionSubscription = () => {
  if (isReducedMotionSubscribed) return;

  isReducedMotionSubscribed = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(publishReducedMotion);
  AccessibilityInfo.addEventListener(
    "reduceMotionChanged",
    publishReducedMotion,
  );
};

export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(reducedMotionValue);

  useEffect(() => {
    ensureReducedMotionSubscription();
    reducedMotionListeners.add(setReducedMotion);
    setReducedMotion(reducedMotionValue);

    return () => {
      reducedMotionListeners.delete(setReducedMotion);
    };
  }, []);

  return reducedMotion;
};

export const MotionEntrance: React.FC<{
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  replayKey?: string | number;
  style?: StyleProp<ViewStyle>;
}> = ({ children, delay = 0, distance = 14, replayKey, style }) => {
  const reducedMotion = useReducedMotion();
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, progress, reducedMotion, replayKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.988, 1],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export const MotionProgressFill: React.FC<{
  progress: number;
  delay?: number;
  minimumPercent?: number;
  style?: StyleProp<ViewStyle>;
}> = ({ progress, delay = 0, minimumPercent = 0, style }) => {
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, progress));
  const targetPercent = Math.max(minimumPercent, clamped * 100);
  const animated = useRef(new Animated.Value(minimumPercent)).current;

  useEffect(() => {
    animated.stopAnimation();
    if (reducedMotion) {
      animated.setValue(targetPercent);
      return;
    }
    Animated.timing(animated, {
      toValue: targetPercent,
      delay,
      duration: 720,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animated, delay, reducedMotion, targetPercent]);

  return (
    <Animated.View
      style={[
        style,
        {
          width: animated.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
          }),
        },
      ]}
    />
  );
};

export const MotionPulse: React.FC<{
  active: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ active, children, style }) => {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    pulse.setValue(0);
    if (!active || reducedMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1150,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, pulse, reducedMotion]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.018],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export const MotionTouchable: React.FC<
  TouchableOpacityProps & {
    lift?: number;
    pressedScale?: number;
  }
> = ({
  children,
  lift = -2,
  pressedScale = 0.992,
  onPressIn,
  onPressOut,
  style,
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const pressed = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reducedMotion) return;
    pressed.stopAnimation();
    pressed.setValue(0);
  }, [pressed, reducedMotion]);

  const animate = (toValue: number) => {
    if (reducedMotion) {
      pressed.setValue(0);
      return;
    }
    Animated.spring(pressed, {
      toValue,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedTouchableOpacity
      {...props}
      style={[
        style,
        {
          transform: [
            {
              translateY: pressed.interpolate({
                inputRange: [0, 1],
                outputRange: [0, lift],
              }),
            },
            {
              scale: pressed.interpolate({
                inputRange: [0, 1],
                outputRange: [1, pressedScale],
              }),
            },
          ],
        },
      ]}
      onPressIn={(event) => {
        animate(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(0);
        onPressOut?.(event);
      }}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
};
