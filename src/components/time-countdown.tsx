import { cn } from '@/utils/cn';

type TimeDisplay = 's' | 'ms' | 'hms';

type CountdownPartProps = {
	value: number;
	label: string;
};

function CountdownPart({ value, label }: CountdownPartProps) {
	return (
		<span aria-live="polite" aria-label={`${value} ${label}`}>
			{value.toString().padStart(2, '0')}
		</span>
	);
}

interface TimeCountdownProps {
	/** Time remaining in milliseconds. */
	ms: number;
	/** Display format: `'s'` (seconds only), `'ms'` (minutes:seconds), `'hms'` (hours:minutes:seconds)
	 * @default 'hms'
	 */
	display?: TimeDisplay;
	/** Additional CSS classes applied to the root `<span>`. */
	className?: string;
}

/**
 * Displays a countdown timer formatted as `HH:MM:SS`, `MM:SS`, or `SS`.
 *
 * @example
 * <TimeCountdown ms={remaining} />
 * <TimeCountdown ms={remaining} display="ms" />
 */
export function TimeCountdown({
	ms,
	display = 'hms',
	className
}: TimeCountdownProps) {
	const totalSeconds = Math.floor(ms / 1000);
	const hrs = Math.floor(totalSeconds / 3600);
	const mins = Math.floor((totalSeconds % 3600) / 60);
	const secs = totalSeconds % 60;

	const renderCountdown = () => {
		switch (display) {
			case 's':
				return <CountdownPart value={secs} label="seconds" />;

			case 'ms':
				return (
					<>
						<CountdownPart value={mins} label="minutes" />
						:
						<CountdownPart value={secs} label="seconds" />
					</>
				);

			case 'hms':
				return (
					<>
						<CountdownPart value={hrs} label="hours" />
						:
						<CountdownPart value={mins} label="minutes" />
						:
						<CountdownPart value={secs} label="seconds" />
					</>
				);
		}
	};

	return (
		<span
			className={cn('font-mono text-4xl', className)}
			role="timer"
			aria-label={`Time: ${hrs} hours, ${mins} minutes, ${secs} seconds`}
		>
			{renderCountdown()}
		</span>
	);
}
