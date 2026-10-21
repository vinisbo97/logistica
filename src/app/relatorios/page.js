'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RelatoriosPage() {
  const [filtroData, setFiltroData] = useState('mes'); // 'hoje' | 'mes' | 'ano' | 'tudo'
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState(null);
  const [dre, setDre] = useState({
    receitaBruta: 0,
    custosFrotaViagem: 0,
    despesasFixasImpostos: 0,
    lucroLiquido: 0,
    margemPercentual: 0,
    aReceberPendente: 0,
    aPagarPendente: 0,
    transacoes: 0
  });
  const [topClientes, setTopClientes] = useState([]);
  const [topRotas, setTopRotas] = useState([]);
  const [custoPorVeiculo, setCustoPorVeiculo] = useState([]);

  useEffect(() => {
    carregarRelatorios();
  }, [filtroData]);

  async function carregarRelatorios() {
    setLoading(true);
    try {
      const [
        { data: financeiro },
        { data: cotacoes },
        { data: emp }
      ] = await Promise.all([
        supabase.from('financeiro').select('*'),
        supabase.from('cotacoes').select('*'),
        supabase.from('configuracoes_empresa').select('*').maybeSingle()
      ]);

      setEmpresa(emp || null);
      const listaFin = financeiro || [];
      const listaCot = cotacoes || [];

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      const filtrados = listaFin.filter((t) => {
        if (filtroData === 'tudo') return true;
        const d = new Date(t.data_vencimento || t.data);
        if (filtroData === 'hoje') return d >= inicioHoje;
        if (filtroData === 'mes') return d >= inicioMes;
        if (filtroData === 'ano') return d >= inicioAno;
        return true;
      });

      let receitaBruta = 0;
      let custosFrotaViagem = 0;
      let despesasFixasImpostos = 0;
      let aReceberPendente = 0;
      let aPagarPendente = 0;
      const mapaVeiculos = {};

      filtrados.forEach((f) => {
        const val = Number(f.valor || 0);
        const st = f.status_pagamento || 'Pago';
        const cat = (f.categoria || '').toLowerCase();

        if (f.tipo === 'Entrada') {
          receitaBruta += val;
          if (st !== 'Pago' && st !== 'Recebido') aReceberPendente += val;
        } else {
          if (st !== 'Pago' && st !== 'Recebido') aPagarPendente += val;
          if (cat.includes('combust') || cat.includes('manuten') || cat.includes('pedágio') || cat.includes('motorista')) {
            custosFrotaViagem += val;
          } else {
            despesasFixasImpostos += val;
          }
        }

        if (f.veiculo_placa) {
          if (!mapaVeiculos[f.veiculo_placa]) mapaVeiculos[f.veiculo_placa] = { receita: 0, despesa: 0 };
          if (f.tipo === 'Entrada') mapaVeiculos[f.veiculo_placa].receita += val;
          else mapaVeiculos[f.veiculo_placa].despesa += val;
        }
      });

      const lucroLiquido = receitaBruta - custosFrotaViagem - despesasFixasImpostos;
      const margemPercentual = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

      setDre({
        receitaBruta,
        custosFrotaViagem,
        despesasFixasImpostos,
        lucroLiquido,
        margemPercentual,
        aReceberPendente,
        aPagarPendente,
        transacoes: filtrados.length
      });

      // Ranking de Clientes
      const clientesMap = {};
      listaCot.filter((c) => c.status === 'Aprovada').forEach((c) => {
        const nome = c.cliente || 'Cliente Avulso';
        clientesMap[nome] = (clientesMap[nome] || 0) + Number(c.valor || 0);
      });
      setTopClientes(
        Object.entries(clientesMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cliente, valor]) => ({ cliente, valor }))
      );

      // Ranking de Rotas
      const rotasMap = {};
      listaCot.filter((c) => c.status === 'Aprovada').forEach((c) => {
        const rota = `${c.origem || '-'} → ${c.destino || '-'}`;
        rotasMap[rota] = (rotasMap[rota] || 0) + Number(c.valor || 0);
      });
      setTopRotas(
        Object.entries(rotasMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([rota, valor]) => ({ rota, valor }))
      );

      // Rentabilidade por Veículo
      setCustoPorVeiculo(
        Object.entries(mapaVeiculos).map(([placa, dados]) => ({
          placa,
          receita: dados.receita,
          despesa: dados.despesa,
          resultado: dados.receita - dados.despesa
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportarDREPDF() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.text(empresa?.nome_fantasia || 'PS LOGÍSTICA & TRANSPORTES', 14, 18);
    doc.setFontSize(10);
    doc.text(`DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO (DRE LOGÍSTICO) | Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, 27);

    autoTable(doc, {
      startY: 48,
      head: [['Rubrica do DRE Gerencial', 'Valor (R$)']],
      body: [
        ['(+) RECEITA BRUTA DE FRETES E SERVIÇOS', `R$ ${dre.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(-) CUSTOS DIRETOS DE FROTA E VIAGEM (Diesel, Pedágio, Oficina, Motoristas)', `R$ ${dre.custosFrotaViagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(=) MARGEM DE CONTRIBUIÇÃO OPERACIONAL', `R$ ${(dre.receitaBruta - dre.custosFrotaViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(-) DESPESAS FIXAS, ADMINISTRATIVAS E IMPOSTOS', `R$ ${dre.despesasFixasImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['(=) RESULTADO LÍQUIDO DO PERÍODO (LUCRO / PREJUÍZO)', `R$ ${dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${dre.margemPercentual.toFixed(1)}%)`],
        ['[INFO] Contas a Receber em Aberto', `R$ ${dre.aReceberPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['[INFO] Contas a Pagar em Aberto', `R$ ${dre.aPagarPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });

    doc.save(`DRE_Logistica_${filtroData}.pdf`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="text-slate-400 animate-pulse">Calculando DRE Gerencial e indicadores de rentabilidade...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Relatórios Gerenciais, BI & DRE Logístico
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Demonstrativo de Resultado (Receita vs Custos de Frota vs Despesas), margem líquida e rentabilidade por placa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
          >
            <option value="hoje">Período: Hoje</option>
            <option value="mes">Período: Este Mês</option>
            <option value="ano">Período: Este Ano</option>
            <option value="tudo">Período: Todo o Histórico</option>
          </select>

          <button
            onClick={exportarDREPDF}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md cursor-pointer"
          >
            📄 Exportar DRE em PDF
          </button>
        </div>
      </div>

      {/* CARDS DO DRE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-emerald-600">Receita Bruta de Fretes</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            R$ {dre.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-rose-500">Custos de Viagem & Frota</p>
          <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
            R$ {dre.custosFrotaViagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-amber-500">Despesas Fixas & Impostos</p>
          <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            R$ {dre.despesasFixasImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-blue-500">Lucro Líquido ({dre.margemPercentual.toFixed(1)}%)</p>
          <h3 className={`text-2xl font-extrabold mt-2 ${dre.lucroLiquido >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
            R$ {dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
        </div>
      </div>

      {/* DEMONSTRATIVO ESTRUTURADO (TABELA DRE) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
          Demonstrativo de Resultado do Exercício (DRE Simplificado)
        </h3>
        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <div className="py-3 flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
            <span>(+) Receita Operacional Bruta (Fretes Emitidos)</span>
            <span>R$ {dre.receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="py-3 flex justify-between text-rose-600 dark:text-rose-400">
            <span>(-) Custos Diretos de Transporte (Combustível, Pedágio, Diárias, Manutenção)</span>
            <span>- R$ {dre.custosFrotaViagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="py-3 flex justify-between font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 px-3 rounded-lg">
            <span>(=) Margem de Contribuição Operacional</span>
            <span>R$ {(dre.receitaBruta - dre.custosFrotaViagem).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="py-3 flex justify-between text-amber-600 dark:text-amber-400">
            <span>(-) Despesas Administrativas, Fixas e Documentação</span>
            <span>- R$ {dre.despesasFixasImpostos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="py-4 flex justify-between text-base font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 px-4 rounded-xl">
            <span>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</span>
            <span>R$ {dre.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({dre.margemPercentual.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* RENTABILIDADE POR VEÍCULO E RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">🚛 Resultado por Placa (Frota)</h3>
          <div className="space-y-2.5">
            {custoPorVeiculo.length > 0 ? (
              custoPorVeiculo.map((v) => (
                <div key={v.placa} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">{v.placa}</span>
                    <span className="text-slate-400">
                      Rec: R$ {v.receita.toLocaleString('pt-BR')} | Desp: R$ {v.despesa.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <span className={`font-extrabold ${v.resultado >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    R$ {v.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">Vincule placas aos lançamentos para ver o lucro por caminhão.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">🏢 Top 5 Clientes (Faturamento)</h3>
          <div className="space-y-2.5">
            {topClientes.length > 0 ? (
              topClientes.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                  <span className="text-slate-900 dark:text-white font-bold">{i + 1}. {c.cliente}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs text-center py-4">Sem dados de faturamento.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">🛣️ Top 5 Rotas Mais Rentáveis</h3>
          <div className="space-y-2.5">
            {topRotas.length > 0 ? (
              topRotas.map((r, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                  <span className="text-slate-900 dark:text-white font-bold">{r.rota}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    R$ {r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs text-center py-4">Sem dados de rotas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
