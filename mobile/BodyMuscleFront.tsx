import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle, SvgXml } from "react-native-svg";
import FRONT_SVG_XML from "./assets/frontSvg";

export type MuscleName =
  | "Neck"
  | "Trapezius"
  | "Chest"
  | "Deltoids"
  | "Biceps"
  | "Triceps"
  | "Forearms"
  | "Abs"
  | "Obliques"
  | "Hip Flexors"
  | "Quadriceps"
  | "Calves"
  | "Tibialis"
  | "Lats"
  | "Lower Back"
  | "Glutes"
  | "Hamstrings";

export type MuscleSelection = {
  muscle: MuscleName;
  active: boolean;
  allActive: MuscleName[];
};

interface Props {
  isLight: boolean;
  onSelectionChange?: (selection: MuscleSelection) => void;
  /**
   * When this value changes, the internal selection is cleared.
   * Used by the parent to reset the map when returning from the
   * filtered exercises list.
   */
  resetKey?: number;
  /**
   * Optional mode that restricts selection to a single muscle at a time.
   * When enabled, tapping a new muscle will clear the previous one so only
   * one region is highlighted.
   */
  singleSelect?: boolean;
}

type Hotspot = {
  id: string;
  cx: number;
  cy: number;
  muscle: MuscleName;
  /** Optional custom diameter for this tap area (in SVG px). */
  size?: number;
};

const VIEWBOX_WIDTH = 660.46;
const VIEWBOX_HEIGHT = 1206.46;

// Marker groups from the original SVG that draw the pink joint circles.
// We strip these out so the body renders cleanly with no extra dots.
const MARKER_GROUP_IDS = [
  "shoulders",
  "elbow",
  "wrist",
  "hips",
  "knees",
  "ankles",
];

// Map our logical muscle names to the corresponding <g id="..."> groups
// inside the SVG. We use this to recolor just that region when active.
const MUSCLE_GROUP_IDS: Partial<Record<MuscleName, string[]>> = {
  Neck: ["traps"],
  Trapezius: ["traps"],
  Chest: ["chest"],
  Deltoids: ["front-shoulders"],
  Biceps: ["biceps"],
  Forearms: ["forearms", "hands"],
  Abs: ["abdominals"],
  Obliques: ["obliques"],
  "Hip Flexors": ["quads"],
  Quadriceps: ["quads"],
  Calves: ["calves"],
  Tibialis: ["calves"],
};

const stripMarkerGroups = (svg: string): string => {
  let output = svg;
  for (const id of MARKER_GROUP_IDS) {
    const re = new RegExp(`<g id="${id}"[\\s\\S]*?<\\/g>`);
    output = output.replace(re, "");
  }
  return output;
};

// React / react-native-svg on web complains about raw `class` attributes
// inside the SVG string ("Invalid DOM property `class`. Did you mean
// `className`?"). We don't rely on those classes at all, so we simply strip
// them out of the markup.
const stripClassAttributes = (svg: string): string =>
  svg.replace(/\sclass="[^"]*"/g, "");

const colorGroupFill = (svg: string, groupId: string, fill: string): string => {
  const re = new RegExp(`(<g id="${groupId}"[\\s\\S]*?>)([\\s\\S]*?)(<\\/g>)`);

  return svg.replace(re, (match, open, inner, close) => {
    // Inside that group, change any fill="..." to our target color.
    const recoloredInner = (inner as string).replace(
      /fill="[^"]*"/g,
      `fill="${fill}"`,
    );
    return `${open as string}${recoloredInner}${close as string}`;
  });
};

// Positions for the circular joint markers that are already drawn in the SVG.
// These coordinates are in the same viewBox as the main SVG, so by using a
// second <Svg> with the same viewBox we avoid any letterboxing math and the
// tap areas always line up.
const SHOULDER_LEFT = { cx: 219.33, cy: 261.13 };
const SHOULDER_RIGHT = { cx: 441.13, cy: 261.13 };
const ELBOW_LEFT = { cx: 118.6, cy: 412.77 };
const ELBOW_RIGHT = { cx: 541.86, cy: 412.77 };
const WRIST_LEFT = { cx: 42.41, cy: 531.02 };
const WRIST_RIGHT = { cx: 618.05, cy: 531.02 };
const HIP_LEFT = { cx: 247.71, cy: 523.37 };
const HIP_RIGHT = { cx: 412.75, cy: 523.37 };
const KNEE_LEFT = { cx: 241.09, cy: 874.7 };
const KNEE_RIGHT = { cx: 419.37, cy: 874.7 };
const ANKLE_LEFT = { cx: 221.14, cy: 1105.65 };
const ANKLE_RIGHT = { cx: 439.32, cy: 1105.65 };

