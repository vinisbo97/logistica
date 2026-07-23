'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    modelo: '',
    placa: '',
    data_ipva: '',
    data_licenciamento: '',
    ano: '',
    cor: '',
    tipo: 'Caminhão',
    capacidade_carga: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchVeiculos();
  }, []);

  async function fetchVeiculos() {
    try {
      const { data } = await supabase.from('veiculos').select('*').order('placa', { ascending: true });
      setVeiculos(data || []);
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    }
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.modelo.trim()) newErrors.modelo = 'Modelo é obrigatório';
    if (!formData.placa.trim()) newErrors.placa = 'Placa é obrigatória';
    if (!/^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(formData.placa.toUpperCase())) {
      newErrors.placa = 'Placa inválida (use ABC-1234 ou ABC1D23)';
    }
    if (!formData.data_ipva) newErrors.data_ipva = 'Data do IPVA é obrigatória';
    if (!formData.data_licenciamento) newErrors.data_licenciamento = 'Data do Licenciamento é obrigatória';
    return newErrors;
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  async function handleSave(e) {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('veiculos').update(formData).eq('id', editingId);
        if (error) throw error;
        showMessage('success', 'Veículo atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('veiculos').insert([formData]);
        if (error) throw error;
        showMessage('success', 'Veículo cadastrado com sucesso!');
      }
      resetForm();
      fetchVeiculos();
    } catch (error) {
      showMessage('error', 'Erro ao salvar veículo');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ modelo: '', placa: '', data_ipva: '', data_licenciamento: '', ano: '', cor: '', tipo: 'Caminhão', capacidade_carga: '' });
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(veiculo) {
    setFormData(veiculo);
    setEditingId(veiculo.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    try {
      const { error } = await supabase.from('veiculos').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Veículo excluído!');
      fetchVeiculos();
    } catch (error) {
      showMessage('error', 'Erro ao excluir veículo');
    }
  }

  const getStatusDocumentacao = (veiculo) => {
    const hoje = new Date();
    const ipva = veiculo.data_ipva ? new Date(veiculo.data_ipva) : null;
    const licenciamento = veiculo.data_licenciamento ? new Date(veiculo.data_licenciamento) : null;

    if (!ipva || !licenciamento) return { status: 'Incompleto', color: 'bg-rose-100 dark:bg-red-900 text-rose-800 dark:text-red-200' };
    if (ipva < hoje || licenciamento < hoje) return { status: 'Vencido', color: 'bg-rose-100 dark:bg-red-900 text-rose-800 dark:text-red-200' };
    
    const diasAteVencimento = Math.min(
      Math.ceil((ipva - hoje) / (1000 * 60 * 60 * 24)),
      Math.ceil((licenciamento - hoje) / (1000 * 60 * 60 * 24))
    );
    
    if (diasAteVencimento <= 30) return { status: 'Atenção', color: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200' };
    return { status: 'Ok', color: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestão de Frota</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Controle de veículos e documentação</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Novo Veículo
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{editingId ? 'Editar Veículo' : 'Novo Veículo'}</h2>
          
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Modelo *</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.modelo ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="Ex: Scania R440"
              />
              {errors.modelo && <p className="text-red-500 text-sm mt-1">{errors.modelo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Placa *</label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.placa ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="ABC-1234"
              />
              {errors.placa && <p className="text-red-500 text-sm mt-1">{errors.placa}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                <option value="Caminhão">Caminhão</option>
                <option value="Van">Van</option>
                <option value="Moto">Moto</option>
                <option value="Bicicleta">Bicicleta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ano</label>
              <input
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="2023"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cor</label>
              <input
                type="text"
                value={formData.cor}
                onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Branco"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Capacidade de Carga (kg)</label>
              <input
                type="number"
                value={formData.capacidade_carga}
                onChange={(e) => setFormData({ ...formData, capacidade_carga: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data IPVA *</label>
              <input
                type="date"
                value={formData.data_ipva}
                onChange={(e) => setFormData({ ...formData, data_ipva: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.data_ipva ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
              />
              {errors.data_ipva && <p className="text-red-500 text-sm mt-1">{errors.data_ipva}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Data Licenciamento *</label>
              <input
                type="date"
                value={formData.data_licenciamento}
                onChange={(e) => setFormData({ ...formData, data_licenciamento: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.data_licenciamento ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
              />
              {errors.data_licenciamento && <p className="text-red-500 text-sm mt-1">{errors.data_licenciamento}</p>}
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md"
              >
                {loading ? 'Salvando...' : editingId ? 'Atualizar Veículo' : 'Cadastrar Veículo'}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Veículo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Placa</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">IPVA</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Licenciamento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {veiculos.length > 0 ? (
                veiculos.map((veiculo) => {
                  const status = getStatusDocumentacao(veiculo);
                  return (
                    <tr key={veiculo.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{veiculo.modelo}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-300">{veiculo.placa}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{veiculo.tipo}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {veiculo.data_ipva ? new Date(veiculo.data_ipva).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {veiculo.data_licenciamento ? new Date(veiculo.data_licenciamento).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(veiculo)}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(veiculo.id)}
                          className="text-red-600 dark:text-red-400 hover:underline font-medium text-sm"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                    Nenhum veículo cadastrado. Clique em "Novo Veículo" para começar.
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