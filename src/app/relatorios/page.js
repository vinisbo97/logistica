'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState({
    hoje: { receita: 0, despesa: 0, saldo: 0, transacoes: 0 },
    mes: { receita: 0, despesa: 0, saldo: 0, transacoes: 0 },
    ano: { receita: 0, despesa: 0, saldo: 0, transacoes: 0 }
  });
  const [filtroData, setFiltroData] = useState('mes');
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topClientes, setTopClientes] = useState([]);
  const [topRotas, setTopRotas] = useState([]);

  useEffect(() => {
    carregarRelatorios();
  }, [filtroData]);

  async function carregarRelatorios() {
    setLoading(true);
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      const { data: financeiro } = await supabase.from('financeiro').select('*');
      const { data: cotacoes } = await supabase.from('cotacoes').select('*');

      const transacoesHoje = financeiro?.filter(t => {
        const dataT = new Date(t.data);
        return dataT >= inicioHoje && dataT < new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000);
      }) || [];
      const receitaHoje = transacoesHoje.filter(t => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
      const despesaHoje = transacoesHoje.filter(t => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0);

      const transacoesMes = financeiro?.filter(t => {
        const dataT = new Date(t.data);
        return dataT >= inicioMes && dataT < new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
      }) || [];
      const receitaMes = transacoesMes.filter(t => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
      const despesaMes = transacoesMes.filter(t => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0);

      const transacoesAno = financeiro?.filter(t => {
        const dataT = new Date(t.data);
        return dataT >= inicioAno && dataT < new Date(hoje.getFullYear() + 1, 0, 1);
      }) || [];
      const receitaAno = transacoesAno.filter(t => t.tipo === 'Entrada').reduce((acc, t) => acc + t.valor, 0);
      const despesaAno = transacoesAno.filter(t => t.tipo === 'Saída').reduce((acc, t) => acc + t.valor, 0);

      setRelatorios({
        hoje: { receita: receitaHoje, despesa: despesaHoje, saldo: receitaHoje - despesaHoje, transacoes: transacoesHoje.length },
        mes: { receita: receitaMes, despesa: despesaMes, saldo: receitaMes - despesaMes, transacoes: transacoesMes.length },
        ano: { receita: receitaAno, despesa: despesaAno, saldo: receitaAno - despesaAno, transacoes: transacoesAno.length }
      });

      if (filtroData === 'mes') setDados(transacoesMes);
      else if (filtroData === 'ano') setDados(transacoesAno);
      else setDados(transacoesHoje);

      const clientesFaturamento = {};
      cotacoes?.filter(c => c.status === 'Aprovada').forEach(c => {
        if (!clientesFaturamento[c.cliente]) clientesFaturamento[c.cliente] = 0;
        clientesFaturamento[c.cliente] += c.valor;
      });
      setTopClientes(Object.entries(clientesFaturamento).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cliente, valor]) => ({ cliente, valor })));

      const rotasFaturamento = {};
      cotacoes?.filter(c => c.status === 'Aprovada').forEach(c => {
        const rota = `${c.origem || '-'} → ${c.destino || '-'}`;
        if (!rotasFaturamento[rota]) rotasFaturamento[rota] = 0;
        rotasFaturamento[rota] += c.valor;
      });
      setTopRotas(Object.entries(rotasFaturamento).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([rota, valor]) => ({ rota, valor })));

    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  }

  const dadosFiltrados = relatorios[filtroData];
  const dadosPorDia = {};
  dados.forEach(d => {
    const dia = new Date(d.data).toLocaleDateString('pt-BR');
    if (!dadosPorDia[dia]) dadosPorDia[dia] = { receita: 0, despesa: 0 };
    if (d.tipo === 'Entrada') dadosPorDia[dia].receita += d.valor;
    else dadosPorDia[dia].despesa += d.valor;
  });

  const diasOrdenados = Object.keys(dadosPorDia).sort();
  const maxValor = Math.max(...Object.values(dadosPorDia).map(d => Math.max(d.receita, d.despesa)), 1);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-xl text-slate-400 animate-pulse">Carregando relatórios...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Relatórios e BI</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Análise de faturamento e desempenho financeiro</p>
        </div>
        <select
          value={filtroData}
          onChange={(e) => setFiltroData(e.target.value)}
          className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="hoje">Hoje</option>
          <option value="mes">Este Mês</option>
          <option value="ano">Este Ano</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Receita</p>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-lg">📈</div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            R$ {dadosFiltrados.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Despesa</p>
            <div className="w-10 h-10 bg-rose-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-lg">📉</div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600 dark:text-red-400">
            R$ {dadosFiltrados.despesa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Saldo</p>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${dadosFiltrados.saldo >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-rose-100 dark:bg-red-900/30'}`}>💰</div>
          </div>
          <h3 className={`text-2xl font-bold ${dadosFiltrados.saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-red-400'}`}>
            R$ {dadosFiltrados.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Transações</p>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-lg">📊</div>
          </div>
          <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">{dadosFiltrados.transacoes}</h3>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Fluxo de Caixa (Receita vs Despesa)</h3>
        {diasOrdenados.length > 0 ? (
          <div className="space-y-4">
            {diasOrdenados.map((dia) => {
              const { receita, despesa } = dadosPorDia[dia];
              const alturaReceita = (receita / maxValor) * 100;
              const alturaDespesa = (despesa / maxValor) * 100;
              return (
                <div key={dia} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{dia}</span>
                    <div className="flex gap-3">
                      <span className="text-emerald-600 dark:text-emerald-400">R$ {receita.toLocaleString('pt-BR')}</span>
                      <span className="text-rose-600 dark:text-red-400">R$ {despesa.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-3">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${alturaReceita}%` }} />
                    </div>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${alturaDespesa}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 italic">Nenhum dado financeiro no período.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Top 5 Clientes (Faturamento)</h3>
          <div className="space-y-3">
            {topClientes.length > 0 ? topClientes.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <span className="text-slate-900 dark:text-white font-medium">{i + 1}. {c.cliente}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">R$ {c.valor.toLocaleString('pt-BR')}</span>
              </div>
            )) : <p className="text-slate-400 italic text-center py-4">Sem dados.</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Top 5 Rotas (Faturamento)</h3>
          <div className="space-y-3">
            {topRotas.length > 0 ? topRotas.map((r, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <span className="text-slate-900 dark:text-white font-medium text-sm">{r.rota}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">R$ {r.valor.toLocaleString('pt-BR')}</span>
              </div>
            )) : <p className="text-slate-400 italic text-center py-4">Sem dados.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}