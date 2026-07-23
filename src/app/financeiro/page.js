'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('Todos');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    descricao: '',
    categoria: 'Frete',
    tipo: 'Entrada',
    valor: '',
    data: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchFinanceiro();
  }, []);

  async function fetchFinanceiro() {
    try {
      const { data } = await supabase.from('financeiro').select('*').order('data', { ascending: false });
      setLancamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar financeiro:', error);
    }
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória';
    if (!formData.valor || parseFloat(formData.valor) <= 0) newErrors.valor = 'Valor deve ser maior que 0';
    return newErrors;
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  async function handleAdd(e) {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('financeiro').insert([{
        ...formData,
        valor: parseFloat(formData.valor)
      }]);
      
      if (error) throw error;
      showMessage('success', 'Lançamento registrado com sucesso!');
      resetForm();
      fetchFinanceiro();
    } catch (error) {
      showMessage('error', 'Erro ao registrar lançamento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      descricao: '',
      categoria: 'Frete',
      tipo: 'Entrada',
      valor: '',
      data: new Date().toISOString().split('T')[0]
    });
    setErrors({});
    setShowForm(false);
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
    
    try {
      const { error } = await supabase.from('financeiro').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Lançamento excluído!');
      fetchFinanceiro();
    } catch (error) {
      showMessage('error', 'Erro ao excluir lançamento');
    }
  }

  const filtered = filter === 'Todos' ? lancamentos : lancamentos.filter(l => l.tipo === filter);
  const totalEntrada = lancamentos.filter(l => l.tipo === 'Entrada').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaida = lancamentos.filter(l => l.tipo === 'Saída').reduce((acc, curr) => acc + curr.valor, 0);
  const saldo = totalEntrada - totalSaida;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Financeiro</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Controle de entradas e saídas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Novo Lançamento
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Entradas</p>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <span className="text-lg">📈</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            R$ {totalEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Total de entradas</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Saídas</p>
            <div className="w-10 h-10 bg-rose-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <span className="text-lg">📉</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600 dark:text-red-400">
            R$ {totalSaida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Total de saídas</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Saldo Líquido</p>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${saldo >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-rose-100 dark:bg-red-900/30'}`}>
              <span className="text-lg">💰</span>
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-red-400'}`}>
            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-2">{saldo >= 0 ? 'Situação positiva' : 'Situação negativa'}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Novo Lançamento</h2>
          
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Descrição *</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.descricao ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="Ex: Combustível, Manutenção, Frete..."
              />
              {errors.descricao && <p className="text-red-500 text-sm mt-1">{errors.descricao}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo *</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                <option value="Entrada">Entrada</option>
                <option value="Saída">Saída</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Categoria</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                <option value="Frete">Frete</option>
                <option value="Combustível">Combustível</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Salário">Salário</option>
                <option value="Aluguel">Aluguel</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.valor ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="0.00"
              />
              {errors.valor && <p className="text-red-500 text-sm mt-1">{errors.valor}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md"
              >
                {loading ? 'Salvando...' : 'Registrar Lançamento'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm dark:shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white">Extrato</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="Todos">Todos</option>
            <option value="Entrada">Entradas</option>
            <option value="Saída">Saídas</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.length > 0 ? (
                filtered.map((lancamento) => (
                  <tr key={lancamento.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {new Date(lancamento.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{lancamento.descricao}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{lancamento.categoria}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${lancamento.tipo === 'Entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-red-400'}`}>
                      {lancamento.tipo === 'Entrada' ? '+' : '-'} R$ {lancamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(lancamento.id)}
                        className="text-red-600 dark:text-red-400 hover:underline font-medium text-sm"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">
                    Nenhum lançamento registrado.
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