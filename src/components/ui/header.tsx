'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BarChart3, Home, Menu, X } from 'lucide-react';
import { NotificationsBell } from './notifications-bell';

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Логотип/Название */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
              <BarChart3 className="w-5 h-5" />
              <span className="hidden sm:inline">FlowForge</span>
            </Link>
          </div>

          {/* Десктопная навигация */}
          <nav className="hidden md:flex items-center gap-2">
            <NotificationsBell />
            <Link href="/">
              <Button
                variant={pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Главная
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                variant={pathname === '/dashboard' ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </nav>

          {/* Мобильная навигация */}
          <div className="md:hidden flex items-center gap-2">
            <NotificationsBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Мобильное меню */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
            <nav className="flex flex-col gap-2 p-4">
              <Link href="/" onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={pathname === '/' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Home className="w-4 h-4" />
                  Главная
                </Button>
              </Link>
              <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                <Button
                  variant={pathname === '/dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}