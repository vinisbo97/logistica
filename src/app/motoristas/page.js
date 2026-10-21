'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MotoristasPage() {
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busca, setBusca] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    cnh_numero: '',
    cnh_categoria: 'E',
    cnh_vencimento: '',
    tipo_vinculo: 'Frota Própria',
    comissao_percentual: '12',
    status: 'Disponível',
    observacoes: ''
  });

  useEffect(() => {
    fetchMotoristas();
  }, []);

  async function fetchMotoristas() {
    try {
      const { data, error } = await supabase.from('motoristas').select('*').order('nome', { ascending: true });
      if (!error && data) {
        setMotoristas(data);
      } else {
        // Fallback local caso a tabela ainda esteja sendo criada
        const local = JSON.parse(localStorage.getItem('pslog_motoristas') || '[]');
        setMotoristas(local);
      }
    } catch (err) {
      console.error('Erro ao buscar motoristas:', err);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  function resetForm() {
    setFormData({
      nome: '',
      cpf: '',
      telefone: '',
      cnh_numero: '',
      cnh_categoria: 'E',
      cnh_vencimento: '',
      tipo_vinculo: 'Frota Própria',
      comissao_percentual: '12',
      status: 'Disponível',
      observacoes: ''
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.nome.trim()) {
      showMessage('error', 'O nome do motorista é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        comissao_percentual: parseFloat(formData.comissao_percentual || 0)
      };

      const { error } = editingId
        ? await supabase.from('motoristas').update(payload).eq('id', editingId)
        : await supabase.from('motoristas').insert([payload]);

      if (error) {
        // Fallback em localStorage caso a tabela ainda não exista
        const atuais = [...motoristas];
        if (editingId) {
          const idx = atuais.findIndex((m) => m.id === editingId);
          if (idx >= 0) atuais[idx] = { ...payload, id: editingId };
        } else {
          atuais.push({ ...payload, id: Date.now() });
        }
        localStorage.setItem('pslog_motoristas', JSON.stringify(atuais));
        setMotoristas(atuais);
      } else {
        fetchMotoristas();
      }

      showMessage('success', editingId ? 'Motorista atualizado com sucesso!' : 'Motorista cadastrado com sucesso!');
      resetForm();
    } catch (err) {
      showMessage('error', 'Erro ao salvar motorista.');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(m) {
    setFormData({
      nome: m.nome || '',
      cpf: m.cpf || '',
      telefone: m.telefone || '',
      cnh_numero: m.cnh_numero || '',
      cnh_categoria: m.cnh_categoria || 'E',
      cnh_vencimento: m.cnh_vencimento || '',
      tipo_vinculo: m.tipo_vinculo || 'Frota Própria',
      comissao_percentual: String(m.comissao_percentual ?? 12),
      status: m.status || 'Disponível',
      observacoes: m.observacoes || ''
    });
    setEditingId(m.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este motorista do cadastro?')) return;
    try {
      const { error } = await supabase.from('motoristas').delete().eq('id', id);
      if (error) {
        const novos = motoristas.filter((m) => m.id !== id);
        localStorage.setItem('pslog_motoristas', JSON.stringify(novos));
        setMotoristas(novos);
      } else {
        fetchMotoristas();
      }
      showMessage('success', 'Motorista removido!');
    } catch (err) {
      showMessage('error', 'Erro ao remover motorista.');
    }
  }

  function statusCNH(dataVenc) {
    if (!dataVenc) return { texto: 'Não informada', cor: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
    const hoje = new Date();
    const venc = new Date(dataVenc);
    const dias = Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: 'CNH Vencida', cor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' };
    if (dias <= 30) return { texto: `Vence em ${dias}d`, cor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
    return { texto: 'CNH Regular', cor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' };
  }

  const filtrados = motoristas.filter((m) => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return (
      (m.nome || '').toLowerCase().includes(t) ||
      (m.cpf || '').toLowerCase().includes(t) ||
      (m.tipo_vinculo || '').toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Motoristas & Agregados
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Controle de prontuário, validade de CNH, comissões de viagem e disponibilidade operacional.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          + Cadastrar Motorista
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'}`}>
          {message.text}
        </div>
      )}

      {/* INDICADORES DE MOTORISTAS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-slate-400">Total Cadastrados</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{motoristas.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-emerald-500">Disponíveis para Escala</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {motoristas.filter((m) => m.status === 'Disponível').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-blue-500">Em Viagem / Rota</p>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {motoristas.filter((m) => m.status === 'Em Viagem').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-purple-500">Frota Própria vs Agregados</p>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
            {motoristas.filter((m) => m.tipo_vinculo === 'Frota Própria').length} Próprios / {motoristas.filter((m) => m.tipo_vinculo !== 'Frota Própria').length} Agregados
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">
            {editingId ? 'Editar Prontuário de Motorista' : 'Novo Cadastro de Motorista'}
          </h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Marcos Roberto da Silva"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
              <input
                type="text"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Registro CNH</label>
              <input
                type="text"
                value={formData.cnh_numero}
                onChange={(e) => setFormData({ ...formData, cnh_numero: e.target.value })}
                placeholder="00000000000"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria CNH</label>
              <select
                value={formData.cnh_categoria}
                onChange={(e) => setFormData({ ...formData, cnh_categoria: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="E">Categoria E (Carreta / Articulado)</option>
                <option value="D">Categoria D (Caminhão / Pesados)</option>
                <option value="C">Categoria C (Carga / Caminhão)</option>
                <option value="B">Categoria B (Utilitário / Van)</option>
                <option value="AB">Categoria AB (Moto / Utilitário)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento da CNH *</label>
              <input
                type="date"
                required
                value={formData.cnh_vencimento}
                onChange={(e) => setFormData({ ...formData, cnh_vencimento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vínculo Contratual</label>
              <select
                value={formData.tipo_vinculo}
                onChange={(e) => setFormData({ ...formData, tipo_vinculo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="Frota Própria">CLT / Frota Própria</option>
                <option value="Agregado">Motorista Agregado Fixo</option>
                <option value="Autônomo / TAC">Terceiro / TAC Autônomo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Comissão Padrão (%)</label>
              <input
                type="number"
                step="0.5"
                value={formData.comissao_percentual}
                onChange={(e) => setFormData({ ...formData, comissao_percentual: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Operacional</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="Disponível">Disponível para Viagem</option>
                <option value="Em Viagem">Em Viagem / Em Rota</option>
                <option value="Folga / Férias">Folga / Férias / Afastado</option>
              </select>
            </div>

            <div className="md:col-span-3 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm cursor-pointer"
              >
                {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABELA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar motorista por nome, CPF ou vínculo..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <th className="p-3.5">Motorista</th>
                <th className="p-3.5">Contato / CPF</th>
                <th className="p-3.5">Habilitação (CNH)</th>
                <th className="p-3.5">Vínculo / Comissão</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filtrados.length > 0 ? (
                filtrados.map((m) => {
                  const cnh = statusCNH(m.cnh_vencimento);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{m.nome}</td>
                      <td className="p-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div>{m.telefone || '-'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{m.cpf || ''}</div>
                      </td>
                      <td className="p-3.5 text-xs">
                        <span className="font-bold mr-2">Cat. {m.cnh_categoria || 'E'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cnh.cor}`}>
                          {cnh.texto}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.tipo_vinculo}</span>
                        <span className="block text-[11px] text-slate-400">Comissão: {m.comissao_percentual || 10}%</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          m.status === 'Disponível'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : m.status === 'Em Viagem'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {m.status || 'Disponível'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-3">
                        <button onClick={() => handleEdit(m)} className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline cursor-pointer">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-rose-600 dark:text-rose-400 text-xs font-bold hover:underline cursor-pointer">
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhum motorista cadastrado. Clique em "+ Cadastrar Motorista" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
