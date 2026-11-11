import { useState, useEffect, useCallback } from 'react';
import type { VaultItem, VaultCustomField, VaultLoginType } from '../../../types';
import { parseVaultCustomFields } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

interface UseVaultItemFormLogicParams {
  item: VaultItem | null;
  groupId: string | null;
  onSave: () => void;
}

export function useVaultItemFormLogic({
  item,
  groupId,
  onSave,
}: UseVaultItemFormLogicParams) {
  const [label, setLabel] = useState(item?.label || '');
  const [loginType, setLoginType] = useState<VaultLoginType>(item?.login_type || 'password');
  const [username, setUsername] = useState(item?.username || '');
  const [email, setEmail] = useState(item?.email || '');
  const [password, setPassword] = useState(item?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl] = useState(item?.url || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [isFavorite, setIsFavorite] = useState(item?.is_favorite === 1);
  const [selectedGroupId, setSelectedGroupId] = useState(item ? (item.group_id || '') : (groupId || ''));

  const [customFields, setCustomFields] = useState<VaultCustomField[]>(() => {
    return parseVaultCustomFields(item?.custom_fields);
  });

  const [passwordStrength, setPasswordStrength] = useState(item?.password_strength || 0);

  const checkStrength = useCallback(async (pass: string) => {
    if (!pass) return setPasswordStrength(0);
    try {
      const str = await window.api?.vault?.checkStrength(pass);
      setPasswordStrength(str ?? 0);
    } catch {
      setPasswordStrength(pass.length > 10 ? 3 : 1);
    }
  }, []);

  useEffect(() => {
    if (item?.password) {
      checkStrength(item.password);
    }
  }, [item?.password, checkStrength]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    if (!label.trim()) {
      triggerToast('O item precisa de um nome (Rótulo).', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const isGoogle = loginType === 'google';
      const itemToSave: VaultItem = {
        ...item,
        id: item?.id || crypto.randomUUID(),
        group_id: selectedGroupId || null,
        label: label.trim(),
        login_type: loginType,
        username: username || null,
        email: email || null,
        password: isGoogle ? null : (password || null),
        url: url || null,
        notes: notes || null,
        custom_fields: customFields.length > 0 ? JSON.stringify(customFields) : null,
        is_favorite: isFavorite ? 1 : 0,
        password_strength: isGoogle ? 4 : passwordStrength,
        created_at: item?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: item?.deleted_at || null,
        password_changed_at: item?.password_changed_at || null,
      };

      await window.api?.vault?.upsertItem(itemToSave);
      triggerToast(item ? 'Item atualizado com sucesso!' : 'Item salvo no cofre!', 'success');
      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar item no cofre.';
      console.error('[Vault] Error saving vault item:', err);
      triggerToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePassword = async () => {
    try {
      const newPass = await window.api?.vault?.generatePassword({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      });
      if (newPass) {
        setPassword(newPass);
        checkStrength(newPass);
        setShowPassword(true);
      }
    } catch (err) {
      console.error('Failed to generate password:', err);
    }
  };

  return {
    label,
    setLabel,
    loginType,
    setLoginType,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    url,
    setUrl,
    notes,
    setNotes,
    isFavorite,
    setIsFavorite,
    selectedGroupId,
    setSelectedGroupId,
    customFields,
    setCustomFields,
    passwordStrength,
    checkStrength,
    generatePassword,
    handleSave,
    isSaving,
  };
}
