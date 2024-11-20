// src/components/admin/header.tsx
import Link from "next/link";
import { Home, Bell, Settings } from "lucide-react";
import { Button } from "../../components/ui/button";

export function Header() {
  return (
    <header className="border-b">
      <div className="flex h-16 items-center px-4 container">
        <Link href="/" className="flex items-center space-x-2">
          <Bell className="h-6 w-6" />
          <span className="font-bold text-xl">Solana Alerts</span>
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </Link>
          <Link href="/alerts">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
