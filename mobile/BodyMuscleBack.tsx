import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, SvgXml } from 'react-native-svg';
import type { MuscleName, MuscleSelection } from './BodyMuscleFront';
import BACK_SVG_XML from './assets/backSvg';

interface Props {
	isLight: boolean;
	onSelectionChange?: (selection: MuscleSelection) => void;
		/** See BodyMuscleFront.resetKey */
		resetKey?: number;
}

type Hotspot = {
	id: string;
	cx: number;
	cy: number;
	muscle: MuscleName;
	size?: number;
};

type Point = { cx: number; cy: number };

const VIEWBOX_WIDTH = 660.46;
const VIEWBOX_HEIGHT = 1206.46;

const MARKER_GROUP_IDS = ['ankles', 'knees', 'wrist', 'elbow', 'upper-spine', 'scapula', 'lower-spine'];

const MUSCLE_GROUP_IDS: Partial<Record<MuscleName, string[]>> = {
	Trapezius: ['traps', 'traps-middle'],
	Deltoids: ['rear-shoulders'],
	Triceps: ['triceps'],
	Forearms: ['forearms', 'hands'],
	Lats: ['lats'],
	'Lower Back': ['lowerback'],
	Glutes: ['glutes'],
	Hamstrings: ['hamstrings'],
	Calves: ['calves'],
};

const stripMarkerGroups = (svg: string): string => {
	let output = svg;
	for (const id of MARKER_GROUP_IDS) {
		const re = new RegExp(`<g id="${id}"[\\s\\S]*?<\\/g>`);
		output = output.replace(re, '');
	}
	return output;
};

const stripClassAttributes = (svg: string): string => svg.replace(/\sclass="[^"]*"/g, '');

const colorGroupFill = (svg: string, groupId: string, fill: string): string => {
	const re = new RegExp(`(<g id="${groupId}"[\\s\\S]*?>)([\\s\\S]*?)(<\\/g>)`);
	return svg.replace(re, (match, open, inner, close) => {
		const recoloredInner = (inner as string).replace(/fill="[^"]*"/g, `fill="${fill}"`);
		return `${open as string}${recoloredInner}${close as string}`;
	});
};

// Joint markers taken from BACK_SVG_XML
const UPPER_SPINE: Point = { cx: 330.26, cy: 209.3 };
const LOWER_SPINE: Point = { cx: 330.26, cy: 491.77 };
const SCAPULA_LEFT: Point = { cx: 240.12, cy: 271.32 };
const SCAPULA_RIGHT: Point = { cx: 420.4, cy: 271.32 };
const ELBOW_LEFT: Point = { cx: 119.84, cy: 396.23 };
const ELBOW_RIGHT: Point = { cx: 540.68, cy: 396.23 };
const WRIST_LEFT: Point = { cx: 30.54, cy: 548.63 };
const WRIST_RIGHT: Point = { cx: 629.98, cy: 548.63 };
const KNEE_LEFT: Point = { cx: 237.16, cy: 879.63 };
const KNEE_RIGHT: Point = { cx: 423.36, cy: 879.63 };
const ANKLE_LEFT: Point = { cx: 214.71, cy: 1119.64 };
const ANKLE_RIGHT: Point = { cx: 445.81, cy: 1119.64 };

const midPoint = (a: Point, b: Point): Point => ({ cx: (a.cx + b.cx) / 2, cy: (a.cy + b.cy) / 2 });
const lerpPoint = (a: Point, b: Point, t: number): Point => ({
	cx: a.cx + (b.cx - a.cx) * t,
	cy: a.cy + (b.cy - a.cy) * t,
});
const distance = (a: Point, b: Point): number => Math.hypot(a.cx - b.cx, a.cy - b.cy);

