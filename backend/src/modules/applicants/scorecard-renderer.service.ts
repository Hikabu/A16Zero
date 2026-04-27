import { Injectable } from '@nestjs/common';

@Injectable()
export class ScorecardRenderer {
  render(app: any): string {
    const jobTitle = app.application?.job?.title || 'Unknown Role';
    const companyName = app.application?.job?.company || 'Unknown Company';
    const candidateName = app.application?.candidate?.name || 'Unknown Candidate';
    
    // Extract decision card
    const decisionCard = app.decisionCard || {};
    const gapDetail = decisionCard.gapDetail || {};
    
    const verdict = decisionCard.verdict || 'N/A';
    const hrSummary = decisionCard.hrSummary || '';
    const technicalSummary = decisionCard.technicalSummary || '';
    
    const strengths = decisionCard.strengths || [];
    const risks = decisionCard.risks || [];
    const reputationNote = decisionCard.reputationNote || '';
    
    const missingTechnologies = gapDetail.missingTechnologies || [];
    const matchedTechnologies = gapDetail.matchedTechnologies || [];
    
    const safeGaps = gapDetail.gaps || [];
    const probeQuestions = safeGaps
      .filter((g: any) => g.probeQuestion && (g.severity === 'SIGNIFICANT' || g.severity === 'DEALBREAKER'))
      .map((g: any) => ({ dimension: g.dimension, question: g.probeQuestion }));

    const notObservable = [
      'Communication style under pressure',
      'Team culture fit / soft skills',
      'Architecture design intuition (without scaffolding)',
      'Mentorship / leadership potential'
    ];

    const generateList = (items: string[]) => items.length 
      ? `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`
      : '<p>None</p>';

    // Badge styling
    let badgeColor = '#6b7280'; // default gray
    let badgeBg = '#f3f4f6';
    if (verdict === 'PROCEED') {
      badgeColor = '#065f46';
      badgeBg = '#d1fae5';
    } else if (verdict === 'REVIEW') {
      badgeColor = '#92400e';
      badgeBg = '#fef3c7';
    } else if (verdict === 'REJECT') {
      badgeColor = '#991b1b';
      badgeBg = '#fee2e2';
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${candidateName} - Scorecard</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: #111827;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            background: #fff;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          h1, h2, h3 { margin-top: 0; }
          .logo-placeholder {
            font-size: 24px;
            font-weight: 800;
            color: #4b5563;
          }
          .candidate-name {
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0 5px;
          }
          .job-title {
            font-size: 18px;
            color: #6b7280;
          }
          .verdict-block {
            background-color: ${badgeBg};
            border-left: 4px solid ${badgeColor};
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 4px;
          }
          .badge {
            display: inline-block;
            padding: 6px 12px;
            background-color: ${badgeColor};
            color: white;
            font-weight: bold;
            border-radius: 4px;
            font-size: 14px;
            letter-spacing: 0.1em;
            margin-bottom: 10px;
          }
          .hr-summary {
            font-size: 18px;
            font-weight: 500;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .tech-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .tech-tag {
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 14px;
          }
          .tech-tag.matched { background: #dcfce7; color: #166534; }
          .tech-tag.missing { background: #fee2e2; color: #991b1b; }
          
          .print-btn {
            background: #000;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 20px;
          }
          .print-btn:hover { background: #333; }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
          }

          @media print {
            body { padding: 0; max-width: none; }
            .no-print { display: none !important; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right;">
          <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
        </div>

        <header>
          <div>
            <div class="candidate-name">${candidateName}</div>
            <div class="job-title">Applying for: <strong>${jobTitle}</strong></div>
          </div>
          <div style="text-align: right;">
            <div class="logo-placeholder">${companyName}</div>
            <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">${new Date().toLocaleDateString()}</div>
          </div>
        </header>

        <div class="verdict-block">
          <div class="badge">${verdict}</div>
          <div class="hr-summary">${hrSummary}</div>
        </div>

        <div class="section">
          <h3 class="section-title">Technical Summary</h3>
          <p>${technicalSummary}</p>
        </div>

        <div class="grid">
          <div class="section">
            <h3 class="section-title">Strengths</h3>
            ${generateList(strengths)}
          </div>
          <div class="section">
            <h3 class="section-title">Risks</h3>
            ${generateList(risks)}
          </div>
        </div>

        <div class="grid">
          <div class="section">
            <h3 class="section-title">Matched Technologies</h3>
            <div class="tech-list">
              ${matchedTechnologies.length ? matchedTechnologies.map((t: string) => `<span class="tech-tag matched">${t}</span>`).join('') : '<p>None</p>'}
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">Missing Technologies</h3>
            <div class="tech-list">
              ${missingTechnologies.length ? missingTechnologies.map((t: string) => `<span class="tech-tag missing">${t}</span>`).join('') : '<p>None</p>'}
            </div>
          </div>
        </div>

        ${probeQuestions.length > 0 ? `
        <div class="section">
          <h3 class="section-title">Interview Probe Questions</h3>
          <ol style="padding-left: 20px;">
            ${probeQuestions.map((q: any) => `
              <li style="margin-bottom: 10px;">
                <strong>${q.dimension}:</strong><br/>
                ${q.question}
              </li>
            `).join('')}
          </ol>
        </div>
        ` : ''}

        ${reputationNote ? `
        <div class="section">
          <h3 class="section-title">Reputation Note</h3>
          <p><em>${reputationNote}</em></p>
        </div>
        ` : ''}

        <div class="section" style="background: #f9fafb; padding: 20px; border-radius: 4px; font-size: 14px;">
          <h3 class="section-title" style="margin-bottom: 10px; border: none; padding: 0;">Evaluation Limits (Not Observable)</h3>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            ${notObservable.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>

        <div class="footer">
          Generated by Colosseum — proof-of-talent hiring platform • ${new Date().toISOString()}
        </div>
      </body>
      </html>
    `;
  }
}
