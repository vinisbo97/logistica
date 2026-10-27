'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const CIDADES_REGIAO = [
  'PIRACICABA',
  'AMERICANA',
  'SANTA BARBARA D\'OESTE',
  'LIMEIRA',
  'ARARAS',
  'SUMARE',
  'PAULINIA',
  'RIO CLARO',
  'INDAIATUBA',
  'LOUVEIRA',
  'JUNDIAI',
  'ITUPEVA',
  'SOROCABA',
  'GUARULHOS',
  'CAMPINAS'
];

const VALORES_PADRAO = {
  'PIRACICABA': 50,
  'AMERICANA': 50,
  'SANTA BARBARA D\'OESTE': 50,
  'SBO': 50,
  'SUMARE': 50,
  'LIMEIRA': 50,
  'PAULINIA': 50,
  'RIO CLARO': 80,
  'ARARAS': 110
};

const DADOS_INICIAIS = [
  { seq: '1', tipo: 'COLETA', empresa: 'LUITEX', nf: '644089', qtd_vol: 1, unid_vol: 'VOL', peso: 0.4, unid_peso: 'KG', data: '2026-10-19', origem: 'AMERICANA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '2', tipo: 'COLETA', empresa: 'CANEPARTS', nf: '4928', qtd_vol: 1, unid_vol: 'VOL', peso: 0.736, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50 },
  { seq: '3', tipo: 'COLETA', empresa: 'REZENFLEX', nf: '114955', qtd_vol: 1, unid_vol: 'VOL', peso: 1, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'AÇUCAR E ALCOOL', valor: 50 },
  { seq: '4', tipo: 'COLETA', empresa: 'REZENFLEX', nf: '115064', qtd_vol: 2, unid_vol: 'VOL', peso: 46, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'AÇUCAR E ALCOOL', valor: 50 },
  { seq: '', tipo: 'COLETA', empresa: 'COLVADIS', nf: '79483', qtd_vol: 1, unid_vol: 'VOL', peso: 4, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '5', tipo: 'COLETA', empresa: 'UCAF', nf: '25786', qtd_vol: 2, unid_vol: 'VOL', peso: 51, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '6', tipo: 'COLETA', empresa: 'SEALVALVE', nf: '12631', qtd_vol: 1, unid_vol: 'VOL', peso: 10, unid_peso: 'KG', data: '2026-10-19', origem: 'ARARAS', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 110 },
  { seq: '19', tipo: 'COLETA', empresa: 'KRAHENBUHL', nf: '388735', qtd_vol: 1, unid_vol: 'VOL', peso: 160, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '20', tipo: 'COLETA', empresa: 'KRAHENBUHL', nf: '388872', qtd_vol: 4, unid_vol: 'VOL', peso: 76, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '21', tipo: 'COLETA', empresa: 'DELTALAB', nf: '53023', qtd_vol: 1, unid_vol: 'VOL', peso: 4.1, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'AÇUCAR E ALCOOL', valor: 50 },
  { seq: '22', tipo: 'COLETA', empresa: 'ALUCEL', nf: '90585', qtd_vol: 1, unid_vol: 'VOL', peso: 1, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '23', tipo: 'COLETA', empresa: 'ALUCEL', nf: '165626', qtd_vol: 3, unid_vol: 'VOL', peso: 16, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151794', qtd_vol: 1, unid_vol: 'VOL', peso: 48, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '24', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151741', qtd_vol: 1, unid_vol: 'VOL', peso: 0.8, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 0 },
  { seq: '25', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151803', qtd_vol: 1, unid_vol: 'VOL', peso: 3, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '26', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151875', qtd_vol: 1, unid_vol: 'VOL', peso: 5, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'CRV', valor: 0 },
  { seq: '27', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151952', qtd_vol: 1, unid_vol: 'VOL', peso: 2, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 0 },
  { seq: '28', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151795', qtd_vol: 1, unid_vol: 'VOL', peso: 3, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '29', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151796', qtd_vol: 1, unid_vol: 'VOL', peso: 94, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 160 },
  { seq: '30', tipo: 'COLETA', empresa: 'UNIMIL', nf: '348003', qtd_vol: 2, unid_vol: 'VOL', peso: 18.38, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '31', tipo: 'COLETA', empresa: 'UNIMIL', nf: '348127', qtd_vol: 2, unid_vol: 'VOL', peso: 47.44, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'ITAMARATI', valor: 0 },
  { seq: '32', tipo: 'COLETA', empresa: 'UNIMIL', nf: '348099', qtd_vol: 3, unid_vol: 'VOL', peso: 46.64, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '33', tipo: 'COLETA', empresa: 'UNIMIL', nf: '348142', qtd_vol: 9, unid_vol: 'VOL', peso: 62.28, unid_peso: 'KG', data: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'ITAMARATI', valor: 160 },
  { seq: '34', tipo: 'COLETA', empresa: 'BIOCHIMECAL', nf: '39817', qtd_vol: 6, unid_vol: 'VOL', peso: 60, unid_peso: 'KG', data: '2026-10-20', origem: 'SUMARE', coletor: 'LUIZ', destino: 'BARRALCOOL', valor: 50 },
  { seq: '35', tipo: 'COLETA', empresa: 'AZTRA', nf: '174', qtd_vol: 1, unid_vol: 'VOL', peso: 37, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'SERTMAX', valor: 50 },
  { seq: '36', tipo: 'COLETA', empresa: 'SALARINOX', nf: '28606', qtd_vol: 1, unid_vol: 'VOL', peso: 13.532, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50 },
  { seq: '37', tipo: 'COLETA', empresa: 'SALARINOX', nf: '28597', qtd_vol: 1, unid_vol: 'VOL', peso: 4.5, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50 },
  { seq: '38', tipo: 'COLETA', empresa: 'APOLINOX', nf: '2289', qtd_vol: 1, unid_vol: 'VOL', peso: 140, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50 },
  { seq: '39', tipo: 'COLETA', empresa: 'ELEPIRA', nf: '282485', qtd_vol: 2, unid_vol: 'VOL', peso: 30, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '40', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '152008', qtd_vol: 1, unid_vol: 'VOL', peso: 2, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'CRV', valor: 50 },
  { seq: '41', tipo: 'COLETA', empresa: 'TRATORCOM', nf: '151983', qtd_vol: 1, unid_vol: 'VOL', peso: 340, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'CRV', valor: 50 },
  { seq: '42', tipo: 'COLETA', empresa: 'INOXRIO', nf: '19491', qtd_vol: 3, unid_vol: 'VOL', peso: 30, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'NOVA GALIA', valor: 50 },
  { seq: '43', tipo: 'COLETA', empresa: 'DIMENSIONAL', nf: '589281', qtd_vol: 1, unid_vol: 'VOL', peso: 50, unid_peso: 'KG', data: '2026-10-20', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'COMP. AGRICOLA', valor: 50 },
  { seq: '44', tipo: 'COLETA', empresa: 'RAESA', nf: '32535', qtd_vol: 1, unid_vol: 'VOL', peso: 8.45, unid_peso: 'KG', data: '2026-10-20', origem: 'ARARAS', coletor: 'LUIZ', destino: 'DA MATA', valor: 110 },
  { seq: '45', tipo: 'COLETA', empresa: 'RAESA', nf: '32538', qtd_vol: 1, unid_vol: 'VOL', peso: 0.52, unid_peso: 'KG', data: '2026-10-20', origem: 'ARARAS', coletor: 'LUIZ', destino: 'CIA CANAVIEIRA', valor: 110 },
  { seq: '46', tipo: 'TRANSBORDO', empresa: 'ANASTACIO', nf: '6180', qtd_vol: 20, unid_vol: 'VOL', peso: 510, unid_peso: 'KG', data: '2026-10-20', origem: 'LOUVEIRA', coletor: 'GMAX', destino: 'CJ SELECTA', valor: 0 },
  { seq: '47', tipo: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250555', qtd_vol: 2, unid_vol: 'VOL', peso: 1062, unid_peso: 'KG', data: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'CRV', valor: 0 },
  { seq: '48', tipo: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250557', qtd_vol: 1, unid_vol: 'VOL', peso: 17, unid_peso: 'KG', data: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'CIA AGRICOLA', valor: 0 },
  { seq: '49', tipo: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250559', qtd_vol: 1, unid_vol: 'VOL', peso: 260, unid_peso: 'KG', data: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '50', tipo: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250560', qtd_vol: 1, unid_vol: 'VOL', peso: 236, unid_peso: 'KG', data: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '51', tipo: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250556', qtd_vol: 1, unid_vol: 'VOL', peso: 683, unid_peso: 'KG', data: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'CRV', valor: 0 },
  { seq: '52', tipo: 'TRANSBORDO', empresa: 'VI', nf: '264211', qtd_vol: 2, unid_vol: 'VOL', peso: 16, unid_peso: 'KG', data: '2026-10-20', origem: 'GUARULHOS', coletor: 'GMAX', destino: 'ALINE LUCIA', valor: 0 },
  { seq: '53', tipo: 'TRANSBORDO', empresa: 'VI', nf: '264212', qtd_vol: 6, unid_vol: 'VOL', peso: 519, unid_peso: 'KG', data: '2026-10-20', origem: 'GUARULHOS', coletor: 'GMAX', destino: 'CARAMURU', valor: 0 },
  { seq: '54', tipo: 'TRANSBORDO', empresa: 'VI', nf: '264213', qtd_vol: 41, unid_vol: 'VOL', peso: 2780, unid_peso: 'KG', data: '2026-10-20', origem: 'GUARULHOS', coletor: 'GMAX', destino: 'CARAMURU', valor: 0 },
  { seq: '55', tipo: 'TRANSBORDO', empresa: 'BRV', nf: '32716', qtd_vol: 1, unid_vol: 'VOL', peso: 325, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '56', tipo: 'TRANSBORDO', empresa: 'PEU', nf: '348481', qtd_vol: 1, unid_vol: 'VOL', peso: 788, unid_peso: 'KG', data: '2026-10-20', origem: 'PIRACICABA', coletor: 'GMAX', destino: 'SONORA', valor: 0 },
  { seq: '57', tipo: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11724', qtd_vol: 2, unid_vol: 'VOL', peso: 45, unid_peso: 'VOL', data: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'SONORA', valor: 0 },
  { seq: '58', tipo: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11709', qtd_vol: 1, unid_vol: 'VOL', peso: 0.24, unid_peso: 'KG', data: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '59', tipo: 'TRANSBORDO', empresa: 'DINAMICA', nf: '111976', qtd_vol: 1, unid_vol: 'VOL', peso: 4.6, unid_peso: 'KG', data: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'SCHEFFER', valor: 0 },
  { seq: '60', tipo: 'TRANSBORDO', empresa: 'NATINALFLEX', nf: '8861', qtd_vol: 3, unid_vol: 'VOL', peso: 45, unid_peso: 'KG', data: '2026-10-20', origem: 'ITUPEVA', coletor: 'GMAX', destino: 'CRV', valor: 0 },
  { seq: '61', tipo: 'TRANSBORDO', empresa: 'ENGINSTREL', nf: '23963', qtd_vol: 1, unid_vol: 'VOL', peso: 15, unid_peso: 'KG', data: '2026-10-20', origem: 'SOROCABA', coletor: 'GMAX', destino: 'NOVA GALIA', valor: 0 },
  { seq: '62', tipo: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11702', qtd_vol: 2, unid_vol: 'VOL', peso: 10, unid_peso: 'KG', data: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0 },
  { seq: '63', tipo: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11665', qtd_vol: 1, unid_vol: 'VOL', peso: 0.2, unid_peso: 'KG', data: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'ACUCAR E ALCOOL', valor: 0 },
  { seq: '64', tipo: 'TRANSBORDO', empresa: 'HEXIS', nf: '1046337', qtd_vol: 1, unid_vol: 'VOL', peso: 1.92, unid_peso: 'KG', data: '2026-10-20', origem: 'JUNDIAI', coletor: 'GMAX', destino: 'NOVA GALIA', valor: 0 },
  { seq: '65', tipo: 'COLETA', empresa: 'LUITEX', nf: '644826', qtd_vol: 1, unid_vol: 'VOL', peso: 12, unid_peso: 'KG', data: '2026-10-21', origem: 'SUMARE', coletor: 'LUIZ', destino: 'BARRALCOOL', valor: 50 },
  { seq: '66', tipo: 'COLETA', empresa: 'LUITEX', nf: '644829', qtd_vol: 1, unid_vol: 'VOL', peso: 0.6, unid_peso: 'KG', data: '2026-10-21', origem: 'SUMARE', coletor: 'LUIZ', destino: 'CRV', valor: 50 },
  { seq: '67', tipo: 'COLETA', empresa: 'LEMAGI', nf: '7636', qtd_vol: 1, unid_vol: 'VOL', peso: 17.5, unid_peso: 'KG', data: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50 },
  { seq: '68', tipo: 'COLETA', empresa: 'MATISA', nf: '73317', qtd_vol: 2, unid_vol: 'VOL', peso: 40, unid_peso: 'KG', data: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'BARRALCOOL', valor: 50 },
  { seq: '69', tipo: 'COLETA', empresa: 'DIMENSIONAL', nf: '588647', qtd_vol: 2, unid_vol: 'VOL', peso: 18, unid_peso: 'KG', data: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'CRV', valor: 50 },
  { seq: '70', tipo: 'COLETA', empresa: 'SETORIAL', nf: '44274', qtd_vol: 1, unid_vol: 'VOL', peso: 11, unid_peso: 'KG', data: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50 },
  { seq: '71', tipo: 'COLETA', empresa: 'PG', nf: '15749', qtd_vol: 1, unid_vol: 'VOL', peso: 15, unid_peso: 'KG', data: '2026-10-21', origem: 'ARARAS', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 110 }
];

export default function PlanilhaGmaxExcelPage() {
  const [semana, setSemana] = useState('GMAX TRANSPORTES SEMANA 19/10/26 ATÉ 23/10/26');
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('Salvo na Nuvem');
  const [activeCell, setActiveCell] = useState({ row: null, col: null });
  const [mensagem, setMensagem] = useState('');

  // Ao carregar, busca as linhas salvas no Supabase ou inicializa com a grade completa do Excel
  useEffect(() => {
    carregarGradeSupabase();
  }, [semana]);

  async function carregarGradeSupabase() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cotacoes')
        .select('*')
        .ilike('descricao', 'GMAX_EXCEL:%')
        .order('id', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapeados = data.map((d) => {
          try {
            const raw = JSON.parse(d.descricao.replace('GMAX_EXCEL:', ''));
            return { dbId: d.id, ...raw };
          } catch (e) {
            return { dbId: d.id, seq: '', tipo: 'COLETA', empresa: d.cliente || '', nf: d.nota_fiscal || '', qtd_vol: 1, unid_vol: 'VOL', peso: 0, unid_peso: 'KG', data: d.previsao_entrega || '', origem: d.origem || '', coletor: d.motorista_nome || '', destino: d.destino || '', valor: d.valor || 0 };
          }
        });
        // Completa com linhas vazias para sempre ter visual de planilha grande
        while (mapeados.length < 75) {
          mapeados.push(criarLinhaVazia(mapeados.length + 1));
        }
        setLinhas(mapeados);
      } else {
        // Inicializa com os dados reais da semana 19/10 a 23/10
        const inicial = DADOS_INICIAIS.map((item, idx) => ({
          dbId: null,
          ...item
        }));
        while (inicial.length < 75) {
          inicial.push(criarLinhaVazia(inicial.length + 1));
        }
        setLinhas(inicial);
        // Salva automaticamente em segundo plano para persistir no banco
        salvarLinhasEmLote(inicial.filter(l => l.empresa || l.nf));
      }
    } catch (err) {
      console.error(err);
      // Fallback local se banco offline
      const inicial = DADOS_INICIAIS.map((item) => ({ dbId: null, ...item }));
      while (inicial.length < 75) inicial.push(criarLinhaVazia(inicial.length + 1));
      setLinhas(inicial);
    } finally {
      setLoading(false);
    }
  }

  function criarLinhaVazia(seqIndex) {
    return {
      dbId: null,
      seq: '',
      tipo: 'COLETA',
      empresa: '',
      nf: '',
      qtd_vol: '',
      unid_vol: 'VOL',
      peso: '',
      unid_peso: 'KG',
      data: new Date().toISOString().split('T')[0],
      origem: 'PIRACICABA',
      coletor: 'LUIZ',
      destino: '',
      valor: ''
    };
  }

  // Salvamento individual imediato ao sair de qualquer célula (onBlur) ou pressionar Enter
  async function atualizarCelula(index, campo, valor) {
    const novasLinhas = [...linhas];
    const linhaAtual = { ...novasLinhas[index], [campo]: valor };

    // Auto-preenchimento inteligente de valores padrão e coletores
    if (campo === 'origem') {
      const origUpper = String(valor).toUpperCase();
      linhaAtual.origem = origUpper;
      if (linhaAtual.tipo === 'COLETA' && (!linhaAtual.valor || linhaAtual.valor === 0)) {
        if (VALORES_PADRAO[origUpper] !== undefined) {
          linhaAtual.valor = VALORES_PADRAO[origUpper];
        }
      }
    }

    if (campo === 'tipo') {
      const tipoUpper = String(valor).toUpperCase();
      linhaAtual.tipo = tipoUpper;
      if (tipoUpper === 'TRANSBORDO') {
        linhaAtual.coletor = 'GMAX';
        linhaAtual.valor = 0;
      } else if (tipoUpper === 'COLETA' && (!linhaAtual.coletor || linhaAtual.coletor === 'GMAX')) {
        linhaAtual.coletor = 'LUIZ';
        linhaAtual.valor = VALORES_PADRAO[linhaAtual.origem] || 50;
      }
    }

    novasLinhas[index] = linhaAtual;
    setLinhas(novasLinhas);

    // Se tiver pelo menos Empresa ou NF ou for uma linha com dbId existente, salva no Supabase na hora!
    if (linhaAtual.empresa || linhaAtual.nf || linhaAtual.dbId) {
      setSavingStatus('Salvando...');
      try {
        const idSalvo = await persistirLinhaNoBanco(linhaAtual);
        if (idSalvo && !linhaAtual.dbId) {
          linhaAtual.dbId = idSalvo;
          novasLinhas[index] = linhaAtual;
          setLinhas([...novasLinhas]);
        }
        setSavingStatus('Salvo na Nuvem');
      } catch (e) {
        console.error(e);
        setSavingStatus('Erro ao salvar');
      }
    }
  }

  async function persistirLinhaNoBanco(linha) {
    const payload = {
      codigo_rastreio: `GMAX-${linha.nf || Math.floor(1000 + Math.random() * 9000)}`,
      cliente: (linha.empresa || 'COLETA GMAX').toUpperCase(),
      origem: linha.origem || 'PIRACICABA',
      destino: linha.destino || '',
      tipo_veiculo: linha.tipo || 'COLETA',
      peso_estimado: `${linha.peso || 0} ${linha.unid_peso || 'KG'}`,
      valor: parseFloat(String(linha.valor || 0).replace(',', '.')) || 0,
      motorista_nome: linha.coletor || 'LUIZ',
      nota_fiscal: String(linha.nf || ''),
      previsao_entrega: linha.data || new Date().toISOString().split('T')[0],
      descricao: `GMAX_EXCEL:${JSON.stringify(linha)}`,
      status: 'Planilha GMAX'
    };

    let res;
    if (linha.dbId) {
      res = await supabase.from('cotacoes').update(payload).eq('id', linha.dbId);
    } else {
      res = await supabase.from('cotacoes').insert([payload]).select('id').maybeSingle();
      if (res.data) return res.data.id;
    }
    return linha.dbId;
  }

  async function salvarLinhasEmLote(itensParaSalvar) {
    for (const item of itensParaSalvar) {
      try {
        await persistirLinhaNoBanco(item);
      } catch (err) {
        console.error('Erro lote:', err);
      }
    }
  }

  function adicionarNovaLinha() {
    setLinhas([...linhas, criarLinhaVazia(linhas.length + 1)]);
  }

  async function limparOuExcluirLinha(index) {
    const linha = linhas[index];
    if (linha.dbId) {
      if (confirm(`Deseja apagar a linha da NF ${linha.nf || index + 1}?`)) {
        await supabase.from('cotacoes').delete().eq('id', linha.dbId);
        const copy = [...linhas];
        copy.splice(index, 1);
        copy.push(criarLinhaVazia(copy.length + 1));
        setLinhas(copy);
        notificar('Linha removida do banco de dados.');
      }
    } else {
      const copy = [...linhas];
      copy[index] = criarLinhaVazia(index + 1);
      setLinhas(copy);
    }
  }

  function notificar(texto) {
    setMensagem(texto);
    setTimeout(() => setMensagem(''), 4500);
  }

  // Totais calculados em tempo real na barra inferior do Excel
  const totais = useMemo(() => {
    let preenchidas = 0;
    let coletas = 0;
    let transbordos = 0;
    let volumes = 0;
    let pesoTotal = 0;
    let valorTotal = 0;

    linhas.forEach((l) => {
      if (l.empresa || l.nf || l.valor) {
        preenchidas++;
        if (l.tipo === 'TRANSBORDO') transbordos++;
        else coletas++;

        volumes += parseFloat(l.qtd_vol || 0);
        pesoTotal += parseFloat(String(l.peso || 0).replace(',', '.'));
        valorTotal += parseFloat(String(l.valor || 0).replace(',', '.'));
      }
    });

    return { preenchidas, coletas, transbordos, volumes, pesoTotal, valorTotal };
  }, [linhas]);

  // Exportar exatamente o arquivo CSV/Excel que a GMAX recebe
  function baixarArquivoExcelGmax() {
    const csvRows = [];
    csvRows.push(',,,,,,,,,,,,');
    csvRows.push(`,TIPO DO SERVIÇO,${semana},,,,,,,,,,`);
    csvRows.push(',,EMPRESA,Nº NF,QTD VOLUME,,PESO,,DATA,ORIGEM,COLETOR,DESTINO,VALOR');

    linhas.forEach((r, idx) => {
      if (r.empresa || r.nf || r.valor) {
        const pesoFmt = String(r.peso || '').replace('.', ',');
        const valFmt = r.valor ? String(r.valor).replace('.', ',') : '';
        csvRows.push(
          `${r.seq || idx + 1},${r.tipo},${r.empresa},${r.nf},${r.qtd_vol},${r.unid_vol},${pesoFmt},${r.unid_peso},${r.data},${r.origem},${r.coletor},${r.destino},${valFmt}`
        );
      }
    });

    csvRows.push(',,,,,,,,,,,,');
    csvRows.push(`,,,,,,,,,,,TOTAL A RECEBER R$,${totais.valorTotal}`);

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${semana.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notificar('Planilha Excel baixada com sucesso no padrão exato da GMAX!');
  }

  // Exportar PDF do borderô semanal
  function gerarPdfGmax() {
    const doc = new jsPDF('landscape');
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`PS LOGÍSTICA — BORDERÔ DE COLETAS E TRANSBORDOS`, 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${semana}   |   Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 19);

    const body = linhas
      .filter((l) => l.empresa || l.nf)
      .map((l, i) => [
        l.seq || i + 1,
        l.tipo,
        l.empresa,
        l.nf,
        `${l.qtd_vol || 0} ${l.unid_vol}`,
        `${Number(l.peso || 0).toLocaleString('pt-BR')} ${l.unid_peso}`,
        l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-',
        l.origem,
        l.coletor,
        l.destino,
        l.valor > 0 ? `R$ ${Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
      ]);

    autoTable(doc, {
      startY: 28,
      head: [['#', 'TIPO', 'EMPRESA', 'Nº NF', 'VOLUME', 'PESO', 'DATA', 'ORIGEM', 'COLETOR', 'DESTINO', 'VALOR']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 1.8 },
      foot: [[
        '',
        'RESUMO',
        `${totais.preenchidas} LANÇAMENTOS`,
        '',
        `${totais.volumes} VOL`,
        `${totais.pesoTotal.toFixed(2)} KG`,
        '',
        '',
        '',
        'TOTAL GMAX:',
        `R$ ${totais.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]],
      footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' }
    });

    doc.save(`GMAX_Planilha_${new Date().toISOString().split('T')[0]}.pdf`);
    notificar('Relatório PDF gerado para envio por e-mail!');
  }

  return (
    <div className="space-y-4">
      <datalist id="cidades-regiao-sugestoes">
        {CIDADES_REGIAO.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* BARRA SUPERIOR ESTILO MICROSOFT EXCEL / GOOGLE SHEETS */}
      <div className="bg-[#107C41] text-white p-4 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-[#107C41] rounded-xl flex items-center justify-center font-black text-xl shadow-md">
            XLS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2.5 py-0.5 rounded-full tracking-wider">
                Planilha Eletrônica GMAX Transportes
              </span>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${savingStatus === 'Salvando...' ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-emerald-300 text-emerald-950'}`}>
                ● {savingStatus}
              </span>
            </div>
            <input
              type="text"
              value={semana}
              onChange={(e) => setSemana(e.target.value.toUpperCase())}
              className="bg-transparent text-lg font-black text-white hover:bg-white/10 px-2 py-0.5 rounded-lg border border-transparent hover:border-white/30 focus:bg-white/20 focus:outline-none transition-all mt-0.5 w-full max-w-xl"
              title="Clique para editar o título da semana"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={adicionarNovaLinha}
            className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-white/20"
          >
            ➕ Inserir Linha
          </button>
          <button
            onClick={baixarArquivoExcelGmax}
            className="px-4 py-2 rounded-xl bg-white text-[#107C41] hover:bg-emerald-50 text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            📊 Baixar Excel (.csv)
          </button>
          <button
            onClick={gerarPdfGmax}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            📄 Gerar PDF p/ E-mail
          </button>
        </div>
      </div>

      {mensagem && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{mensagem}</span>
          <button onClick={() => setMensagem('')} className="underline text-[11px]">Fechar</button>
        </div>
      )}

      {/* PAINEL DE KPIs EM TEMPO REAL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Lançamentos</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totais.preenchidas}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Coletas</span>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{totais.coletas}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Transbordos</span>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{totais.transbordos}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Volumes (VOL)</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totais.volumes}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Peso Total</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totais.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} KG</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase text-emerald-100">Total a Receber</span>
          <p className="text-xl font-black mt-0.5">R$ {totais.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* GRADE EXATA DO EXCEL (DIGITAÇÃO DIRETA NAS CÉLULAS) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
          <div className="flex items-center gap-2">
            <span>🖱️</span>
            <span>Preenchimento estilo Excel: clique e digite direto em qualquer célula. Ao apertar <strong>Enter</strong> ou <strong>Tab</strong>, o sistema salva automaticamente na nuvem.</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Total: R$ {totais.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-slate-500 animate-pulse">Carregando células da planilha...</div>
        ) : (
          <div className="overflow-x-auto max-h-[72vh] overflow-y-auto">
            <table className="w-full border-collapse text-xs select-none">
              <thead className="sticky top-0 z-20 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs">
                <tr className="border-b border-slate-300 dark:border-slate-700 text-center font-bold uppercase text-[10px]">
                  <th className="w-12 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2 bg-slate-300/70 dark:bg-slate-700/80">#</th>
                  <th className="w-28 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">TIPO DO SERVIÇO</th>
                  <th className="w-44 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2 text-left">EMPRESA</th>
                  <th className="w-28 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">Nº NF</th>
                  <th className="w-20 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">QTD VOL</th>
                  <th className="w-16 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">UNID</th>
                  <th className="w-24 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">PESO</th>
                  <th className="w-16 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">UNID</th>
                  <th className="w-28 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">DATA</th>
                  <th className="w-36 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2 text-left">ORIGEM</th>
                  <th className="w-24 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2">COLETOR</th>
                  <th className="w-40 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2 text-left">DESTINO</th>
                  <th className="w-28 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2 text-right bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">VALOR (R$)</th>
                  <th className="w-12 py-2.5 px-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {linhas.map((row, idx) => (
                  <tr
                    key={row.dbId || idx}
                    className={`hover:bg-blue-50/70 dark:hover:bg-slate-800/60 transition-colors ${
                      row.tipo === 'TRANSBORDO' ? 'bg-purple-50/25 dark:bg-purple-950/10' : ''
                    }`}
                  >
                    {/* COLUNA #: NÚMERO DA LINHA (EDITÁVEL OU SEQ AUTOMÁTICA) */}
                    <td className="border-r border-slate-200 dark:border-slate-800 text-center font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-0">
                      <input
                        type="text"
                        value={row.seq !== undefined ? row.seq : idx + 1}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], seq: e.target.value };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'seq', e.target.value)}
                        className="w-full text-center bg-transparent py-2 focus:outline-none font-bold"
                      />
                    </td>

                    {/* TIPO DO SERVIÇO (COLETA / TRANSBORDO) */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center">
                      <select
                        value={row.tipo || 'COLETA'}
                        onChange={(e) => atualizarCelula(idx, 'tipo', e.target.value)}
                        className={`w-full py-2 px-1 text-center font-black bg-transparent focus:outline-none cursor-pointer ${
                          row.tipo === 'TRANSBORDO' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        <option value="COLETA">COLETA</option>
                        <option value="TRANSBORDO">TRANSBORDO</option>
                      </select>
                    </td>

                    {/* EMPRESA */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <input
                        type="text"
                        value={row.empresa || ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], empresa: e.target.value.toUpperCase() };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'empresa', e.target.value.toUpperCase())}
                        placeholder="Nome da Empresa..."
                        className="w-full py-2 px-2.5 bg-transparent font-bold text-slate-900 dark:text-white uppercase focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* Nº NF */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center">
                      <input
                        type="text"
                        value={row.nf || ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], nf: e.target.value };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'nf', e.target.value)}
                        placeholder="Nº NF"
                        className="w-full py-2 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200 bg-transparent focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* QTD VOLUME */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center">
                      <input
                        type="number"
                        value={row.qtd_vol !== undefined ? row.qtd_vol : ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], qtd_vol: e.target.value };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'qtd_vol', e.target.value)}
                        placeholder="1"
                        className="w-full py-2 px-1 text-center font-semibold bg-transparent focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* UNIDADE VOLUME (VOL) */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center font-mono text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/30">
                      <input
                        type="text"
                        value={row.unid_vol || 'VOL'}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], unid_vol: e.target.value.toUpperCase() };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'unid_vol', e.target.value.toUpperCase())}
                        className="w-full py-2 text-center bg-transparent focus:outline-none font-bold"
                      />
                    </td>

                    {/* PESO */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-right">
                      <input
                        type="text"
                        value={row.peso !== undefined ? row.peso : ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], peso: e.target.value };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'peso', e.target.value)}
                        placeholder="0,00"
                        className="w-full py-2 px-2 text-right font-mono font-semibold bg-transparent focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* UNIDADE PESO (KG) */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center font-mono text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/30">
                      <input
                        type="text"
                        value={row.unid_peso || 'KG'}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], unid_peso: e.target.value.toUpperCase() };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'unid_peso', e.target.value.toUpperCase())}
                        className="w-full py-2 text-center bg-transparent focus:outline-none font-bold"
                      />
                    </td>

                    {/* DATA DA COLETA */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center">
                      <input
                        type="date"
                        value={row.data || ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], data: e.target.value };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'data', e.target.value)}
                        className="w-full py-2 px-1 text-center font-mono text-[11px] bg-transparent focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none cursor-pointer"
                      />
                    </td>

                    {/* ORIGEM (CIDADE) */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <input
                        type="text"
                        list="cidades-regiao-sugestoes"
                        value={row.origem || ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], origem: e.target.value.toUpperCase() };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'origem', e.target.value.toUpperCase())}
                        placeholder="PIRACICABA"
                        className="w-full py-2 px-2.5 font-bold uppercase bg-transparent focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* COLETOR (LUIZ / GMAX) */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center">
                      <input
                        type="text"
                        value={row.coletor || ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], coletor: e.target.value.toUpperCase() };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'coletor', e.target.value.toUpperCase())}
                        placeholder="LUIZ"
                        className="w-full py-2 text-center font-bold uppercase bg-transparent focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* DESTINO */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0">
                      <input
                        type="text"
                        value={row.destino || ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], destino: e.target.value.toUpperCase() };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'destino', e.target.value.toUpperCase())}
                        placeholder="Cliente Final..."
                        className="w-full py-2 px-2.5 font-semibold uppercase bg-transparent focus:bg-amber-50 dark:focus:bg-slate-800 focus:outline-none"
                      />
                    </td>

                    {/* VALOR (R$) */}
                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-right bg-emerald-50/40 dark:bg-emerald-950/20">
                      <input
                        type="text"
                        value={row.valor !== undefined && row.valor !== '' ? row.valor : ''}
                        onChange={(e) => {
                          const copy = [...linhas];
                          copy[idx] = { ...copy[idx], valor: e.target.value };
                          setLinhas(copy);
                        }}
                        onBlur={(e) => atualizarCelula(idx, 'valor', e.target.value)}
                        placeholder="0,00"
                        className="w-full py-2 px-2 text-right font-mono font-black text-emerald-700 dark:text-emerald-300 bg-transparent focus:bg-emerald-100 dark:focus:bg-emerald-900/60 focus:outline-none"
                      />
                    </td>

                    {/* BOTÃO LIMPAR / REMOVER LINHA */}
                    <td className="p-0 text-center">
                      {(row.empresa || row.nf || row.valor) ? (
                        <button
                          onClick={() => limparOuExcluirLinha(idx)}
                          title="Limpar linha"
                          className="w-full h-full py-2 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer text-xs"
                        >
                          ✕
                        </button>
                      ) : (
                        <span className="text-slate-200 dark:text-slate-700 text-xs">·</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white font-black text-xs shadow-lg">
                <tr>
                  <td colSpan={4} className="py-3 px-4 uppercase text-amber-300">
                    TOTAL GERAL ({totais.preenchidas} LANÇAMENTOS)
                  </td>
                  <td className="py-3 px-1 text-center font-mono">{totais.volumes}</td>
                  <td className="py-3 px-1 text-center text-[10px] text-slate-400">VOL</td>
                  <td className="py-3 px-2 text-right font-mono">{totais.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-1 text-center text-[10px] text-slate-400">KG</td>
                  <td colSpan={4} className="py-3 px-3 text-right uppercase text-slate-300">
                    TOTAL A RECEBER R$:
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-emerald-400 text-sm bg-slate-950">
                    R$ {totais.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
