'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Abas do módulo financeiro ERP
  const [abaAtiva, setAbaAtiva] = useState('todos'); // 'todos' | 'receber' | 'pagar' | 'inadimplencia'
  const [filtroStatus, setFiltroStatus] = useState('Todos'); // 'Todos' | 'Pendente' | 'Pago' | 'Vencido'
  const [busca, setBusca] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const hojeISO = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    descricao: '',
    categoria: 'Frete',
    tipo: 'Entrada',
    valor: '',
    data: hojeISO,
    data_vencimento: hojeISO,
    data_pagamento: '',
    status_pagamento: 'Pendente',
    forma_pagamento: 'Boleto',
    entidade_nome: '',
    veiculo_placa: '',
    numero_documento: '',
    observacoes: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const [
        { data: fin },
        { data: cli },
        { data: vei },
        { data: emp }
      ] = await Promise.all([
        supabase.from('financeiro').select('*').order('id', { ascending: false }),
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('veiculos').select('id, placa, modelo').order('placa'),
        supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle()
      ]);
      setLancamentos(fin || []);
      setClientes(cli || []);
      setVeiculos(vei || []);
      if (emp) setEmpresa(emp);
    } catch (error) {
      console.error('Erro ao carregar financeiro:', error);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4500);
  }

  function abrirNovoTitulo(tipoPadrao) {
    setEditingId(null);
    setFormData({
      descricao: '',
      categoria: tipoPadrao === 'Entrada' ? 'Frete' : 'Combustível',
      tipo: tipoPadrao,
      valor: '',
      data: hojeISO,
      data_vencimento: hojeISO,
      data_pagamento: '',
      status_pagamento: 'Pendente',
      forma_pagamento: tipoPadrao === 'Entrada' ? 'Boleto' : 'PIX',
      entidade_nome: '',
      veiculo_placa: '',
      numero_documento: '',
      observacoes: ''
    });
    setShowForm(true);
  }

  function handleEditar(item) {
    setEditingId(item.id);
    setFormData({
      descricao: item.descricao || '',
      categoria: item.categoria || 'Frete',
      tipo: item.tipo || 'Entrada',
      valor: item.valor || '',
      data: item.data || hojeISO,
      data_vencimento: item.data_vencimento || item.data || hojeISO,
      data_pagamento: item.data_pagamento || '',
      status_pagamento: item.status_pagamento || 'Pago',
      forma_pagamento: item.forma_pagamento || 'PIX',
      entidade_nome: item.entidade_nome || '',
      veiculo_placa: item.veiculo_placa || '',
      numero_documento: item.numero_documento || '',
      observacoes: item.observacoes || ''
    });
    setShowForm(true);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (!formData.descricao.trim() || !formData.valor || Number(formData.valor) <= 0) {
      showMessage('error', 'Informe uma descrição válida e valor maior que R$ 0,00.');
      return;
    }

    setLoading(true);
    try {
      const payloadCompleto = {
        descricao: formData.descricao.trim(),
        categoria: formData.categoria,
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        data: formData.data || hojeISO,
        data_vencimento: formData.data_vencimento || formData.data || hojeISO,
        data_pagamento: formData.status_pagamento === 'Pago' ? (formData.data_pagamento || hojeISO) : null,
        status_pagamento: formData.status_pagamento,
        forma_pagamento: formData.forma_pagamento,
        entidade_nome: formData.entidade_nome,
        veiculo_placa: formData.veiculo_placa,
        numero_documento: formData.numero_documento,
        observacoes: formData.observacoes
      };

      let res;
      if (editingId) {
        res = await supabase.from('financeiro').update(payloadCompleto).eq('id', editingId);
      } else {
        res = await supabase.from('financeiro').insert([payloadCompleto]);
      }

      // Fallback caso o banco ainda tenha apenas as colunas básicas
      if (res.error) {
        const payloadBasico = {
          descricao: `${formData.descricao} ${formData.entidade_nome ? `(${formData.entidade_nome})` : ''}`.trim(),
          categoria: formData.categoria,
          tipo: formData.tipo,
          valor: parseFloat(formData.valor),
          data: formData.data_vencimento || formData.data || hojeISO
        };
        res = editingId
          ? await supabase.from('financeiro').update(payloadBasico).eq('id', editingId)
          : await supabase.from('financeiro').insert([payloadBasico]);
      }

      if (res.error) throw res.error;

      showMessage('success', editingId ? 'Título atualizado com sucesso!' : 'Título registrado no financeiro!');
      setShowForm(false);
      setEditingId(null);
      carregarDados();
    } catch (error) {
      console.error(error);
      showMessage('error', 'Erro ao salvar lançamento financeiro.');
    } finally {
      setLoading(false);
    }
  }

  async function darBaixaTitulo(item) {
    try {
      const novoStatus = (item.status_pagamento || 'Pago') === 'Pago' ? 'Pendente' : 'Pago';
      const { error } = await supabase
        .from('financeiro')
        .update({
          status_pagamento: novoStatus,
          data_pagamento: novoStatus === 'Pago' ? hojeISO : null
        })
        .eq('id', item.id);

      if (error) throw error;
      showMessage(
        'success',
        novoStatus === 'Pago'
          ? `Baixa efetuada: ${item.descricao} marcado como Liquidado!`
          : `Título reaberto como Pendente.`
      );
      carregarDados();
    } catch (err) {
      showMessage('error', 'Não foi possível alterar o status do título.');
    }
  }

  async function handleExcluir(id) {
    if (!confirm('Confirma a exclusão definitiva deste título financeiro?')) return;
    try {
      const { error } = await supabase.from('financeiro').delete().eq('id', id);
      if (error) throw error;
      showMessage('success', 'Título removido com sucesso!');
      carregarDados();
    } catch (err) {
      showMessage('error', 'Erro ao excluir título.');
    }
  }

  function obterSituacao(item) {
    const status = item.status_pagamento || 'Pago';
    const venc = item.data_vencimento || item.data;
    if (status === 'Pago' || status === 'Recebido') {
      return { label: item.tipo === 'Entrada' ? 'Recebido' : 'Pago', cor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' };
    }
    if (venc && venc < hojeISO) {
      return { label: 'Vencido / Atrasado', cor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300' };
    }
    if (venc === hojeISO) {
      return { label: 'Vence Hoje', cor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' };
    }
    return { label: 'Em Aberto', cor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300' };
  }

  function gerarReciboPDF(item) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(empresa?.nome_fantasia || 'PS LOGÍSTICA & TRANSPORTES', 14, 18);
    doc.setFontSize(10);
    doc.text(`CNPJ: ${empresa?.cnpj || '45.123.789/0001-90'} | Tel: ${empresa?.telefone || '(11) 98765-4321'}`, 14, 26);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.text(
      item.tipo === 'Entrada' ? 'FATURA / RECIBO DE FRETE (CONTAS A RECEBER)' : 'COMPROVANTE DE DESPESA (CONTAS A PAGAR)',
      14,
      52
    );

    autoTable(doc, {
      startY: 60,
      head: [['Campo do Título', 'Detalhamento']],
      body: [
        ['Nº Documento / Título', item.numero_documento || `TIT-${item.id}`],
        ['Descrição da Operação', item.descricao],
        ['Cliente / Fornecedor / Favorecido', item.entidade_nome || 'Não informado'],
        ['Categoria Contábil', item.categoria || '-'],
        ['Veículo Vinculado (Frota)', item.veiculo_placa || 'Geral / Administrativo'],
        ['Data de Emissão', item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '-'],
        ['Data de Vencimento', item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : '-'],
        ['Forma de Pagamento', item.forma_pagamento || 'PIX / Boleto'],
        ['Situação Atual', obterSituacao(item).label],
        ['VALOR DO TÍTULO', `R$ ${Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });

    doc.save(`Titulo_${item.numero_documento || item.id}.pdf`);
  }

  // Cálculos de Totais do ERP Financeiro
  let saldoCaixa = 0;
  let totalReceberAberto = 0;
  let totalPagarAberto = 0;
  let totalInadimplente = 0;

  lancamentos.forEach((l) => {
    const v = Number(l.valor || 0);
    const st = l.status_pagamento || 'Pago';
    const venc = l.data_vencimento || l.data;

    if (st === 'Pago' || st === 'Recebido') {
      if (l.tipo === 'Entrada') saldoCaixa += v;
      else saldoCaixa -= v;
    } else {
      if (l.tipo === 'Entrada') totalReceberAberto += v;
      else totalPagarAberto += v;
      if (venc && venc < hojeISO) totalInadimplente += v;
    }
  });

  // Filtros combinados
  const listaFiltrada = lancamentos.filter((item) => {
    if (abaAtiva === 'receber' && item.tipo !== 'Entrada') return false;
    if (abaAtiva === 'pagar' && item.tipo !== 'Saída') return false;
    if (abaAtiva === 'inadimplencia') {
      const st = item.status_pagamento || 'Pago';
      const venc = item.data_vencimento || item.data;
      if (st === 'Pago' || !venc || venc >= hojeISO) return false;
    }

    if (filtroStatus !== 'Todos') {
      const sit = obterSituacao(item).label;
      if (filtroStatus === 'Pago' && sit !== 'Pago' && sit !== 'Recebido') return false;
      if (filtroStatus === 'Pendente' && (sit === 'Pago' || sit === 'Recebido')) return false;
      if (filtroStatus === 'Vencido' && sit !== 'Vencido / Atrasado') return false;
    }

    if (busca.trim()) {
      const t = busca.toLowerCase();
      return (
        (item.descricao || '').toLowerCase().includes(t) ||
        (item.entidade_nome || '').toLowerCase().includes(t) ||
        (item.categoria || '').toLowerCase().includes(t) ||
        (item.veiculo_placa || '').toLowerCase().includes(t) ||
        (item.numero_documento || '').toLowerCase().includes(t)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Gestão Financeira — Contas a Pagar & Receber
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Controle de faturamento de fretes, despesas de viagens, vencimentos, baixas e conciliação de caixa.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => abrirNovoTitulo('Entrada')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>+</span> Nova Conta a Receber (Frete)
          </button>
          <button
            onClick={() => abrirNovoTitulo('Saída')}
            className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>-</span> Nova Conta a Pagar (Despesa)
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'}`}>
          {message.text}
        </div>
      )}

      {/* INDICADORES FINANCEIROS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-slate-400">Saldo Realizado em Caixa</p>
          <h3 className={`text-2xl font-extrabold mt-2 ${saldoCaixa >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
            R$ {saldoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Títulos já liquidados (Pagos/Recebidos)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">A Receber (Em Aberto)</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            R$ {totalReceberAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Faturas de fretes aguardando recebimento</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400">A Pagar (Em Aberto)</p>
          <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
            R$ {totalPagarAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Fornecedores, diesel, oficina e motoristas</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">Títulos Vencidos / Atrasados</p>
          <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            R$ {totalInadimplente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Exigem atenção imediata ou cobrança</p>
        </div>
      </div>

      {/* MODAL / FORMULÁRIO DE TÍTULO */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {editingId ? 'Editar Título Financeiro' : formData.tipo === 'Entrada' ? 'Novo Título — Contas a Receber' : 'Novo Título — Contas a Pagar'}
              </h2>
              <p className="text-xs text-slate-400">Preencha os dados de vencimento, favorecido e vínculo operacional</p>
            </div>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm">✕ Fechar</button>
          </div>

          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição do Título / Histórico *</label>
              <input
                type="text"
                required
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Frete Lotação SP x MG - NF 458912 / Abastecimento Diesel S10"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Documento / Fatura / NF</label>
              <input
                type="text"
                value={formData.numero_documento}
                onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                placeholder="Ex: FAT-1020 / NF-890"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Natureza (Tipo) *</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="Entrada">Contas a Receber (Entrada / Receita)</option>
                <option value="Saída">Contas a Pagar (Saída / Despesa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria Contábil / Centro de Custo</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="Frete">Receita de Frete / Transporte</option>
                <option value="Combustível">Combustível & Arla 32</option>
                <option value="Pedágio">Vale-Pedágio / Rota</option>
                <option value="Motorista / Diária">Comissão / Diária de Motorista</option>
                <option value="Manutenção">Manutenção & Pneus (Oficina)</option>
                <option value="Impostos / Documentação">Impostos / IPVA / Licenciamento / Seguro</option>
                <option value="Administrativo / Fixo">Despesa Fixa / Aluguel / Folha</option>
                <option value="Outros">Outros Lançamentos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor do Título (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente / Fornecedor / Favorecido</label>
              <input
                type="text"
                list="lista-entidades"
                value={formData.entidade_nome}
                onChange={(e) => setFormData({ ...formData, entidade_nome: e.target.value })}
                placeholder="Selecione ou digite o nome..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              <datalist id="lista-entidades">
                {clientes.map((c) => (
                  <option key={c.id} value={c.nome} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Veículo Vinculado (Custo por Placa)</label>
              <select
                value={formData.veiculo_placa}
                onChange={(e) => setFormData({ ...formData, veiculo_placa: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Geral / Sem veículo específico</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.placa}>{v.placa} — {v.modelo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meio de Pagamento</label>
              <select
                value={formData.forma_pagamento}
                onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="Boleto">Boleto Bancário</option>
                <option value="PIX">PIX / Transferência TED</option>
                <option value="Cartão Frota">Cartão Combustível / Frota</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Espécie">Dinheiro / Caixa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Competência / Emissão</label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Vencimento *</label>
              <input
                type="date"
                required
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Situação de Liquidação</label>
              <select
                value={formData.status_pagamento}
                onChange={(e) => setFormData({ ...formData, status_pagamento: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white font-bold"
              >
                <option value="Pendente">Em Aberto (A Pagar / A Receber)</option>
                <option value="Pago">Liquidado (Já Pago / Já Recebido)</option>
              </select>
            </div>

            <div className="md:col-span-3 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer"
              >
                {loading ? 'Salvando...' : editingId ? 'Salvar Alterações do Título' : 'Confirmar Inclusão do Título'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABAS E FILTROS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'todos', label: '📋 Todos os Lançamentos' },
              { id: 'receber', label: '📈 Contas a Receber (Clientes)' },
              { id: 'pagar', label: '📉 Contas a Pagar (Fornecedores/Frota)' },
              { id: 'inadimplencia', label: '⚠️ Vencidos / Em Atraso' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAbaAtiva(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  abaAtiva === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Pendente">Somente Em Aberto</option>
              <option value="Pago">Somente Liquidados (Pagos/Recebidos)</option>
              <option value="Vencido">Somente Vencidos</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por descrição, cliente/fornecedor, placa do caminhão, categoria ou nº documento..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
          />
        </div>

        {/* TABELA DE TÍTULOS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <th className="p-3.5">Vencimento</th>
                <th className="p-3.5">Doc / Título</th>
                <th className="p-3.5">Cliente / Favorecido</th>
                <th className="p-3.5">Categoria / Frota</th>
                <th className="p-3.5">Valor</th>
                <th className="p-3.5">Situação</th>
                <th className="p-3.5 text-right">Ações de Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {listaFiltrada.length > 0 ? (
                listaFiltrada.map((item) => {
                  const sit = obterSituacao(item);
                  const isLiquidado = (item.status_pagamento || 'Pago') === 'Pago';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          {new Date(item.data_vencimento || item.data).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-[11px] text-slate-400">{item.forma_pagamento || 'PIX/Boleto'}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-bold block">
                          {item.numero_documento || `TIT-#${item.id}`}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">{item.descricao}</span>
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {item.entidade_nome || '-'}
                      </td>
                      <td className="p-3.5 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                          {item.categoria}
                        </span>
                        {item.veiculo_placa && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-mono font-bold">
                            🚛 {item.veiculo_placa}
                          </span>
                        )}
                      </td>
                      <td className={`p-3.5 font-extrabold whitespace-nowrap ${item.tipo === 'Entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.tipo === 'Entrada' ? '+' : '-'} R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${sit.cor}`}>
                          {sit.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => darBaixaTitulo(item)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            isLiquidado
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                          }`}
                          title={isLiquidado ? 'Reabrir título como Em Aberto' : 'Confirmar pagamento / recebimento'}
                        >
                          {isLiquidado ? '↩ Estornar' : '✓ Dar Baixa'}
                        </button>
                        <button
                          onClick={() => gerarReciboPDF(item)}
                          className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline cursor-pointer"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleEditar(item)}
                          className="text-slate-500 hover:text-blue-600 text-xs font-semibold cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleExcluir(item.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhum título encontrado para os filtros selecionados.
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
