'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProdutosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    categoria: 'Pneus & Rodagem',
    marca: '',
    estoque: '',
    estoque_minimo: '5',
    preco: ''
  });

  const padraoInsumos = [
    { id: 1, codigo: 'INS-001', nome: 'Óleo Motor Diesel 15W40 (Balde 20L)', categoria: 'Lubrificantes', marca: 'Shell Rimula', estoque: 12, estoque_minimo: 4, preco: 480.00 },
    { id: 2, codigo: 'PNE-002', nome: 'Pneu Caminhão 295/80 R22.5 Radial', categoria: 'Pneus & Rodagem', marca: 'Michelin', estoque: 6, estoque_minimo: 4, preco: 2890.00 },
    { id: 3, codigo: 'EPI-003', nome: 'Cinta Catraca Amarração de Carga 10T (9m)', categoria: 'Amarração & Carga', marca: 'Vonder', estoque: 25, estoque_minimo: 10, preco: 145.00 },
    { id: 4, codigo: 'ARL-004', nome: 'Arla 32 Galão 20 Litros Homologado', categoria: 'Insumos Frota', marca: 'Petrobras', estoque: 3, estoque_minimo: 8, preco: 89.90 }
  ];

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    try {
      const { data, error } = await supabase.from('produtos').select('*').order('nome', { ascending: true });
      if (!error && data && data.length > 0) {
        setProdutos(data);
      } else {
        const salvo = JSON.parse(localStorage.getItem('pslog_produtos') || 'null');
        setProdutos(salvo || padraoInsumos);
      }
    } catch (err) {
      setProdutos(padraoInsumos);
    }
  }

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  function resetForm() {
    setFormData({
      codigo: `INS-${Math.floor(100 + Math.random() * 900)}`,
      nome: '',
      categoria: 'Pneus & Rodagem',
      marca: '',
      estoque: '',
      estoque_minimo: '5',
      preco: ''
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!formData.nome.trim()) return;
    setLoading(true);
    try {
      const payload = {
        codigo: formData.codigo || `INS-${Math.floor(100 + Math.random() * 900)}`,
        nome: formData.nome.trim(),
        categoria: formData.categoria,
        marca: formData.marca,
        estoque: parseFloat(formData.estoque || 0),
        estoque_minimo: parseFloat(formData.estoque_minimo || 5),
        preco: parseFloat(formData.preco || 0),
        status: parseFloat(formData.estoque || 0) <= 0 ? 'Sem Estoque' : 'Ativo'
      };

      const { error } = editingId
        ? await supabase.from('produtos').update(payload).eq('id', editingId)
        : await supabase.from('produtos').insert([payload]);

      if (error) {
        const lista = [...produtos];
        if (editingId) {
          const idx = lista.findIndex((p) => p.id === editingId);
          if (idx >= 0) lista[idx] = { ...payload, id: editingId };
        } else {
          lista.push({ ...payload, id: Date.now() });
        }
        localStorage.setItem('pslog_produtos', JSON.stringify(lista));
        setProdutos(lista);
      } else {
        carregarProdutos();
      }
      showMessage('success', 'Item salvo no almoxarifado!');
      resetForm();
    } catch (err) {
      showMessage('error', 'Erro ao salvar item.');
    } finally {
      setLoading(false);
    }
  }

  async function ajustarEstoque(item, delta) {
    const novoEstoque = Math.max(0, Number(item.estoque || 0) + delta);
    const { error } = await supabase.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
    if (error) {
      const novaLista = produtos.map((p) => (p.id === item.id ? { ...p, estoque: novoEstoque } : p));
      localStorage.setItem('pslog_produtos', JSON.stringify(novaLista));
      setProdutos(novaLista);
    } else {
      carregarProdutos();
    }
  }

  const filtrados = produtos.filter((p) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return (
      (p.nome || '').toLowerCase().includes(t) ||
      (p.codigo || '').toLowerCase().includes(t) ||
      (p.marca || '').toLowerCase().includes(t) ||
      (p.categoria || '').toLowerCase().includes(t)
    );
  });

  const valorTotalEstoque = produtos.reduce((acc, p) => acc + Number(p.estoque || 0) * Number(p.preco || 0), 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Almoxarifado, Peças & Insumos de Frota
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Controle de estoque de pneus, filtros, lubrificantes, Arla 32, cintas de amarração e EPIs.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer"
        >
          + Cadastrar Peça / Insumo
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50 dark:bg-red-950 border-rose-200 dark:border-red-700 text-rose-800 dark:text-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* INDICADORES DO ALMOXARIFADO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-slate-400">Itens Cadastrados</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{produtos.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-rose-500">Abaixo do Estoque Mínimo</p>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {produtos.filter((p) => Number(p.estoque || 0) <= Number(p.estoque_minimo || 5)).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase text-emerald-600">Valor Imobilizado em Peças</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            R$ {valorTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">
            {editingId ? 'Editar Item de Estoque' : 'Novo Item do Almoxarifado'}
          </h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Código Interno</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Descrição da Peça / Insumo *</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Pneu 295/80 R22.5 / Filtro Combustível Scania"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              >
                <option value="Pneus & Rodagem">Pneus & Rodagem</option>
                <option value="Lubrificantes & Filtros">Lubrificantes & Filtros</option>
                <option value="Amarração & Carga">Amarração & Carga (Cintas/Lonas)</option>
                <option value="Peças Mecânicas">Peças Mecânicas & Elétricas</option>
                <option value="Insumos Frota">Arla 32 & Insumos</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Marca / Fabricante</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                placeholder="Ex: Michelin / Mann / Shell"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Custo Unitário (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.preco}
                onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Saldo Atual em Estoque</label>
              <input
                type="number"
                value={formData.estoque}
                onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                placeholder="10"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white mt-1"
              />
            </div>

            <div className="md:col-span-2 flex gap-3 items-end">
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-bold text-sm cursor-pointer">
                Salvar no Almoxarifado
              </button>
              <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BARRA DE PESQUISA E TABELA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
        <input
          type="text"
          placeholder="Pesquisar por código, nome da peça, categoria ou fabricante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500">
                <th className="p-3.5">Cód.</th>
                <th className="p-3.5">Peça / Insumo</th>
                <th className="p-3.5">Categoria / Marca</th>
                <th className="p-3.5 text-center">Saldo Estoque</th>
                <th className="p-3.5 text-right">Custo Unit.</th>
                <th className="p-3.5 text-right">Movimentar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filtrados.map((p) => {
                const baixo = Number(p.estoque || 0) <= Number(p.estoque_minimo || 5);
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 font-mono text-xs text-blue-600 dark:text-blue-400 font-bold">{p.codigo || p.id}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{p.nome}</td>
                    <td className="p-3.5 text-xs text-slate-500">{p.categoria || 'Frota'} • {p.marca}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${baixo ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                        {p.estoque} un {baixo ? '(Repor)' : ''}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900 dark:text-white">
                      R$ {Number(p.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => ajustarEstoque(p, 1)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold text-xs cursor-pointer"
                        title="Registrar entrada de 1 unidade"
                      >
                        +1 Entrada
                      </button>
                      <button
                        onClick={() => ajustarEstoque(p, -1)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 font-bold text-xs cursor-pointer"
                        title="Dar baixa de 1 unidade para uso na frota"
                      >
                        -1 Baixa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
