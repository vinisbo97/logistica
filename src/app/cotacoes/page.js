'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busca, setBusca] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const hojeISO = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    codigo_rastreio: '',
    cliente: '',
    cliente_id: '',
    origem: '',
    destino: '',
    tipo_veiculo: 'Caminhão',
    peso_estimado: '',
    distancia_km: '',
    valor: '',
    custo_combustivel: '',
    custo_pedagio: '',
    custo_motorista: '',
    motorista_nome: '',
    veiculo_placa: '',
    nota_fiscal: '',
    previsao_entrega: '',
    descricao: '',
    status: 'Pendente'
  });

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      const [
        { data: cot },
        { data: cli },
        { data: mot },
        { data: vei },
        { data: emp }
      ] = await Promise.all([
        supabase.from('cotacoes').select('*').order('id', { ascending: false }),
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('motoristas').select('id, nome').order('nome'),
        supabase.from('veiculos').select('id, placa, modelo').order('placa'),
        supabase.from('configuracoes_empresa').select('*').maybeSingle()
      ]);
      setCotacoes(cot || []);
      setClientes(cli || []);
      setMotoristas(mot || []);
      setVeiculos(vei || []);
      setEmpresa(emp || null);
    } catch (error) {
      console.error(error);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  function resetForm() {
    setFormData({
      codigo_rastreio: `PS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      cliente: '',
      cliente_id: '',
      origem: '',
      destino: '',
      tipo_veiculo: 'Caminhão',
      peso_estimado: '',
      distancia_km: '',
      valor: '',
      custo_combustivel: '',
      custo_pedagio: '',
      custo_motorista: '',
      motorista_nome: '',
      veiculo_placa: '',
      nota_fiscal: '',
      previsao_entrega: '',
      descricao: '',
      status: 'Pendente'
    });
    setEditingId(null);
    setShowForm(false);
  }

  function calcularFreteSugerido() {
    const km = parseFloat(formData.distancia_km || 0);
    if (!km || km <= 0) {
      showMessage('error', 'Informe a distância (KM) para calcular os custos estimados.');
      return;
    }
    const dieselPorKm = formData.tipo_veiculo === 'Caminhão' ? 3.1 : formData.tipo_veiculo === 'Van' ? 1.45 : 0.45;
    const pedagioPorKm = formData.tipo_veiculo === 'Caminhão' ? 0.65 : 0.25;
    const comb = Math.round(km * dieselPorKm);
    const ped = Math.round(km * pedagioPorKm);
    const freteSugerido = Math.round((comb + ped) * 2.4);
    const comissaoMot = Math.round(freteSugerido * 0.12);

    setFormData({
      ...formData,
      custo_combustivel: String(comb),
      custo_pedagio: String(ped),
      custo_motorista: String(comissaoMot),
      valor: formData.valor || String(freteSugerido)
    });
    showMessage('success', 'Custos de rota e tarifa sugerida calculados automaticamente pela quilometragem!');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if ((!formData.cliente_id && !formData.cliente) || !formData.valor) {
      showMessage('error', 'Selecione o cliente e informe o valor do frete.');
      return;
    }

    setLoading(true);
    try {
      const clienteSelecionado = clientes.find((c) => String(c.id) === String(formData.cliente_id));
      const codigo = formData.codigo_rastreio || `PS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const dataToSave = {
        codigo_rastreio: codigo,
        cliente: clienteSelecionado?.nome || formData.cliente,
        cliente_id: formData.cliente_id ? parseInt(formData.cliente_id, 10) : null,
        origem: formData.origem,
        destino: formData.destino,
        tipo_veiculo: formData.tipo_veiculo,
        peso_estimado: formData.peso_estimado,
        distancia_km: parseFloat(formData.distancia_km || 0),
        valor: parseFloat(formData.valor || 0),
        custo_combustivel: parseFloat(formData.custo_combustivel || 0),
        custo_pedagio: parseFloat(formData.custo_pedagio || 0),
        custo_motorista: parseFloat(formData.custo_motorista || 0),
        motorista_nome: formData.motorista_nome,
        veiculo_placa: formData.veiculo_placa,
        nota_fiscal: formData.nota_fiscal,
        previsao_entrega: formData.previsao_entrega || null,
        descricao: formData.descricao,
        status: formData.status
      };

      let res = editingId
        ? await supabase.from('cotacoes').update(dataToSave).eq('id', editingId)
        : await supabase.from('cotacoes').insert([dataToSave]);

      if (res.error) {
        const basico = {
          cliente: dataToSave.cliente,
          cliente_id: dataToSave.cliente_id,
          origem: dataToSave.origem,
          destino: dataToSave.destino,
          tipo_veiculo: dataToSave.tipo_veiculo,
          peso_estimado: dataToSave.peso_estimado,
          valor: dataToSave.valor,
          descricao: dataToSave.descricao,
          status: dataToSave.status
        };
        res = editingId
          ? await supabase.from('cotacoes').update(basico).eq('id', editingId)
          : await supabase.from('cotacoes').insert([basico]);
      }

      if (res.error) throw res.error;
      showMessage('success', editingId ? 'Cotação atualizada!' : 'Cotação registrada com sucesso!');
      resetForm();
      carregarTudo();
    } catch (error) {
      showMessage('error', 'Erro ao salvar cotação.');
    } finally {
      setLoading(false);
    }
  }

  function handleEditar(c) {
    setEditingId(c.id);
    setFormData({
      codigo_rastreio: c.codigo_rastreio || `PS-2026-${c.id}`,
      cliente: c.cliente || '',
      cliente_id: c.cliente_id || '',
      origem: c.origem || '',
      destino: c.destino || '',
      tipo_veiculo: c.tipo_veiculo || 'Caminhão',
      peso_estimado: c.peso_estimado || '',
      distancia_km: c.distancia_km || '',
      valor: c.valor || '',
      custo_combustivel: c.custo_combustivel || '',
      custo_pedagio: c.custo_pedagio || '',
      custo_motorista: c.custo_motorista || '',
      motorista_nome: c.motorista_nome || '',
      veiculo_placa: c.veiculo_placa || '',
      nota_fiscal: c.nota_fiscal || '',
      previsao_entrega: c.previsao_entrega || '',
      descricao: c.descricao || '',
      status: c.status || 'Pendente'
    });
    setShowForm(true);
  }

  async function aprovarEGerarFinanceiro(cotacao) {
    try {
      // 1. Gera Conta a Receber (Faturamento do Frete)
      await supabase.from('financeiro').insert([{
        descricao: `Fatura de Frete (${cotacao.codigo_rastreio || `#${cotacao.id}`}) - ${cotacao.origem} x ${cotacao.destino}`,
        categoria: 'Frete',
        tipo: 'Entrada',
        valor: Number(cotacao.valor || 0),
        data: hojeISO,
        data_vencimento: cotacao.previsao_entrega || hojeISO,
        status_pagamento: 'Pendente',
        forma_pagamento: 'Boleto',
        entidade_nome: cotacao.cliente,
        veiculo_placa: cotacao.veiculo_placa || '',
        numero_documento: cotacao.nota_fiscal || `FRETE-${cotacao.id}`
      }]);

      // 2. Se houver custos de viagem informados, gera no Contas a Pagar
      const custoTotalViagem =
        Number(cotacao.custo_combustivel || 0) +
        Number(cotacao.custo_pedagio || 0) +
        Number(cotacao.custo_motorista || 0);

      if (custoTotalViagem > 0) {
        await supabase.from('financeiro').insert([{
          descricao: `Despesas de Viagem / Adiantamento (${cotacao.codigo_rastreio || `#${cotacao.id}`})`,
          categoria: 'Combustível',
          tipo: 'Saída',
          valor: custoTotalViagem,
          data: hojeISO,
          data_vencimento: hojeISO,
          status_pagamento: 'Pendente',
          forma_pagamento: 'PIX',
          entidade_nome: cotacao.motorista_nome || 'Custo Operacional de Rota',
          veiculo_placa: cotacao.veiculo_placa || '',
          numero_documento: `ROTA-${cotacao.id}`
        }]);
      }

      await supabase.from('cotacoes').update({ status: 'Aprovada', status_entrega: 'Coletado' }).eq('id', cotacao.id);
      carregarTudo();
      showMessage('success', 'Cotação aprovada! Títulos gerados automaticamente no Contas a Receber e Contas a Pagar + liberada na Torre de Entregas.');
    } catch (error) {
      showMessage('error', 'Erro ao aprovar cotação.');
    }
  }

  const gerarPDF = (cotacao) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(empresa?.nome_fantasia || 'PS LOGÍSTICA & TRANSPORTES', 14, 18);
    doc.setFontSize(10);
    doc.text(`Proposta Comercial & Ordem de Coleta | Protocolo: ${cotacao.codigo_rastreio || `PS-${cotacao.id}`}`, 14, 26);
    doc.text(`${empresa?.email || 'comercial@pslogistica.com.br'} | ${empresa?.telefone || '(11) 98765-4321'}`, 14, 33);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('PROPOSTA DE FRETE / ORDEM DE CARREGAMENTO', 105, 52, { align: 'center' });

    autoTable(doc, {
      startY: 60,
      head: [['Item da Operação', 'Especificação']],
      body: [
        ['Código de Rastreio', cotacao.codigo_rastreio || `PS-2026-${cotacao.id}`],
        ['Cliente / Embarcador', cotacao.cliente || '-'],
        ['Praça de Coleta (Origem)', cotacao.origem || '-'],
        ['Praça de Entrega (Destino)', cotacao.destino || '-'],
        ['Distância Estimada', `${cotacao.distancia_km || '-'} km`],
        ['Equipamento / Veículo', `${cotacao.tipo_veiculo || 'Caminhão'} ${cotacao.veiculo_placa ? `(${cotacao.veiculo_placa})` : ''}`],
        ['Motorista Escalado', cotacao.motorista_nome || 'A definir na escala'],
        ['Peso / Mercadoria', `${cotacao.peso_estimado || 'N/A'} kg — ${cotacao.descricao || 'Carga Geral'}`],
        ['Nota Fiscal Vinculada', cotacao.nota_fiscal || '-'],
        ['VALOR TOTAL DO FRETE', `R$ ${Number(cotacao.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175] }
    });

    doc.save(`Proposta_${cotacao.codigo_rastreio || cotacao.id}.pdf`);
  };

  const getStatusColor = (status) => {
    if (status === 'Aprovada') return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300';
    if (status === 'Rejeitada') return 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300';
    return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300';
  };

  const filtradas = cotacoes.filter((c) => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return (
      (c.cliente || '').toLowerCase().includes(t) ||
      (c.origem || '').toLowerCase().includes(t) ||
      (c.destino || '').toLowerCase().includes(t) ||
      (c.codigo_rastreio || '').toLowerCase().includes(t)
    );
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Cotações, Simulador de Frete & Ordens de Coleta
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Calcule custos de rota, emita propostas em PDF e aprove fretes integrados ao Contas a Receber e Pagar.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          + Nova Cotação / Ordem de Coleta
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {editingId ? 'Editar Cotação / Viagem' : 'Nova Cotação e Cálculo de Rentabilidade da Rota'}
            </h2>
            <button
              type="button"
              onClick={calcularFreteSugerido}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
            >
              ⚡ Simular Custos Automáticos pelo KM
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Cliente Cadastrado *</label>
              <select
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              >
                <option value="">Selecione um cliente cadastrado (ou digite ao lado)</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Ou Nome Avulso</label>
              <input
                type="text"
                placeholder="Nome da empresa"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Código de Rastreio</label>
              <input
                type="text"
                value={formData.codigo_rastreio}
                onChange={(e) => setFormData({ ...formData, codigo_rastreio: e.target.value })}
                placeholder="PS-2026-1001"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-mono text-blue-600 dark:text-blue-400 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Origem (Cidade/UF)</label>
              <input
                type="text"
                placeholder="Ex: Guarulhos - SP"
                value={formData.origem}
                onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Destino (Cidade/UF)</label>
              <input
                type="text"
                placeholder="Ex: Belo Horizonte - MG"
                value={formData.destino}
                onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Distância Rota (KM)</label>
              <input
                type="number"
                placeholder="Ex: 580"
                value={formData.distancia_km}
                onChange={(e) => setFormData({ ...formData, distancia_km: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Peso da Carga (kg)</label>
              <input
                type="number"
                placeholder="Ex: 14000"
                value={formData.peso_estimado}
                onChange={(e) => setFormData({ ...formData, peso_estimado: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            {/* CUSTOS DA VIAGEM E VALOR DO FRETE */}
            <div>
              <label className="text-xs font-bold text-emerald-600 uppercase">Valor Cobrado Frete (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 rounded-xl p-2.5 text-sm font-extrabold text-emerald-700 dark:text-emerald-300 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-rose-500 uppercase">Custo Combustível (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.custo_combustivel}
                onChange={(e) => setFormData({ ...formData, custo_combustivel: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-rose-500 uppercase">Custo Pedágio (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.custo_pedagio}
                onChange={(e) => setFormData({ ...formData, custo_pedagio: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-rose-500 uppercase">Diária/Comissão Motorista (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.custo_motorista}
                onChange={(e) => setFormData({ ...formData, custo_motorista: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            {/* ESCALA DE FROTA E MOTORISTA */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Equipamento</label>
              <select
                value={formData.tipo_veiculo}
                onChange={(e) => setFormData({ ...formData, tipo_veiculo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              >
                <option value="Caminhão">Caminhão / Carreta</option>
                <option value="Van">Van / Utilitário</option>
                <option value="Moto">Moto Express</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Veículo Escalado (Placa)</label>
              <select
                value={formData.veiculo_placa}
                onChange={(e) => setFormData({ ...formData, veiculo_placa: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              >
                <option value="">Definir depois</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.placa}>{v.placa} — {v.modelo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Motorista Escalado</label>
              <select
                value={formData.motorista_nome}
                onChange={(e) => setFormData({ ...formData, motorista_nome: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              >
                <option value="">Definir depois</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.nome}>{m.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Previsão Entrega / Venc. Fatura</label>
              <input
                type="date"
                value={formData.previsao_entrega}
                onChange={(e) => setFormData({ ...formData, previsao_entrega: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Nota Fiscal / CT-e / Mercadoria</label>
              <input
                type="text"
                placeholder="Ex: NF-e 458912 - Bobinas paletizadas"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 items-end">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl font-bold text-sm transition-all cursor-pointer">
                {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Registrar Cotação'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white p-3 rounded-xl font-bold text-sm transition-all cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABELA DE COTAÇÕES COM MARGEM DE LUCRO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por código de rastreio (ex: PS-2026-1001), cliente, origem ou destino..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Rastreio / Cliente</th>
                <th className="p-3.5">Rota & Escala</th>
                <th className="p-3.5">Valor Frete</th>
                <th className="p-3.5">Custos Viagem</th>
                <th className="p-3.5">Lucro Estimado</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filtradas.length > 0 ? (
                filtradas.map((c) => {
                  const frete = Number(c.valor || 0);
                  const custos = Number(c.custo_combustivel || 0) + Number(c.custo_pedagio || 0) + Number(c.custo_motorista || 0);
                  const lucro = frete - custos;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {c.codigo_rastreio || `PS-2026-${c.id}`}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{c.cliente}</span>
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 dark:text-slate-300">
                        <div className="font-semibold">{c.origem || '-'} → {c.destino || '-'}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.veiculo_placa ? `🚛 ${c.veiculo_placa}` : c.tipo_veiculo} {c.motorista_nome ? `• 👤 ${c.motorista_nome}` : ''}
                        </div>
                      </td>
                      <td className="p-3.5 text-emerald-600 dark:text-emerald-400 font-extrabold whitespace-nowrap">
                        R$ {frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-xs text-rose-500 font-semibold whitespace-nowrap">
                        R$ {custos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 font-bold whitespace-nowrap">
                        <span className={lucro >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}>
                          R$ {lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                        {c.status === 'Pendente' && (
                          <button
                            onClick={() => aprovarEGerarFinanceiro(c)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                            title="Aprova a cotação e gera automaticamente os títulos no Contas a Receber e Pagar"
                          >
                            ✓ Aprovar & Faturar
                          </button>
                        )}
                        <button onClick={() => gerarPDF(c)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold cursor-pointer">
                          PDF
                        </button>
                        <button onClick={() => handleEditar(c)} className="text-slate-500 hover:text-blue-600 text-xs font-semibold cursor-pointer">
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Nenhuma cotação encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