const midPoint = (
  a: { cx: number; cy: number },
  b: { cx: number; cy: number },
) => ({
  cx: (a.cx + b.cx) / 2,
  cy: (a.cy + b.cy) / 2,
});

const distance = (
  a: { cx: number; cy: number },
  b: { cx: number; cy: number },
) => Math.hypot(a.cx - b.cx, a.cy - b.cy);

const HOTSPOTS: Hotspot[] = [
  // Upper traps / neck (big target around neck/upper shoulders)
  { id: "traps-center", cx: 330.4, cy: 205, muscle: "Trapezius", size: 140 },
  // Chest (left/right)
  { id: "chest-left", cx: 285, cy: 305, muscle: "Chest", size: 140 },
  { id: "chest-right", cx: 375, cy: 305, muscle: "Chest", size: 140 },
  // Abs – stacked zones covering the full six‑pack area
  { id: "abs-upper", cx: 330.4, cy: 360, muscle: "Abs", size: 140 },
  { id: "abs-center", cx: 330.4, cy: 400, muscle: "Abs", size: 140 },
  { id: "abs-lower", cx: 330.4, cy: 445, muscle: "Abs", size: 140 },
  // Obliques (left/right waist)
  { id: "oblique-left", cx: 270, cy: 410, muscle: "Obliques", size: 130 },
  { id: "oblique-right", cx: 390, cy: 410, muscle: "Obliques", size: 130 },
  // Delts at shoulder joints
  { id: "shoulder-left", ...SHOULDER_LEFT, muscle: "Deltoids", size: 130 },
  { id: "shoulder-right", ...SHOULDER_RIGHT, muscle: "Deltoids", size: 130 },
  // Biceps – large circles spanning from shoulder to elbow
  (() => {
    const mid = midPoint(SHOULDER_LEFT, ELBOW_LEFT);
    return {
      id: "biceps-left",
      muscle: "Biceps" as const,
      cx: mid.cx,
      cy: mid.cy,
      size: distance(SHOULDER_LEFT, ELBOW_LEFT) * 1.1,
    };
  })(),
  (() => {
    const mid = midPoint(SHOULDER_RIGHT, ELBOW_RIGHT);
    return {
      id: "biceps-right",
      muscle: "Biceps" as const,
      cx: mid.cx,
      cy: mid.cy,
      size: distance(SHOULDER_RIGHT, ELBOW_RIGHT) * 1.1,
    };
  })(),
  // Forearms – large circles from elbow to wrist
  (() => {
    const mid = midPoint(ELBOW_LEFT, WRIST_LEFT);
    return {
      id: "forearm-left",
      muscle: "Forearms" as const,
      cx: mid.cx,
      cy: mid.cy,
      size: distance(ELBOW_LEFT, WRIST_LEFT) * 1.1,
    };
  })(),
  (() => {
    const mid = midPoint(ELBOW_RIGHT, WRIST_RIGHT);
    return {
      id: "forearm-right",
      muscle: "Forearms" as const,
      cx: mid.cx,
      cy: mid.cy,
      size: distance(ELBOW_RIGHT, WRIST_RIGHT) * 1.1,
    };
  })(),
  // Hips / hip flexors
  { id: "hip-left", ...HIP_LEFT, muscle: "Hip Flexors", size: 130 },
  { id: "hip-right", ...HIP_RIGHT, muscle: "Hip Flexors", size: 130 },
  // Quads – big circles spanning upper front thighs
  (() => {
    const mid = midPoint(HIP_LEFT, KNEE_LEFT);
    return {
      id: "quad-left",
      muscle: "Quadriceps" as const,
      cx: mid.cx,
      cy: mid.cy,
      // Slightly smaller than the full hip-to-knee distance so quads
      // don't extend up into the lower abs tap area.
      size: distance(HIP_LEFT, KNEE_LEFT) * 0.7,
    };
  })(),
  (() => {
    const mid = midPoint(HIP_RIGHT, KNEE_RIGHT);
    return {
      id: "quad-right",
      muscle: "Quadriceps" as const,
      cx: mid.cx,
      cy: mid.cy,
      // Mirror of left quad: keep below abs region.
      size: distance(HIP_RIGHT, KNEE_RIGHT) * 0.7,
    };
  })(),
  // Lower leg / tibialis – between knee and ankle
  (() => {
    const mid = midPoint(KNEE_LEFT, ANKLE_LEFT);
    return {
      id: "lower-leg-left",
      muscle: "Tibialis" as const,
      cx: mid.cx,
      cy: mid.cy,
      // Slightly reduced so it doesn't reach too far into the quad zone.
      size: distance(KNEE_LEFT, ANKLE_LEFT) * 0.9,
    };
  })(),
  (() => {
    const mid = midPoint(KNEE_RIGHT, ANKLE_RIGHT);
    return {
      id: "lower-leg-right",
      muscle: "Tibialis" as const,
      cx: mid.cx,
      cy: mid.cy,
      // Mirror of left tibialis.
      size: distance(KNEE_RIGHT, ANKLE_RIGHT) * 0.9,
    };
  })(),
  // Ankles / calves
  { id: "ankle-left", ...ANKLE_LEFT, muscle: "Calves", size: 130 },
  { id: "ankle-right", ...ANKLE_RIGHT, muscle: "Calves", size: 130 },
];

