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
			'grid min-h-dvh grid-rows-[auto_1fr_auto] bg-slate-100',
			className
		)}
	>
		{children}
	</div>
);

const HostPresenterHeader = ({ children, className }: LayoutProps) => (
	<header
		className={cn(
			'sticky top-0 z-10 bg-slate-50/95 shadow-xs backdrop-blur-xs',
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
			'sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs',
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
