// src/app/admin/page.tsx
import { ConfigPanel } from "../../components/admin/config-panel";

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <ConfigPanel />
    </div>
  );
}
