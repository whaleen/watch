// src/app/admin/layout.tsx
import { Header } from "@/components/admin/header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Header />
      {children}
    </div>
  );
}
