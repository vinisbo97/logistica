'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function HomeContent() {
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verSitePublico = searchParams?.get('site') === '1';

  // Estado do Rastreamento Público (Site institucional)
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [trackingSearched, setTrackingSearched] = useState(false);

  // Estado do Formulário de Cotação Online (Site institucional)
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

  // Estado do Dashboard Executivo ERP (quando logado)
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

      listaFin
        .filter((f) => (f.status_pagamento === 'Pendente' || f.status_pagamento === 'Em Aberto') && (f.data_vencimento || f.data) <= hojeStr)
        .forEach((f) => {
          novosAlertas.push({
            tipo: 'critico',
            titulo: `${f.tipo === 'Entrada' ? 'Recebimento' : 'Conta a Pagar'} vencendo/atrasado`,
            detalhe: `${f.descricao} — R$ ${Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            link: '/financeiro'
          });
        });

      setKpis({
        clientes: listaClientes.length,
        viagensAtivas: listaCotacoes.filter((c) => c.status === 'Aprovada' && c.status_entrega !== 'Entregue').length,
        cotacoesPendentes: listaCotacoes.filter((c) => c.status === 'Pendente').length,
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
          .filter((f) => f.status_pagamento === 'Pendente' || f.status_pagamento === 'Em Aberto')
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Erro ao carregar dashboard ERP:', error);
    } finally {
      setLoadingDash(false);
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
        descricao: `${quoteForm.descricao || 'Solicitação via Site Oficial'} | Contato: ${quoteForm.solicitante_email || '-'} / ${quoteForm.solicitante_telefone || '-'}`,
        valor: 0,
        status: 'Pendente',
        status_entrega: 'Coletado'
      };

      let { error } = await supabase.from('cotacoes').insert([payload]);
      if (error) {
        const { codigo_rastreio, ...fallbackPayload } = payload;
        const retry = await supabase.from('cotacoes').insert([fallbackPayload]);
        error = retry.error;
      }
      if (error) throw error;

      setQuoteMsg({
        type: 'success',
        text: `Cotação registrada com sucesso! Seu protocolo de acompanhamento é ${codigo}. Nossa equipe comercial entrará em contato em instantes.`
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
      setQuoteMsg({ type: 'error', text: 'Não foi possível enviar sua cotação agora. Tente novamente.' });
    } finally {
      setQuoteSending(false);
    }
  }

  if (!authChecked) return null;

  // ============================================================================
  // VISÃO 1: SITE INSTITUCIONAL E COMERCIAL DA PS LOGÍSTICA (VISITANTES OU MODO SITE)
  // ============================================================================
  if (!session || verSitePublico) {
    const nomeEmpresa = empresa?.nome_fantasia || 'PS LOGÍSTICA';
    const razaoEmpresa = empresa?.razao_social || 'PS Logística & Transportes Rodoviários Ltda';
    const telEmpresa = empresa?.telefone || '(11) 98765-4321';
    const emailEmpresa = empresa?.email || 'comercial@pslogistica.com.br';
    const enderecoEmpresa = empresa?.endereco
      ? `${empresa.endereco} — ${empresa.cidade || 'São Paulo'}/${empresa.estado || 'SP'}`
      : 'Av. das Nações Unidas, 1500 — Galpão Logístico 4, São Paulo/SP';
    const cnpjEmpresa = empresa?.cnpj || '45.123.789/0001-90';

    return (
      <div className="min-h-screen flex flex-col bg-[#060B18] text-slate-100 selection:bg-blue-600 selection:text-white">
        {/* TOPBAR DE CONTATO DIRETO (TELEFONE, E-MAIL, HORÁRIO E ATALHO ERP) */}
        <div className="bg-[#030711] border-b border-white/10 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
            <div className="flex items-center gap-6 text-slate-300">
              <a href={`tel:${telEmpresa.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-blue-400 transition-colors font-medium">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Central de Atendimento: <strong className="text-white">{telEmpresa}</strong></span>
              </a>

              <a href={`mailto:${emailEmpresa}`} className="hidden sm:flex items-center gap-2 hover:text-blue-400 transition-colors font-medium">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{emailEmpresa}</span>
              </a>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden lg:inline-flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Plantão Operacional 24h • Cobertura Nacional
              </span>
            </div>
          </div>
        </div>

        {/* NAVBAR PRINCIPAL COM BOTÃO DE LOGIN PARA O ERP NO TOPO */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#060B18]/85 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* LOGO DA EMPRESA */}
            <div className="flex items-center gap-3.5">
              {empresa?.logo_url ? (
                <img src={empresa.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-slate-900 p-1.5 border border-white/10" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/30 border border-blue-400/30">
                  PS
                </div>
              )}
              <div>
                <span className="text-xl font-black tracking-tight text-white block leading-none">
                  {nomeEmpresa}
                </span>
                <span className="text-[11px] text-blue-400 font-semibold tracking-widest uppercase mt-1 block">
                  Transportes & Logística Integrada
                </span>
              </div>
            </div>

            {/* LINKS DE NAVEGAÇÃO */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
              <a href="#inicio" className="hover:text-white transition-colors">Início</a>
              <a href="#solucoes" className="hover:text-white transition-colors">Soluções</a>
              <a href="#frota" className="hover:text-white transition-colors">Nossa Frota</a>
              <a href="#rastreamento" className="hover:text-white transition-colors">Rastrear Carga</a>
              <a href="#contato" className="hover:text-white transition-colors">Contato</a>
            </nav>

            {/* BOTÕES NO TOPO DIREITO: COTAR FRETE + LOGIN PARA O ERP */}
            <div className="flex items-center gap-3">
              <a
                href="#cotacao"
                className="hidden sm:inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
              >
                Cotar Frete
              </a>

              {session ? (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
                >
                  <span>Painel ERP</span>
                  <span>→</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Login ERP</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* HERO BANNER COM FOTO DE CAMINHÃO EM ALTA RESOLUÇÃO E CONTATO EM DESTAQUE */}
        <section id="inicio" className="relative min-h-[640px] lg:min-h-[720px] flex items-center overflow-hidden border-b border-white/10">
          {/* FOTO DO CAMINHÃO NA ESTRADA (BACKGROUND) */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=2000&q=85"
              alt="Caminhão PS Logística na rodovia"
              className="w-full h-full object-cover object-center scale-105 transition-transform duration-1000"
            />
            {/* Overlay gradiente corporativo escuro para leitura perfeita */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#060B18] via-[#060B18]/90 to-[#060B18]/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060B18] via-transparent to-[#060B18]/40" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* TEXTO DE MARKETING E CONTATO DIRETO */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 backdrop-blur-md text-blue-300 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                  Excelência em Transporte Rodoviário de Cargas
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                  Força, pontualidade e inteligência para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300">mover o seu negócio.</span>
                </h1>

                <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed font-normal">
                  A <strong>{nomeEmpresa}</strong> conecta os principais polos industriais e comerciais do país com frota moderna, rastreamento em tempo real 24/7 e seguro total de carga do embarque à entrega final.
                </p>

                {/* BOTÕES DE AÇÃO IMEDIATA */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <a
                    href="#cotacao"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-extrabold text-sm shadow-2xl shadow-blue-600/40 transition-all flex items-center gap-2"
                  >
                    <span>Solicitar Cotação de Frete</span>
                    <span>→</span>
                  </a>
                  <a
                    href="#contato"
                    className="bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/20 px-7 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
                  >
                    <span>📞 Falar com Especialista</span>
                  </a>
                </div>

                {/* BARRA RÁPIDA DE TELEFONE E E-MAIL DIRETO NO BANNER */}
                <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <a
                    href={`tel:${telEmpresa.replace(/\D/g, '')}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#0B132B]/85 backdrop-blur-md border border-white/10 hover:border-blue-500/50 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">Telefone & WhatsApp Comercial</span>
                      <span className="text-base font-extrabold text-white">{telEmpresa}</span>
                    </div>
                  </a>

                  <a
                    href={`mailto:${emailEmpresa}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#0B132B]/85 backdrop-blur-md border border-white/10 hover:border-blue-500/50 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">E-mail Corporativo</span>
                      <span className="text-sm font-extrabold text-white truncate block">{emailEmpresa}</span>
                    </div>
                  </a>
                </div>
              </div>

              {/* CARD FLUTUANTE DE RASTREAMENTO DE CARGA E DESTAQUE DA FROTA */}
              <div id="rastreamento" className="lg:col-span-5">
                <div className="bg-[#0B132B]/90 backdrop-blur-xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Torre de Monitoramento</span>
                      <h3 className="text-xl font-black text-white mt-0.5">Rastrear Carga Online</h3>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Acompanhe a posição da sua mercadoria em tempo real. Informe o código de rastreio (ex: <code className="text-blue-300 font-bold">PS-2026-1001</code>) ou o nome da empresa embarcadora:
                  </p>

                  <form onSubmit={handlePublicTracking} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        placeholder="Código do pedido ou empresa..."
                        className="flex-1 bg-[#060B18] border border-white/15 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-bold text-sm cursor-pointer transition-all shadow-lg shadow-blue-600/30"
                      >
                        Localizar
                      </button>
                    </div>
                  </form>

                  {trackingSearched && (
                    <div className="p-4 rounded-2xl bg-[#060B18] border border-white/10 space-y-3">
                      {trackingResult ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-blue-400">
                              {trackingResult.codigo_rastreio || `REMESSA #${trackingResult.id}`}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {trackingResult.status === 'Pendente' ? 'Aguardando Liberação' : (trackingResult.status_entrega || 'Coletado')}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white">{trackingResult.cliente}</p>
                          <div className="text-xs text-slate-300 flex items-center gap-2">
                            <span>Origem: <strong>{trackingResult.origem || '-'}</strong></span>
                            <span>→</span>
                            <span>Destino: <strong>{trackingResult.destino || '-'}</strong></span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2">
                            {['Coletado', 'Em Trânsito', 'Entregue'].map((etapa, i) => {
                              const statusAtual = trackingResult.status_entrega || 'Coletado';
                              const ordem = ['Coletado', 'Em Trânsito', 'Entregue'];
                              const concluido = ordem.indexOf(statusAtual) >= i;
                              return (
                                <div key={etapa} className={`p-2 rounded-lg text-center border text-[11px] font-bold ${concluido ? 'bg-blue-600/25 border-blue-500 text-blue-200' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                                  {concluido ? '✓ ' : ''}{etapa}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-2">
                          Nenhuma remessa localizada para <strong>"{trackingCode}"</strong>.
                        </p>
                      )}
                    </div>
                  )}

                  {/* INDICADORES RESUMIDOS */}
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 text-center">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <p className="text-lg font-black text-white">99,4%</p>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Pontualidade</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <p className="text-lg font-black text-blue-400">+15 mil</p>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Cargas Entregues</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <p className="text-lg font-black text-emerald-400">100%</p>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Carga Segurada</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO DE DIFERENCIAIS E SOLUÇÕES LOGÍSTICAS */}
        <section id="solucoes" className="py-20 bg-[#060B18]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Soluções Corporativas</span>
                <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
                  Engenharia Logística para Todos os Perfis de Carga
                </h2>
              </div>
              <p className="text-sm text-slate-400 max-w-md">
                Atendemos indústrias, distribuidores, varejistas e operações de e-commerce com rigor operacional e rastreabilidade ponta a ponta.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  badge: 'FTL • Carga Dedicada',
                  titulo: 'Transporte Lotação & Cargas Pesadas',
                  desc: 'Carretas e caminhões exclusivos para grandes volumes industriais, saindo diretamente da planta de origem para o destinatário sem transbordo.',
                  itens: ['Menor tempo de trânsito (Transit Time)', 'Risco zero de manuseio intermediário', 'Monitoramento via satélite em tempo real']
                },
                {
                  badge: 'LTL • Fracionado Expresso',
                  titulo: 'Distribuição Regional & Interestadual',
                  desc: 'Rotas diárias consolidadas com saídas programadas, permitindo embarcar volumes menores e paletizados com tarifa reduzida e alta frequência.',
                  itens: ['Coletas programadas em até 24h', 'Conferência eletrônica por código', 'Comprovante de entrega digitalizado']
                },
                {
                  badge: 'JIT • Operações Críticas',
                  titulo: 'Logística Dedicada & Fretes Urgentes',
                  desc: 'Frota dedicada com veículos utilitários, VUCs, Vans e caminhões prontos para abastecimento de linhas de produção e entregas emergenciais.',
                  itens: ['Atendimento imediato sob demanda', 'Motoristas treinados e homologados', 'Gestão completa de KPIs e SLA']
                }
              ].map((card) => (
                <div
                  key={card.titulo}
                  className="bg-[#0B132B] border border-white/10 hover:border-blue-500/40 rounded-3xl p-8 flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold uppercase">
                      {card.badge}
                    </span>
                    <h3 className="text-xl font-extrabold text-white group-hover:text-blue-400 transition-colors">
                      {card.titulo}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{card.desc}</p>
                  </div>

                  <ul className="space-y-2 pt-6 mt-6 border-t border-white/10 text-xs text-slate-300">
                    {card.itens.map((it) => (
                      <li key={it} className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VITRINE VISUAL DA FROTA COM FOTOS DE CAMINHÕES */}
        <section id="frota" className="py-20 bg-[#091024] border-y border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Estrutura Operacional</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">Frota Moderna, Revisada e Monitorada</h2>
              <p className="text-sm text-slate-400">
                Veículos para todas as etapas da cadeia de suprimentos: do transporte rodoviário pesado à distribuição urbana rápida.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
                  nome: 'Carretas & Caminhões Pesados',
                  cap: 'Até 32 Toneladas • Baú, Sider e Grade Baixa',
                  detalhe: 'Ideais para longas distâncias interestaduais, cargas paletizadas e operações industriais de grande porte.'
                },
                {
                  img: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=900&q=80',
                  nome: 'Caminhões Truck, Toco & VUC',
                  cap: 'De 3 a 14 Toneladas • Distribuição Regional',
                  detalhe: 'Alta versatilidade para entregas intermunicipais e centros urbanos com restrição de circulação.'
                },
                {
                  img: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80',
                  nome: 'Vans & Utilitários Expressos',
                  cap: 'Até 3.500 kg • Coletas e Entregas Rápidas',
                  detalhe: 'Agilidade máxima para cargas fracionadas urgentes, e-commerce, insumos hospitalares e tecnologia.'
                }
              ].map((item) => (
                <div key={item.nome} className="bg-[#060B18] border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col">
                  <div className="h-52 overflow-hidden relative">
                    <img
                      src={item.img}
                      alt={item.nome}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060B18] via-transparent to-transparent" />
                  </div>
                  <div className="p-6 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-400 uppercase">{item.cap}</span>
                      <h3 className="text-lg font-extrabold text-white mt-1">{item.nome}</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.detalhe}</p>
                    </div>
                    <a href="#cotacao" className="inline-block pt-4 text-xs font-bold text-blue-400 hover:text-blue-300">
                      Solicitar este veículo →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEÇÃO DE COTAÇÃO + CANAIS DE ATENDIMENTO DIRETO (TELEFONE E E-MAIL) */}
        <section id="cotacao" className="py-20 bg-[#060B18]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* COLUNA ESQUERDA: DADOS DE CONTATO DA EMPRESA */}
              <div id="contato" className="lg:col-span-5 space-y-6">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Canais de Atendimento</span>
                <h2 className="text-3xl font-black text-white leading-tight">
                  Fale Direto com a Mesa Operacional da {nomeEmpresa}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Precisa de uma cotação imediata ou quer estruturar uma operação logística dedicada para a sua empresa? Nossa equipe comercial atende por telefone, WhatsApp e e-mail.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="p-5 rounded-2xl bg-[#0B132B] border border-white/10 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl shrink-0">
                      📞
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-400">Central Telefônica & WhatsApp</h4>
                      <p className="text-lg font-black text-white mt-0.5">{telEmpresa}</p>
                      <p className="text-xs text-slate-400 mt-1">Atendimento comercial de Seg. a Sex. e plantão operacional 24h</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0B132B] border border-white/10 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl shrink-0">
                      ✉️
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-400">E-mail Comercial & Cotações</h4>
                      <p className="text-base font-extrabold text-white mt-0.5 break-all">{emailEmpresa}</p>
                      <p className="text-xs text-slate-400 mt-1">Envio de XML de NF-e, tabelas de frete e faturamento</p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#0B132B] border border-white/10 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl shrink-0">
                      🏢
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-400">Base Operacional & Matriz</h4>
                      <p className="text-sm font-bold text-white mt-0.5">{enderecoEmpresa}</p>
                      <p className="text-xs text-slate-400 mt-1">CNPJ: {cnpjEmpresa}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: FORMULÁRIO DE COTAÇÃO INTEGRADO AO ERP */}
              <div className="lg:col-span-7 bg-[#0B132B] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Cotação Expressa</span>
                  <h3 className="text-2xl font-black text-white mt-1">Solicite seu Orçamento de Transporte</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Preencha os dados do embarque abaixo. Sua solicitação é integrada diretamente ao nosso sistema ERP.
                  </p>
                </div>

                {quoteMsg.text && (
                  <div className={`p-4 rounded-xl text-sm border ${quoteMsg.type === 'success' ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200' : 'bg-rose-950/90 border-rose-700 text-rose-200'}`}>
                    {quoteMsg.text}
                  </div>
                )}

                <form onSubmit={handlePublicQuoteSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Empresa ou Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={quoteForm.cliente}
                      onChange={(e) => setQuoteForm({ ...quoteForm, cliente: e.target.value })}
                      placeholder="Ex: Indústria Metalúrgica Brasil"
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Telefone / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={quoteForm.solicitante_telefone}
                      onChange={(e) => setQuoteForm({ ...quoteForm, solicitante_telefone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">E-mail para Retorno da Proposta</label>
                    <input
                      type="email"
                      value={quoteForm.solicitante_email}
                      onChange={(e) => setQuoteForm({ ...quoteForm, solicitante_email: e.target.value })}
                      placeholder="compras@suaempresa.com.br"
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Cidade/UF de Coleta (Origem) *</label>
                    <input
                      type="text"
                      required
                      value={quoteForm.origem}
                      onChange={(e) => setQuoteForm({ ...quoteForm, origem: e.target.value })}
                      placeholder="Ex: Guarulhos - SP"
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Cidade/UF de Entrega (Destino) *</label>
                    <input
                      type="text"
                      required
                      value={quoteForm.destino}
                      onChange={(e) => setQuoteForm({ ...quoteForm, destino: e.target.value })}
                      placeholder="Ex: Belo Horizonte - MG"
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Tipo de Veículo</label>
                    <select
                      value={quoteForm.tipo_veiculo}
                      onChange={(e) => setQuoteForm({ ...quoteForm, tipo_veiculo: e.target.value })}
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="Caminhão">Carreta / Caminhão Pesado</option>
                      <option value="VUC / 3/4">Caminhão VUC / Toco / 3/4</option>
                      <option value="Van">Van / Utilitário Expresso</option>
                      <option value="Moto">Moto Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Peso Estimado (kg)</label>
                    <input
                      type="number"
                      value={quoteForm.peso_estimado}
                      onChange={(e) => setQuoteForm({ ...quoteForm, peso_estimado: e.target.value })}
                      placeholder="Ex: 12000"
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Descrição da Carga / Cubagem / Valor da NF</label>
                    <textarea
                      rows={3}
                      value={quoteForm.descricao}
                      onChange={(e) => setQuoteForm({ ...quoteForm, descricao: e.target.value })}
                      placeholder="Informe tipo de mercadoria, quantidade de volumes/paletes ou necessidades especiais..."
                      className="w-full bg-[#060B18] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <button
                      type="submit"
                      disabled={quoteSending}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl font-extrabold text-sm shadow-xl shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {quoteSending ? 'Enviando Solicitação...' : 'Receber Cotação Comercial →'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* RODAPÉ CORPORATIVO COMPLETO */}
        <footer className="mt-auto py-10 border-t border-white/10 bg-[#030711] text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white">{razaoEmpresa}</p>
              <p className="mt-0.5">© {new Date().getFullYear()} {nomeEmpresa} • CNPJ: {cnpjEmpresa}</p>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <span>📞 {telEmpresa}</span>
              <span>✉️ {emailEmpresa}</span>
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-bold underline">
                Acessar ERP Interno →
              </Link>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-slate-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Central de Comando Corporativa</span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            {empresa?.nome_fantasia || 'PS LOGÍSTICA'} — Painel Executivo ERP
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Controle integrado de faturamento, contas a pagar e receber, frota, motoristas e entregas em rota.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/?site=1"
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            🌐 Ver Site Comercial
          </Link>
          <Link
            href="/cotacoes"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all"
          >
            + Nova Cotação / Coleta
          </Link>
          <Link
            href="/financeiro"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all"
          >
            $ Contas a Pagar / Receber
          </Link>
        </div>
      </div>

      {loadingDash ? (
        <div className="flex justify-center p-12">
          <div className="text-slate-400 animate-pulse">Consolidando indicadores operacionais e financeiros...</div>
        </div>
      ) : (
        <>
          {/* CARDS FINANCEIROS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-400">Saldo em Caixa (Realizado)</span>
                <span className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg">🏦</span>
              </div>
              <p className={`text-2xl font-black ${kpis.saldoRealizado >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'}`}>
                R$ {kpis.saldoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/financeiro" className="text-xs text-blue-600 dark:text-blue-400 mt-2 inline-block hover:underline font-semibold">
                Ver extrato conciliado →
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Contas a Receber (Aberto)</span>
                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-lg">📈</span>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                R$ {kpis.aReceberAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/financeiro" className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 inline-block hover:underline font-semibold">
                Gerenciar faturas de clientes →
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-rose-600 dark:text-rose-400">Contas a Pagar (Aberto)</span>
                <span className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-lg">📉</span>
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                R$ {kpis.aPagarAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/financeiro" className="text-xs text-rose-600 dark:text-rose-400 mt-2 inline-block hover:underline font-semibold">
                Programação de desembolso →
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">Projeção Líquida</span>
                <span className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">📊</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                R$ {(kpis.saldoRealizado + kpis.aReceberAberto - kpis.aPagarAberto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <Link href="/relatorios" className="text-xs text-amber-600 dark:text-amber-400 mt-2 inline-block hover:underline font-semibold">
                Abrir DRE Gerencial →
              </Link>
            </div>
          </div>

          {/* CARDS OPERACIONAIS TMS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/entregas" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Viagens em Andamento</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.viagensAtivas}</p>
              </div>
              <span className="text-2xl">🚚</span>
            </Link>

            <Link href="/cotacoes" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cotações Pendentes</p>
                <p className="text-2xl font-black text-amber-500 mt-0.5">{kpis.cotacoesPendentes}</p>
              </div>
              <span className="text-2xl">📋</span>
            </Link>

            <Link href="/veiculos" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Veículos na Frota</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.veiculosTotal}</p>
              </div>
              <span className="text-2xl">🚛</span>
            </Link>

            <Link href="/motoristas" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-blue-500 transition-all flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Motoristas Ativos</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{kpis.motoristasTotal}</p>
              </div>
              <span className="text-2xl">🪪</span>
            </Link>
          </div>

          {/* ALERTAS, TÍTULOS E VIAGENS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060B18]" />}>
      <HomeContent />
    </Suspense>
  );
}
