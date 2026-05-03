import { Injectable } from '@nestjs/common';

@Injectable()
export class ScorecardRendererService {

  render(application: any): string {
    const dc  = application.decisionCard   ?? {};
    const sc  = application.frozenScorecard ?? {};  // source of truth — never pull live data
    const gap = application.gapReport      ?? {};
    const job = application.jobPost            ?? application.job ?? {};
    const candidate = application.candidate ?? {};
    const name = candidate?.user?.name ?? ((`${candidate?.user?.firstName || ''} ${candidate?.user?.lastName || ''}`).trim() || 'Candidate');
    const username = candidate?.user?.username ?? '';

    const verdictColor = dc.verdict === 'PROCEED' ? '#16a34a'
                       : dc.verdict === 'REJECT'  ? '#dc2626'
                       :                            '#d97706';

    const fitColor = sc.fitTier === 'STRONG' ? '#16a34a'
                   : sc.fitTier === 'PROBE'  ? '#d97706'
                   :                           '#6b7280';

    const fraudColor = sc.fraudTier === 'CLEAN'  ? '#16a34a'
                     : sc.fraudTier === 'REVIEW' ? '#d97706'
                     :                             '#dc2626';

    const pct = (n: number) => `${Math.round(n)}%`;
    const score = (n: number) => `${Math.round(n ?? 0)}`;

    const languageBar = (langs: any[]) => langs.slice(0, 6).map(l => `
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span>${l.name}</span><span style="color:#6b7280">${pct(l.percent)}</span>
        </div>
        <div style="background:#e5e7eb;border-radius:4px;height:6px">
          <div style="background:#2563eb;border-radius:4px;height:6px;width:${pct(l.percent)}"></div>
        </div>
      </div>`).join('');

    const repoList = (repos: any[]) => repos.slice(0, 5).map(r => `
      <div class="repo-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <strong style="font-size:13px">${r.name}</strong>
          ${r.isOriginal ? '' : '<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px">FORK</span>'}
          ${r.primaryLanguage ? `<span style="font-size:10px;background:#eff6ff;color:#1d4ed8;padding:1px 6px;border-radius:4px">${r.primaryLanguage}</span>` : ''}
          ${r.stars > 0 ? `<span style="font-size:11px;color:#6b7280">★ ${r.stars}</span>` : ''}
        </div>
        ${r.description ? `<div style="font-size:12px;color:#6b7280">${r.description}</div>` : ''}
      </div>`).join('');

    const dimensionRows = (dims: any[]) => dims.map(d => `
      <tr>
        <td>${d.name}</td>
        <td style="text-align:center;font-family:monospace;font-weight:700">${score(d.score)}</td>
        <td style="text-align:center;color:#6b7280">${pct(d.weight * 100)}</td>
        <td style="font-size:11px;color:#6b7280">${(d.signals ?? []).slice(0, 3).join(' · ')}</td>
      </tr>`).join('');

    const gapRows = (gaps: any[]) => gaps.map(g => {
      const sCol = g.severity === 'DEALBREAKER' ? '#dc2626'
                 : g.severity === 'SIGNIFICANT' ? '#d97706' : '#6b7280';
      return `<tr>
        <td>${g.dimension}</td>
        <td style="color:${sCol};font-weight:600;font-size:11px">${g.severity}</td>
        <td style="font-size:12px">${g.description}</td>
        ${g.probeQuestion ? `<td style="font-size:11px;color:#92400e;font-style:italic">${g.probeQuestion}</td>` : '<td style="color:#9ca3af">—</td>'}
      </tr>`;
    }).join('');

    const stats = sc.contributionStats ?? {};

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Scorecard — ${job.title ?? 'Role'} — ${name}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 800; color: #111; }
  h2 { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 24px; }
  h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #374151; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #f3f4f6; }
  .verdict-block { display: flex; align-items: center; gap: 20px; padding: 18px 22px; border-radius: 10px; border: 2px solid ${verdictColor}33; background: ${verdictColor}0d; margin: 20px 0; }
  .verdict-badge { font-size: 20px; font-weight: 900; color: ${verdictColor}; white-space: nowrap; }
  .verdict-summary { font-size: 14px; color: #374151; line-height: 1.6; }
  .pill-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
  .pill { font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
  ul { list-style: none; padding: 0; }
  li { padding: 3px 0 3px 16px; font-size: 13px; color: #374151; position: relative; }
  li::before { content: '·'; position: absolute; left: 0; color: #9ca3af; font-weight: 900; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-n { font-size: 24px; font-weight: 800; font-family: monospace; color: #111; }
  .stat-l { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
  th { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; padding: 8px 10px; border-bottom: 2px solid #e5e7eb; text-align: left; background: #f9fafb; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .repo-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; }
  .divider { border: none; border-top: 3px solid #f3f4f6; margin: 32px 0; }
  .section-label { display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; padding: 3px 10px; border-radius: 4px; margin-bottom: 18px; }
  .sl-hr  { background: #eff6ff; color: #1d4ed8; }
  .sl-cto { background: #fef3c7; color: #92400e; }
  .tech-chip { font-size: 11px; padding: 3px 10px; border-radius: 12px; display: inline-block; margin: 2px; }
  .tc-match { background: #dcfce7; color: #166534; }
  .tc-miss  { background: #fee2e2; color: #991b1b; }
  .not-obs { padding: 12px 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; color: #6b7280; }
  .footer { font-size: 11px; color: #9ca3af; text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; margin-top: 40px; }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
    @page { margin: 1.5cm; }
  }
</style>
</head>
<body>

<div class="no-print" style="background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:10px 16px;margin-bottom:24px;font-size:12px;color:#92400e">
  To export as PDF: use your browser's <strong>Print</strong> function and choose <strong>Save as PDF</strong>.
</div>

<h1>${job.title ?? 'Role'} — Candidate Scorecard</h1>
<h2>${name}${username ? ' · @' + username : ''} · Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>

<div class="verdict-block">
  <div class="verdict-badge">${dc.verdict ?? '—'}</div>
  <div class="verdict-summary">${dc.hrSummary ?? 'No summary available.'}</div>
</div>

<div class="pill-row">
  <span class="pill" style="background:${fitColor}1a;color:${fitColor}">Fit: ${sc.fitTier ?? '—'}</span>
  <span class="pill" style="background:#eff6ff;color:#1d4ed8">Score: ${score(sc.roleFitScore ?? application.roleFitScore)}/100</span>
  <span class="pill" style="background:${fraudColor}1a;color:${fraudColor}">Fraud: ${sc.fraudTier ?? 'CLEAN'}</span>
  ${sc.confidenceTier ? `<span class="pill" style="background:#f3f4f6;color:#374151">Confidence: ${sc.confidenceTier}</span>` : ''}
  ${sc.behaviorPattern ? `<span class="pill" style="background:#f3f4f6;color:#374151">${sc.behaviorPattern}</span>` : ''}
</div>

<!-- ─── HR SECTION ───────────────────────────────────── -->
<span class="section-label sl-hr">HR Summary</span>

<div class="two-col">
  <div class="box">
    <h3 style="margin-top:0">Strengths</h3>
    <ul>${(dc.strengths ?? []).map((s: string) => `<li>${s}</li>`).join('') || '<li style="color:#9ca3af">None recorded</li>'}</ul>
  </div>
  <div class="box">
    <h3 style="margin-top:0">Risks</h3>
    <ul>${(dc.risks ?? []).map((r: string) => `<li>${r}</li>`).join('') || '<li style="color:#9ca3af">None recorded</li>'}</ul>
  </div>
</div>

${dc.reputationNote ? `<div class="box" style="margin-bottom:16px"><h3 style="margin-top:0">Reputation Note</h3><p style="font-size:13px">${dc.reputationNote}</p></div>` : ''}

<hr class="divider">

<!-- ─── TECHNICAL SECTION ─────────────────────────────── -->
<span class="section-label sl-cto">Technical Deep-Dive</span>

${dc.technicalSummary ? `<div class="box" style="margin-bottom:20px"><p style="font-size:13px;font-family:monospace;color:#374151">${dc.technicalSummary}</p></div>` : ''}

<h3>Contribution Stats</h3>
<div class="stat-grid">
  <div class="stat-box"><div class="stat-n">${stats.totalCommits ?? '—'}</div><div class="stat-l">Commits</div></div>
  <div class="stat-box"><div class="stat-n">${stats.totalPRs ?? '—'}</div><div class="stat-l">Pull Requests</div></div>
  <div class="stat-box"><div class="stat-n">${stats.totalReviews ?? '—'}</div><div class="stat-l">Reviews</div></div>
  <div class="stat-box"><div class="stat-n">${stats.accountAgeDays ? Math.round(stats.accountAgeDays / 365) + 'y' : '—'}</div><div class="stat-l">Account Age</div></div>
</div>

${(sc.languagesUsed ?? []).length > 0 ? `
<h3>Language Profile</h3>
<div class="box">${languageBar(sc.languagesUsed)}</div>
` : ''}

${(sc.dimensions ?? []).length > 0 ? `
<h3>Dimension Scores</h3>
<table>
  <thead><tr><th>Dimension</th><th style="text-align:center">Score</th><th style="text-align:center">Weight</th><th>Signals</th></tr></thead>
  <tbody>${dimensionRows(sc.dimensions)}</tbody>
</table>
` : ''}

${(sc.topRepositories ?? []).length > 0 ? `
<h3>Top Repositories</h3>
${repoList(sc.topRepositories)}
` : ''}

${sc.web3 ? `
<h3>Web3 Profile</h3>
<div class="box" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
  <div><div style="font-size:20px;font-weight:800;font-family:monospace">${score(sc.web3.walletScore)}</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase">Wallet Score</div></div>
  <div><div style="font-size:20px;font-weight:800;font-family:monospace">${sc.web3.transactionCount ?? '—'}</div><div style="font-size:11px;color:#6b7280;text-transform:uppercase">Transactions</div></div>
  <div style="grid-column:1/-1"><div style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase">Protocols</div>${(sc.web3.protocolsUsed ?? []).map((p: string) => `<span class="tech-chip" style="background:#eff6ff;color:#1d4ed8">${p}</span>`).join('') || '—'}</div>
</div>
` : ''}

<hr class="divider">

<!-- ─── GAP ANALYSIS ────────────────────────────────────── -->
<span class="section-label" style="background:#f3f4f6;color:#374151">Gap Analysis</span>

<h3>Technology Match</h3>
<div class="two-col">
  <div class="box">
    <strong style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:.06em">Matched</strong>
    <div style="margin-top:8px">${(gap.matchedTechnologies ?? []).map((t: string) => `<span class="tech-chip tc-match">${t}</span>`).join('') || '<span style="font-size:12px;color:#9ca3af">None</span>'}</div>
  </div>
  <div class="box">
    <strong style="font-size:11px;color:#991b1b;text-transform:uppercase;letter-spacing:.06em">Missing</strong>
    <div style="margin-top:8px">${(gap.missingTechnologies ?? []).map((t: string) => `<span class="tech-chip tc-miss">${t}</span>`).join('') || '<span style="font-size:12px;color:#9ca3af">None</span>'}</div>
  </div>
</div>

${(gap.gaps ?? []).length > 0 ? `
<h3>Gap Breakdown + Probe Questions</h3>
<table>
  <thead><tr><th>Dimension</th><th>Severity</th><th>Description</th><th>Probe Question</th></tr></thead>
  <tbody>${gapRows(gap.gaps)}</tbody>
</table>
` : ''}

<h3>Not Observable via GitHub</h3>
<div class="not-obs">The following cannot be assessed from code signals alone and require interview assessment: Communication quality · System design thinking · Management capability · Cultural fit · Attitude under pressure · Interview performance.</div>

<div class="footer">
  Generated by Colosseum — proof-of-talent hiring platform<br>
  Snapshot captured: ${sc.capturedAt ? new Date(sc.capturedAt).toLocaleString('en-GB') : 'Unknown'} · Exported: ${new Date().toISOString()}
</div>
</body></html>`;
  }
}
