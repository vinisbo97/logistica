'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConfiguracoesPage() {
  const [configId, setConfigId] = useState(null);
  const [config, setConfig] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    carregarConfiguracao();
  }, []);

  async function carregarConfiguracao() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('configuracoes_empresa')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setConfigId(data.id);
        setConfig({
          nome_fantasia: data.nome_fantasia || '',
          razao_social: data.razao_social || '',
          cnpj: data.cnpj || '',
          email: data.email || '',
          telefone: data.telefone || '',
          endereco: data.endereco || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          cep: data.cep || '',
          logo_url: data.logo_url || ''
        });
        setLogoPreview(data.logo_url || '');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      let error;
      if (configId) {
        const res = await supabase
          .from('configuracoes_empresa')
          .update(config)
          .eq('id', configId);
        error = res.error;
      } else {
        const res = await supabase
          .from('configuracoes_empresa')
          .insert([config])
          .select()
          .single();
        if (res.data) setConfigId(res.data.id);
        error = res.error;
      }

      if (error) throw error;
      showMessage('success', 'Configurações salvas com sucesso! Recarregue a página para atualizar o menu.');
    } catch (error) {
      showMessage('error', 'Erro ao salvar configurações');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  function handleInputChange(field, value) {
    setConfig({ ...config, [field]: value });
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        setLogoPreview(base64);
        setConfig({ ...config, logo_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-slate-400 animate-pulse">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configurações da Empresa</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Personalize os dados e a logo que aparecerão no menu e nos orçamentos</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Logo da Empresa</h2>
            <div className="w-full aspect-square bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600 mb-4 shadow-inner">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
              ) : (
                <div className="text-slate-400 text-sm">Sem Logotipo</div>
              )}
            </div>
            <label className="cursor-pointer block">
              <div className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md">
                Selecionar Imagem
              </div>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Dados Cadastrais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Fantasia *</label>
                <input type="text" value={config.nome_fantasia} onChange={(e) => handleInputChange('nome_fantasia', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Razão Social</label>
                <input type="text" value={config.razao_social} onChange={(e) => handleInputChange('razao_social', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CNPJ</label>
                <input type="text" value={config.cnpj} onChange={(e) => handleInputChange('cnpj', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label>
                <input type="text" value={config.telefone} onChange={(e) => handleInputChange('telefone', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                <input type="email" value={config.email} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Localização</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço</label>
                <input type="text" value={config.endereco} onChange={(e) => handleInputChange('endereco', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CEP</label>
                <input type="text" value={config.cep} onChange={(e) => handleInputChange('cep', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cidade</label>
                <input type="text" value={config.cidade} onChange={(e) => handleInputChange('cidade', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Estado</label>
                <input type="text" value={config.estado} onChange={(e) => handleInputChange('estado', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md cursor-pointer"
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}