const HOTSPOTS: Hotspot[] = [
	{ id: 'traps-upper', cx: UPPER_SPINE.cx, cy: UPPER_SPINE.cy, muscle: 'Trapezius', size: 150 },
	(() => {
		const mid = lerpPoint(UPPER_SPINE, LOWER_SPINE, 0.4);
		return {
			id: 'traps-middle',
			muscle: 'Trapezius' as const,
			cx: mid.cx,
			cy: mid.cy,
			size: distance(UPPER_SPINE, LOWER_SPINE) * 0.5,
		};
	})(),
	{ id: 'rear-shoulder-left', ...SCAPULA_LEFT, muscle: 'Deltoids', size: 130 },
	{ id: 'rear-shoulder-right', ...SCAPULA_RIGHT, muscle: 'Deltoids', size: 130 },
	(() => {
		const mid = midPoint(SCAPULA_LEFT, ELBOW_LEFT);
		return {
			id: 'triceps-left',
			muscle: 'Triceps' as const,
			cx: mid.cx,
			cy: mid.cy,
			size: distance(SCAPULA_LEFT, ELBOW_LEFT) * 1.1,
		};
	})(),
	(() => {
		const mid = midPoint(SCAPULA_RIGHT, ELBOW_RIGHT);
		return {
			id: 'triceps-right',
			muscle: 'Triceps' as const,
			cx: mid.cx,
			cy: mid.cy,
			size: distance(SCAPULA_RIGHT, ELBOW_RIGHT) * 1.1,
		};
	})(),
	(() => {
		const mid = midPoint(ELBOW_LEFT, WRIST_LEFT);
		return {
			id: 'forearm-left',
			muscle: 'Forearms' as const,
			cx: mid.cx,
			cy: mid.cy,
			size: distance(ELBOW_LEFT, WRIST_LEFT) * 1.1,
		};
	})(),
	(() => {
		const mid = midPoint(ELBOW_RIGHT, WRIST_RIGHT);
		return {
			id: 'forearm-right',
			muscle: 'Forearms' as const,
			cx: mid.cx,
			cy: mid.cy,
			size: distance(ELBOW_RIGHT, WRIST_RIGHT) * 1.1,
		};
	})(),
	(() => {
		const p = lerpPoint(SCAPULA_LEFT, LOWER_SPINE, 0.6);
		return {
			id: 'lat-left',
			muscle: 'Lats' as const,
			cx: p.cx - 15,
			cy: p.cy,
			size: distance(SCAPULA_LEFT, LOWER_SPINE) * 0.55,
		};
	})(),
	(() => {
		const p = lerpPoint(SCAPULA_RIGHT, LOWER_SPINE, 0.6);
		return {
			id: 'lat-right',
			muscle: 'Lats' as const,
			cx: p.cx + 15,
			cy: p.cy,
			size: distance(SCAPULA_RIGHT, LOWER_SPINE) * 0.55,
		};
	})(),
	{
		id: 'lower-back',
		muscle: 'Lower Back',
		cx: LOWER_SPINE.cx,
		cy: LOWER_SPINE.cy + 20,
		size: 150,
	},
	(() => {
		const p = lerpPoint(LOWER_SPINE, KNEE_LEFT, 0.4);
		return {
			id: 'glute-left',
			muscle: 'Glutes' as const,
			cx: p.cx,
			cy: p.cy,
			size: distance(LOWER_SPINE, KNEE_LEFT) * 0.5,
		};
	})(),
	(() => {
		const p = lerpPoint(LOWER_SPINE, KNEE_RIGHT, 0.4);
		return {
			id: 'glute-right',
			muscle: 'Glutes' as const,
			cx: p.cx,
			cy: p.cy,
			size: distance(LOWER_SPINE, KNEE_RIGHT) * 0.5,
		};
	})(),
	(() => {
		const p = lerpPoint(LOWER_SPINE, KNEE_LEFT, 0.7);
		return {
			id: 'hamstring-left',
			muscle: 'Hamstrings' as const,
			cx: p.cx,
			cy: p.cy,
			size: distance(LOWER_SPINE, KNEE_LEFT) * 0.6,
		};
	})(),
	(() => {
		const p = lerpPoint(LOWER_SPINE, KNEE_RIGHT, 0.7);
		return {
			id: 'hamstring-right',
			muscle: 'Hamstrings' as const,
			cx: p.cx,
			cy: p.cy,
			size: distance(LOWER_SPINE, KNEE_RIGHT) * 0.6,
		};
	})(),
	(() => {
		const mid = midPoint(KNEE_LEFT, ANKLE_LEFT);
		return {
			id: 'calf-left',
			muscle: 'Calves' as const,
			cx: mid.cx,
			cy: mid.cy,
			size: distance(KNEE_LEFT, ANKLE_LEFT) * 0.9,
		};
	})(),
	(() => {
		const mid = midPoint(KNEE_RIGHT, ANKLE_RIGHT);
		return {
			id: 'calf-right',
			muscle: 'Calves' as const,
			cx: mid.cx,
			cy: mid.cy,
			size: distance(KNEE_RIGHT, ANKLE_RIGHT) * 0.9,
		};
	})(),
	{ id: 'ankle-left', ...ANKLE_LEFT, muscle: 'Calves', size: 110 },
	{ id: 'ankle-right', ...ANKLE_RIGHT, muscle: 'Calves', size: 110 },
];

	const BodyMuscleBack: React.FC<Props> = ({ isLight, onSelectionChange, resetKey }) => {
		const [selectedMuscles, setSelectedMuscles] = useState<MuscleName[]>([]);
		const [hoveredMuscle, setHoveredMuscle] = useState<MuscleName | null>(null);

		useEffect(() => {
			setSelectedMuscles([]);
			setHoveredMuscle(null);
		}, [resetKey]);

				const themedSvgXml = useMemo(() => {
					const baseColor = isLight ? '#d1d5db' : '#4B5563';
					const highlightColor = '#FF7A3C';

		let svg = stripClassAttributes(stripMarkerGroups(BACK_SVG_XML));
		svg = svg.replace(/fill="mw-red"/g, 'fill="currentColor"');
		svg = svg.replace(/fill="currentColor"/g, `fill="${baseColor}"`);

		const activeMuscles = new Set<MuscleName>(selectedMuscles);
		if (hoveredMuscle) activeMuscles.add(hoveredMuscle);

		for (const muscle of activeMuscles) {
			const groupIds = MUSCLE_GROUP_IDS[muscle] ?? [];
			for (const id of groupIds) {
				svg = colorGroupFill(svg, id, highlightColor);
			}
		}

		return svg;
	}, [hoveredMuscle, isLight, selectedMuscles]);

		const handlePress = (muscle: MuscleName) => {
			// Same pattern as BodyMuscleFront: update our own state first, then
			// notify parent outside of the internal state updater.
			const alreadyActive = selectedMuscles.includes(muscle);
			const next = alreadyActive
				? selectedMuscles.filter((m) => m !== muscle)
				: [...selectedMuscles, muscle];

			setSelectedMuscles(next);

			if (onSelectionChange) {
				onSelectionChange({ muscle, active: !alreadyActive, allActive: next });
			}
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
					return (
						<Circle
							key={spot.id}
							cx={spot.cx}
							cy={spot.cy}
							r={radius}
									fill="transparent"
							onPress={() => handlePress(spot.muscle)}
							onPressIn={() => setHoveredMuscle(spot.muscle)}
							onPressOut={() =>
								setHoveredMuscle((current) =>
									current === spot.muscle ? null : current,
								)
							}
						/>
					);
				})}
			</Svg>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, width: '100%', position: 'relative' },
});

export default BodyMuscleBack;

