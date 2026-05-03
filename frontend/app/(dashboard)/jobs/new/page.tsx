"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check, Loader2, X } from "lucide-react";
import { createJob, publishJob } from "../../../_lib/api/jobs";
import { isApiConfigured } from "../../../_lib/api/client";

const STEPS = ["Job Details", "Requirements", "Bond Setup", "Fund Bond", "Review & Publish"];

type FormData = {
  title: string;
  department: string;
  location_type: string;
  description: string;
  skills: string[];
  experience_level: string;
  employment_type: string;
  deadline: string;
  salary_min: string;
  salary_max: string;
  bond_amount: number | null;
};

const INIT: FormData = {
  title: "", department: "", location_type: "remote", description: "", skills: [],
  experience_level: "mid", employment_type: "full-time", deadline: "",
  salary_min: "", salary_max: "", bond_amount: null,
};

export default function NewJobPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INIT);
  const [skillInput, setSkillInput] = useState("");
  const [funding, setFunding] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [showFiatModal, setShowFiatModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function set(key: keyof FormData, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) set("skills", [...form.skills, s]);
    setSkillInput("");
  }

  function calcBond() {
    const min = Number(form.salary_min) || 0;
    const max = Number(form.salary_max) || 0;
    const avg = (min + max) / 2;
    return Math.round(avg * 0.04);
  }

  function handleNext() {
    if (step === 1) set("bond_amount", calcBond());
    setStep((s) => s + 1);
  }

  async function handleFund() {
    setFunding("pending");
    await new Promise((r) => setTimeout(r, 2000));
    setFunding("success");
    setTimeout(() => setStep(4), 800);
  }

  async function handlePublish() {
    if (isApiConfigured()) {
      setPublishing(true);
      try {
        const job = await createJob({
          title: form.title,
          department: form.department,
          location_type: form.location_type,
          description: form.description,
          skills: form.skills,
          experience_level: form.experience_level,
          employment_type: form.employment_type,
          deadline: form.deadline,
          salary_min: Number(form.salary_min) || 0,
          salary_max: Number(form.salary_max) || 0,
          bond_amount: form.bond_amount,
        });
        await publishJob(job.id);
      } catch {
        // Navigate regardless — page will show error or mock data
      } finally {
        setPublishing(false);
      }
    }
    router.push("/jobs");
  }

  const canProceed = [
    form.title && form.department && form.description,
    form.experience_level && form.employment_type,
    true,
    funding === "success",
    true,
  ][step];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Job</h1>

      {/* Progress */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-600 text-white ring-4 ring-violet-100" : "bg-gray-200 text-gray-400"
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-violet-700" : i < step ? "text-gray-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${i < step ? "bg-violet-600" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-7">
        {/* Step 1: Job Details */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Job Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Title *</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Department *</label>
                <input value={form.department} onChange={(e) => set("department", e.target.value)}
                  placeholder="e.g. Engineering"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location Type *</label>
                <select value={form.location_type} onChange={(e) => set("location_type", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="remote">Remote</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
                rows={4} placeholder="Describe the role and responsibilities..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Required Skills</label>
              <div className="flex gap-2 mb-2">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill and press Enter"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <button onClick={addSkill} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm rounded-lg transition-colors">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.skills.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-violet-50 text-violet-700 text-xs px-2.5 py-1 rounded-full">
                    {s}
                    <button onClick={() => set("skills", form.skills.filter((x) => x !== s))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Salary (USD/yr)</label>
                <input value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)}
                  type="number" placeholder="e.g. 120000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Salary (USD/yr)</label>
                <input value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)}
                  type="number" placeholder="e.g. 160000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Requirements */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Requirements</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Experience Level</label>
              <select value={form.experience_level} onChange={(e) => set("experience_level", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="entry">Entry Level (0–2 yrs)</option>
                <option value="mid">Mid Level (3–5 yrs)</option>
                <option value="senior">Senior (5–8 yrs)</option>
                <option value="staff">Staff / Principal (8+ yrs)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Employment Type</label>
              <select value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Application Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>
        )}

        {/* Step 3: Bond Setup */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Bond Setup</h2>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">Salary range entered</span>
                <span className="font-medium text-gray-900">
                  {form.salary_min && form.salary_max
                    ? `$${Number(form.salary_min).toLocaleString()} — $${Number(form.salary_max).toLocaleString()}`
                    : "Not specified"}
                </span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">Bond required</span>
                <span className="text-xl font-bold text-violet-700">${calcBond().toLocaleString()} USDC</span>
              </div>
              <div className="border-t border-violet-200 pt-3">
                <p className="text-xs text-gray-500">
                  This bond protects candidates from ghost jobs. If you fail to respond to applicants within 48 hours, the bond is at risk. The bond is returned to you when you successfully hire.
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-400">The bond amount is calculated server-side based on your salary range and cannot be modified.</p>
          </div>
        )}

        {/* Step 4: Fund Bond */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Fund Bond</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
              <p className="text-2xl font-bold text-gray-900 mb-1">${calcBond().toLocaleString()} USDC</p>
              <p className="text-sm text-gray-500 mb-5">This amount will be locked in escrow until the role is filled.</p>
              {funding === "idle" && (
                <div className="flex flex-col gap-3 items-center">
                  <button
                    onClick={handleFund}
                    className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                  >
                    Fund Bond
                  </button>
                  <button
                    onClick={() => setShowFiatModal(true)}
                    className="text-sm text-gray-500 border border-gray-200 px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Buy USDC
                  </button>
                </div>
              )}
              {funding === "pending" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                  <p className="text-sm text-gray-500">Waiting for wallet signature...</p>
                </div>
              )}
              {funding === "success" && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-green-700">Bond confirmed! Proceeding to review...</p>
                </div>
              )}
              {funding === "error" && (
                <div>
                  <p className="text-sm text-red-600 mb-3">Transaction failed. Please try again.</p>
                  <button onClick={handleFund} className="bg-violet-600 text-white font-semibold px-8 py-3 rounded-lg">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Publish */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">Review & Publish</h2>
            <div className="space-y-3">
              {[
                { label: "Job Title", value: form.title || "—" },
                { label: "Department", value: form.department || "—" },
                { label: "Location", value: form.location_type },
                { label: "Experience Level", value: form.experience_level },
                { label: "Employment Type", value: form.employment_type },
                { label: "Bond Amount", value: `$${calcBond().toLocaleString()} USDC` },
                { label: "Bond Status", value: "Staked ✓" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2.5 border-b border-gray-50">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                </div>
              ))}
              {form.skills.length > 0 && (
                <div className="flex justify-between py-2.5">
                  <span className="text-sm text-gray-500">Skills</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {form.skills.map((s) => (
                      <span key={s} className="bg-violet-50 text-violet-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</> : "Publish Job"}
            </button>
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step !== 3 && (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fiat modal */}
      {showFiatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💳</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Buy USDC</h3>
            <p className="text-gray-500 text-sm mb-6">Fiat on-ramp coming soon. You&apos;ll be able to top up with a credit card directly.</p>
            <button onClick={() => setShowFiatModal(false)}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
