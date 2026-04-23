export const LANGUAGE_CAPABILITY_WEIGHTS: Record<string, { backend: number; frontend: number; devops: number }> = {
  // Backend-dominant languages
  'Go':         { backend: 0.90, frontend: 0.05, devops: 0.30 },
  'Python':     { backend: 0.75, frontend: 0.10, devops: 0.25 },
  'Rust':       { backend: 0.85, frontend: 0.05, devops: 0.20 },
  'Java':       { backend: 0.85, frontend: 0.15, devops: 0.15 },
  'Ruby':       { backend: 0.80, frontend: 0.10, devops: 0.10 },
  'PHP':        { backend: 0.75, frontend: 0.20, devops: 0.05 },
  'C#':         { backend: 0.80, frontend: 0.20, devops: 0.15 },
  'C++':        { backend: 0.80, frontend: 0.05, devops: 0.15 },
  'C':          { backend: 0.70, frontend: 0.05, devops: 0.20 },
  'Scala':      { backend: 0.80, frontend: 0.05, devops: 0.10 },
  'Kotlin':     { backend: 0.75, frontend: 0.25, devops: 0.10 },
  'Swift':      { backend: 0.30, frontend: 0.80, devops: 0.05 },
  'Elixir':     { backend: 0.85, frontend: 0.05, devops: 0.15 },
  'Haskell':    { backend: 0.80, frontend: 0.05, devops: 0.10 },
  'Erlang':     { backend: 0.85, frontend: 0.05, devops: 0.15 },
  // Frontend-dominant languages
  'TypeScript': { backend: 0.45, frontend: 0.70, devops: 0.15 },
  'JavaScript': { backend: 0.35, frontend: 0.75, devops: 0.10 },
  'HTML':       { backend: 0.05, frontend: 0.90, devops: 0.05 },
  'CSS':        { backend: 0.00, frontend: 0.85, devops: 0.00 },
  'Dart':       { backend: 0.20, frontend: 0.80, devops: 0.05 },
  'Vue':        { backend: 0.10, frontend: 0.85, devops: 0.05 },
  // DevOps-dominant languages
  'Shell':      { backend: 0.20, frontend: 0.00, devops: 0.85 },
  'HCL':        { backend: 0.05, frontend: 0.00, devops: 0.95 },
  'Dockerfile': { backend: 0.10, frontend: 0.05, devops: 0.90 },
  'YAML':       { backend: 0.10, frontend: 0.05, devops: 0.70 },
  'Makefile':   { backend: 0.10, frontend: 0.00, devops: 0.70 },
  'Nix':        { backend: 0.10, frontend: 0.00, devops: 0.80 },
  // Data science languages
  'R':          { backend: 0.40, frontend: 0.05, devops: 0.05 },
  'MATLAB':     { backend: 0.35, frontend: 0.05, devops: 0.05 },
  'Jupyter':    { backend: 0.40, frontend: 0.10, devops: 0.05 },
  // Solidity / Web3
  'Solidity':   { backend: 0.80, frontend: 0.10, devops: 0.10 },
  'Vyper':      { backend: 0.80, frontend: 0.05, devops: 0.05 },
  // Fallback
  '_unknown':   { backend: 0.30, frontend: 0.20, devops: 0.10 },
};
