'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    cliente: '',
    cliente_id: '',
    origem: '',
    destino: '',
    tipo_veiculo: 'Caminhão',
    peso_estimado: '',
    valor: '',
    descricao: '',
    status: 'Pendente'
  });

  useEffect(() => {
    fetchCotacoes();
    fetchClientes();
    fetchEmpresa();
  }, []);

  async function fetchCotacoes() {
    try {
      const { data } = await supabase.from('cotacoes').select('*').order('id', { ascending: false });
      setCotacoes(data || []);
    } catch (error) { console.error(error); }
  }

  async function fetchClientes() {
    try {
      const { data } = await supabase.from('clientes').select('id, nome').order('nome');
      setClientes(data || []);
    } catch (error) { console.error(error); }
  }

  async function fetchEmpresa() {
    try {
      const { data } = await supabase.from('configuracoes_empresa').select('*').maybeSingle();
      setEmpresa(data);
    } catch (error) { console.error(error); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.cliente_id || !formData.valor) {
      showMessage('error', 'Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const clienteSelecionado = clientes.find(c => c.id === parseInt(formData.cliente_id));
      const dataToSave = {
        ...formData,
        cliente: clienteSelecionado?.nome || formData.cliente,
        valor: parseFloat(formData.valor)
      };

      const { error } = editingId 
        ? await supabase.from('cotacoes').update(dataToSave).eq('id', editingId)
        : await supabase.from('cotacoes').insert([dataToSave]);

      if (error) throw error;
      showMessage('success', 'Salvo com sucesso!');
      resetForm();
      fetchCotacoes();
    } catch (error) {
      showMessage('error', 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ cliente: '', cliente_id: '', origem: '', destino: '', tipo_veiculo: 'Caminhão', peso_estimado: '', valor: '', descricao: '', status: 'Pendente' });
    setEditingId(null);
    setShowForm(false);
  }

  async function updateStatus(id, novoStatus) {
    try {
      if (novoStatus === 'Aprovada') {
        const cotacao = cotacoes.find(c => c.id === id);
        await supabase.from('financeiro').insert([{
          descricao: `Frete aprovado - ${cotacao.cliente}`,
          categoria: 'Frete',
          tipo: 'Entrada',
          valor: cotacao.valor,
          data: new Date().toISOString().split('T')[0]
        }]);
      }
      await supabase.from('cotacoes').update({ status: novoStatus }).eq('id', id);
      fetchCotacoes();
      showMessage('success', 'Status atualizado!');
    } catch (error) { showMessage('error', 'Erro ao atualizar'); }
  }

  const gerarPDF = (cotacao) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho Profissional
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    if (empresa?.logo_url) {
      try { doc.addImage(empresa.logo_url, 'PNG', 10, 5, 30, 30); } catch(e){}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(empresa?.nome_fantasia || 'PS LOGÍSTICA', 45, 18);
    doc.setFontSize(10);
    doc.text(empresa?.razao_social || 'Sistema de Gestão de Transportes', 45, 25);
    doc.text(`${empresa?.email || ''} | ${empresa?.telefone || ''}`, 45, 32);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('ORÇAMENTO DE SERVIÇO', 105, 55, { align: 'center' });

    autoTable(doc, {
      startY: 65,
      head: [['Campo', 'Informação']],
      body: [
        ['Cliente', cotacao.cliente],
        ['Origem', cotacao.origem],
        ['Destino', cotacao.destino],
        ['Veículo', cotacao.tipo_veiculo],
        ['Peso', `${cotacao.peso_estimado || 'N/A'} kg`],
        ['VALOR TOTAL', `R$ ${cotacao.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] }
    });

    doc.save(`Orcamento_${cotacao.cliente}.pdf`);
  };

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  }

  const getStatusColor = (status) => {
    if (status === 'Aprovada') return 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';
    if (status === 'Rejeitada') return 'bg-rose-100 dark:bg-red-900 text-rose-800 dark:text-red-200';
    return 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cotações</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all">Nova Cotação</button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cliente *</label>
              <select value={formData.cliente_id} onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white mt-1">
                <option value="">Selecione</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Origem</label>
              <input type="text" placeholder="Origem" value={formData.origem} onChange={(e) => setFormData({ ...formData, origem: e.target.value })} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Destino</label>
              <input type="text" placeholder="Destino" value={formData.destino} onChange={(e) => setFormData({ ...formData, destino: e.target.value })} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Valor (R$)</label>
              <input type="number" placeholder="Valor (R$)" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tipo de Veículo</label>
              <select value={formData.tipo_veiculo} onChange={(e) => setFormData({ ...formData, tipo_veiculo: e.target.value })} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-slate-900 dark:text-white mt-1">
                <option value="Caminhão">Caminhão</option>
                <option value="Van">Van</option>
                <option value="Moto">Moto</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3 mt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg font-bold transition-all">{loading ? 'Salvando...' : 'Salvar'}</button>
              <button type="button" onClick={resetForm} className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white p-2.5 rounded-lg font-bold transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm dark:shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-600">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4">Rota</th>
              <th className="p-4">Valor</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {cotacoes.length > 0 ? (
              cotacoes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">{c.cliente}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{c.origem || '-'} → {c.destino || '-'}</td>
                  <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold">R$ {c.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(c.status)}`}>{c.status}</span></td>
                  <td className="p-4 text-right space-x-3">
                    {c.status === 'Pendente' && <button onClick={() => updateStatus(c.id, 'Aprovada')} className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs font-bold uppercase">Aprovar</button>}
                    <button onClick={() => gerarPDF(c)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold uppercase">PDF</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400">Nenhuma cotação cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}