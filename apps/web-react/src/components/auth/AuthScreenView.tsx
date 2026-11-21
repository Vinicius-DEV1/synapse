import { ArrowRight, CheckCircle2, Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import WindowControls from '../layout/WindowControls';
import { AuthLockoutView } from './AuthLockoutView';
import { useI18n } from '../../i18n';
import { platform } from '../../services/platform';
import type { AuthScreenModel } from './useAuthScreenController';

export function AuthScreenView({ model }: { model: AuthScreenModel }) {
  const { t } = useI18n();
  const {
    isSetup,
    lockoutTime,
    intimidatingPhrase,
    cloudMode,
    email,
    maskedEmail,
    isEmailMasked,
    rememberEmail,
    cloudPassword,
    previousPassword,
    cloudMessage,
    error,
    loading,
    shake,
    migrationRequired,
    recoveryWarning,
    setEmail,
    toggleRememberEmail,
    switchToCustomEmail,
    setCloudPassword,
    setPreviousPassword,
    changeCloudMode,
    handleCloudSubmit,
    handleLegacyMigration,
    handleForgotPassword,
    cancelLegacyMigration,
  } = model;

  return (
    <div className="min-h-screen bg-[#0f0e17] flex items-center justify-center p-4 relative" style={{ minHeight: '100dvh' }}>
      {platform.isDesktop && (
        <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-10 z-50 flex items-center justify-end select-none">
          <WindowControls />
        </div>
      )}
      <div className={`bg-dark-card border border-white/[0.06] rounded-2xl p-8 max-w-md w-full shadow-2xl transition-all ${shake ? 'animate-shake' : ''} ${lockoutTime > 0 ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.15)] bg-[#1a0f0f]' : ''}`}>
        {lockoutTime > 0 ? (
          <AuthLockoutView lockoutTime={lockoutTime} intimidatingPhrase={intimidatingPhrase} />
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/40">
                <Lock size={20} />
              </div>
            </div>

            <h1 className="text-xl font-medium text-center text-white mb-2">
              {migrationRequired ? t('auth.migrationTitle') : isSetup ? t('auth.cloudSetupTitle') : t('auth.cloudTitle')}
            </h1>
            <p className="text-center text-dark-subtext mb-6 text-sm">
              {migrationRequired ? t('auth.migrationSubtitle') : t('auth.cloudSubtitle')}
            </p>

            {cloudMessage && (
              <div className="mb-4 flex items-center gap-2 text-emerald-300 text-xs bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{cloudMessage}</span>
              </div>
            )}

            {!migrationRequired ? (
              <>
                <div className="flex rounded-xl bg-zinc-900/60 p-1 mb-5 border border-white/5">
                  <button
                    type="button"
                    onClick={() => changeCloudMode('login')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${cloudMode === 'login' ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                  >
                    {t('auth.signIn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => changeCloudMode('register')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${cloudMode === 'register' ? 'bg-brand-500 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                  >
                    <Sparkles size={12} />
                    <span>{t('auth.createAccount')}</span>
                  </button>
                </div>

                <form onSubmit={handleCloudSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-medium text-dark-subtext mb-1 ml-1 uppercase tracking-wider">Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                      {cloudMode === 'login' && isEmailMasked ? (
                        <>
                          <input
                            type="text"
                            readOnly
                            aria-label="Email"
                            value={maskedEmail}
                            disabled={loading}
                            className="w-full bg-dark-bg border border-white/[0.08] rounded-xl pl-9 pr-20 py-2.5 text-sm text-white/90 tracking-wide focus:outline-none focus:border-brand-500/50 cursor-default"
                          />
                          <button
                            type="button"
                            onClick={switchToCustomEmail}
                            disabled={loading}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-brand-400 hover:text-brand-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                          >
                            {t('auth.changeEmail')}
                          </button>
                        </>
                      ) : (
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          disabled={loading}
                          autoFocus
                          autoComplete="username"
                          className="w-full bg-dark-bg border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
                          placeholder={t('auth.emailPlaceholder')}
                        />
                      )}
                    </div>
                    <label className="mt-2 ml-1 inline-flex items-center gap-2 text-xs text-dark-subtext hover:text-white/90 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(event) => toggleRememberEmail(event.target.checked)}
                        disabled={loading}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500/40 focus:ring-offset-0"
                      />
                      <span>{t('auth.rememberEmail')}</span>
                    </label>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <label className="text-[11px] font-medium text-dark-subtext uppercase tracking-wider">{t('auth.accountPassword')}</label>
                      {cloudMode === 'login' && (
                        <button type="button" onClick={handleForgotPassword} disabled={loading} className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50">
                          {recoveryWarning ? t('auth.sendRecoveryLink') : t('auth.forgotPassword')}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-3.5 text-zinc-500" />
                      <input
                        type="password"
                        required
                        value={cloudPassword}
                        onChange={(event) => setCloudPassword(event.target.value)}
                        disabled={loading}
                        autoFocus={cloudMode === 'login' && isEmailMasked}
                        autoComplete={cloudMode === 'register' ? 'new-password' : 'current-password'}
                        className="w-full bg-dark-bg border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
                        placeholder={t('auth.accountPasswordPlaceholder')}
                      />
                    </div>
                  </div>

                  {recoveryWarning && (
                    <p className="text-xs leading-relaxed text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                      {t('auth.passwordRecoveryWarning')}
                    </p>
                  )}

                  {error && <ErrorNotice message={error} />}

                  <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2">
                    {loading ? <span className="animate-pulse">{t('common.loading')}</span> : <><span>{cloudMode === 'register' ? t('auth.createAccount') : t('auth.signInToAccount')}</span><ArrowRight size={16} /></>}
                  </button>
                </form>
              </>
            ) : (
              <form onSubmit={handleLegacyMigration} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-dark-subtext mb-1 ml-1 uppercase tracking-wider">{t('auth.previousVaultCredential')}</label>
                  <input
                    type="password"
                    value={previousPassword}
                    onChange={(event) => setPreviousPassword(event.target.value)}
                    disabled={loading}
                    autoFocus
                    autoComplete="current-password"
                    className="w-full bg-dark-bg border border-white/[0.08] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-white/10"
                    placeholder={t('auth.previousCredentialPlaceholder')}
                  />
                </div>

                <p className="text-xs leading-relaxed text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  {t('auth.migrationSafetyNotice')}
                </p>
                {error && <ErrorNotice message={error} />}
                <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <span className="animate-pulse">{t('common.loading')}</span> : <><span>{t('auth.migrateAndUnlock')}</span><ArrowRight size={18} /></>}
                </button>
                <button type="button" onClick={cancelLegacyMigration} disabled={loading} className="w-full text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-50">
                  {t('common.cancel')}
                </button>
              </form>
            )}

            {!migrationRequired && error && <div className="mt-4"><ErrorNotice message={error} /></div>}
          </>
        )}
      </div>
    </div>
  );
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
      <ShieldAlert size={16} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
