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

- [ ] **TypeScript Contract Verification**: `npm run typecheck` passes with 0 errors.
- [ ] **Targeted Tests**: Added or verified tests via `npm run test:related -- <files>` or `npm run test -- <path>`.
- [ ] **Linter**: `npm run lint` passes without style violations.
- [ ] **100% Functional & Visual Parity**: All animations, shortcuts, dark theme styling, and user flows are preserved.
- [ ] **Zero Sensitive Data**: No real credentials, `.env` values, API keys, or personal tokens are included.
- [ ] **Documentation**: Updated the relevant current sources of truth and app-level guidance; checked links and commands.
- [ ] **Status Claims**: Historical plans and prior test totals are not used as evidence of current completion.
- [ ] **Cryptography Changes**: Updated `docs/security/native-encryption-audit.md` and tested the modified client/bridge if crypto, keychain, or media protection changed.
- [ ] **Native Parity**: Updated `docs/native-desktop-parity.md` if a Qt module's verified coverage or remaining gaps changed.
