export const LANGUAGE_CAPABILITY_WEIGHTS: Record<
  string,
  { backend: number; frontend: number; devops: number }
> = {
  // Backend-dominant languages
  Go: { backend: 0.9, frontend: 0.05, devops: 0.3 },
  Python: { backend: 0.75, frontend: 0.1, devops: 0.25 },
  Rust: { backend: 0.85, frontend: 0.05, devops: 0.2 },
  Java: { backend: 0.85, frontend: 0.15, devops: 0.15 },
  Ruby: { backend: 0.8, frontend: 0.1, devops: 0.1 },
  PHP: { backend: 0.75, frontend: 0.2, devops: 0.05 },
  'C#': { backend: 0.8, frontend: 0.2, devops: 0.15 },
  'C++': { backend: 0.8, frontend: 0.05, devops: 0.15 },
  C: { backend: 0.7, frontend: 0.05, devops: 0.2 },
  Scala: { backend: 0.8, frontend: 0.05, devops: 0.1 },
  Kotlin: { backend: 0.75, frontend: 0.25, devops: 0.1 },
  Swift: { backend: 0.3, frontend: 0.8, devops: 0.05 },
  Elixir: { backend: 0.85, frontend: 0.05, devops: 0.15 },
  Haskell: { backend: 0.8, frontend: 0.05, devops: 0.1 },
  Erlang: { backend: 0.85, frontend: 0.05, devops: 0.15 },
  // Frontend-dominant languages
  TypeScript: { backend: 0.45, frontend: 0.7, devops: 0.15 },
  JavaScript: { backend: 0.35, frontend: 0.75, devops: 0.1 },
  HTML: { backend: 0.05, frontend: 0.9, devops: 0.05 },
  CSS: { backend: 0.0, frontend: 0.85, devops: 0.0 },
  Dart: { backend: 0.2, frontend: 0.8, devops: 0.05 },
  Vue: { backend: 0.1, frontend: 0.85, devops: 0.05 },
  // DevOps-dominant languages
  Shell: { backend: 0.2, frontend: 0.0, devops: 0.85 },
  HCL: { backend: 0.05, frontend: 0.0, devops: 0.95 },
  Dockerfile: { backend: 0.1, frontend: 0.05, devops: 0.9 },
  YAML: { backend: 0.1, frontend: 0.05, devops: 0.7 },
  Makefile: { backend: 0.1, frontend: 0.0, devops: 0.7 },
  Nix: { backend: 0.1, frontend: 0.0, devops: 0.8 },
  // Data science languages
  R: { backend: 0.4, frontend: 0.05, devops: 0.05 },
  MATLAB: { backend: 0.35, frontend: 0.05, devops: 0.05 },
  Jupyter: { backend: 0.4, frontend: 0.1, devops: 0.05 },
  // Solidity / Web3
  Solidity: { backend: 0.8, frontend: 0.1, devops: 0.1 },
  Vyper: { backend: 0.8, frontend: 0.05, devops: 0.05 },
  // Fallback
  _unknown: { backend: 0.3, frontend: 0.2, devops: 0.1 },
};
