import { Search } from 'lucide-react';
import { ActiveTimerWidget } from '@/features/time/active-timer-widget';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search…  (coming soon)"
          disabled
          className="h-9 w-full rounded-md border border-input bg-muted/40 pl-9 pr-3 text-sm text-muted-foreground"
        />
      </div>
      <div className="font-semibold md:hidden">EOP</div>
      <div className="flex items-center gap-2">
        <ActiveTimerWidget />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
