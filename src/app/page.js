'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const router = useRouter();

  // Estado do Login Discreto no Topo (Landing Page)
  const [showTopLogin, setShowTopLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');

  // Estado do Rastreamento Público (Landing Page)
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingSearched, setTrackingSearched] = useState(false);

  // Estado do Formulário de Cotação Online (Landing Page)
  const [quoteForm, setQuoteForm] = useState({
    cliente: '',
    solicitante_telefone: '',
    solicitante_email: '',
    origem: '',
    destino: '',
    tipo_veiculo: 'Caminhão',
    peso_estimado: '',
    descricao: ''
  });
  const [quoteMsg, setQuoteMsg] = useState({ type: '', text: '' });
  const [quoteSending, setQuoteSending] = useState(false);

  // Estado do Dashboard Executivo (quando logado)
  const [loadingDash, setLoadingDash] = useState(true);
  const [kpis, setKpis] = useState({
    clientes: 0,
    viagensAtivas: 0,
    cotacoesPendentes: 0,
    veiculosTotal: 0,
    motoristasTotal: 0,
    saldoRealizado: 0,
    aReceberAberto: 0,
    aPagarAberto: 0,
    vencidosTotal: 0
  });
  const [alertas, setAlertas] = useState([]);
  const [ultimasViagens, setUltimasViagens] = useState([]);
  const [proximosVencimentos, setProximosVencimentos] = useState([]);

  useEffect(() => {
    async function init() {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
      setAuthChecked(true);

      const { data: emp } = await supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle();
      if (emp) setEmpresa(emp);

      if (s) {
        await carregarDashboardERP();
      }
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) carregarDashboardERP();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function carregarDashboardERP() {
    setLoadingDash(true);
    try {
      const [
        { data: clientes },
        { data: cotacoes },
        { data: veiculos },
        { data: motoristas },
        { data: financeiro }
      ] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('cotacoes').select('*').order('id', { ascending: false }),
        supabase.from('veiculos').select('*'),
        supabase.from('motoristas').select('*'),
        supabase.from('financeiro').select('*').order('data_vencimento', { ascending: true })
      ]);

      const listaClientes = clientes || [];
      const listaCotacoes = cotacoes || [];
      const listaVeiculos = veiculos || [];
      const listaMotoristas = motoristas || [];
      const listaFin = financeiro || [];

      const hojeStr = new Date().toISOString().split('T')[0];
      const hojeDate = new Date();

      let saldoRealizado = 0;
      let aReceberAberto = 0;
      let aPagarAberto = 0;
      let vencidosTotal = 0;

      listaFin.forEach((f) => {
        const val = Number(f.valor || 0);
        const st = f.status_pagamento || 'Pago';
        const venc = f.data_vencimento || f.data;

        if (st === 'Pago' || st === 'Recebido') {
          if (f.tipo === 'Entrada') saldoRealizado += val;
          else saldoRealizado -= val;
        } else {
          if (f.tipo === 'Entrada') aReceberAberto += val;
          else aPagarAberto += val;

          if (venc && venc < hojeStr) {
            vencidosTotal += val;
          }
        }
      });

      // Gerar alertas inteligentes de documentos e financeiro
      const novosAlertas = [];

      listaVeiculos.forEach((v) => {
        if (v.data_ipva) {
          const dias = Math.ceil((new Date(v.data_ipva) - hojeDate) / (1000 * 60 * 60 * 24));
          if (dias < 0) novosAlertas.push({ tipo: 'critico', titulo: `IPVA Vencido: ${v.placa}`, detalhe: `${v.modelo} venceu em ${new Date(v.data_ipva).toLocaleDateString('pt-BR')}`, link: '/veiculos' });
          else if (dias <= 30) novosAlertas.push({ tipo: 'atencao', titulo: `IPVA vencendo em ${dias} dias`, detalhe: `Veículo ${v.modelo} (${v.placa})`, link: '/veiculos' });
        }
        if (v.data_licenciamento) {
          const dias = Math.ceil((new Date(v.data_licenciamento) - hojeDate) / (1000 * 60 * 60 * 24));
          if (dias < 0) novosAlertas.push({ tipo: 'critico', titulo: `Licenciamento Vencido: ${v.placa}`, detalhe: `${v.modelo}`, link: '/veiculos' });
        }
      });

      listaMotoristas.forEach((m) => {
        if (m.cnh_vencimento) {
          const dias = Math.ceil((new Date(m.cnh_vencimento) - hojeDate) / (1000 * 60 * 60 * 24));
          if (dias < 0) novosAlertas.push({ tipo: 'critico', titulo: `CNH Vencida: ${m.nome}`, detalhe: `Categoria ${m.cnh_categoria || 'E'}`, link: '/motoristas' });
          else if (dias <= 30) novosAlertas.push({ tipo: 'atencao', titulo: `CNH vencendo em ${dias} dias`, detalhe: `Motorista ${m.nome}`, link: '/motoristas' });
        }
      });

      listaFin.filter(f => (f.status_pagamento === 'Pendente' || f.status_pagamento === 'Em Aberto') && (f.data_vencimento || f.data) <= hojeStr).forEach(f => {
        novosAlertas.push({
          tipo: 'critico',
          titulo: `${f.tipo === 'Entrada' ? 'Recebimento' : 'Conta a Pagar'} em atraso/hoje`,
          detalhe: `${f.descricao} - R$ ${Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          link: '/financeiro'
        });
      });

      setKpis({
        clientes: listaClientes.length,
        viagensAtivas: listaCotacoes.filter(c => c.status === 'Aprovada' && c.status_entrega !== 'Entregue').length,
        cotacoesPendentes: listaCotacoes.filter(c => c.status === 'Pendente').length,
        veiculosTotal: listaVeiculos.length,
        motoristasTotal: listaMotoristas.length,
        saldoRealizado,
        aReceberAberto,
        aPagarAberto,
        vencidosTotal
      });

      setAlertas(novosAlertas.slice(0, 6));
      setUltimasViagens(listaCotacoes.slice(0, 5));
      setProximosVencimentos(
        listaFin
          .filter(f => f.status_pagamento === 'Pendente' || f.status_pagamento === 'Em Aberto')
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Erro ao carregar dashboard ERP:', error);
    } finally {
      setLoadingDash(false);
    }
  }

  async function handleTopLogin(e) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });
      if (error) throw error;
      setShowTopLogin(false);
      router.refresh();
    } catch (err) {
      setLoginMsg('Credenciais inválidas. Verifique seu e-mail e senha.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handlePublicTracking(e) {
    e.preventDefault();
    if (!trackingCode.trim()) return;
    setTrackingSearched(true);
    try {
      const termo = trackingCode.trim();
      const { data } = await supabase
        .from('cotacoes')
        .select('*')
        .or(`codigo_rastreio.ilike.%${termo}%,cliente.ilike.%${termo}%`)
        .limit(1)
        .maybeSingle();

      if (!data && /^\d+$/.test(termo)) {
        const { data: byId } = await supabase.from('cotacoes').select('*').eq('id', parseInt(termo, 10)).maybeSingle();
        setTrackingResult(byId || null);
      } else {
        setTrackingResult(data || null);
      }
    } catch (err) {
      setTrackingResult(null);
    }
  }

  async function handlePublicQuoteSubmit(e) {
    e.preventDefault();
    if (!quoteForm.cliente || !quoteForm.origem || !quoteForm.destino) {
      setQuoteMsg({ type: 'error', text: 'Preencha nome/empresa, cidade de origem e destino.' });
      return;
    }
    setQuoteSending(true);
    try {
      const codigo = `PS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        codigo_rastreio: codigo,
        cliente: `${quoteForm.cliente} (${quoteForm.solicitante_telefone || 'Site'})`,
        origem: quoteForm.origem,
        destino: quoteForm.destino,
        tipo_veiculo: quoteForm.tipo_veiculo,
        peso_estimado: quoteForm.peso_estimado,
        descricao: `${quoteForm.descricao || 'Solicitação via Portal Web'} | Contato: ${quoteForm.solicitante_email || '-'} / ${quoteForm.solicitante_telefone || '-'}`,
        valor: 0,
        status: 'Pendente',
        status_entrega: 'Coletado'
      };

      let { error } = await supabase.from('cotacoes').insert([payload]);
      if (error) {
        // Fallback caso a coluna codigo_rastreio ainda não exista
        const { codigo_rastreio, ...fallbackPayload } = payload;
        const retry = await supabase.from('cotacoes').insert([fallbackPayload]);
        error = retry.error;
      }
      if (error) throw error;

      setQuoteMsg({
        type: 'success',
        text: `Solicitação enviada com sucesso! Protocolo de consulta: ${codigo}. Nossa equipe comercial entrará em contato.`
      });
      setQuoteForm({
        cliente: '',
        solicitante_telefone: '',
        solicitante_email: '',
        origem: '',
        destino: '',
        tipo_veiculo: 'Caminhão',
        peso_estimado: '',
        descricao: ''
      });
    } catch (err) {
      setQuoteMsg({ type: 'error', text: 'Não foi possível enviar sua cotação no momento. Tente novamente.' });
    } finally {
      setQuoteSending(false);
    }
  }

  if (!authChecked) return null;

  // ============================================================================
  // VISÃO 1: LANDING PAGE COMERCIAL + LOGIN DISCRETO NO TOPO (VISITANTES)
  // ============================================================================
  if (!session) {
    const nomeEmpresa = empresa?.nome_fantasia || 'PS LOGÍSTICA & TRANSPORTES';
    const telEmpresa = empresa?.telefone || '(11) 98765-4321';
    const emailEmpresa = empresa?.email || 'comercial@pslogistica.com.br';

    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        {/* BARRA SUPERIOR DISCRETA + HEADER */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/85 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {empresa?.logo_url ? (
                <img src={empresa.logo_url} alt="Logo" className="w-11 h-11 rounded-xl object-contain bg-slate-900 p-1 border border-slate-800" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-blue-600/30">
                  PS
                </div>
              )}
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white block leading-none">
                  {nomeEmpresa}
                </span>
                <span className="text-[11px] text-blue-400 font-medium tracking-wider uppercase">
                   Soluções em Transporte & Logística Integrada
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
              <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
              <a href="#rastreamento" className="hover:text-white transition-colors">Rastrear Carga</a>
              <a href="#frota" className="hover:text-white transition-colors">Frota & Cobertura</a>
              <a href="#cotacao" className="hover:text-white transition-colors">Cotação Online</a>
            </nav>

            {/* ÁREA DE LOGIN DISCRETA NO TOPO */}
            <div className="relative flex items-center gap-3">
              <a
                href="#cotacao"
                className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all"
              >
                Solicitar Frete
              </a>

              <button
                onClick={() => setShowTopLogin(!showTopLogin)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                title="Acesso restrito para colaboradores e gestão ERP"
              >
                <span>🔒</span>
                <span>Portal ERP</span>
              </button>

              {/* DROPDOWN DE LOGIN RÁPIDO NO TOPO */}
              {showTopLogin && (
                <div className="absolute right-0 top-14 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 z-50">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white">Acesso ao ERP</h4>
                      <p className="text-[11px] text-slate-400">Área restrita administrativa</p>
                    </div>
                    <button onClick={() => setShowTopLogin(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
                  </div>

                  {loginMsg && (
                    <div className="mb-3 p-2.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
                      {loginMsg}
                    </div>
                  )}

                  <form onSubmit={handleTopLogin} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">E-mail Corporativo</label>
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="admin@pslog.com"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Senha</label>
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loginLoading ? 'Autenticando...' : 'Entrar no Sistema ERP →'}
                    </button>
                    <div className="flex justify-between items-center pt-1 text-[11px] text-slate-400">
                      <Link href="/login" className="hover:text-blue-400 underline">Tela cheia / Recuperar senha</Link>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* HERO SECTION COMERCIAL */}
        <section className="relative overflow-hidden py-16 lg:py-24 border-b border-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                  <span>🚛</span> Transporte Rodoviário Nacional com Rastreamento Inteligente
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                  Sua carga entregue no prazo, com <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">segurança e controle total.</span>
                </h1>
                <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                  Operamos com frota própria e agregados homologados para cargas fechadas (lotação), dedicadas e fracionadas. Tecnologia de ponta para você acompanhar cada quilômetro da sua mercadoria.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <a
                    href="#cotacao"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-600/30 transition-all"
                  >
                    Cotar Frete Agora →
                  </a>
                  <a
                    href="#rastreamento"
                    className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 px-7 py-4 rounded-2xl font-bold text-sm transition-all"
                  >
                    📦 Rastrear Mercadoria
                  </a>
                </div>

                {/* INDICADORES DE CONFIANÇA */}
                <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800/80">
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-white">99,4%</p>
                    <p className="text-xs text-slate-400 mt-1">Índice de entregas no prazo (OTIF)</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-blue-400">24/7</p>
                    <p className="text-xs text-slate-400 mt-1">Torre de Controle e Monitoramento</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">100%</p>
                    <p className="text-xs text-slate-400 mt-1">Cargas seguradas e averbadas</p>
                  </div>
                </div>
              </div>

              {/* CARD DE RASTREAMENTO RÁPIDO NA CAPA */}
              <div id="rastreamento" className="lg:col-span-5">
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Torre de Controle</span>
                      <h3 className="text-xl font-bold text-white mt-0.5">Rastreamento de Carga</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl">
                      📍
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Consulte em tempo real o andamento da sua entrega informando o código de rastreio (ex: <code className="text-blue-300">PS-2026-1001</code>) ou o nome da empresa.
                  </p>

                  <form onSubmit={handlePublicTracking} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        placeholder="Digite o código ou razão social..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3.5 rounded-xl font-bold text-sm cursor-pointer transition-all"
                      >
                        Buscar
                      </button>
                    </div>
                  </form>

                  {trackingSearched && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      {trackingResult ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-blue-400">
                              {trackingResult.codigo_rastreio || `PEDIDO #${trackingResult.id}`}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {trackingResult.status === 'Pendente' ? 'Em Análise Comercial' : (trackingResult.status_entrega || 'Coletado')}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white">{trackingResult.cliente}</p>
                          <div className="text-xs text-slate-300 flex items-center gap-2">
                            <span>🚩 <strong>Origem:</strong> {trackingResult.origem || '-'}</span>
                            <span>→</span>
                            <span>🏁 <strong>Destino:</strong> {trackingResult.destino || '-'}</span>
                          </div>
                          {/* Linha do Tempo Visual */}
                          <div className="grid grid-cols-3 gap-2 pt-2">
                            {['Coletado', 'Em Trânsito', 'Entregue'].map((etapa, i) => {
                              const statusAtual = trackingResult.status_entrega || 'Coletado';
                              const ordem = ['Coletado', 'Em Trânsito', 'Entregue'];
                              const concluido = ordem.indexOf(statusAtual) >= i;
                              return (
                                <div key={etapa} className={`p-2 rounded-lg text-center border text-[11px] font-bold ${concluido ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                                  {concluido ? '✓ ' : ''}{etapa}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">
                          Nenhuma remessa encontrada para <strong>"{trackingCode}"</strong>. Verifique o código informado.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVIÇOS LOGÍSTICOS */}
        <section id="servicos" className="py-16 lg:py-20 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Portfólio Operacional</span>
              <h2 className="text-3xl font-extrabold text-white">Modalidades de Transporte Sob Medida</h2>
              <p className="text-sm text-slate-400">
                Estrutura completa para atender embarques urgentes, contratos dedicados e operações interestaduais.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: '🚛',
                  titulo: 'Carga Lotação (FTL)',
                  desc: 'Veículo exclusivo dedicado à sua mercadoria, saindo direto da origem para o destino sem baldeações, reduzindo o tempo de trânsito e o risco de avarias.'
                },
                {
                  icon: '📦',
                  titulo: 'Carga Fracionada Expressa (LTL)',
                  desc: 'Consolidação inteligente de cargas com saídas diárias programadas, ideal para remessas médias e paletizadas com excelente custo-benefício.'
                },
                {
                  icon: '⚡',
                  titulo: 'Fretes Urgentes & Dedicados',
                  desc: 'Vans, utilitários e caminhões prontos para coletas imediatas de insumos críticos, peças industriais e operações Just-in-Time.'
                }
              ].map((s) => (
                <div key={s.titulo} className="bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-7 space-y-4 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-2xl">
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white">{s.titulo}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FORMULÁRIO DE COTAÇÃO ONLINE INTEGRADO AO ERP */}
        <section id="cotacao" className="py-16 lg:py-20 bg-slate-900/50 border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Orçamento Rápido</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Solicite uma Cotação de Frete</h2>
                <p className="text-sm text-slate-400">
                  Seu pedido cai diretamente na nossa Central de Operações ERP para cálculo imediato da melhor tarifa.
                </p>
              </div>

              {quoteMsg.text && (
                <div className={`p-4 rounded-xl text-sm border ${quoteMsg.type === 'success' ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200' : 'bg-rose-950/90 border-rose-700 text-rose-200'}`}>
                  {quoteMsg.text}
                </div>
              )}

              <form onSubmit={handlePublicQuoteSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Empresa ou Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.cliente}
                    onChange={(e) => setQuoteForm({ ...quoteForm, cliente: e.target.value })}
                    placeholder="Ex: Metalúrgica ABC Ltda"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">WhatsApp / Telefone *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.solicitante_telefone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, solicitante_telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cidade/UF de Coleta (Origem) *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.origem}
                    onChange={(e) => setQuoteForm({ ...quoteForm, origem: e.target.value })}
                    placeholder="Ex: Guarulhos - SP"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cidade/UF de Entrega (Destino) *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.destino}
                    onChange={(e) => setQuoteForm({ ...quoteForm, destino: e.target.value })}
                    placeholder="Ex: Curitiba - PR"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Veículo Desejado</label>
                  <select
                    value={quoteForm.tipo_veiculo}
                    onChange={(e) => setQuoteForm({ ...quoteForm, tipo_veiculo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                  >
                    <option value="Caminhão">Caminhão / Carreta</option>
                    <option value="VUC / 3/4">Caminhão VUC / 3/4</option>
                    <option value="Van">Van / Utilitário</option>
                    <option value="Moto">Moto Express</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Peso Estimado (kg)</label>
                  <input
                    type="number"
                    value={quoteForm.peso_estimado}
                    onChange={(e) => setQuoteForm({ ...quoteForm, peso_estimado: e.target.value })}
                    placeholder="Ex: 4500"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Detalhes da Mercadoria / Volume / NF</label>
                  <textarea
                    rows={2}
                    value={quoteForm.descricao}
                    onChange={(e) => setQuoteForm({ ...quoteForm, descricao: e.target.value })}
                    placeholder="Informe tipo de mercadoria, quantidade de paletes ou observações..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white"
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={quoteSending}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {quoteSending ? 'Registrando Solicitação...' : 'Enviar Pedido de Cotação para a Central →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* RODAPÉ */}
        <footer className="mt-auto py-8 border-t border-slate-900 bg-slate-950 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} {nomeEmpresa}. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6">
              <span>📞 {telEmpresa}</span>
              <span>✉️ {emailEmpresa}</span>
              <button onClick={() => setShowTopLogin(true)} className="text-slate-400 hover:text-white underline cursor-pointer">
                Acesso Interno ERP
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // VISÃO 2: PAINEL EXECUTIVO DO ERP (USUÁRIO AUTENTICADO)
  // ============================================================================
  return (
    <div className="space-y-6 pb-8">
      {/* CABEÇALHO DO ERP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Visão Geral Corporativa</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-0.5">
            {empresa?.nome_fantasia || 'PS LOGÍSTICA'} — Torre de Controle & ERP
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Acompanhamento em tempo real de fretes, contas a pagar/receber, frota e motoristas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cotacoes"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all"
          >
            + Emitir Cotação / Ordem de Coleta
          </Link>
          <Link
            href="/financeiro"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all"
          >
            $ Baixar Títulos / Financeiro
          </Link>
        </div>
      </div>

      {loadingDash ? (
        <div className="flex justify-center p-12">
          <div className="text-slate-400 animate-pulse">Consolidando indicadores operacionais e financeiros...</div>
        </div>
      ) : (
        <>
          {/* CARDS FINANCEIROS (CONTAS A PAGAR, RECEBER E CAIXA) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-400">Saldo em Caixa (Realizado)</span>
                <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg">🏦</span>
              </div>
              <p className={`text-2xl font-extrabold ${kpis.saldoRealizado >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
                R$ {kpis.saldoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/financeiro" className="text-xs text-blue-600 dark:text-blue-400 mt-2 inline-block hover:underline">
                Ver extrato conciliado →
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Contas a Receber (Aberto)</span>
                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg">📈</span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                R$ {kpis.aReceberAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/financeiro" className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 inline-block hover:underline">
                Gerenciar faturas de clientes →
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400">Contas a Pagar (Aberto)</span>
                <span className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-lg">📉</span>
              </div>
              <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                R$ {kpis.aPagarAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/financeiro" className="text-xs text-rose-600 dark:text-rose-400 mt-2 inline-block hover:underline">
                Programação de desembolso →
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">Projeção Líquida</span>
                <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">📊</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                R$ {(kpis.saldoRealizado + kpis.aReceberAberto - kpis.aPagarAberto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/relatorios" className="text-xs text-amber-600 dark:text-amber-400 mt-2 inline-block hover:underline">
                Abrir DRE Gerencial →
              </Link>
            </div>
          </div>

          {/* CARDS OPERACIONAIS TMS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/entregas" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Viagens em Andamento</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{kpis.viagensAtivas}</p>
              </div>
              <span className="text-2xl">🚚</span>
            </Link>

            <Link href="/cotacoes" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cotações Aguardando</p>
                <p className="text-xl font-extrabold text-amber-500 mt-0.5">{kpis.cotacoesPendentes}</p>
              </div>
              <span className="text-2xl">📋</span>
            </Link>

            <Link href="/veiculos" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Veículos na Frota</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{kpis.veiculosTotal}</p>
              </div>
              <span className="text-2xl">🚛</span>
            </Link>

            <Link href="/motoristas" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Motoristas Cadastrados</p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{kpis.motoristasTotal}</p>
              </div>
              <span className="text-2xl">🪪</span>
            </Link>
          </div>

          {/* ALERTAS DE GESTÃO + PRÓXIMOS VENCIMENTOS + ÚLTIMAS VIAGENS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ALERTAS OPERACIONAIS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔔</span> Alertas de Controle
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {alertas.length} ativos
                </span>
              </div>

              {alertas.length > 0 ? (
                <div className="space-y-2.5">
                  {alertas.map((a, i) => (
                    <Link
                      key={i}
                      href={a.link}
                      className={`block p-3 rounded-xl border text-xs transition-all ${
                        a.tipo === 'critico'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                      }`}
                    >
                      <p className="font-bold">{a.titulo}</p>
                      <p className="opacity-80 mt-0.5">{a.detalhe}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  ✅ Nenhuma pendência crítica de CNH, IPVA ou títulos vencidos!
                </div>
              )}
            </div>

            {/* CONTAS A PAGAR E RECEBER PRÓXIMAS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📅</span> Títulos em Aberto
                </h3>
                <Link href="/financeiro" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Ver todos →
                </Link>
              </div>

              {proximosVencimentos.length > 0 ? (
                <div className="space-y-2.5">
                  {proximosVencimentos.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.descricao}</p>
                        <p className="text-[11px] text-slate-500">
                          Venc: {new Date(item.data_vencimento || item.data).toLocaleDateString('pt-BR')} • {item.entidade_nome || item.categoria}
                        </p>
                      </div>
                      <span className={`text-xs font-extrabold whitespace-nowrap ${item.tipo === 'Entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.tipo === 'Entrada' ? '+' : '-'} R$ {Number(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Nenhum título pendente de baixa no momento.
                </div>
              )}
            </div>

            {/* ÚLTIMAS COTAÇÕES E VIAGENS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🛣️</span> Últimas Operações
                </h3>
                <Link href="/cotacoes" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Ver todas →
                </Link>
              </div>

              {ultimasViagens.length > 0 ? (
                <div className="space-y-2.5">
                  {ultimasViagens.map((v) => (
                    <div key={v.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{v.cliente}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {v.origem || '-'} → {v.destino || '-'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.status === 'Aprovada' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>
                        {v.status === 'Aprovada' ? (v.status_entrega || 'Aprovada') : v.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  Nenhuma viagem registrada.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
