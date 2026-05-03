export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your company and account configuration</p>
      </div>

      <div className="space-y-6">
        {/* Company Profile */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Company Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
              <input defaultValue="Acme Corp" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
              <input defaultValue="you@acme.com" type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option>Technology</option>
                <option>Finance</option>
                <option>Healthcare</option>
                <option>Other</option>
              </select>
            </div>
            <button className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              Save Changes
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Notifications</h2>
          <div className="space-y-4">
            {[
              { label: "48h timer alerts", desc: "Get notified before review timers expire" },
              { label: "New applicants", desc: "When someone applies to one of your jobs" },
              { label: "Bond status changes", desc: "Deposits, locks, and releases" },
            ].map(({ label, desc }) => (
              <label key={label} className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <div className="relative">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-violet-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Billing */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Billing</h2>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Billing Account ID</p>
            <p className="font-mono text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              0x4a3b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b
            </p>
            <p className="text-xs text-gray-400 mt-2">This is your smart account address for USDC transactions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
