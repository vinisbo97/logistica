'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function EntregasPage() {
  const [entregas, setEntregas] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState('Todos');
  const [escalaAbertaId, setEscalaAbertaId] = useState(null);
  const [escalaForm, setEscalaForm] = useState({ motorista_nome: '', veiculo_placa: '' });

  useEffect(() => {
    carregarTorre();
  }, []);

  async function carregarTorre() {
    try {
      const [
        { data: ent },
        { data: mot },
        { data: vei },
        { data: emp }
      ] = await Promise.all([
        supabase.from('cotacoes').select('*').eq('status', 'Aprovada').order('id', { ascending: false }),
        supabase.from('motoristas').select('id, nome').order('nome'),
        supabase.from('veiculos').select('id, placa, modelo').order('placa'),
        supabase.from('configuracoes_empresa').select('*').maybeSingle()
      ]);
      setEntregas(ent || []);
      setMotoristas(mot || []);
      setVeiculos(vei || []);
      setEmpresa(emp || null);
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  async function updateStatusEntrega(id, novoStatus) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update({ status_entrega: novoStatus })
        .eq('id', id);

      if (error) throw error;
      showMessage('success', `Status operacional alterado para "${novoStatus}"!`);
      carregarTorre();
    } catch (error) {
      showMessage('error', 'Erro ao atualizar status da entrega.');
    } finally {
      setLoading(false);
    }
  }

  async function salvarEscala(id) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('cotacoes')
        .update({
          motorista_nome: escalaForm.motorista_nome,
          veiculo_placa: escalaForm.veiculo_placa
        })
        .eq('id', id);

      if (error) throw error;
      showMessage('success', 'Motorista e veículo vinculados à viagem!');
      setEscalaAbertaId(null);
      carregarTorre();
    } catch (err) {
      showMessage('error', 'Não foi possível salvar a escala.');
    } finally {
      setLoading(false);
    }
  }

  function emitirManifestoPDF(e) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(17);
    doc.text(empresa?.nome_fantasia || 'PS LOGÍSTICA & TRANSPORTES', 14, 18);
    doc.setFontSize(10);
    doc.text(`MANIFESTO DE CARGA & ORDEM DE VIAGEM | Rastreio: ${e.codigo_rastreio || `PS-2026-${e.id}`}`, 14, 27);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text('FICHA DE VIAGEM E CANHOTO DE ENTREGA', 14, 50);

    autoTable(doc, {
      startY: 56,
      head: [['Informação da Viagem', 'Detalhamento Operacional']],
      body: [
        ['Código de Rastreamento', e.codigo_rastreio || `PS-2026-${e.id}`],
        ['Cliente / Destinatário', e.cliente || '-'],
        ['Origem (Coleta)', e.origem || '-'],
        ['Destino (Entrega)', e.destino || '-'],
        ['Motorista Responsável', e.motorista_nome || 'Não escalado'],
        ['Veículo / Placa', `${e.tipo_veiculo || 'Caminhão'} — ${e.veiculo_placa || 'Sem placa'}`],
        ['Peso / Carga', `${e.peso_estimado || '-'} kg | ${e.descricao || 'Carga Geral'}`],
        ['Status Atual', e.status_entrega || 'Coletado']
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.setFontSize(10);
    doc.text('___________________________________________________', 14, finalY);
    doc.text('Assinatura do Motorista (Saída / Conferência)', 14, finalY + 6);

    doc.text('___________________________________________________', 115, finalY);
    doc.text('Canhoto Recebedor / Cliente (Data e Assinatura)', 115, finalY + 6);

    doc.save(`Manifesto_${e.codigo_rastreio || e.id}.pdf`);
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Coletado':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
      case 'Em Trânsito':
        return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200';
      case 'Entregue':
        return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200';
      case 'Problema':
        return 'bg-rose-100 dark:bg-red-950 text-rose-800 dark:text-red-200';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
    }
  };

  const filtered = filter === 'Todos'
    ? entregas
    : entregas.filter((e) => (e.status_entrega || 'Coletado') === filter);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Torre de Controle de Entregas & Manifestos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Monitoramento em tempo real das viagens aprovadas, escala de motoristas e emissão de manifesto com canhoto.
          </p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* INDICADORES DA TORRE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-slate-400">Total de Viagens</p>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{entregas.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-amber-500">Em Trânsito na Estrada</p>
          <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {entregas.filter((e) => (e.status_entrega || 'Coletado') === 'Em Trânsito').length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-emerald-500">Entregas Concluídas</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {entregas.filter((e) => (e.status_entrega || 'Coletado') === 'Entregue').length}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-rose-500">Ocorrências / Avarias</p>
          <h3 className="text-2xl font-extrabold text-rose-600 dark:text-red-400 mt-1">
            {entregas.filter((e) => (e.status_entrega || 'Coletado') === 'Problema').length}
          </h3>
        </div>
      </div>

      {/* TABELA DA TORRE DE CONTROLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white">Operações de Transporte Ativas</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs font-bold"
          >
            <option value="Todos">Status: Todos</option>
            <option value="Coletado">Coletado (No Pátio)</option>
            <option value="Em Trânsito">Em Trânsito (Na Estrada)</option>
            <option value="Entregue">Entregue (Finalizado)</option>
            <option value="Problema">Com Ocorrência / Problema</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-4">Rastreio / Cliente</th>
                <th className="p-4">Rota</th>
                <th className="p-4">Escala (Motorista & Placa)</th>
                <th className="p-4">Frete</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {filtered.length > 0 ? (
                filtered.map((entrega) => {
                  const statusAtual = entrega.status_entrega || 'Coletado';
                  return (
                    <tr key={entrega.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-4">
                        <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 block">
                          {entrega.codigo_rastreio || `PS-2026-${entrega.id}`}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{entrega.cliente}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                        {entrega.origem || '-'} → {entrega.destino || '-'}
                      </td>
                      <td className="p-4 text-xs">
                        {escalaAbertaId === entrega.id ? (
                          <div className="flex flex-col gap-1.5 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                            <select
                              value={escalaForm.motorista_nome}
                              onChange={(e) => setEscalaForm({ ...escalaForm, motorista_nome: e.target.value })}
                              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
                            >
                              <option value="">Selecionar motorista...</option>
                              {motoristas.map((m) => (
                                <option key={m.id} value={m.nome}>{m.nome}</option>
                              ))}
                            </select>
                            <select
                              value={escalaForm.veiculo_placa}
                              onChange={(e) => setEscalaForm({ ...escalaForm, veiculo_placa: e.target.value })}
                              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
                            >
                              <option value="">Selecionar placa...</option>
                              {veiculos.map((v) => (
                                <option key={v.id} value={v.placa}>{v.placa} - {v.modelo}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <button onClick={() => salvarEscala(entrega.id)} className="bg-blue-600 text-white px-2 py-1 rounded text-[11px] font-bold cursor-pointer">Salvar</button>
                              <button onClick={() => setEscalaAbertaId(null)} className="bg-slate-300 dark:bg-slate-700 px-2 py-1 rounded text-[11px] cursor-pointer">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              👤 {entrega.motorista_nome || 'Sem motorista'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              🚛 {entrega.veiculo_placa || entrega.tipo_veiculo || 'Sem placa'}
                              <button
                                onClick={() => {
                                  setEscalaAbertaId(entrega.id);
                                  setEscalaForm({
                                    motorista_nome: entrega.motorista_nome || '',
                                    veiculo_placa: entrega.veiculo_placa || ''
                                  });
                                }}
                                className="ml-2 text-blue-500 hover:underline font-semibold cursor-pointer"
                              >
                                [Escalar]
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        R$ {Number(entrega.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(statusAtual)}`}>
                          {statusAtual}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap space-x-2">
                        {statusAtual === 'Coletado' && (
                          <button
                            onClick={() => updateStatusEntrega(entrega.id, 'Em Trânsito')}
                            disabled={loading}
                            className="bg-amber-500 hover:bg-amber-400 text-white px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer"
                          >
                            Iniciar Viagem
                          </button>
                        )}
                        {statusAtual === 'Em Trânsito' && (
                          <button
                            onClick={() => updateStatusEntrega(entrega.id, 'Entregue')}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer"
                          >
                            ✓ Confirmar Entrega
                          </button>
                        )}
                        {statusAtual !== 'Entregue' && statusAtual !== 'Problema' && (
                          <button
                            onClick={() => updateStatusEntrega(entrega.id, 'Problema')}
                            disabled={loading}
                            className="text-rose-600 dark:text-red-400 hover:underline font-bold text-xs cursor-pointer"
                          >
                            Ocorrência
                          </button>
                        )}
                        {statusAtual === 'Problema' && (
                          <button
                            onClick={() => updateStatusEntrega(entrega.id, 'Em Trânsito')}
                            disabled={loading}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs cursor-pointer"
                          >
                            Retomar Rota
                          </button>
                        )}
                        <button
                          onClick={() => emitirManifestoPDF(entrega)}
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer"
                        >
                          📄 Manifesto PDF
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Nenhuma entrega encontrada para este filtro.
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
