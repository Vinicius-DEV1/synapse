import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Plus, Folder, Search, Key, ShieldAlert, Star, Lock, Eye, EyeOff, Check, Copy, ExternalLink, Settings2, History, Trash2, Clock, Smartphone, GripVertical, MoreVertical, Edit2 } from 'lucide-react';
import type { VaultGroup, VaultItem } from '../../types';
import { VaultItemForm } from './VaultItemForm';
import { VaultPasswordHistory } from './VaultPasswordHistory';
import { VaultBreachBadge } from './VaultBreachBadge';
import { VaultSecurityDashboard } from './VaultSecurityDashboard';

export default function VaultView() {
  const [viewMode, setViewMode] = useState<'list' | 'security'>('list');
  const [groups, setGroups] = useState<VaultGroup[]>([]);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Drag and Drop States
  const [draggedGroup, setDraggedGroup] = useState<VaultGroup | null>(null);
  const [draggedItem, setDraggedItem] = useState<VaultItem | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  
  // Context Menu States
  const [groupContextMenu, setGroupContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const g = await window.api.vault?.getGroups() || [];
      const i = await window.api.vault?.getItems(selectedGroupId || undefined) || [];
      setGroups(g);
      setItems(i);
    } catch (e) {
      console.error("Erro ao carregar cofre:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGroupId]);

  // Fechar context menu se clicar fora
  useEffect(() => {
    const handleClick = () => setGroupContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleCreateGroup = async () => {
    const name = prompt("Nome do Grupo:");
    if (!name) return;
    const newGroup = {
      id: crypto.randomUUID(),
      name,
      icon: 'Folder',
      color: '#3b82f6',
      position: groups.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await window.api.vault?.upsertGroup(newGroup);
    loadData();
  };

  const handleEditGroup = async (group: VaultGroup) => {
    const newName = prompt("Novo nome para o grupo:", group.name);
    if (!newName || newName === group.name) return;
    await window.api.vault?.upsertGroup({ ...group, name: newName });
    loadData();
  };

  const handleDeleteGroup = async (group: VaultGroup) => {
    if (confirm(`Tem certeza que deseja apagar o grupo "${group.name}"?\nOs itens dentro dele NÃO serão apagados, mas ficarão sem grupo.`)) {
      // 1. Mover os itens para 'Nenhum grupo' (isso na verdade deveria ser feito no backend se quisermos manter consistência forte, mas como o ID aponta pro void, eles automaticamente não vão aparecer quando filtrar pelo grupo deletado)
      // No getItems do backend, se passar None, ele pega todos. Se passarmos id do grupo deletado, ele retornaria vazio. Então os órfãos continuam salvos e aparecerão em "Todos os Itens".
      await window.api.vault?.deleteGroup(group.id);
      if (selectedGroupId === group.id) setSelectedGroupId(null);
      loadData();
    }
  };

  const handleSelectItem = (item: VaultItem) => {
    setViewMode('list');
    setSelectedItem(item);
    setIsEditingItem(false);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Tem certeza que deseja apagar este item?")) {
      await window.api.vault?.deleteItem(id);
      setSelectedItem(null);
      loadData();
    }
  };



  const filteredItems = searchQuery
    ? items.filter(i => 
        i.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (i.username && i.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (i.url && i.url.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : items;

  return (
    <div className="flex h-full bg-dark-bg text-dark-text font-sans" onClick={() => setGroupContextMenu(null)}>
      
      {/* PAINEL 1: Grupos (Esquerda) */}
      <div className="w-64 border-r border-white/5 bg-dark-card/30 flex flex-col">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400 font-semibold">
            <Shield size={20} />
            <span>Cofre</span>
          </div>
          <button onClick={handleCreateGroup} className="p-1 hover:bg-white/10 rounded-md transition-colors" title="Novo Grupo">
            <Plus size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          <button 
            data-droppable-type="vault-group"
            data-droppable-id="root"
            onClick={() => { setViewMode('list'); setSelectedGroupId(null); }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${selectedGroupId === null && viewMode === 'list' ? 'bg-brand-500/20 text-brand-400 border-r-2 border-brand-500' : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'} ${dragOverGroupId === 'root' ? 'bg-brand-500/20 border border-dashed border-brand-500' : ''}`}
          >
            <ShieldAlert size={16} />
            <span>Todos os Itens</span>
          </button>
          
          <button 
            onClick={() => setViewMode('security')}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors mt-1 ${viewMode === 'security' ? 'bg-brand-500/20 text-brand-400 border-r-2 border-brand-500' : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'}`}
          >
            <ShieldCheck size={16} />
            <span>Painel de Segurança</span>
          </button>
          
          <div className="px-4 py-2 mt-4 text-xs font-semibold text-dark-subtext uppercase tracking-wider">
            Grupos
          </div>
          {groups.map(g => (
            <VaultGroupItem 
              key={g.id} 
              g={g} 
              selectedGroupId={selectedGroupId} 
              viewMode={viewMode} 
              dragOverGroupId={dragOverGroupId}
              onSelect={() => { setViewMode('list'); setSelectedGroupId(g.id); }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setGroupContextMenu({ id: g.id, x: e.clientX, y: e.clientY });
              }}
            />
          ))}
        </div>
      </div>

      {/* Menu de Contexto para Grupos */}
      {groupContextMenu && (
        <div 
          className="fixed z-50 bg-dark-card border border-white/10 rounded-lg shadow-xl py-1 w-40 animate-fade-in"
          style={{ top: groupContextMenu.y, left: groupContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              const group = groups.find(g => g.id === groupContextMenu.id);
              if (group) handleEditGroup(group);
              setGroupContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-white/10 transition-colors"
          >
            <Edit2 size={14} /> Renomear
          </button>
          <button 
            onClick={() => {
              const group = groups.find(g => g.id === groupContextMenu.id);
              if (group) handleDeleteGroup(group);
              setGroupContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 size={14} /> Deletar
          </button>
        </div>
      )}

      {viewMode === 'security' ? (
        <VaultSecurityDashboard 
          items={items} 
          onEditItem={handleSelectItem} 
        />
      ) : (
        <>
          {/* PAINEL 2: Lista de Itens (Meio) */}
          <div className="w-80 border-r border-white/5 bg-dark-card/50 flex flex-col relative">
            <div className="p-4 border-b border-white/5 flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
             <div className="text-center py-10 text-dark-subtext text-sm">Carregando...</div>
          ) : filteredItems.length === 0 ? (
             <div className="text-center py-10 text-dark-subtext text-sm">Nenhum item encontrado</div>
          ) : (
            filteredItems.map(item => (
              <VaultItemRow 
                key={item.id} 
                item={item} 
                selectedItem={selectedItem} 
                onSelect={() => handleSelectItem(item)} 
              />
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => { setSelectedItem(null); setIsEditingItem(true); }}
            className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-brand-500/20"
          >
            <Plus size={16} />
            <span>Novo Item</span>
          </button>
        </div>
      </div>

      {/* PAINEL 3: Detalhes do Item (Direita) */}
      <div className="flex-1 flex flex-col bg-dark-bg overflow-y-auto relative">
        {!selectedItem && !isEditingItem ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-dark-subtext">
            <Shield size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Cofre de Senhas</p>
            <p className="text-sm opacity-60">Selecione um item ou crie um novo</p>
          </div>
        ) : isEditingItem ? (
          <VaultItemForm 
            item={selectedItem} 
            groups={groups}
            groupId={selectedGroupId}
            onSave={() => { setIsEditingItem(false); loadData(); }} 
            onCancel={() => { setIsEditingItem(false); }} 
          />
        ) : selectedItem ? (
          <ItemDetails item={selectedItem} onEdit={() => setIsEditingItem(true)} onDelete={() => handleDeleteItem(selectedItem.id)} />
        ) : null}
      </div>
      </>
      )}
      
    </div>
  );
}

function ItemDetails({ item, onEdit, onDelete }: { item: VaultItem; onEdit: () => void; onDelete: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const parsedCustomFields = React.useMemo(() => {
    if (!item.custom_fields) return [];
    try { return JSON.parse(item.custom_fields); } catch { return []; }
  }, [item.custom_fields]);

  return (
    <div className="max-w-3xl mx-auto w-full p-8 animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Key size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
              {item.label}
              {item.is_favorite === 1 && <Star size={20} className="text-yellow-500" fill="currentColor" />}
            </h1>
            {item.url && (
              <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline text-sm flex items-center gap-1 mt-1">
                {item.url} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">Editar</button>
          <button onClick={onDelete} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Credenciais Base */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-2">Credenciais</h3>
          
          {item.username && (
            <div className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs text-dark-subtext">Nome de Usuário</span>
                <span className="text-dark-text font-medium">{item.username}</span>
              </div>
              <button onClick={() => copyToClipboard(item.username!, 'username')} className="p-2 text-dark-subtext hover:text-white transition-colors">
                {copiedField === 'username' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {item.email && (
            <div className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs text-dark-subtext">E-mail</span>
                <span className="text-dark-text font-medium">{item.email}</span>
              </div>
              <button onClick={() => copyToClipboard(item.email!, 'email')} className="p-2 text-dark-subtext hover:text-white transition-colors">
                {copiedField === 'email' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {item.password && (
            <div className="group flex items-center justify-between p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 hover:bg-brand-500/10 transition-colors">
              <div className="flex flex-col flex-1">
                <span className="text-xs text-dark-subtext">Senha</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-dark-text font-mono text-lg tracking-wider">
                    {showPassword ? item.password : '••••••••••••'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-dark-subtext hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => copyToClipboard(item.password!, 'password')} className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/20">
                  {copiedField === 'password' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}
          
          {item.password && (
            <div className="mt-2">
              <VaultBreachBadge password={item.password} />
            </div>
          )}
        </div>

        {/* Campos Personalizados */}
        {parsedCustomFields.length > 0 && (
          <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-2">Campos Adicionais</h3>
            <div className="grid grid-cols-2 gap-4">
              {parsedCustomFields.map((field: any, idx: number) => (
                <div key={idx} className="flex flex-col p-3 rounded-xl bg-white/5">
                  <span className="text-xs text-dark-subtext">{field.key}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-dark-text truncate pr-2">
                      {field.type === 'hidden' && !showPassword ? '••••••••' : field.value}
                    </span>
                    <button onClick={() => copyToClipboard(field.value, `custom-${idx}`)} className="p-1 text-dark-subtext hover:text-white transition-colors">
                       {copiedField === `custom-${idx}` ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {item.notes && (
          <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-3">Anotações Seguras</h3>
            <div className="whitespace-pre-wrap text-sm text-dark-subtext/90 leading-relaxed font-mono bg-black/20 p-4 rounded-xl border border-white/5">
              {item.notes}
            </div>
          </div>
        )}

        {/* Histórico de Senhas */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-4 flex items-center gap-2">
            <History size={16} /> Histórico de Senhas
          </h3>
          <VaultPasswordHistory itemId={item.id} />
        </div>

      </div>
    </div>
  );
}

function VaultGroupItem({ g, selectedGroupId, viewMode, dragOverGroupId, onSelect, onContextMenu }: any) {

  return (
    <div 
      data-droppable-type="vault-group"
      data-droppable-id={g.id}
      onContextMenu={onContextMenu}
      className={`group w-full flex items-center justify-between px-2 py-1 transition-colors cursor-pointer ${selectedGroupId === g.id && viewMode === 'list' ? 'bg-brand-500/20 text-brand-400 border-r-2 border-brand-500' : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'} ${dragOverGroupId === g.id ? 'bg-brand-500/30 border border-dashed border-brand-500' : ''}`}
    >
      <div 
        className="flex items-center gap-2 flex-1 overflow-hidden px-2 py-1"
        onClick={onSelect}
      >
        <Folder size={16} style={{ color: g.color || undefined }} className="flex-shrink-0" />
        <span className="truncate text-sm">{g.name}</span>
      </div>
      <div className="flex flex-shrink-0 items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-dark-subtext/50 mr-1">
          <GripVertical size={14} />
        </span>
        <button 
          onClick={onContextMenu}
          className="p-1 hover:bg-white/10 rounded"
        >
          <MoreVertical size={14} />
        </button>
      </div>
    </div>
  );
}

function VaultItemRow({ item, selectedItem, onSelect }: any) {

  return (
    <div 
      onClick={onSelect}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-all group ${selectedItem?.id === item.id ? 'bg-brand-500/20 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.3)]' : 'hover:bg-white/5'}`}
    >
      <div className="w-10 h-10 rounded-full bg-dark-bg flex items-center justify-center flex-shrink-0 text-brand-400">
        <Key size={18} />
      </div>
      <div className="overflow-hidden flex-1">
        <div className="font-medium text-sm truncate text-dark-text">{item.label}</div>
        <div className="text-xs text-dark-subtext truncate">{item.username || item.email || 'Sem usuário'}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {item.is_favorite === 1 && <Star size={12} className="text-yellow-500 flex-shrink-0" fill="currentColor" />}
        <span className="text-dark-subtext/30 opacity-0 group-hover:opacity-100">
          <GripVertical size={12} />
        </span>
      </div>
    </div>
  );
}