const BodyMuscleFront: React.FC<Props> = ({
  isLight,
  onSelectionChange,
  resetKey,
  singleSelect,
}) => {
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleName[]>([]);
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleName | null>(null);

  useEffect(() => {
    setSelectedMuscles([]);
    setHoveredMuscle(null);
  }, [resetKey]);

  const themedSvgXml = useMemo(() => {
    const baseColor = isLight ? "#d1d5db" : "#4B5563";
    const highlightColor = "#FF7A3C";

    // Start from the raw asset each time so our replacements are predictable.
    let svg = stripClassAttributes(stripMarkerGroups(FRONT_SVG_XML));
    // Some paths use the design-token-like value "mw-red" for fill; map that
    // to currentColor so we can style it consistently.
    svg = svg.replace(/fill="mw-red"/g, 'fill="currentColor"');

    // Give all muscle shapes a subtle base fill instead of relying on
    // CSS classes that don't exist in React Native.
    svg = svg.replace(/fill="currentColor"/g, `fill="${baseColor}"`);

    // Build the set of muscles that should be visually highlighted: all
    // selected ones plus the one under the pointer (if any).
    const activeMuscles = new Set<MuscleName>(selectedMuscles);
    if (hoveredMuscle) {
      activeMuscles.add(hoveredMuscle);
    }

    for (const muscle of activeMuscles) {
      const groupIds = MUSCLE_GROUP_IDS[muscle] ?? [];
      for (const id of groupIds) {
        svg = colorGroupFill(svg, id, highlightColor);
      }
    }

    return svg;
  }, [hoveredMuscle, isLight, selectedMuscles]);

  const handlePress = (muscle: MuscleName) => {
    // Compute next selection from current state, then update parent
    // outside of React's render phase to avoid setState-during-render
    // warnings when notifying the ExerciseListScreen.
    const alreadyActive = selectedMuscles.includes(muscle);
    let next: MuscleName[];
    let nowActive: boolean;
    if (singleSelect) {
      // In single-select mode, tapping a new muscle clears the previous
      // one so only one region is highlighted at a time.
      if (alreadyActive) {
        next = [];
        nowActive = false;
      } else {
        next = [muscle];
        nowActive = true;
      }
    } else {
      next = alreadyActive
        ? selectedMuscles.filter((m) => m !== muscle)
        : [...selectedMuscles, muscle];
      nowActive = !alreadyActive;
    }

    setSelectedMuscles(next);

    if (onSelectionChange) {
      onSelectionChange({
        muscle,
        active: nowActive,
        allActive: next,
      });
    }
  };

  const handleHoverIn = (muscle: MuscleName) => {
    setHoveredMuscle(muscle);
  };

  const handleHoverOut = (muscle: MuscleName) => {
    setHoveredMuscle((current) => (current === muscle ? null : current));
  };

  return (
    <View style={styles.container}>
      <SvgXml xml={themedSvgXml} width="100%" height="100%" />
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        style={StyleSheet.absoluteFillObject}
      >
        {HOTSPOTS.map((spot) => {
          const size = spot.size ?? 80;
          const radius = size / 2;
          const isActive = selectedMuscles.includes(spot.muscle);

          return (
            <Circle
              key={spot.id}
              cx={spot.cx}
              cy={spot.cy}
              r={radius}
              // Keep the circle fully transparent so users only see the
              // muscle highlight on the SVG itself, not a blue overlay.
              fill="transparent"
              onPress={() => handlePress(spot.muscle)}
              onPressIn={() => handleHoverIn(spot.muscle)}
              onPressOut={() => handleHoverOut(spot.muscle)}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
});

export default BodyMuscleFront;
