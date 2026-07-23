'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    cidade: '',
    estado: '',
    endereco: '',
    contato_principal: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchClientes();
  }, []);

  async function fetchClientes() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      showMessage('error', 'Erro ao carregar clientes');
      console.error(error);
    }
  }

  function validateForm() {
    const newErrors = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (formData.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{11}$/.test(formData.cnpj.replace(/\D/g, ''))) {
      newErrors.cnpj = 'CNPJ/CPF inválido';
    }
    return newErrors;
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        showMessage('success', 'Cliente atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([formData]);
        if (error) throw error;
        showMessage('success', 'Cliente cadastrado com sucesso!');
      }
      
      resetForm();
      fetchClientes();
    } catch (error) {
      showMessage('error', 'Erro ao salvar cliente');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      nome: '',
      cnpj: '',
      email: '',
      telefone: '',
      cidade: '',
      estado: '',
      endereco: '',
      contato_principal: ''
    });
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  }

  function handleEdit(cliente) {
    setFormData(cliente);
    setEditingId(cliente.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Cliente excluído com sucesso!');
      fetchClientes();
    } catch (error) {
      showMessage('error', 'Erro ao excluir cliente');
      console.error(error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestão de Clientes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Cadastro e manutenção de parceiros logísticos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Novo Cliente
        </button>
      </div>

      {/* Mensagens */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome / Razão Social *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.nome ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="Digite o nome ou razão social"
              />
              {errors.nome && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.nome}</p>}
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">CNPJ / CPF</label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.cnpj ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="00.000.000/0000-00"
              />
              {errors.cnpj && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.cnpj}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full bg-white dark:bg-slate-700 border rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.email}</p>}
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="(11) 99999-9999"
              />
            </div>

            {/* Contato Principal */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Contato Principal</label>
              <input
                type="text"
                value={formData.contato_principal}
                onChange={(e) => setFormData({ ...formData, contato_principal: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Nome do contato"
              />
            </div>

            {/* Endereço */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Endereço</label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Rua, número, complemento"
              />
            </div>

            {/* Cidade e Estado */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cidade</label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="São Paulo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estado</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              >
                <option value="">Selecione</option>
                <option value="SP">SP</option>
                <option value="RJ">RJ</option>
                <option value="MG">MG</option>
                <option value="BA">BA</option>
                <option value="SC">SC</option>
                <option value="RS">RS</option>
                <option value="PR">PR</option>
                <option value="PE">PE</option>
                <option value="CE">CE</option>
                <option value="PA">PA</option>
              </select>
            </div>

            {/* Botões */}
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-md"
              >
                {loading ? 'Salvando...' : editingId ? 'Atualizar Cliente' : 'Cadastrar Cliente'}
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

      {/* Tabela de Clientes */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm dark:shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">CNPJ/CPF</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Telefone</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Cidade</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {clientes.length > 0 ? (
                clientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{cliente.nome}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{cliente.cnpj || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{cliente.email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{cliente.telefone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{cliente.cidade || '-'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(cliente)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium text-sm"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
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