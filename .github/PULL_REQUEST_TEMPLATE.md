## 📝 Description

<!-- Briefly describe the rationale and summary of your changes. -->

## 🎯 Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] ⚡ Performance optimization (latency, memory, or render improvements)
- [ ] ♻️ Code refactoring (structural improvements maintaining 100% parity)
- [ ] 📚 Documentation update (guides, specifications, comments)
- [ ] 🔒 Security hardening (cryptography, vulnerability patch)

## 🧪 Verification & Quality Checklist

Before submitting this pull request, please verify:

- [ ] **TypeScript Contract Verification**: `npx tsc -b --noEmit` passes with 0 errors.
- [ ] **Targeted Tests**: Added or verified tests via `npx vitest related --run <files>` or `npx vitest run <path>`.
- [ ] **Linter**: `npm run lint` passes without style violations.
- [ ] **100% Functional & Visual Parity**: All animations, shortcuts, dark theme styling, and user flows are preserved.
- [ ] **Zero Sensitive Data**: No real credentials, `.env` values, API keys, or personal tokens are included.
- [ ] **Documentation**: Updated corresponding markdown files in `docs/` if modifying APIs or architecture.
