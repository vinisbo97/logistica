'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ProdutosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Dados de exemplo baseados no seu protótipo, mas modernizados
  const [produtos] = useState([
    { id: '00416', nome: 'Filtro de Linha Magnético 5 Tomadas', marca: 'MAG', estoque: 15, preco: 46.14, status: 'Ativo' },
    { id: '00417', nome: 'Leitor Código de Barras USB', marca: 'ELGIN', estoque: 5, preco: 210.00, status: 'Ativo' },
    { id: '00430', nome: 'Monitor LED 20"', marca: 'HAOQING', estoque: 0, preco: 360.00, status: 'Sem Estoque' },
    { id: '00435', nome: 'Repetidor Wi-Fi AC1200', marca: 'TP-LINK', estoque: 8, preco: 285.00, status: 'Inativo' },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Produtos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie seu catálogo, preços e estoque.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Novo Produto
        </button>
      </div>

      {/* Barra de Pesquisa (Soft UI) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input
            type="text"
            placeholder="Pesquisar por código, nome ou marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <button className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap">
          Filtros Avançados
        </button>
      </div>

      {/* Tabela de Dados (Substituindo a tabela densa do protótipo) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                <th className="p-4 font-semibold">Cód.</th>
                <th className="p-4 font-semibold">Produto</th>
                <th className="p-4 font-semibold">Marca</th>
                <th className="p-4 font-semibold text-right">Estoque</th>
                <th className="p-4 font-semibold text-right">Preço (R$)</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {produtos.map((produto) => (
                <tr key={produto.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-sm">{produto.id}</td>
                  <td className="p-4 font-medium text-slate-900 dark:text-white">{produto.nome}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{produto.marca}</td>
                  <td className="p-4 text-right">
                    <span className={`font-medium ${produto.estoque <= 5 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                      {produto.estoque} un
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium text-slate-900 dark:text-white">
                    {produto.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      produto.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      produto.status === 'Sem Estoque' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {produto.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm text-slate-500">
          <span>Mostrando 4 de 4 produtos</span>
        </div>
      </div>

    </div>
  );
}