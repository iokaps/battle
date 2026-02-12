import { ArenaCanvas } from '@/components/arena-canvas';
import { ArenaHUD } from '@/components/arena-hud';

/**
 * Full battle arena view for the presenter.
 * Combines the Canvas 2D renderer with the HUD overlay.
 */
export function BattleArenaView() {
	return (
		<div className="relative h-dvh w-full overflow-hidden bg-slate-900">
			<ArenaCanvas />
			<ArenaHUD />
		</div>
	);
}
