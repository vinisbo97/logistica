'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('frota'); // 'frota' | 'manutencao'
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showManutForm, setShowManutForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const hojeISO = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    modelo: '',
    placa: '',
    data_ipva: '',
    data_licenciamento: '',
    ano: '',
    cor: '',
    tipo: 'Caminhão',
    capacidade_carga: '',
    km_atual: ''
  });

  const [manutData, setManutData] = useState({
    veiculo_placa: '',
    tipo_registro: 'Abastecimento',
    descricao: '',
    km_registro: '',
    litros: '',
    valor: '',
    fornecedor: '',
    data: hojeISO,
    gerar_contas_pagar: true
  });

  useEffect(() => {
    carregarFrota();
  }, []);

  async function carregarFrota() {
    try {
      const [{ data: vei }, { data: man }] = await Promise.all([
        supabase.from('veiculos').select('*').order('placa', { ascending: true }),
        supabase.from('manutencoes_frota').select('*').order('id', { ascending: false })
      ]);
      setVeiculos(vei || []);
      setManutencoes(man || []);
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  function resetForm() {
    setFormData({
      modelo: '',
      placa: '',
      data_ipva: '',
      data_licenciamento: '',
      ano: '',
      cor: '',
      tipo: 'Caminhão',
      capacidade_carga: '',
      km_atual: ''
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSaveVeiculo(e) {
    e.preventDefault();
    if (!formData.modelo.trim() || !formData.placa.trim()) {
      showMessage('error', 'Informe o modelo e a placa do veículo.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        placa: formData.placa.toUpperCase().trim(),
        km_atual: parseFloat(formData.km_atual || 0)
      };

      let res = editingId
        ? await supabase.from('veiculos').update(payload).eq('id', editingId)
        : await supabase.from('veiculos').insert([payload]);

      if (res.error) {
        const { km_atual, ...basico } = payload;
        res = editingId
          ? await supabase.from('veiculos').update(basico).eq('id', editingId)
          : await supabase.from('veiculos').insert([basico]);
      }

      if (res.error) throw res.error;
      showMessage('success', editingId ? 'Veículo atualizado!' : 'Veículo cadastrado na frota!');
      resetForm();
      carregarFrota();
    } catch (err) {
      showMessage('error', 'Erro ao salvar veículo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveManutencao(e) {
    e.preventDefault();
    if (!manutData.veiculo_placa || !manutData.descricao || !manutData.valor) {
      showMessage('error', 'Selecione a placa, descrição e valor.');
      return;
    }

    setLoading(true);
    try {
      const vObj = veiculos.find((v) => v.placa === manutData.veiculo_placa);
      const payload = {
        veiculo_placa: manutData.veiculo_placa,
        veiculo_modelo: vObj?.modelo || '',
        tipo_registro: manutData.tipo_registro,
        descricao: manutData.descricao,
        km_registro: parseFloat(manutData.km_registro || 0),
        litros: parseFloat(manutData.litros || 0),
        valor: parseFloat(manutData.valor || 0),
        fornecedor: manutData.fornecedor,
        data: manutData.data || hojeISO,
        status: 'Concluído'
      };

      await supabase.from('manutencoes_frota').insert([payload]);

      // Atualiza KM do veículo se for maior
      if (vObj && Number(manutData.km_registro) > Number(vObj.km_atual || 0)) {
        await supabase.from('veiculos').update({ km_atual: parseFloat(manutData.km_registro) }).eq('id', vObj.id);
      }

      // Gera automaticamente no Contas a Pagar se marcado
      if (manutData.gerar_contas_pagar) {
        await supabase.from('financeiro').insert([{
          descricao: `[${manutData.tipo_registro}] ${manutData.descricao} - Placa ${manutData.veiculo_placa}`,
          categoria: manutData.tipo_registro === 'Abastecimento' ? 'Combustível' : 'Manutenção',
          tipo: 'Saída',
          valor: parseFloat(manutData.valor || 0),
          data: manutData.data || hojeISO,
          data_vencimento: manutData.data || hojeISO,
          status_pagamento: 'Pago',
          forma_pagamento: 'Cartão Frota',
          entidade_nome: manutData.fornecedor || 'Fornecedor de Frota',
          veiculo_placa: manutData.veiculo_placa
        }]);
      }

      showMessage('success', 'Registro salvo e integrado ao Contas a Pagar!');
      setShowManutForm(false);
      setManutData({
        veiculo_placa: '',
        tipo_registro: 'Abastecimento',
        descricao: '',
        km_registro: '',
        litros: '',
        valor: '',
        fornecedor: '',
        data: hojeISO,
        gerar_contas_pagar: true
      });
      carregarFrota();
    } catch (err) {
      showMessage('error', 'Erro ao registrar ocorrência de frota.');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(veiculo) {
    setFormData({
      modelo: veiculo.modelo || '',
      placa: veiculo.placa || '',
      data_ipva: veiculo.data_ipva || '',
      data_licenciamento: veiculo.data_licenciamento || '',
      ano: veiculo.ano || '',
      cor: veiculo.cor || '',
      tipo: veiculo.tipo || 'Caminhão',
      capacidade_carga: veiculo.capacidade_carga || '',
      km_atual: veiculo.km_atual || ''
    });
    setEditingId(veiculo.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este veículo?')) return;
    try {
      const { error } = await supabase.from('veiculos').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Veículo excluído!');
      carregarFrota();
    } catch (error) {
      showMessage('error', 'Erro ao excluir veículo');
    }
  }

  const getStatusDocumentacao = (veiculo) => {
    const hoje = new Date();
    const ipva = veiculo.data_ipva ? new Date(veiculo.data_ipva) : null;
    const licenciamento = veiculo.data_licenciamento ? new Date(veiculo.data_licenciamento) : null;

    if (!ipva || !licenciamento) return { status: 'Doc Pendente', color: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' };
    if (ipva < hoje || licenciamento < hoje) return { status: 'Doc Vencido', color: 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' };

    const diasAteVencimento = Math.min(
      Math.ceil((ipva - hoje) / (1000 * 60 * 60 * 24)),
      Math.ceil((licenciamento - hoje) / (1000 * 60 * 60 * 24))
    );

    if (diasAteVencimento <= 30) return { status: `Vence em ${diasAteVencimento}d`, color: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' };
    return { status: 'Regular / OK', color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' };
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Frota, Abastecimento & Ordens de Oficina
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Controle de documentação (IPVA/Licenciamento), hodômetro (KM), consumo de diesel e manutenções.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
              setShowManutForm(false);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            + Novo Veículo
          </button>
          <button
            onClick={() => {
              setShowManutForm(true);
              setShowForm(false);
            }}
            className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            ⛽ Lançar Abastecimento / Oficina
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* FORMULÁRIO DE ABASTECIMENTO / MANUTENÇÃO */}
      {showManutForm && (
        <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Registrar Abastecimento ou Ordem de Serviço (Oficina)
          </h2>
          <form onSubmit={handleSaveManutencao} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Veículo (Placa) *</label>
              <select
                required
                value={manutData.veiculo_placa}
                onChange={(e) => setManutData({ ...manutData, veiculo_placa: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              >
                <option value="">Selecione o veículo...</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.placa}>{v.placa} — {v.modelo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Ocorrência *</label>
              <select
                value={manutData.tipo_registro}
                onChange={(e) => setManutData({ ...manutData, tipo_registro: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              >
                <option value="Abastecimento">Abastecimento (Diesel / Combustível)</option>
                <option value="Manutenção Preventiva">Manutenção Preventiva (Óleo/Filtros/Revisão)</option>
                <option value="Manutenção Corretiva">Manutenção Corretiva (Oficina/Socorro)</option>
                <option value="Pneus / Borracharia">Pneus / Recapagem / Alinhamento</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Valor Total (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={manutData.valor}
                onChange={(e) => setManutData({ ...manutData, valor: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Descrição do Serviço / Abastecimento *</label>
              <input
                type="text"
                required
                value={manutData.descricao}
                onChange={(e) => setManutData({ ...manutData, descricao: e.target.value })}
                placeholder="Ex: 310L Diesel S10 / Troca de pastilhas de freio e óleo motor"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Posto / Oficina Fornecedora</label>
              <input
                type="text"
                value={manutData.fornecedor}
                onChange={(e) => setManutData({ ...manutData, fornecedor: e.target.value })}
                placeholder="Ex: Posto Graal / Oficina Diesel"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Hodômetro Atual (KM)</label>
              <input
                type="number"
                value={manutData.km_registro}
                onChange={(e) => setManutData({ ...manutData, km_registro: e.target.value })}
                placeholder="Ex: 85400"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Litros Abastecidos (se aplicável)</label>
              <input
                type="number"
                step="0.1"
                value={manutData.litros}
                onChange={(e) => setManutData({ ...manutData, litros: e.target.value })}
                placeholder="Ex: 300"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manutData.gerar_contas_pagar}
                  onChange={(e) => setManutData({ ...manutData, gerar_contas_pagar: e.target.checked })}
                  className="w-4 h-4"
                />
                Lançar despesa automaticamente no Financeiro
              </label>
            </div>

            <div className="md:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-bold text-sm cursor-pointer">
                {loading ? 'Salvando...' : 'Confirmar Registro de Frota'}
              </button>
              <button type="button" onClick={() => setShowManutForm(false)} className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO DE VEÍCULO */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{editingId ? 'Editar Veículo' : 'Novo Veículo'}</h2>
          <form onSubmit={handleSaveVeiculo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo / Marca *</label>
              <input
                type="text"
                required
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                placeholder="Ex: Scania R450 6x2"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Placa (Mercosul/Antiga) *</label>
              <input
                type="text"
                required
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white"
                placeholder="BRA2E19"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="Caminhão">Caminhão / Carreta</option>
                <option value="Van">Van / VUC</option>
                <option value="Moto">Moto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hodômetro Atual (KM)</label>
              <input
                type="number"
                value={formData.km_atual}
                onChange={(e) => setFormData({ ...formData, km_atual: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                placeholder="84500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Capacidade Carga (kg)</label>
              <input
                type="number"
                value={formData.capacidade_carga}
                onChange={(e) => setFormData({ ...formData, capacidade_carga: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                placeholder="32000"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ano / Cor</label>
              <input
                type="text"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                placeholder="2024"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento IPVA *</label>
              <input
                type="date"
                required
                value={formData.data_ipva}
                onChange={(e) => setFormData({ ...formData, data_ipva: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimento Licenciamento *</label>
              <input
                type="date"
                required
                value={formData.data_licenciamento}
                onChange={(e) => setFormData({ ...formData, data_licenciamento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex gap-3 items-end">
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-sm cursor-pointer">
                {loading ? 'Salvando...' : 'Salvar Veículo'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABAS DE FROTA E HISTÓRICO DE MANUTENÇÃO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setAbaAtiva('frota')}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${abaAtiva === 'frota' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            🚛 Veículos Cadastrados ({veiculos.length})
          </button>
          <button
            onClick={() => setAbaAtiva('manutencao')}
            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${abaAtiva === 'manutencao' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            ⛽ Histórico de Abastecimentos & Oficina ({manutencoes.length})
          </button>
        </div>

        {abaAtiva === 'frota' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3.5">Veículo</th>
                  <th className="p-3.5">Placa</th>
                  <th className="p-3.5">Tipo / Capacidade</th>
                  <th className="p-3.5">Hodômetro</th>
                  <th className="p-3.5">IPVA / Licenciamento</th>
                  <th className="p-3.5">Status Doc</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {veiculos.map((v) => {
                  const status = getStatusDocumentacao(v);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{v.modelo}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{v.placa}</td>
                      <td className="p-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {v.tipo} {v.capacidade_carga ? `(${Number(v.capacidade_carga).toLocaleString('pt-BR')} kg)` : ''}
                      </td>
                      <td className="p-3.5 text-xs font-semibold">
                        {v.km_atual ? `${Number(v.km_atual).toLocaleString('pt-BR')} km` : '-'}
                      </td>
                      <td className="p-3.5 text-xs text-slate-500">
                        IPVA: {v.data_ipva ? new Date(v.data_ipva).toLocaleDateString('pt-BR') : '-'} <br />
                        Lic.: {v.data_licenciamento ? new Date(v.data_licenciamento).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                          {status.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button onClick={() => handleEdit(v)} className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline cursor-pointer">Editar</button>
                        <button onClick={() => handleDelete(v.id)} className="text-rose-600 dark:text-rose-400 text-xs font-bold hover:underline cursor-pointer">Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5">Placa</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Descrição / Fornecedor</th>
                  <th className="p-3.5">KM / Litros</th>
                  <th className="p-3.5 text-right">Custo Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {manutencoes.length > 0 ? (
                  manutencoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 text-xs">{m.data ? new Date(m.data).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{m.veiculo_placa}</td>
                      <td className="p-3.5 text-xs font-bold">{m.tipo_registro}</td>
                      <td className="p-3.5 text-xs">
                        <div className="font-semibold text-slate-900 dark:text-white">{m.descricao}</div>
                        <div className="text-slate-400">{m.fornecedor || ''}</div>
                      </td>
                      <td className="p-3.5 text-xs">
                        {m.km_registro ? `${Number(m.km_registro).toLocaleString('pt-BR')} km` : '-'}
                        {Number(m.litros) > 0 ? ` • ${m.litros}L` : ''}
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-rose-600 dark:text-rose-400">
                        R$ {Number(m.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Nenhum registro de abastecimento ou manutenção lançado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
