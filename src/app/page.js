'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LandingPage() {
  const [empresa, setEmpresa] = useState(null);

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

  useEffect(() => {
    supabase
      .from('configuracoes_empresa')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEmpresa(data);
      });
  }, []);

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
        text: `Proposta solicitada com sucesso! Seu protocolo de acompanhamento é ${codigo}. Nossa equipe comercial entrará em contato.`
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

  const nomeEmpresa = empresa?.nome_fantasia || 'PS LOGÍSTICA';
  const razaoEmpresa = empresa?.razao_social || 'PS Logística & Transportes Rodoviários Ltda';
  const telEmpresa = empresa?.telefone || '(11) 98765-4321';
  const emailEmpresa = empresa?.email || 'comercial@pslogistica.com.br';
  const enderecoEmpresa = empresa?.endereco
    ? `${empresa.endereco} — ${empresa.cidade || 'São Paulo'}/${empresa.estado || 'SP'}`
    : 'Av. das Nações Unidas, 1500 — Galpão Logístico 4, São Paulo/SP';
  const cnpjEmpresa = empresa?.cnpj || '45.123.789/0001-90';
  const whatsappLimpo = telEmpresa.replace(/\D/g, '') || '5511987654321';

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* 1. FAIXA FINA NO TOPO (TOPBAR ESTILO ESSYSTEM) */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 border-b border-slate-200/80 text-[11px] font-semibold tracking-wider text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <span className="uppercase tracking-widest text-slate-500">
            TRANSPORTE RODOVIÁRIO DE CARGAS & LOGÍSTICA INTEGRADA
          </span>

          <div className="flex items-center gap-6">
            <a href={`mailto:${emailEmpresa}`} className="hidden sm:inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors">
              <span>✉️</span>
              <span className="lowercase">{emailEmpresa}</span>
            </a>
            <a href={`tel:${whatsappLimpo}`} className="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-600 transition-colors font-bold">
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{telEmpresa}</span>
            </a>
          </div>
        </div>
      </div>

      {/* 2. CABEÇALHO BRANCO CLEAN COM MENU CENTRAL + "SOLICITAR PROPOSTA" + BOTÃO DISCRETO "LOGIN" */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* LOGO */}
          <a href="#home" className="flex items-center gap-3">
            {empresa?.logo_url ? (
              <img src={empresa.logo_url} alt="Logo" className="w-11 h-11 rounded-xl object-contain bg-white p-1 border border-slate-200" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/20">
                PS
              </div>
            )}
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 block leading-none">
                {nomeEmpresa}
              </span>
              <span className="text-[10px] text-blue-600 font-bold tracking-widest uppercase mt-0.5 block">
                Transportes & Logística
              </span>
            </div>
          </a>

          {/* MENU CENTRAL EM CAIXA ALTA (IGUAL AO MODELO DE REFERÊNCIA) */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold tracking-widest uppercase text-slate-600">
            <a href="#home" className="hover:text-blue-600 transition-colors">Home</a>
            <a href="#empresa" className="hover:text-blue-600 transition-colors">Empresa</a>
            <a href="#servicos" className="hover:text-blue-600 transition-colors">Serviços</a>
            <a href="#frota" className="hover:text-blue-600 transition-colors">Frota</a>
            <a href="#orcamento" className="hover:text-blue-600 transition-colors">Orçamento</a>
            <a href="#rastreamento" className="hover:text-blue-600 transition-colors">Rastreamento</a>
            <a href="#contato" className="hover:text-blue-600 transition-colors">Contato</a>
          </nav>

          {/* BOTÕES DO TOPO DIREITO: "SOLICITAR PROPOSTA" (DESTAQUE) + "LOGIN" (CLEAN COM BORDA) */}
          <div className="flex items-center gap-3">
            <a
              href="#orcamento"
              className="hidden sm:inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-md shadow-blue-600/20 transition-all"
            >
              Solicitar proposta
            </a>

            <Link
              href="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition-all shadow-2xs"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* 3. HERO PRINCIPAL CLARO, MODERNO E IMPONENTE COM FOTO DO CAMINHÃO */}
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-br from-blue-50/70 via-white to-slate-50 py-16 lg:py-24 border-b border-slate-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* COLUNA ESQUERDA: APRESENTAÇÃO DA EMPRESA (ESTILO ESSYSTEM) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-[11px] font-extrabold uppercase tracking-widest">
                {nomeEmpresa} • OPERAÇÃO NACIONAL
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-950 leading-[1.08]">
                Transporte e operação logística com mais controle, agilidade e presença.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-normal">
                A <strong>{nomeEmpresa}</strong> desenvolve soluções completas para transporte rodoviário de cargas, coletas dedicadas, distribuição fracionada e armazenagem, com rastreamento próximo e foco em pontualidade real.
              </p>

              {/* PILLS DE ESPECIALIDADES (IGUAL AO MODELO) */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                {['CARGA LOTAÇÃO (FTL)', 'CARGA FRACIONADA', 'FRETE DEDICADO EXPRESSO', 'RASTREAMENTO 24H'].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-[11px] font-bold tracking-wider uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* BOTÕES DE AÇÃO PRINCIPAIS */}
              <div className="flex flex-wrap gap-4 pt-3">
                <a
                  href="#orcamento"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-extrabold text-sm shadow-lg shadow-blue-600/25 transition-all"
                >
                  Solicitar orçamento de frete
                </a>
                <a
                  href="#rastreamento"
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-8 py-4 rounded-full font-bold text-sm transition-all shadow-2xs"
                >
                  Rastrear mercadoria
                </a>
              </div>

              {/* DADOS DE CONTATO DIRETO NA CAPA */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-600 border-t border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">📞</span>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Central de Atendimento</span>
                    <strong className="text-slate-900 text-sm">{telEmpresa}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">✉️</span>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">E-mail Comercial</span>
                    <strong className="text-slate-900 text-sm">{emailEmpresa}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: FOTO DO CAMINHÃO + CARD DE DESTAQUE OPERACIONAL */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900">
                <img
                  src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=85"
                  alt="Frota PS Logística em operação"
                  className="w-full h-[440px] object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                      Frota Própria & Homologada
                    </span>
                    <p className="text-sm font-black text-slate-900">
                      Cargas 100% Seguradas e Monitoradas via Satélite
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    99,4%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SOBRE A EMPRESA E SOLUÇÕES LOGÍSTICAS */}
      <section id="empresa" className="py-20 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div id="servicos" className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-block px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-widest">
                Nossas Especialidades
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 mt-3">
                Soluções Logísticas para Impulsionar Sua Operação
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Estrutura completa de transporte rodoviário com gestão integrada por ERP e TMS próprios para máxima transparência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                tag: 'CARGA FECHADA (FTL)',
                titulo: 'Transporte Rodoviário Lotação',
                desc: 'Veículos exclusivos dedicados à sua operação, partindo diretamente da indústria ou CD de origem até o cliente final sem baldeações.',
                vantagens: ['Menor tempo de trânsito', 'Segurança máxima contra avarias', 'Atendimento nacional interestadual']
              },
              {
                tag: 'CARGA FRACIONADA (LTL)',
                titulo: 'Distribuição Regional & Expressa',
                desc: 'Consolidação inteligente de remessas com saídas programadas, permitindo enviar volumes menores com excelente custo-benefício.',
                vantagens: ['Coletas ágeis em até 24 horas', 'Rastreabilidade por protocolo', 'Baixa de entrega em tempo real']
              },
              {
                tag: 'OPERAÇÕES DEDICADAS',
                titulo: 'Fretes Urgentes & Contratos JIT',
                desc: 'Alocação de frota fixa ou veículos expressos para abastecimento contínuo de plantas industriais, varejo e distribuição.',
                vantagens: [' SLA de pontualidade garantido', 'Motoristas treinados e fixos', 'Relatórios de performance']
              }
            ].map((item) => (
              <div
                key={item.titulo}
                className="bg-slate-50/70 hover:bg-white border border-slate-200/90 hover:border-blue-400 rounded-3xl p-8 transition-all shadow-2xs hover:shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider">
                    {item.tag}
                  </span>
                  <h3 className="text-xl font-black text-slate-900">{item.titulo}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>

                <ul className="space-y-2 pt-6 mt-6 border-t border-slate-200 text-xs text-slate-700 font-medium">
                  {item.vantagens.map((v) => (
                    <li key={v} className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span> {v}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. VITRINE DA FROTA COM FOTOS DE CAMINHÕES */}
      <section id="frota" className="py-20 bg-slate-50 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-widest">
              Frota PS Logística
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">Veículos para Qualquer Demanda</h2>
            <p className="text-sm text-slate-600">
              Caminhões pesados, trucks, VUCs e utilitários revisados preventivamente e monitorados 24h.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80',
                nome: 'Carretas & Caminhões Pesados',
                cap: 'Até 32 Toneladas • Sider, Baú e Grade Baixa',
                detalhe: 'Operações rodoviárias de longa distância e grandes lotes industriais paletizados.'
              },
              {
                img: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=900&q=80',
                nome: 'Caminhões Truck, Toco & VUC',
                cap: 'De 3 a 14 Toneladas • Urbano e Regional',
                detalhe: 'Versatilidade para abastecimento comercial, centros de distribuição e rotas intermunicipais.'
              },
              {
                img: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=900&q=80',
                nome: 'Vans & Utilitários Expressos',
                cap: 'Até 3.500 kg • Entregas Rápidas Dedicadas',
                detalhe: 'Agilidade total para embarques urgentes, cargas sensíveis e entregas porta a porta.'
              }
            ].map((f) => (
              <div key={f.nome} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col">
                <div className="h-52 overflow-hidden">
                  <img src={f.img} alt={f.nome} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-extrabold text-blue-600 uppercase">{f.cap}</span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">{f.nome}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{f.detalhe}</p>
                  </div>
                  <a href="#orcamento" className="inline-block pt-4 text-xs font-extrabold text-blue-600 hover:underline">
                    Cotar frete com este veículo →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. RASTREAMENTO ONLINE + SOLICITAÇÃO DE ORÇAMENTO + CONTATO */}
      <section id="orcamento" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* COLUNA ESQUERDA: RASTREAMENTO DE CARGA + CONTATOS TELEFÔNICOS/E-MAIL */}
            <div className="lg:col-span-5 space-y-8">
              {/* BOX DE RASTREAMENTO */}
              <div id="rastreamento" className="bg-slate-900 text-white rounded-3xl p-7 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-blue-400">Consulta Pública</span>
                    <h3 className="text-xl font-black mt-0.5">Rastrear Carga Online</h3>
                  </div>
                  <span className="text-2xl">📦</span>
                </div>
                <p className="text-xs text-slate-300">
                  Digite o código de rastreamento (ex: <code className="text-blue-300 font-bold">PS-2026-1001</code>) ou o nome da empresa para consultar o status da entrega:
                </p>
                <form onSubmit={handlePublicTracking} className="flex gap-2">
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Código ou razão social..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold text-xs cursor-pointer transition-all"
                  >
                    Buscar
                  </button>
                </form>

                {trackingSearched && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    {trackingResult ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-blue-400">
                            {trackingResult.codigo_rastreio || `PEDIDO #${trackingResult.id}`}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                            {trackingResult.status === 'Pendente' ? 'Em Análise' : (trackingResult.status_entrega || 'Coletado')}
                          </span>
                        </div>
                        <p className="font-bold text-white text-sm">{trackingResult.cliente}</p>
                        <p className="text-slate-300">{trackingResult.origem || '-'} → {trackingResult.destino || '-'}</p>
                      </>
                    ) : (
                      <p className="text-slate-400 text-center">Nenhuma carga encontrada para "{trackingCode}".</p>
                    )}
                  </div>
                )}
              </div>

              {/* CANAIS DIRETOS DE CONTATO */}
              <div id="contato" className="bg-slate-50 border border-slate-200 rounded-3xl p-7 space-y-5">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Atendimento Direto</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">Canais de Contato</h3>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shrink-0">📞</div>
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 block">Telefone & WhatsApp</span>
                      <strong className="text-slate-900 text-base">{telEmpresa}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shrink-0">✉️</div>
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 block">E-mail Comercial</span>
                      <strong className="text-slate-900 text-sm break-all">{emailEmpresa}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shrink-0">📍</div>
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 block">Matriz & Terminal Logístico</span>
                      <strong className="text-slate-900 text-xs">{enderecoEmpresa}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: FORMULÁRIO DE SOLICITAÇÃO DE PROPOSTA / COTAÇÃO */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-3xl p-7 sm:p-10 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Orçamento Sem Compromisso</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">Solicitar Proposta de Frete</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Preencha os dados da coleta e entrega. Seu pedido cai automaticamente na central comercial do nosso ERP.
                </p>
              </div>

              {quoteMsg.text && (
                <div className={`p-4 rounded-xl text-sm border font-medium ${quoteMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
                  {quoteMsg.text}
                </div>
              )}

              <form onSubmit={handlePublicQuoteSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Empresa ou Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.cliente}
                    onChange={(e) => setQuoteForm({ ...quoteForm, cliente: e.target.value })}
                    placeholder="Ex: Indústria Metalúrgica Brasil"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.solicitante_telefone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, solicitante_telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={quoteForm.solicitante_email}
                    onChange={(e) => setQuoteForm({ ...quoteForm, solicitante_email: e.target.value })}
                    placeholder="logistica@suaempresa.com.br"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Cidade/UF de Coleta (Origem) *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.origem}
                    onChange={(e) => setQuoteForm({ ...quoteForm, origem: e.target.value })}
                    placeholder="Ex: Guarulhos - SP"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Cidade/UF de Entrega (Destino) *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.destino}
                    onChange={(e) => setQuoteForm({ ...quoteForm, destino: e.target.value })}
                    placeholder="Ex: Belo Horizonte - MG"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Tipo de Veículo</label>
                  <select
                    value={quoteForm.tipo_veiculo}
                    onChange={(e) => setQuoteForm({ ...quoteForm, tipo_veiculo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Caminhão">Carreta / Caminhão Pesado</option>
                    <option value="VUC / 3/4">Caminhão VUC / Toco / 3/4</option>
                    <option value="Van">Van / Utilitário Expresso</option>
                    <option value="Moto">Moto Express</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Peso Estimado (kg)</label>
                  <input
                    type="number"
                    value={quoteForm.peso_estimado}
                    onChange={(e) => setQuoteForm({ ...quoteForm, peso_estimado: e.target.value })}
                    placeholder="Ex: 12000"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Detalhes da Mercadoria / Volumes</label>
                  <textarea
                    rows={3}
                    value={quoteForm.descricao}
                    onChange={(e) => setQuoteForm({ ...quoteForm, descricao: e.target.value })}
                    placeholder="Informe tipo de mercadoria, quantidade de paletes ou observações..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={quoteSending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full font-extrabold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {quoteSending ? 'Enviando Solicitação...' : 'Enviar Solicitação de Proposta →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="mt-auto py-8 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-900">{razaoEmpresa}</p>
            <p className="mt-0.5">© {new Date().getFullYear()} {nomeEmpresa} • CNPJ: {cnpjEmpresa}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <span>📞 {telEmpresa}</span>
            <span>✉️ {emailEmpresa}</span>
            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-bold underline">
              Login Administrativo ERP →
            </Link>
          </div>
        </div>
      </footer>

      {/* BOTÃO FLUTUANTE DE WHATSAPP NO CANTO INFERIOR DIREITO (IGUAL AO MODELO ESSYSTEM) */}
      <a
        href={`https://wa.me/55${whatsappLimpo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-full shadow-2xl shadow-emerald-600/30 transition-all"
      >
        <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">💬</span>
        <div className="text-left leading-tight pr-1">
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">WhatsApp</span>
          <span className="text-xs font-extrabold block">Fale com a {nomeEmpresa}</span>
        </div>
      </a>
    </div>
  );
}
