'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EntregasPage() {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    fetchEntregas();
  }, []);

  async function fetchEntregas() {
    try {
      const { data } = await supabase
        .from('cotacoes')
        .select('*')
        .eq('status', 'Aprovada')
        .order('id', { ascending: false });
      setEntregas(data || []);
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  async function updateStatusEntrega(id, novoStatus) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update({ status_entrega: novoStatus })
        .eq('id', id);
      
      if (error) throw error;
      showMessage('success', 'Status da entrega atualizado!');
      fetchEntregas();
    } catch (error) {
      showMessage('error', 'Erro ao atualizar status.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Coletado':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'Em Trânsito':
        return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
      case 'Entregue':
        return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';
      case 'Problema':
        return 'bg-rose-100 dark:bg-red-900 text-rose-800 dark:text-red-200';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
    }
  };

  const filtered = filter === 'Todos' 
    ? entregas 
    : entregas.filter(e => (e.status_entrega || 'Coletado') === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Controle de Entregas</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe o status das entregas aprovadas</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total</p>
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-lg">📦</div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{entregas.length}</h3>
          <p className="text-xs text-slate-400 mt-2">Entregas aprovadas</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Em Trânsito</p>
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-lg">🚛</div>
          </div>
          <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {entregas.filter(e => (e.status_entrega || 'Coletado') === 'Em Trânsito').length}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Em rota</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Entregues</p>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-lg">✅</div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {entregas.filter(e => (e.status_entrega || 'Coletado') === 'Entregue').length}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Concluídas</p>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Problemas</p>
            <div className="w-10 h-10 bg-rose-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-lg">⚠️</div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600 dark:text-red-400">
            {entregas.filter(e => (e.status_entrega || 'Coletado') === 'Problema').length}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Com problemas</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm dark:shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white">Entregas Aprovadas</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="Todos">Todos</option>
            <option value="Coletado">Coletado</option>
            <option value="Em Trânsito">Em Trânsito</option>
            <option value="Entregue">Entregue</option>
            <option value="Problema">Problema</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Rota</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Veículo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.length > 0 ? (
                filtered.map((entrega) => {
                  const statusAtual = entrega.status_entrega || 'Coletado';
                  return (
                    <tr key={entrega.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{entrega.cliente}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {entrega.origem || '-'} → {entrega.destino || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{entrega.tipo_veiculo}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        R$ {entrega.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(statusAtual)}`}>
                          {statusAtual}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {statusAtual !== 'Entregue' && statusAtual !== 'Problema' && (
                            <>
                              {statusAtual === 'Coletado' && (
                                <button
                                  onClick={() => updateStatusEntrega(entrega.id, 'Em Trânsito')}
                                  disabled={loading}
                                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium text-sm disabled:opacity-50"
                                >
                                  Iniciar Rota
                                </button>
                              )}
                              {statusAtual === 'Em Trânsito' && (
                                <button
                                  onClick={() => updateStatusEntrega(entrega.id, 'Entregue')}
                                  disabled={loading}
                                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium text-sm disabled:opacity-50"
                                >
                                  Confirmar Entrega
                                </button>
                              )}
                              <button
                                onClick={() => updateStatusEntrega(entrega.id, 'Problema')}
                                disabled={loading}
                                className="text-rose-600 dark:text-red-400 hover:underline font-medium text-sm disabled:opacity-50"
                              >
                                Problema
                              </button>
                            </>
                          )}
                          {statusAtual === 'Problema' && (
                            <button
                              onClick={() => updateStatusEntrega(entrega.id, 'Coletado')}
                              disabled={loading}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm disabled:opacity-50"
                            >
                              Reiniciar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    Nenhuma entrega encontrada com este filtro.
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