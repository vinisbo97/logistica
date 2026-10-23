'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [empresa, setEmpresa] = useState(null);
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
    carregarDashboardERP();
  }, []);

  async function carregarDashboardERP() {
    setLoadingDash(true);
    try {
      const [
        { data: emp },
        { data: clientes },
        { data: cotacoes },
        { data: veiculos },
        { data: motoristas },
        { data: financeiro }
      ] = await Promise.all([
        supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle(),
        supabase.from('clientes').select('*'),
        supabase.from('cotacoes').select('*').order('id', { ascending: false }),
        supabase.from('veiculos').select('*'),
        supabase.from('motoristas').select('*'),
        supabase.from('financeiro').select('*').order('data_vencimento', { ascending: true })
      ]);

      if (emp) setEmpresa(emp);
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
            href="/"
            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
          >
            🌐 Ver Site Principal
          </Link>
          <Link
            href="/coletas-gmax"
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black shadow-md transition-all"
          >
            📑 Planilha Coletas GMAX
          </Link>
          <Link
            href="/cotacoes"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all"
          >
            + Nova Cotação
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
