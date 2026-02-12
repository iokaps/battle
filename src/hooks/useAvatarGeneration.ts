import { kmClient } from '@/services/km-client';
import { localPlayerActions } from '@/state/actions/local-player-actions';
import { localPlayerStore } from '@/state/stores/local-player-store';
import { playersStore } from '@/state/stores/players-store';
import { useSnapshot } from '@kokimoki/app';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type AvatarStatus = 'idle' | 'generating' | 'done' | 'error';

/** Creates a small solid-color placeholder blob to upload as seed image for AI. */
function createPlaceholderBlob(color = '#808080'): Promise<Blob> {
	return new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d')!;
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 128, 128);
		canvas.toBlob((blob) => resolve(blob!), 'image/png');
	});
}

/**
 * Hook that manages AI avatar generation lifecycle.
 * Submits a generation job, polls for completion, and stores the CDN URL.
 * Resumes polling on page reload if a job is pending.
 *
 * @returns { status, avatarUrl, generate, errorMessage }
 */
export function useAvatarGeneration() {
	const { avatarJobId } = useSnapshot(localPlayerStore.proxy);
	const playerData = useSnapshot(playersStore.proxy).players[kmClient.id];
	const avatarUrl = playerData?.avatarUrl || '';

	const [errorMessage, setErrorMessage] = useState('');
	const [hasError, setHasError] = useState(false);
	const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Derive status from store state rather than tracking in local state
	const status: AvatarStatus = useMemo(() => {
		if (hasError) return 'error';
		if (avatarUrl) return 'done';
		if (avatarJobId) return 'generating';
		return 'idle';
	}, [avatarUrl, avatarJobId, hasError]);

	const stopPolling = useCallback(() => {
		if (pollingRef.current) {
			clearInterval(pollingRef.current);
			pollingRef.current = null;
		}
	}, []);

	// Resume polling on mount if there's a pending job (or when jobId changes)
	useEffect(() => {
		if (!avatarJobId || avatarUrl) {
			return;
		}

		pollingRef.current = setInterval(async () => {
			try {
				const job = await kmClient.ai.getJob(avatarJobId);

				if (job.status === 'completed' && job.result) {
					stopPolling();
					// Result may be an Upload object with .url or a plain string URL
					const result = job.result as string | { url: string };
					const url = typeof result === 'string' ? result : result.url;
					await localPlayerActions.setAvatarUrl(url);
				} else if (job.status === 'failed') {
					stopPolling();
					setHasError(true);
					setErrorMessage(job.error?.message || 'Avatar generation failed');
				}
			} catch {
				// Network error, keep polling
			}
		}, 2000);

		return stopPolling;
	}, [avatarJobId, avatarUrl, stopPolling]);

	/** Submit a new avatar generation job */
	const generate = useCallback(async (prompt: string) => {
		if (!prompt.trim()) return;

		setHasError(false);
		setErrorMessage('');

		try {
			// Upload a placeholder image to storage to get a CDN URL
			// (generateImage requires real HTTP URLs, not data URIs)
			const placeholderBlob = await createPlaceholderBlob();
			const upload = await kmClient.storage.upload(
				'avatar-placeholder.png',
				placeholderBlob,
				['avatar-placeholder']
			);

			const { jobId } = await kmClient.ai.generateImage({
				model: 'gemini-2.5-flash-image',
				prompt: `Generate a game character avatar based on this description: ${prompt}. Pixel-art style, top-down view, 128x128 sprite, colorful, solid background. Replace the input image entirely with the new character.`,
				imageUrls: [upload.url],
				tags: ['avatar', 'ai-generated']
			});

			// This triggers the polling effect via avatarJobId change
			await localPlayerActions.setAvatarJobId(jobId);
		} catch (err: unknown) {
			console.error('[AvatarGeneration] Failed:', err);
			setHasError(true);
			const message =
				err && typeof err === 'object' && 'message' in err
					? String((err as { message: string }).message)
					: 'Failed to start avatar generation';
			setErrorMessage(message);
		}
	}, []);

	return { status, avatarUrl, generate, errorMessage };
}
