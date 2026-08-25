import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/AppContext';
import { verifyCloudMasterPassword, pullModularKeysFromCloud } from '../services/sync/sync-auth';
import { deriveMasterKey } from '../services/crypto';

export const LoginScreen: React.FC = () => {
  const { dispatch } = useAppStore();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    console.log("[LOGIN] 🚀 Botão Desbloquear clicado! Senha preenchida:", !!password.trim());
    if (!password.trim()) {
      setErrorMessage('Digite sua senha mestra.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setStatusText('Derivando chave criptográfica...');

    try {
      console.log("[LOGIN] 1. Derivando chave mestra via WebView nativo...");
      const masterKeyHex = await deriveMasterKey(password);
      console.log("[LOGIN] 2. Chave derivada! Hex length:", masterKeyHex.length);
      
      setStatusText('Validando com o Firebase...');
      console.log("[LOGIN] 3. Validando senha com a nuvem...");
      const check = await verifyCloudMasterPassword(masterKeyHex);
      console.log("[LOGIN] 4. Resultado da verificação:", JSON.stringify(check));

      if (!check.isValid) {
        setErrorMessage(
          check.error === 'timeout'
            ? 'Tempo limite de conexão esgotado. Verifique sua internet.'
            : 'Senha incorreta. Tente novamente.'
        );
        setLoading(false);
        setStatusText(null);
        return;
      }

      setStatusText('Sincronizando chaves...');
      console.log("[LOGIN] 5. Baixando chaves modulares...");
      const modularKeys = await pullModularKeysFromCloud(masterKeyHex);
      console.log("[LOGIN] 6. Chaves modulares recebidas:", modularKeys ? Object.keys(modularKeys) : 'null');

      setStatusText('Desbloqueando...');
      console.log("[LOGIN] 7. ✅ Desbloqueando app!");
      dispatch({
        type: 'SET_AUTH',
        isAuth: true,
        moduleKeys: modularKeys || { core: masterKeyHex, notes: masterKeyHex, library: masterKeyHex },
      });
    } catch (err: any) {
      console.error('[LOGIN] ❌ Erro no fluxo de login:', err?.message || err);
      setErrorMessage(err?.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
      setStatusText(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <ShieldCheck size={36} color={colors.brand400} />
        </View>

        <Text style={styles.title}>Caderno Mobile</Text>
        <Text style={styles.subtitle}>Ambiente Seguro & Criptografia E2EE</Text>

        <View style={styles.inputWrapper}>
          <Lock size={18} color={colors.darkSubtext} style={styles.lockIcon} />
          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Digite a Senha Mestra"
            placeholderTextColor={colors.darkSubtext}
            secureTextEntry
            style={styles.input}
            autoCapitalize="none"
            editable={!loading}
            onSubmitEditing={handleLogin}
          />
        </View>

        {errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        {statusText && (
          <View style={styles.statusRow}>
            <ActivityIndicator color={colors.brand400} size="small" />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.loginButton, loading ? styles.buttonDisabled : null]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Text style={styles.buttonText}>Desbloquear Ambiente</Text>
              <ArrowRight size={18} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.darkCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.darkSubtext,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  lockIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.darkText,
    fontSize: 15,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  statusText: {
    color: colors.brand400,
    fontSize: 13,
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 52,
    backgroundColor: colors.brand500,
    borderRadius: 14,
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
