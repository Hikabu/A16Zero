const fs = require('fs');
let code = fs.readFileSync('test/stage2-analysis.e2e-spec.ts', 'utf8');
code = code.replace(/if \(res.body.status === 'complete' \|\| res.body.status === 'failed'\) \{/g, `if (res.body.status === 'complete' || res.body.status === 'failed') {
        if (res.body.status === 'failed') console.error('Job Failed: ', res.body.failureReason);`);
code = code.replace(/UST_RUST_MOCK_WALLET/g, '11111111111111111111111111111112');
fs.writeFileSync('test/stage2-analysis.e2e-spec.ts', code);
