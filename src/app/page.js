'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LandingPage() {
  const [empresa, setEmpresa] = useState(null);

  // Estado do Formulário de Cotação B2B (Apenas para Empresas)
  const [quoteForm, setQuoteForm] = useState({
    cliente: '',
    cnpj: '',
    solicitante_telefone: '',
    solicitante_email: '',
    origem: '',
    destino: '',
    tipo_veiculo: 'Mercedes-Benz 914 (Carroceria)',
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

  async function handlePublicQuoteSubmit(e) {
    e.preventDefault();
    if (!quoteForm.cliente || !quoteForm.origem || !quoteForm.destino) {
      setQuoteMsg({ type: 'error', text: 'Informe a Razão Social/Empresa, local de coleta e local de entrega.' });
      return;
    }
    setQuoteSending(true);
    try {
      const payload = {
        cliente: `${quoteForm.cliente}${quoteForm.cnpj ? ` - CNPJ: ${quoteForm.cnpj}` : ''}`,
        origem: quoteForm.origem,
        destino: quoteForm.destino,
        tipo_veiculo: quoteForm.tipo_veiculo.includes('Strada') ? 'Utilitário (Fiat Strada)' : 'Caminhão MB 914',
        peso_estimado: quoteForm.peso_estimado,
        descricao: `${quoteForm.descricao || 'Cotação B2B via Site'} | Contato: ${quoteForm.solicitante_telefone || '-'} / ${quoteForm.solicitante_email || '-'}`,
        valor: 0,
        status: 'Pendente',
        status_entrega: 'Coletado'
      };

      const { error } = await supabase.from('cotacoes').insert([payload]);
      if (error) throw error;

      setQuoteMsg({
        type: 'success',
        text: 'Solicitação de proposta B2B enviada com sucesso! Nossa equipe comercial analisará a rota e retornará o contato.'
      });
      setQuoteForm({
        cliente: '',
        cnpj: '',
        solicitante_telefone: '',
        solicitante_email: '',
        origem: '',
        destino: '',
        tipo_veiculo: 'Mercedes-Benz 914 (Carroceria)',
        peso_estimado: '',
        descricao: ''
      });
    } catch (err) {
      setQuoteMsg({ type: 'error', text: 'Não foi possível registrar sua solicitação agora. Tente novamente.' });
    } finally {
      setQuoteSending(false);
    }
  }

  const nomeEmpresa = empresa?.nome_fantasia || 'PS LOGÍSTICA';
  const razaoEmpresa = empresa?.razao_social || 'PS Logística & Transportes Ltda';
  const telEmpresa = empresa?.telefone || 'Em manutenção';
  const emailEmpresa = empresa?.email || 'Em manutenção';
  const enderecoEmpresa = empresa?.endereco
    ? `${empresa.endereco} — ${empresa.cidade || ''}/${empresa.estado || ''}`
    : 'Em manutenção';

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* 1. FAIXA FINA NO TOPO (TOPBAR ESTILO ESSYSTEM) */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50 border-b border-slate-200/80 text-[11px] font-semibold tracking-wider text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <span className="uppercase tracking-widest text-slate-600 font-bold">
            TRANSPORTE EXCLUSIVO PARA EMPRESAS (B2B) • CARGAS LEVES & FRETES RÁPIDOS
          </span>

          <div className="flex items-center gap-6">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-500">
              <span>📍 Endereço:</span>
              <strong className="text-amber-700">{enderecoEmpresa}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span>📞 WhatsApp / Tel:</span>
              <strong className="text-amber-700">{telEmpresa}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. CABEÇALHO BRANCO CLEAN COM MENU CENTRAL + "SOLICITAR PROPOSTA" + BOTÃO "LOGIN" */}
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
                Logística B2B & Cargas Leves
              </span>
            </div>
          </a>

          {/* MENU CENTRAL EM CAIXA ALTA */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold tracking-widest uppercase text-slate-600">
            <a href="#home" className="hover:text-blue-600 transition-colors">Home</a>
            <a href="#empresa" className="hover:text-blue-600 transition-colors">Empresa</a>
            <a href="#servicos" className="hover:text-blue-600 transition-colors">Serviços B2B</a>
            <a href="#frota" className="hover:text-blue-600 transition-colors">Nossa Frota</a>
            <a href="#orcamento" className="hover:text-blue-600 transition-colors">Orçamento</a>
            <a href="#contato" className="hover:text-blue-600 transition-colors">Contato</a>
          </nav>

          {/* BOTÕES DO TOPO DIREITO: "SOLICITAR PROPOSTA" + "LOGIN" */}
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

      {/* 3. HERO PRINCIPAL COM A FOTO REAL DO MERCEDES-BENZ 914 VERMELHO */}
      <section
        id="home"
        className="relative overflow-hidden bg-gradient-to-br from-blue-50/70 via-white to-slate-50 py-16 lg:py-24 border-b border-slate-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* COLUNA ESQUERDA: APRESENTAÇÃO FOCADA EM EMPRESAS E CARGAS LEVES */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-900 text-[11px] font-extrabold uppercase tracking-widest">
                ATENDIMENTO EXCLUSIVO PARA EMPRESAS (B2B)
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-black tracking-tight text-slate-950 leading-[1.08]">
                Agilidade e compromisso no transporte de cargas leves para a sua empresa.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-normal">
                A <strong>{nomeEmpresa}</strong> é especializada em fretes corporativos, coletas rápidas e distribuição de cargas leves e médias. Operamos com caminhão carroceria aberta e utilitários ágeis para atender indústrias, comércios e distribuidoras com total pontualidade.
              </p>

              {/* ETIQUETAS DE ESPECIALIDADES REAIS DA EMPRESA */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                {[
                  'EXCLUSIVO PARA EMPRESAS (CNPJ)',
                  'CARGAS LEVES E MÉDIAS',
                  'MERCEDES-BENZ 914 CARROCERIA',
                  'UTILITÁRIOS FIAT STRADA'
                ].map((tag) => (
                  <span
                    key={tag}
                    className="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-900 text-[11px] font-bold tracking-wider uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex flex-wrap gap-4 pt-3">
                <a
                  href="#orcamento"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-extrabold text-sm shadow-lg shadow-blue-600/25 transition-all"
                >
                  Solicitar proposta comercial
                </a>
                <a
                  href="#frota"
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-8 py-4 rounded-full font-bold text-sm transition-all shadow-2xs"
                >
                  Conhecer nossa frota
                </a>
              </div>

              {/* BARRA DE CONTATO NA CAPA (COM AVISO DE EM MANUTENÇÃO) */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 border-t border-slate-200/80">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">📞</span>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">WhatsApp & Telefone</span>
                    <strong className="text-slate-900 text-sm">{telEmpresa}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">📍</span>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Endereço & Base</span>
                    <strong className="text-slate-900 text-sm">{enderecoEmpresa}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: FOTO REAL DO CAMINHÃO MERCEDES-BENZ 914 VERMELHO */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900">
                <img
                  src="/caminhao-mb914.webp"
                  alt="Caminhão Mercedes-Benz 914 Carroceria da PS Logística"
                  className="w-full h-[440px] object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />

                <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 block">
                      Frota Própria PS Logística
                    </span>
                    <p className="text-sm font-black text-slate-900">
                      Mercedes-Benz 914 Carroceria + 2 Utilitários Fiat Strada
                    </p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-black text-xs shrink-0">
                    B2B
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SERVIÇOS B2B (EXCLUSIVO PARA EMPRESAS - SEM CONSUMIDOR FINAL) */}
      <section id="empresa" className="py-20 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div id="servicos" className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-block px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-widest">
                Foco 100% Empresarial (B2B)
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 mt-3">
                Transporte Dedicado para Empresas e Comércios
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Não realizamos mudanças residenciais ou atendimento a consumidor pessoa física. Nossa operação é 100% estruturada para atender empresas (CNPJ).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                tag: 'FRETES RÁPIDOS & LEVES',
                titulo: 'Coletas e Entregas Expressas com Utilitários',
                desc: 'Contamos com 2 unidades Fiat Strada ideais para remessas rápidas, reposição de estoque entre filiais, peças, insumos e entregas ágeis em centros urbanos.',
                vantagens: ['Acesso livre em vias urbanas restritas', 'Agilidade na coleta e entrega no mesmo dia', 'Custo reduzido para pequenos lotes']
              },
              {
                tag: 'CARROCERIA ABERTA',
                titulo: 'Transporte com Caminhão Mercedes 914',
                desc: 'Nosso caminhão Mercedes-Benz 914 de carroceria aberta oferece facilidade total para carga e descarga lateral ou por empilhadeira de materiais, paletes e equipamentos.',
                vantagens: ['Facilidade de carregamento e amarração', 'Ideal para materiais de construção, peças e volumes médios', 'Viagens dedicadas para sua empresa']
              },
              {
                tag: 'PARCERIA B2B',
                titulo: 'Contratos Mensais ou Fretes Avulsos (CNPJ)',
                desc: 'Atendemos sua empresa tanto em demandas pontuais quanto em rotas fixas programadas, com emissão de relatórios e faturamento organizado.',
                vantagens: ['Atendimento exclusivo para Pessoa Jurídica', 'Controle financeiro e emissão de recibos/faturas', 'Compromisso com horários de coleta']
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

      {/* 5. NOSSA FROTA REAL: 1 MERCEDES-BENZ 914 CARROCERIA + 2 FIAT STRADA */}
      <section id="frota" className="py-20 bg-slate-50 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-widest">
              Nossos Veículos
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950">Frota Especializada em Cargas Leves e Médias</h2>
            <p className="text-sm text-slate-600">
              Contamos com 3 veículos próprios revisados e prontos para atender a operação da sua empresa:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* VEÍCULO 1: MERCEDES-BENZ 914 CARROCERIA */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col">
              <div className="h-64 overflow-hidden bg-slate-100">
                <img
                  src="/caminhao-mb914.webp"
                  alt="Caminhão Mercedes-Benz 914 Carroceria"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-7 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-600 uppercase">1 Unidade Disponível • Carroceria Aberta</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">Operacional</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-1">Caminhão Mercedes-Benz 914</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Caminhão de carroceria aberta em madeira, ideal para transporte de cargas comerciais, paletizadas, máquinas, estruturas e mercadorias de médio porte entre empresas.
                  </p>
                </div>
                <a href="#orcamento" className="inline-block pt-4 text-xs font-extrabold text-blue-600 hover:underline">
                  Solicitar frete com o Mercedes 914 →
                </a>
              </div>
            </div>

            {/* VEÍCULOS 2 E 3: 2 UNIDADES FIAT STRADA */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col">
              <div className="h-64 overflow-hidden bg-slate-100 relative flex items-center justify-center">
                <img
                  src="/fiat-strada.png"
                  alt="Utilitários Fiat Strada para Pequenos Fretes"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-md">
                  2 Unidades na Frota
                </div>
              </div>
              <div className="p-7 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-600 uppercase">2 Unidades Disponíveis • Frete Leve & Rápido</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">Operacional</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-1">2x Utilitários Fiat Strada</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Duas picapes utilitárias Fiat Strada dedicadas a fretes pequenos, entregas expressas B2B, coletas urgentes de peças, caixas e insumos com máxima rapidez no trânsito urbano e rodoviário.
                  </p>
                </div>
                <a href="#orcamento" className="inline-block pt-4 text-xs font-extrabold text-blue-600 hover:underline">
                  Solicitar frete rápido com Fiat Strada →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SOLICITAÇÃO DE ORÇAMENTO B2B + CANAIS DE CONTATO (EM MANUTENÇÃO) */}
      <section id="orcamento" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* COLUNA ESQUERDA: INFORMAÇÕES DE CONTATO (EM MANUTENÇÃO) */}
            <div id="contato" className="lg:col-span-5 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-7 space-y-6">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Canais Corporativos</span>
                  <h3 className="text-2xl font-black text-slate-900 mt-1">Informações de Contato</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Atendimento exclusivo para pessoas jurídicas (empresas). Enquanto nossos canais diretos estão sendo atualizados, utilize o formulário ao lado para solicitar cotações.
                  </p>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">📞</div>
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 block">WhatsApp & Telefone Comercial</span>
                      <strong className="text-amber-700 text-sm">{telEmpresa}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">✉️</div>
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 block">E-mail Corporativo</span>
                      <strong className="text-amber-700 text-sm break-all">{emailEmpresa}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white border border-slate-200">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">📍</div>
                    <div>
                      <span className="text-xs font-bold uppercase text-slate-400 block">Endereço / Base Operacional</span>
                      <strong className="text-amber-700 text-sm">{enderecoEmpresa}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: FORMULÁRIO DE SOLICITAÇÃO DE PROPOSTA B2B */}
            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-3xl p-7 sm:p-10 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">Atendimento Exclusivo B2B</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-950 mt-1">Solicitar Orçamento para Empresa</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Informe os dados da sua empresa e a rota desejada. Seu pedido cai diretamente no nosso sistema ERP.
                </p>
              </div>

              {quoteMsg.text && (
                <div className={`p-4 rounded-xl text-sm border font-medium ${quoteMsg.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
                  {quoteMsg.text}
                </div>
              )}

              <form onSubmit={handlePublicQuoteSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Razão Social / Nome da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.cliente}
                    onChange={(e) => setQuoteForm({ ...quoteForm, cliente: e.target.value })}
                    placeholder="Ex: Metalúrgica ABC Ltda"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">CNPJ da Empresa *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.cnpj}
                    onChange={(e) => setQuoteForm({ ...quoteForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Telefone / WhatsApp do Responsável *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.solicitante_telefone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, solicitante_telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={quoteForm.solicitante_email}
                    onChange={(e) => setQuoteForm({ ...quoteForm, solicitante_email: e.target.value })}
                    placeholder="compras@suaempresa.com.br"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Local de Coleta (Origem) *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.origem}
                    onChange={(e) => setQuoteForm({ ...quoteForm, origem: e.target.value })}
                    placeholder="Cidade / Bairro de coleta"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Local de Entrega (Destino) *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.destino}
                    onChange={(e) => setQuoteForm({ ...quoteForm, destino: e.target.value })}
                    placeholder="Cidade / Bairro de entrega"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Veículo Desejado</label>
                  <select
                    value={quoteForm.tipo_veiculo}
                    onChange={(e) => setQuoteForm({ ...quoteForm, tipo_veiculo: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Mercedes-Benz 914 (Carroceria)">Caminhão Mercedes-Benz 914 (Carroceria)</option>
                    <option value="Utilitário Fiat Strada (Frete Pequeno)">Utilitário Fiat Strada (Frete Leve / Pequeno)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Peso Estimado (kg)</label>
                  <input
                    type="number"
                    value={quoteForm.peso_estimado}
                    onChange={(e) => setQuoteForm({ ...quoteForm, peso_estimado: e.target.value })}
                    placeholder="Ex: 500"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Descrição do Material / Volumes</label>
                  <textarea
                    rows={3}
                    value={quoteForm.descricao}
                    onChange={(e) => setQuoteForm({ ...quoteForm, descricao: e.target.value })}
                    placeholder="Descreva o tipo de material comercial/industrial a ser transportado..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={quoteSending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full font-extrabold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {quoteSending ? 'Enviando Solicitação...' : 'Enviar Solicitação de Frete Empresarial →'}
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
            <p className="mt-0.5">© {new Date().getFullYear()} {nomeEmpresa} • Transporte Exclusivo B2B</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <span>📞 WhatsApp: <strong>{telEmpresa}</strong></span>
            <span>📍 Endereço: <strong>{enderecoEmpresa}</strong></span>
            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-bold underline">
              Login Administrativo ERP →
            </Link>
          </div>
        </div>
      </footer>

      {/* BOTÃO FLUTUANTE DE WHATSAPP NO CANTO INFERIOR DIREITO (SINALIZADO COMO EM MANUTENÇÃO) */}
      <div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-800 border border-slate-700 text-white px-5 py-3 rounded-full shadow-2xl"
        title="O número de WhatsApp será disponibilizado em breve"
      >
        <span className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-lg">💬</span>
        <div className="text-left leading-tight pr-1">
          <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-400">WhatsApp Comercial</span>
          <span className="text-xs font-extrabold block">Em manutenção</span>
        </div>
      </div>
    </div>
  );
}
