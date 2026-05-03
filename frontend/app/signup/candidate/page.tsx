"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Check, Loader2, Mail, Globe, User, MapPin, Plus, X, ArrowLeft, Sparkles } from "lucide-react";

const STEPS = ["Create Account", "Your Profile", "Skills", "Experience", "Done"];

type Experience = { company: string; role: string; years: string };

type Form = {
  email: string;
  auth_method: "email" | "google" | null;
  name: string;
  headline: string;
  location: string;
  skills: string[];
  experience: Experience[];
};

const INIT: Form = {
  email: "",
  auth_method: null,
  name: "",
  headline: "",
  location: "",
  skills: [],
  experience: [],
};

const SUGGESTED_SKILLS = ["React", "TypeScript", "Node.js", "Python", "Solidity", "Go", "Rust", "PostgreSQL", "AWS", "Docker"];

export default function CandidateSignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(INIT);
  const [authLoading, setAuthLoading] = useState<"email" | "google" | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [newExp, setNewExp] = useState<Experience>({ company: "", role: "", years: "" });
  const [addingExp, setAddingExp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function setField(key: keyof Form, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleGoogleAuth() {
    setAuthLoading("google");
    await new Promise((r) => setTimeout(r, 1000));
    setAuthLoading(null);
    setField("auth_method", "google");
    setStep(1);
  }

  async function handleEmailAuth() {
    if (!form.email) return;
    setAuthLoading("email");
    await new Promise((r) => setTimeout(r, 1200));
    setAuthLoading(null);
    setEmailSent(true);
    await new Promise((r) => setTimeout(r, 800));
    setField("auth_method", "email");
    setEmailSent(false);
    setStep(1);
  }

  function addSkill(s: string) {
    const trimmed = s.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setField("skills", [...form.skills, trimmed]);
    }
    setSkillInput("");
  }

  function addExperience() {
    if (!newExp.company || !newExp.role) return;
    setField("experience", [...form.experience, newExp]);
    setNewExp({ company: "", role: "", years: "" });
    setAddingExp(false);
  }

  async function handleSubmit() {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setStep(4);
  }

  const canProceedStep: Record<number, boolean> = {
    0: !!form.auth_method,
    1: !!(form.name && form.headline && form.location),
    2: form.skills.length >= 1,
    3: true,
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">HireOnChain</span>
        </Link>
        <p className="text-white/40 text-sm">Candidate sign up</p>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {step < 4 && (
          <Link href="/signup" className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors self-start max-w-md w-full mx-auto">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        )}

        {/* Progress */}
        {step < 4 && (
          <div className="flex items-center gap-0 mb-10 max-w-lg w-full">
            {STEPS.slice(0, 4).map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    i < step ? "bg-emerald-500 text-white" : i === step ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20" : "bg-white/10 text-white/30"
                  }`}>
                    {i < step ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block whitespace-nowrap ${i === step ? "text-white" : i < step ? "text-white/60" : "text-white/30"}`}>
                    {label}
                  </span>
                </div>
                {i < 3 && <div className={`flex-1 h-px mx-2 ${i < step ? "bg-emerald-500" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full">

          {/* Step 0: Auth */}
          {step === 0 && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600/20 mb-5">
                <User className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Create your candidate account</h2>
              <p className="text-white/50 text-sm mb-7">Sign in to build your verified profile and apply to bond-backed jobs.</p>

              <button
                onClick={handleGoogleAuth}
                disabled={!!authLoading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-xl mb-3 transition-colors disabled:opacity-60"
              >
                {authLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
                  placeholder="you@email.com"
                  className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleEmailAuth}
                  disabled={!form.email || !!authLoading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-40"
                >
                  {authLoading === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : emailSent ? <Check className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </button>
              </div>
              {emailSent && <p className="text-xs text-emerald-400 mt-2 text-center">Magic link sent — check your inbox</p>}
            </div>
          )}

          {/* Step 1: Profile */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600/20 mb-5">
                <User className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Your profile</h2>
              <p className="text-white/50 text-sm mb-7">This is what employers will see when you apply.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Sarah Chen"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Professional Headline *</label>
                  <input
                    value={form.headline}
                    onChange={(e) => setField("headline", e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer at Stripe"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1.5">Location *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      value={form.location}
                      onChange={(e) => setField("location", e.target.value)}
                      placeholder="San Francisco, CA or Remote"
                      className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep[1]}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600/20 mb-5">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Your skills</h2>
              <p className="text-white/50 text-sm mb-6">Add the technologies and skills you&apos;re proficient in. Add at least one.</p>

              {/* Suggestions */}
              <div className="mb-4">
                <p className="text-xs text-white/40 mb-2">Suggested</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_SKILLS.filter((s) => !form.skills.includes(s)).map((s) => (
                    <button
                      key={s}
                      onClick={() => addSkill(s)}
                      className="text-xs bg-white/10 hover:bg-emerald-600/30 border border-white/20 hover:border-emerald-500/50 text-white/70 hover:text-white px-3 py-1 rounded-full transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom skill input */}
              <div className="flex gap-2 mb-4">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill(skillInput))}
                  placeholder="Add a custom skill..."
                  className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => addSkill(skillInput)}
                  disabled={!skillInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {/* Selected skills */}
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.skills.map((s) => (
                    <span key={s} className="flex items-center gap-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs px-3 py-1 rounded-full">
                      {s}
                      <button onClick={() => setField("skills", form.skills.filter((x) => x !== s))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep[2]}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3: Experience */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600/20 mb-5">
                <Briefcase className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Work experience</h2>
              <p className="text-white/50 text-sm mb-6">Optional but recommended. Add your past roles.</p>

              {/* Existing entries */}
              {form.experience.length > 0 && (
                <div className="space-y-2 mb-4">
                  {form.experience.map((e, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/10 border border-white/20 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{e.role}</p>
                        <p className="text-white/50 text-xs">{e.company}{e.years ? ` · ${e.years}yr${Number(e.years) !== 1 ? "s" : ""}` : ""}</p>
                      </div>
                      <button
                        onClick={() => setField("experience", form.experience.filter((_, j) => j !== i))}
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add experience form */}
              {addingExp ? (
                <div className="bg-white/10 border border-white/20 rounded-xl p-4 space-y-3 mb-4">
                  <input
                    value={newExp.role}
                    onChange={(e) => setNewExp((x) => ({ ...x, role: e.target.value }))}
                    placeholder="Job title *"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    value={newExp.company}
                    onChange={(e) => setNewExp((x) => ({ ...x, company: e.target.value }))}
                    placeholder="Company name *"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={newExp.years}
                    onChange={(e) => setNewExp((x) => ({ ...x, years: e.target.value }))}
                    placeholder="Years in role"
                    min={0}
                    max={50}
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setAddingExp(false)} className="flex-1 border border-white/20 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={addExperience} disabled={!newExp.company || !newExp.role} className="flex-1 bg-emerald-600 text-white text-sm py-2 rounded-lg hover:bg-emerald-500 disabled:opacity-40 transition-colors">Add</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingExp(true)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-white/20 hover:border-emerald-500/40 text-white/40 hover:text-emerald-400 py-3 rounded-xl text-sm transition-colors mb-4"
                >
                  <Plus className="w-4 h-4" /> Add experience
                </button>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating profile...</> : "Create Profile"}
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Profile created!</h2>
              <p className="text-white/50 text-sm mb-6">
                Your profile is live. Employers can now find you for bond-backed roles.
              </p>

              {/* Profile summary */}
              <div className="bg-white/10 border border-white/20 rounded-xl p-5 text-left mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
                    {form.name.split(" ").map((n) => n[0]).join("") || "?"}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{form.name || "Your Name"}</p>
                    <p className="text-white/50 text-xs">{form.headline}</p>
                    <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{form.location}</p>
                  </div>
                </div>
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.skills.slice(0, 6).map((s) => (
                      <span key={s} className="bg-emerald-600/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {form.skills.length > 6 && <span className="text-white/30 text-xs py-0.5">+{form.skills.length - 6} more</span>}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-yellow-400 text-lg">⚠</span>
                  <div className="text-left">
                    <p className="text-yellow-300 text-xs font-medium">KYC verification pending</p>
                    <p className="text-yellow-400/70 text-xs mt-0.5">We&apos;ll email you next steps to complete identity verification.</p>
                  </div>
                </div>
                <Link
                  href="/"
                  className="block w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Go to Homepage
                </Link>
              </div>
            </div>
          )}
        </div>

        {step < 4 && (
          <p className="text-white/30 text-xs mt-6">
            Already have an account?{" "}
            <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 transition-colors">Sign in</Link>
          </p>
        )}
      </main>
    </div>
  );
}
