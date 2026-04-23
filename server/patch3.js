const fs = require('fs');
let code = fs.readFileSync('test/stage2-analysis.e2e-spec.ts', 'utf8');
code = code.replace(/await waitForJob\(res.body.jobId\);/g, `console.log('waiting for job...', res.body.jobId);
    let allProfs = await prisma.githubProfile.findMany();
    console.log('ALL PROFILES: ', allProfs.map(p => ({ id: p.id, username: p.githubUsername })));
    await waitForJob(res.body.jobId);`);
fs.writeFileSync('test/stage2-analysis.e2e-spec.ts', code);
