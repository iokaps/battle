import { Logo } from '@/components/logo';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface LayoutProps {
	children?: React.ReactNode;
	className?: string;
}

const HostPresenterRoot = ({ children, className }: LayoutProps) => (
	<div
		className={cn(
			'bg-arena-bg grid min-h-dvh grid-rows-[auto_1fr_auto] text-slate-100',
			className
		)}
	>
		{children}
	</div>
);

const HostPresenterHeader = ({ children, className }: LayoutProps) => (
	<header
		className={cn(
			'bg-arena-surface/95 sticky top-0 z-10 border-b border-white/10 shadow-xs backdrop-blur-md',
			className
		)}
	>
		<div className="container mx-auto flex items-center justify-between p-4">
			<Logo />
			{children}
		</div>
	</header>
);

const HostPresenterMain = ({ children, className }: LayoutProps) => (
	<main
		className={cn('container mx-auto flex items-center px-4 py-16', className)}
	>
		{children}
	</main>
);

const HostPresenterFooter = ({ children, className }: LayoutProps) => (
	<footer
		className={cn(
			'bg-arena-surface/95 sticky bottom-0 z-10 border-t border-white/10 backdrop-blur-md',
			className
		)}
	>
		<div className="container mx-auto flex items-center justify-between p-4">
			{children}
		</div>
	</footer>
);

/**
 * Layout components for the `host` and `presenter` modes
 *
 * These compound components can be used to structure the host/presenter view
 * and provide a consistent layout across different screens.
 */
export const HostPresenterLayout = {
	Root: HostPresenterRoot,
	Header: HostPresenterHeader,
	Main: HostPresenterMain,
	Footer: HostPresenterFooter
};
