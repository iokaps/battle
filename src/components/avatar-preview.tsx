import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AvatarPreviewProps {
	avatarUrl: string;
	status: 'idle' | 'generating' | 'done' | 'error';
	color: string;
	name: string;
	size?: 'sm' | 'md' | 'lg';
}

/**
 * Displays the player's avatar with loading and fallback states.
 * Shows a colored circle placeholder while avatar is generating.
 */
export function AvatarPreview({
	avatarUrl,
	status,
	color,
	name,
	size = 'md'
}: AvatarPreviewProps) {
	const { t } = useTranslation();
	const sizeClasses = {
		sm: 'h-8 w-8',
		md: 'h-16 w-16',
		lg: 'h-24 w-24'
	};

	if (status === 'done' && avatarUrl) {
		return (
			<img
				src={avatarUrl}
				alt={name}
				className={cn('rounded-full border-2 object-cover', sizeClasses[size])}
				style={{ borderColor: color }}
			/>
		);
	}

	return (
		<div
			className={cn(
				'flex items-center justify-center rounded-full border-2',
				sizeClasses[size]
			)}
			style={{ backgroundColor: color, borderColor: color }}
		>
			{status === 'generating' ? (
				<Loader2 className="h-1/2 w-1/2 animate-spin text-white" />
			) : status === 'error' ? (
				<span className="text-xs font-bold text-white">
					{t('ui:avatarError')}
				</span>
			) : (
				<span className="text-lg font-bold text-white">
					{name.charAt(0).toUpperCase()}
				</span>
			)}
		</div>
	);
}
