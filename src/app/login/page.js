'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    clientes: 0,
    cotacoesAprovadas: 0,
    veiculos: 0,
    saldo: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { count: clientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true });
        const { count: entregas } = await supabase.from('cotacoes').select('*', { count: 'exact', head: true }).eq('status', 'Aprovada');
        const { count: veiculos } = await supabase.from('veiculos').select('*', { count: 'exact', head: true });
        
        const { data: financeiro } = await supabase.from('financeiro').select('valor, tipo');
        let saldoCalc = 0;
        if (financeiro) {
          financeiro.forEach(item => {
            if (item.tipo === 'Entrada') saldoCalc += item.valor;
            if (item.tipo === 'Saída') saldoCalc -= item.valor;
          });
        }

        setStats({
          clientes: clientes || 0,
          cotacoesAprovadas: entregas || 0,
          veiculos: veiculos || 0,
          saldo: saldoCalc
        });
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindo ao PS Logística. Aqui está o resumo das suas operações.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="text-slate-400 animate-pulse">Carregando painel...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Clientes Ativos</p>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-lg">👥</div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.clientes}</h3>
            <Link href="/clientes" className="text-xs text-blue-600 dark:text-blue-400 mt-2 block hover:underline">Ver clientes →</Link>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Entregas Ativas</p>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-lg">🚚</div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.cotacoesAprovadas}</h3>
            <Link href="/entregas" className="text-xs text-amber-600 dark:text-amber-400 mt-2 block hover:underline">Acompanhar entregas →</Link>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Frota</p>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-lg">🚛</div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.veiculos}</h3>
            <Link href="/veiculos" className="text-xs text-purple-600 dark:text-purple-400 mt-2 block hover:underline">Gerenciar frota →</Link>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Saldo Atual</p>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${stats.saldo >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>💰</div>
            </div>
            <h3 className={`text-2xl font-bold ${stats.saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              R$ {stats.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <Link href="/financeiro" className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 block hover:underline">Ver financeiro →</Link>
          </div>

        </div>
      )}
    </div>
  );
}