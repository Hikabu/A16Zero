import { Sidebar } from "../_components/Sidebar";
import { DashboardAuthGate } from "../_components/DashboardAuthGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGate>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="ml-[220px] min-h-screen">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </DashboardAuthGate>
  );
}
