import { cn } from '@/utils/cn';
import { DEAD_ZONE } from '@/utils/gameConstants';
import * as React from 'react';

interface JoystickControlProps {
	/** Called when joystick direction changes. Values range from -1 to 1. */
	onMove: (dx: number, dy: number) => void;
	/** Size of the joystick base in pixels */
	size?: number;
	className?: string;
}

/**
 * Virtual joystick component for mobile touch input.
 * Dark neon themed with dead zone threshold.
 * Outputs normalized direction values (-1 to 1) on move.
 */
export function JoystickControl({
	onMove,
	size = 140,
	className
}: JoystickControlProps) {
	const baseRef = React.useRef<HTMLDivElement>(null);
	const [knobPos, setKnobPos] = React.useState({ x: 0, y: 0 });
	const [isActive, setIsActive] = React.useState(false);
	const touchIdRef = React.useRef<number | null>(null);

	const maxRadius = size / 2 - 10;
	const knobSize = size * 0.38;
	const deadZonePixels = maxRadius * DEAD_ZONE;

	const mouseDownRef = React.useRef(false);

	/** Compute direction from a client position relative to the joystick base */
	const computeDirection = React.useCallback(
		(clientX: number, clientY: number) => {
			const base = baseRef.current;
			if (!base) return;
			const rect = base.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const deltaX = clientX - centerX;
			const deltaY = clientY - centerY;
			const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			const clampedDist = Math.min(dist, maxRadius);

			const angle = Math.atan2(deltaY, deltaX);

			// Apply dead zone
			if (dist < deadZonePixels) {
				setKnobPos({
					x: Math.cos(angle) * clampedDist,
					y: Math.sin(angle) * clampedDist
				});
				onMove(0, 0);
				return;
			}

			const x = (Math.cos(angle) * clampedDist) / maxRadius;
			const y = (Math.sin(angle) * clampedDist) / maxRadius;

			setKnobPos({
				x: Math.cos(angle) * clampedDist,
				y: Math.sin(angle) * clampedDist
			});
			onMove(x, y);
		},
		[maxRadius, deadZonePixels, onMove]
	);

	const handleTouchStart = React.useCallback(
		(e: React.TouchEvent) => {
			e.preventDefault();
			if (touchIdRef.current !== null) return;

			const touch = e.changedTouches[0];
			touchIdRef.current = touch.identifier;
			setIsActive(true);
			computeDirection(touch.clientX, touch.clientY);
		},
		[computeDirection]
	);

	const handleTouchMove = React.useCallback(
		(e: React.TouchEvent) => {
			e.preventDefault();
			const touch = Array.from(e.changedTouches).find(
				(t) => t.identifier === touchIdRef.current
			);
			if (!touch) return;
			computeDirection(touch.clientX, touch.clientY);
		},
		[computeDirection]
	);

	const handleTouchEnd = React.useCallback(
		(e: React.TouchEvent) => {
			const touch = Array.from(e.changedTouches).find(
				(t) => t.identifier === touchIdRef.current
			);
			if (!touch) return;

			touchIdRef.current = null;
			setIsActive(false);
			setKnobPos({ x: 0, y: 0 });
			onMove(0, 0);
		},
		[onMove]
	);

	// Mouse event handlers for desktop testing
	const handleMouseDown = React.useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			mouseDownRef.current = true;
			setIsActive(true);
			computeDirection(e.clientX, e.clientY);
		},
		[computeDirection]
	);

	const handleMouseMove = React.useCallback(
		(e: React.MouseEvent) => {
			if (!mouseDownRef.current) return;
			e.preventDefault();
			computeDirection(e.clientX, e.clientY);
		},
		[computeDirection]
	);

	const handleMouseUp = React.useCallback(() => {
		if (!mouseDownRef.current) return;
		mouseDownRef.current = false;
		setIsActive(false);
		setKnobPos({ x: 0, y: 0 });
		onMove(0, 0);
	}, [onMove]);

	// Also listen for mouseup on window to catch releases outside the joystick
	React.useEffect(() => {
		const handler = () => {
			if (mouseDownRef.current) {
				mouseDownRef.current = false;
				setIsActive(false);
				setKnobPos({ x: 0, y: 0 });
				onMove(0, 0);
			}
		};
		window.addEventListener('mouseup', handler);
		return () => window.removeEventListener('mouseup', handler);
	}, [onMove]);

	return (
		<div
			ref={baseRef}
			className={cn(
				'relative flex-shrink-0 rounded-full border-2 bg-slate-800/60',
				isActive
					? 'border-neon-cyan/60 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
					: 'border-slate-600',
				className
			)}
			style={{
				width: size,
				height: size,
				touchAction: 'none'
			}}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
		>
			{/* Dead zone indicator ring */}
			<div
				className="absolute rounded-full border border-dashed border-slate-700"
				style={{
					width: deadZonePixels * 2,
					height: deadZonePixels * 2,
					left: `calc(50% - ${deadZonePixels}px)`,
					top: `calc(50% - ${deadZonePixels}px)`
				}}
			/>
			{/* Knob */}
			<div
				className={cn(
					'absolute rounded-full shadow-lg transition-colors',
					isActive
						? 'bg-neon-cyan shadow-[0_0_10px_rgba(34,211,238,0.5)]'
						: 'bg-slate-500'
				)}
				style={{
					width: knobSize,
					height: knobSize,
					left: `calc(50% - ${knobSize / 2}px + ${knobPos.x}px)`,
					top: `calc(50% - ${knobSize / 2}px + ${knobPos.y}px)`,
					touchAction: 'none'
				}}
			/>
		</div>
	);
}
