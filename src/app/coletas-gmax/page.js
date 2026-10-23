'use client';
import { useState, useEffect, useMemo } from 'react';
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

const VALORES_PADRAO_CIDADE = {
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

const DADOS_SEMANA_ATUAL_SEED = [
  { seq: 1, tipo_servico: 'COLETA', empresa: 'LUITEX', nf: '644089', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 0.4, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'AMERICANA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 2, tipo_servico: 'COLETA', empresa: 'CANEPARTS', nf: '4928', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 0.736, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 3, tipo_servico: 'COLETA', empresa: 'REZENFLEX', nf: '114955', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 1, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'AÇUCAR E ALCOOL', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 4, tipo_servico: 'COLETA', empresa: 'REZENFLEX', nf: '115064', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 46, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'AÇUCAR E ALCOOL', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 5, tipo_servico: 'COLETA', empresa: 'COLVADIS', nf: '79483', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 4, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 6, tipo_servico: 'COLETA', empresa: 'UCAF', nf: '25786', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 51, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 7, tipo_servico: 'COLETA', empresa: 'SEALVALVE', nf: '12631', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 10, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'ARARAS', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 110, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 19, tipo_servico: 'COLETA', empresa: 'KRAHENBUHL', nf: '388735', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 160, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 20, tipo_servico: 'COLETA', empresa: 'KRAHENBUHL', nf: '388872', qtd_volume: 4, unid_vol: 'VOL', peso_kg: 76, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 21, tipo_servico: 'COLETA', empresa: 'DELTALAB', nf: '53023', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 4.1, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'AÇUCAR E ALCOOL', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 22, tipo_servico: 'COLETA', empresa: 'ALUCEL', nf: '90585', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 1, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 23, tipo_servico: 'COLETA', empresa: 'ALUCEL', nf: '165626', qtd_volume: 3, unid_vol: 'VOL', peso_kg: 16, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 24, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151794', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 48, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 25, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151741', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 0.8, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 26, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151803', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 3, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 27, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151875', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 5, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'CRV', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 28, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151952', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 2, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 29, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151795', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 3, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 30, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151796', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 94, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 160, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 31, tipo_servico: 'COLETA', empresa: 'UNIMIL', nf: '348003', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 18.38, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 32, tipo_servico: 'COLETA', empresa: 'UNIMIL', nf: '348127', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 47.44, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'ITAMARATI', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 33, tipo_servico: 'COLETA', empresa: 'UNIMIL', nf: '348099', qtd_volume: 3, unid_vol: 'VOL', peso_kg: 46.64, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 34, tipo_servico: 'COLETA', empresa: 'UNIMIL', nf: '348142', qtd_volume: 9, unid_vol: 'VOL', peso_kg: 62.28, unid_peso: 'KG', data_coleta: '2026-10-19', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'ITAMARATI', valor: 160, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 35, tipo_servico: 'COLETA', empresa: 'BIOCHIMECAL', nf: '39817', qtd_volume: 6, unid_vol: 'VOL', peso_kg: 60, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'SUMARE', coletor: 'LUIZ', destino: 'BARRALCOOL', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 36, tipo_servico: 'COLETA', empresa: 'AZTRA', nf: '174', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 37, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'SERTMAX', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 37, tipo_servico: 'COLETA', empresa: 'SALARINOX', nf: '28606', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 13.532, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 38, tipo_servico: 'COLETA', empresa: 'SALARINOX', nf: '28597', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 4.5, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 39, tipo_servico: 'COLETA', empresa: 'APOLINOX', nf: '2289', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 140, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 40, tipo_servico: 'COLETA', empresa: 'ELEPIRA', nf: '282485', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 30, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 41, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '152008', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 2, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'CRV', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 42, tipo_servico: 'COLETA', empresa: 'TRATORCOM', nf: '151983', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 340, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'CRV', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 43, tipo_servico: 'COLETA', empresa: 'INOXRIO', nf: '19491', qtd_volume: 3, unid_vol: 'VOL', peso_kg: 30, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'LUIZ', destino: 'NOVA GALIA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 44, tipo_servico: 'COLETA', empresa: 'DIMENSIONAL', nf: '589281', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 50, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'COMP. AGRICOLA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 45, tipo_servico: 'COLETA', empresa: 'RAESA', nf: '32535', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 8.45, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'ARARAS', coletor: 'LUIZ', destino: 'DA MATA', valor: 110, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 46, tipo_servico: 'COLETA', empresa: 'RAESA', nf: '32538', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 0.52, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'ARARAS', coletor: 'LUIZ', destino: 'CIA CANAVIEIRA', valor: 110, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 47, tipo_servico: 'TRANSBORDO', empresa: 'ANASTACIO', nf: '6180', qtd_volume: 20, unid_vol: 'VOL', peso_kg: 510, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'LOUVEIRA', coletor: 'GMAX', destino: 'CJ SELECTA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 48, tipo_servico: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250555', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 1062, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'CRV', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 49, tipo_servico: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250557', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 17, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'CIA AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 50, tipo_servico: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250559', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 260, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 51, tipo_servico: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250560', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 236, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 52, tipo_servico: 'TRANSBORDO', empresa: 'AÇOFERA', nf: '250556', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 683, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'LIMEIRA', coletor: 'GMAX', destino: 'CRV', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 53, tipo_servico: 'TRANSBORDO', empresa: 'VI', nf: '264211', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 16, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'GUARULHOS', coletor: 'GMAX', destino: 'ALINE LUCIA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 54, tipo_servico: 'TRANSBORDO', empresa: 'VI', nf: '264212', qtd_volume: 6, unid_vol: 'VOL', peso_kg: 519, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'GUARULHOS', coletor: 'GMAX', destino: 'CARAMURU', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 55, tipo_servico: 'TRANSBORDO', empresa: 'VI', nf: '264213', qtd_volume: 41, unid_vol: 'VOL', peso_kg: 2780, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'GUARULHOS', coletor: 'GMAX', destino: 'CARAMURU', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 56, tipo_servico: 'TRANSBORDO', empresa: 'BRV', nf: '32716', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 325, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 57, tipo_servico: 'TRANSBORDO', empresa: 'PEU', nf: '348481', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 788, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'PIRACICABA', coletor: 'GMAX', destino: 'SONORA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 58, tipo_servico: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11724', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 45, unid_peso: 'VOL', data_coleta: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'SONORA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 59, tipo_servico: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11709', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 0.24, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 60, tipo_servico: 'TRANSBORDO', empresa: 'DINAMICA', nf: '111976', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 4.6, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'SCHEFFER', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 61, tipo_servico: 'TRANSBORDO', empresa: 'NATINALFLEX', nf: '8861', qtd_volume: 3, unid_vol: 'VOL', peso_kg: 45, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'ITUPEVA', coletor: 'GMAX', destino: 'CRV', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 62, tipo_servico: 'TRANSBORDO', empresa: 'ENGINSTREL', nf: '23963', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 15, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'SOROCABA', coletor: 'GMAX', destino: 'NOVA GALIA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 63, tipo_servico: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11702', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 10, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'COOP. AGRICOLA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 64, tipo_servico: 'TRANSBORDO', empresa: 'SAFETECH', nf: '11665', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 0.2, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'INDAIATUBA', coletor: 'GMAX', destino: 'ACUCAR E ALCOOL', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 65, tipo_servico: 'TRANSBORDO', empresa: 'HEXIS', nf: '1046337', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 1.92, unid_peso: 'KG', data_coleta: '2026-10-20', origem: 'JUNDIAI', coletor: 'GMAX', destino: 'NOVA GALIA', valor: 0, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 66, tipo_servico: 'COLETA', empresa: 'LUITEX', nf: '644826', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 12, unid_peso: 'KG', data_coleta: '2026-10-21', origem: 'SUMARE', coletor: 'LUIZ', destino: 'BARRALCOOL', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 67, tipo_servico: 'COLETA', empresa: 'LUITEX', nf: '644829', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 0.6, unid_peso: 'KG', data_coleta: '2026-10-21', origem: 'SUMARE', coletor: 'LUIZ', destino: 'CRV', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 68, tipo_servico: 'COLETA', empresa: 'LEMAGI', nf: '7636', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 17.5, unid_peso: 'KG', data_coleta: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 69, tipo_servico: 'COLETA', empresa: 'MATISA', nf: '73317', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 40, unid_peso: 'KG', data_coleta: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'BARRALCOOL', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 70, tipo_servico: 'COLETA', empresa: 'DIMENSIONAL', nf: '588647', qtd_volume: 2, unid_vol: 'VOL', peso_kg: 18, unid_peso: 'KG', data_coleta: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'CRV', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 71, tipo_servico: 'COLETA', empresa: 'SETORIAL', nf: '44274', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 11, unid_peso: 'KG', data_coleta: '2026-10-21', origem: 'LIMEIRA', coletor: 'LUIZ', destino: 'DA MATA', valor: 50, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' },
  { seq: 72, tipo_servico: 'COLETA', empresa: 'PG', nf: '15749', qtd_volume: 1, unid_vol: 'VOL', peso_kg: 15, unid_peso: 'KG', data_coleta: '2026-10-21', origem: 'ARARAS', coletor: 'LUIZ', destino: 'COOP. AGRICOLA', valor: 110, semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26' }
];

function extrairDadosGmax(row) {
  let meta = {};
  if (row.descricao && row.descricao.startsWith('GMAX_JSON:')) {
    try {
      meta = JSON.parse(row.descricao.replace('GMAX_JSON:', ''));
    } catch (e) {
      meta = {};
    }
  }
  return {
    id: row.id,
    seq: meta.seq || row.id,
    parceiro: meta.parceiro || 'GMAX TRANSPORTES',
    semana_ref: meta.semana_ref || 'SEMANA 19/10/26 ATÉ 23/10/26',
    tipo_servico: meta.tipo_servico || 'COLETA',
    empresa: row.cliente || meta.empresa || '',
    nf: row.nota_fiscal || meta.nf || '',
    qtd_volume: Number(meta.qtd_volume ?? 1),
    unid_vol: meta.unid_vol || 'VOL',
    peso_kg: Number(meta.peso_kg ?? parseFloat(String(row.peso_estimado || '0').replace(',', '.')) || 0),
    unid_peso: meta.unid_peso || 'KG',
    data_coleta: meta.data_coleta || row.previsao_entrega || new Date().toISOString().split('T')[0],
    origem: (row.origem || meta.origem || 'PIRACICABA').toUpperCase(),
    coletor: (row.motorista_nome || meta.coletor || 'LUIZ').toUpperCase(),
    destino: (row.destino || meta.destino || '').toUpperCase(),
    valor: Number(row.valor ?? meta.valor ?? 0),
    status: row.status || 'Registrado',
    faturado_financeiro: Boolean(meta.faturado_financeiro)
  };
}

export default function ColetasGmaxPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Filtros
  const [filtroSemana, setFiltroSemana] = useState('TODAS');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroCidade, setFiltroCidade] = useState('TODAS');
  const [busca, setBusca] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvTexto, setCsvTexto] = useState('');

  const hojeISO = new Date().toISOString().split('T')[0];

  // Formulário de lançamento rápido (estilo planilha segura)
  const [form, setForm] = useState({
    semana_ref: 'SEMANA 19/10/26 ATÉ 23/10/26',
    tipo_servico: 'COLETA',
    empresa: '',
    nf: '',
    qtd_volume: '1',
    unid_vol: 'VOL',
    peso_kg: '',
    unid_peso: 'KG',
    data_coleta: hojeISO,
    origem: 'PIRACICABA',
    coletor: 'LUIZ',
    destino: '',
    valor: '50'
  });

  useEffect(() => {
    carregarColetasGmax();
  }, []);

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }

  async function carregarColetasGmax() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cotacoes')
        .select('*')
        .ilike('descricao', 'GMAX_JSON:%')
        .order('id', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Se ainda não tiver os dados da planilha da semana 19/10 a 23/10 salvos no banco, salva automaticamente para o funcionário nunca mais perder!
        await restaurarPlanilhaSemanaPadrao(true);
      } else {
        const mapeados = data.map(extrairDadosGmax);
        setRegistros(mapeados);
      }
    } catch (err) {
      console.error('Erro ao carregar coletas GMAX:', err);
      showMessage('error', 'Erro ao carregar registros do banco de dados.');
    } finally {
      setLoading(false);
    }
  }

  async function salvarItemNoSupabase(item) {
    const meta = {
      seq: item.seq || '',
      parceiro: 'GMAX TRANSPORTES',
      semana_ref: (item.semana_ref || 'SEMANA 19/10/26 ATÉ 23/10/26').toUpperCase(),
      tipo_servico: (item.tipo_servico || 'COLETA').toUpperCase(),
      empresa: (item.empresa || '').toUpperCase().trim(),
      nf: String(item.nf || '').trim(),
      qtd_volume: Number(item.qtd_volume || 1),
      unid_vol: item.unid_vol || 'VOL',
      peso_kg: Number(String(item.peso_kg || 0).replace(',', '.')),
      unid_peso: item.unid_peso || 'KG',
      data_coleta: item.data_coleta || hojeISO,
      origem: (item.origem || 'PIRACICABA').toUpperCase().trim(),
      coletor: (item.coletor || 'LUIZ').toUpperCase().trim(),
      destino: (item.destino || '').toUpperCase().trim(),
      valor: Number(String(item.valor || 0).replace(',', '.')),
      faturado_financeiro: Boolean(item.faturado_financeiro)
    };

    const payloadCompleto = {
      codigo_rastreio: `GMAX-${meta.nf || Math.floor(1000 + Math.random() * 9000)}`,
      cliente: meta.empresa,
      origem: meta.origem,
      destino: meta.destino,
      tipo_veiculo: meta.tipo_servico,
      peso_estimado: `${meta.peso_kg} ${meta.unid_peso} (${meta.qtd_volume} ${meta.unid_vol})`,
      valor: meta.valor,
      motorista_nome: meta.coletor,
      nota_fiscal: meta.nf,
      previsao_entrega: meta.data_coleta,
      descricao: `GMAX_JSON:${JSON.stringify(meta)}`,
      status: item.status || 'Coleta Realizada'
    };

    let res = item.id
      ? await supabase.from('cotacoes').update(payloadCompleto).eq('id', item.id)
      : await supabase.from('cotacoes').insert([payloadCompleto]);

    if (res.error) {
      const payloadBasico = {
        cliente: meta.empresa,
        origem: meta.origem,
        destino: meta.destino,
        tipo_veiculo: meta.tipo_servico,
        peso_estimado: `${meta.peso_kg} ${meta.unid_peso}`,
        valor: meta.valor,
        descricao: `GMAX_JSON:${JSON.stringify(meta)}`,
        status: item.status || 'Coleta Realizada'
      };
      res = item.id
        ? await supabase.from('cotacoes').update(payloadBasico).eq('id', item.id)
        : await supabase.from('cotacoes').insert([payloadBasico]);
    }

    if (res.error) throw res.error;
    return res;
  }

  async function restaurarPlanilhaSemanaPadrao(silencioso = false) {
    setSaving(true);
    try {
      // Verifica quais NFs já estão salvas para não duplicar
      const { data: existentes } = await supabase
        .from('cotacoes')
        .select('*')
        .ilike('descricao', 'GMAX_JSON:%');

      const nfsExistentes = new Set((existentes || []).map((r) => extrairDadosGmax(r).nf));

      const novosParaInserir = DADOS_SEMANA_ATUAL_SEED.filter((item) => !nfsExistentes.has(String(item.nf)));

      for (const item of novosParaInserir) {
        await salvarItemNoSupabase(item);
      }

      const { data: atualizados } = await supabase
        .from('cotacoes')
        .select('*')
        .ilike('descricao', 'GMAX_JSON:%')
        .order('id', { ascending: true });

      setRegistros((atualizados || []).map(extrairDadosGmax));
      if (!silencioso) {
        showMessage('success', `${novosParaInserir.length} coletas/transbordos da Semana 19/10 a 23/10 restaurados e salvos na nuvem!`);
      }
    } catch (err) {
      console.error(err);
      if (!silencioso) showMessage('error', 'Erro ao restaurar os lançamentos da semana.');
    } finally {
      setSaving(false);
    }
  }

  function handleCidadeChange(novaCidade) {
    const cidUpper = novaCidade.toUpperCase();
    let valorSugerido = form.valor;
    if (form.tipo_servico === 'COLETA' && VALORES_PADRAO_CIDADE[cidUpper] !== undefined) {
      valorSugerido = String(VALORES_PADRAO_CIDADE[cidUpper]);
    } else if (form.tipo_servico === 'TRANSBORDO') {
      valorSugerido = '0';
    }
    setForm({ ...form, origem: cidUpper, valor: valorSugerido });
  }

  function handleTipoServicoChange(novoTipo) {
    const coletorSugerido = novoTipo === 'TRANSBORDO' ? 'GMAX' : 'LUIZ';
    const valorSugerido = novoTipo === 'TRANSBORDO'
      ? '0'
      : String(VALORES_PADRAO_CIDADE[form.origem.toUpperCase()] ?? 50);

    setForm({
      ...form,
      tipo_servico: novoTipo,
      coletor: coletorSugerido,
      valor: valorSugerido
    });
  }

  async function handleSalvarLancamento(e) {
    e.preventDefault();
    if (!form.empresa || !form.nf) {
      showMessage('error', 'Informe pelo menos a EMPRESA e o Nº da NF.');
      return;
    }

    setSaving(true);
    try {
      await salvarItemNoSupabase({
        id: editingId,
        seq: editingId ? form.seq : registros.length + 1,
        ...form
      });

      showMessage(
        'success',
        editingId
          ? `Coleta NF ${form.nf} (${form.empresa}) atualizada e salva na nuvem!`
          : `Coleta NF ${form.nf} (${form.empresa}) salva automaticamente no banco! Zero risco de perda.`
      );

      // Mantém a data, semana, cidade, tipo e coletor para digitação rápida em lote!
      setForm({
        ...form,
        empresa: '',
        nf: '',
        qtd_volume: '1',
        peso_kg: '',
        destino: '',
        valor: form.tipo_servico === 'TRANSBORDO' ? '0' : String(VALORES_PADRAO_CIDADE[form.origem] ?? form.valor)
      });
      setEditingId(null);
      await carregarColetasGmax();
    } catch (err) {
      console.error(err);
      showMessage('error', 'Erro ao salvar coleta.');
    } finally {
      setSaving(false);
    }
  }

  function handleEditarLinha(reg) {
    setEditingId(reg.id);
    setForm({
      seq: reg.seq,
      semana_ref: reg.semana_ref,
      tipo_servico: reg.tipo_servico,
      empresa: reg.empresa,
      nf: reg.nf,
      qtd_volume: String(reg.qtd_volume),
      unid_vol: reg.unid_vol,
      peso_kg: String(reg.peso_kg),
      unid_peso: reg.unid_peso,
      data_coleta: reg.data_coleta,
      origem: reg.origem,
      coletor: reg.coletor,
      destino: reg.destino,
      valor: String(reg.valor)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleAtualizarValorRapido(reg, novoValor) {
    try {
      await salvarItemNoSupabase({
        ...reg,
        valor: parseFloat(novoValor || 0)
      });
      setRegistros((prev) =>
        prev.map((item) => (item.id === reg.id ? { ...item, valor: parseFloat(novoValor || 0) } : item))
      );
      showMessage('success', `Valor da NF ${reg.nf} atualizado para R$ ${Number(novoValor || 0).toFixed(2)}`);
    } catch (err) {
      showMessage('error', 'Não foi possível atualizar o valor.');
    }
  }

  async function handleExcluirLinha(id, nf) {
    if (!confirm(`Deseja realmente excluir o lançamento da NF ${nf}?`)) return;
    try {
      await supabase.from('cotacoes').delete().eq('id', id);
      setRegistros((prev) => prev.filter((r) => r.id !== id));
      showMessage('success', `Lançamento NF ${nf} removido.`);
    } catch (err) {
      showMessage('error', 'Erro ao excluir lançamento.');
    }
  }

  async function handleImportarCsvColado() {
    if (!csvTexto.trim()) {
      showMessage('error', 'Cole as linhas da planilha antes de importar.');
      return;
    }

    setSaving(true);
    try {
      const linhas = csvTexto.split(/\r?\n/).filter((l) => l.trim().length > 0);
      let importados = 0;

      for (const linha of linhas) {
        // Suporta separação por vírgula, ponto e vírgula ou TAB (copiar direto do Excel)
        const cols = linha.includes('\t')
          ? linha.split('\t')
          : linha.includes(';')
          ? linha.split(';')
          : linha.split(',');

        const limpas = cols.map((c) => c.trim());
        // Procura onde está COLETA ou TRANSBORDO
        const idxTipo = limpas.findIndex((c) => c.toUpperCase() === 'COLETA' || c.toUpperCase() === 'TRANSBORDO');
        if (idxTipo === -1) continue;

        const tipo = limpas[idxTipo].toUpperCase();
        const emp = limpas[idxTipo + 1] || '';
        const nf = limpas[idxTipo + 2] || '';
        if (!emp && !nf) continue;

        const qtdVol = parseFloat((limpas[idxTipo + 3] || '1').replace(',', '.')) || 1;
        const unidVol = limpas[idxTipo + 4] || 'VOL';
        const peso = parseFloat((limpas[idxTipo + 5] || '0').replace(',', '.')) || 0;
        const unidPeso = limpas[idxTipo + 6] || 'KG';
        const dataCol = limpas[idxTipo + 7] || hojeISO;
        const origem = limpas[idxTipo + 8] || 'PIRACICABA';
        const coletor = limpas[idxTipo + 9] || (tipo === 'TRANSBORDO' ? 'GMAX' : 'LUIZ');
        const destino = limpas[idxTipo + 10] || '';
        const valor = parseFloat((limpas[idxTipo + 11] || '0').replace(',', '.')) || 0;

        await salvarItemNoSupabase({
          seq: registros.length + importados + 1,
          semana_ref: filtroSemana !== 'TODAS' ? filtroSemana : form.semana_ref,
          tipo_servico: tipo,
          empresa: emp,
          nf,
          qtd_volume: qtdVol,
          unid_vol: unidVol,
          peso_kg: peso,
          unid_peso: unidPeso,
          data_coleta: dataCol,
          origem,
          coletor,
          destino,
          valor
        });
        importados++;
      }

      setCsvTexto('');
      setShowImportModal(false);
      await carregarColetasGmax();
      showMessage('success', `${importados} linhas importadas da planilha e salvas no banco de dados!`);
    } catch (err) {
      console.error(err);
      showMessage('error', 'Erro ao importar linhas da planilha.');
    } finally {
      setSaving(false);
    }
  }

  // Semanas únicas disponíveis
  const semanasDisponiveis = useMemo(() => {
    const setSem = new Set(registros.map((r) => r.semana_ref));
    setSem.add('SEMANA 19/10/26 ATÉ 23/10/26');
    return Array.from(setSem);
  }, [registros]);

  // Filtragem
  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroSemana !== 'TODAS' && r.semana_ref !== filtroSemana) return false;
      if (filtroTipo !== 'TODOS' && r.tipo_servico !== filtroTipo) return false;
      if (filtroCidade !== 'TODAS' && r.origem !== filtroCidade) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const match =
          r.empresa.toLowerCase().includes(q) ||
          r.nf.toLowerCase().includes(q) ||
          r.destino.toLowerCase().includes(q) ||
          r.origem.toLowerCase().includes(q) ||
          r.coletor.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [registros, filtroSemana, filtroTipo, filtroCidade, busca]);

  // Totais da visualização atual
  const resumo = useMemo(() => {
    let totalColetas = 0;
    let totalTransbordos = 0;
    let totalVolumes = 0;
    let totalPeso = 0;
    let valorTotalReceber = 0;

    registrosFiltrados.forEach((r) => {
      if (r.tipo_servico === 'COLETA') totalColetas++;
      else totalTransbordos++;
      totalVolumes += Number(r.qtd_volume || 0);
      totalPeso += Number(r.peso_kg || 0);
      valorTotalReceber += Number(r.valor || 0);
    });

    return {
      totalRegistros: registrosFiltrados.length,
      totalColetas,
      totalTransbordos,
      totalVolumes,
      totalPeso,
      valorTotalReceber
    };
  }, [registrosFiltrados]);

  // Exportar CSV IDÊNTICO à planilha enviada para a GMAX
  function exportarPlanilhaExcelGmax() {
    const tituloSemana = filtroSemana !== 'TODAS' ? filtroSemana : form.semana_ref;
    const linhasCsv = [];

    linhasCsv.push(',,,,,,,,,,,,');
    linhasCsv.push(`,TIPO DO SERVIÇO,GMAX TRANSPORTES ${tituloSemana},,,,,,,,,,`);
    linhasCsv.push(',,EMPRESA,Nº NF,QTD VOLUME,,PESO,,DATA,ORIGEM,COLETOR,DESTINO,VALOR (R$)');

    registrosFiltrados.forEach((r, idx) => {
      const valStr = r.valor > 0 ? String(r.valor).replace('.', ',') : '';
      const pesoStr = String(r.peso_kg).replace('.', ',');
      linhasCsv.push(
        `${idx + 1},${r.tipo_servico},${r.empresa},${r.nf},${r.qtd_volume},${r.unid_vol},${pesoStr},${r.unid_peso},${r.data_coleta},${r.origem},${r.coletor},${r.destino},${valStr}`
      );
    });

    linhasCsv.push(',,,,,,,,,,,,');
    linhasCsv.push(`,,,,,,,,,,,TOTAL A RECEBER R$,${resumo.valorTotalReceber}`);

    // BOM UTF-8 para abrir com acentos perfeitos no Excel em português
    const conteudo = '\uFEFF' + linhasCsv.join('\r\n');
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Planilha_GMAX_${tituloSemana.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'Planilha CSV/Excel gerada no padrão exato da GMAX Transportes!');
  }

  // Exportar Relatório PDF Profissional para anexar no e-mail da GMAX
  function exportarRelatorioPdfGmax() {
    const doc = new jsPDF('landscape');
    const tituloSemana = filtroSemana !== 'TODAS' ? filtroSemana : form.semana_ref;

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PS LOGÍSTICA — RELATÓRIO DE COLETAS E TRANSBORDOS (GMAX TRANSPORTES)', 14, 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período / Referência: ${tituloSemana}   |   Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

    const body = registrosFiltrados.map((r, index) => [
      index + 1,
      r.tipo_servico,
      r.empresa,
      r.nf,
      `${r.qtd_volume} ${r.unid_vol}`,
      `${Number(r.peso_kg).toLocaleString('pt-BR')} ${r.unid_peso}`,
      new Date(r.data_coleta + 'T12:00:00').toLocaleDateString('pt-BR'),
      r.origem,
      r.coletor,
      r.destino,
      r.valor > 0 ? `R$ ${Number(r.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'
    ]);

    autoTable(doc, {
      startY: 36,
      head: [['#', 'SERVIÇO', 'EMPRESA', 'Nº NF', 'VOLUMES', 'PESO', 'DATA', 'ORIGEM', 'COLETOR', 'DESTINO', 'VALOR']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 2 },
      foot: [[
        '',
        'RESUMO',
        `${resumo.totalColetas} Coletas / ${resumo.totalTransbordos} Transbordos`,
        '',
        `${resumo.totalVolumes} VOL`,
        `${resumo.totalPeso.toFixed(2)} KG`,
        '',
        '',
        '',
        'TOTAL A PAGAR:',
        `R$ ${resumo.valorTotalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]],
      footStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5, fontStyle: 'bold' }
    });

    doc.save(`Bordero_GMAX_${tituloSemana.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    showMessage('success', 'Relatório PDF para a GMAX gerado com sucesso!');
  }

  // Gerar Fatura Semanal no Contas a Receber
  async function faturarSemanaNoFinanceiro() {
    if (resumo.valorTotalReceber <= 0) {
      showMessage('error', 'O valor total a receber desta seleção é R$ 0,00.');
      return;
    }

    const tituloSemana = filtroSemana !== 'TODAS' ? filtroSemana : form.semana_ref;
    if (
      !confirm(
        `Deseja lançar a fatura da GMAX (${tituloSemana}) no valor de R$ ${resumo.valorTotalReceber.toLocaleString('pt-BR', {
          minimumFractionDigits: 2
        })} em Contas a Receber?`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('financeiro').insert([
        {
          descricao: `Faturamento Semanal GMAX Transportes - ${tituloSemana} (${resumo.totalColetas} Coletas / ${resumo.totalTransbordos} Transbordos)`,
          categoria: 'Frete',
          tipo: 'Entrada',
          valor: resumo.valorTotalReceber,
          data: hojeISO,
          data_vencimento: hojeISO,
          status_pagamento: 'Pendente',
          forma_pagamento: 'PIX / Transferência',
          entidade_nome: 'GMAX TRANSPORTES',
          numero_documento: `GMAX-${hojeISO}`
        }
      ]);

      if (error) throw error;
      showMessage(
        'success',
        `Fatura de R$ ${resumo.valorTotalReceber.toLocaleString('pt-BR', {
          minimumFractionDigits: 2
        })} enviada para Contas a Receber (GMAX Transportes)!`
      );
    } catch (err) {
      console.error(err);
      showMessage('error', 'Erro ao gerar título no Contas a Receber.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO E AÇÕES DE FECHAMENTO GMAX */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              ☁️ SALVAMENTO AUTOMÁTICO NA NUVEM
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
              Região Piracicaba / SBO / Americana / Limeira / Araras / Sumaré
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
            Borderô de Coletas & Transbordos — GMAX Transportes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Substitui a planilha manual: cada coleta digitada já fica salva no banco de dados na hora (impossível perder dados) e gera a planilha/PDF pronta para enviar por e-mail à GMAX.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportarPlanilhaExcelGmax}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
          >
            📊 Baixar Planilha GMAX (.CSV / Excel)
          </button>
          <button
            onClick={exportarRelatorioPdfGmax}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition-all shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
          >
            📄 Gerar PDF p/ E-mail GMAX
          </button>
          <button
            onClick={faturarSemanaNoFinanceiro}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
          >
            💰 Gerar Contas a Receber (R$ {resumo.valorTotalReceber.toLocaleString('pt-BR')})
          </button>
        </div>
      </div>

      {/* ALERTA DE MENSAGEM */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-sm font-bold border flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="text-xs underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* INDICADORES DA SEMANA (KPIs GMAX) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Coletas Regionais</span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{resumo.totalColetas}</p>
          <span className="text-[11px] text-slate-500">Realizadas na região</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Transbordos GMAX</span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{resumo.totalTransbordos}</p>
          <span className="text-[11px] text-slate-500">Recebidos / Repassados</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Total de Volumes</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{resumo.totalVolumes} VOL</p>
          <span className="text-[11px] text-slate-500">Em {resumo.totalRegistros} notas fiscais</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold uppercase text-slate-400 block">Peso Total Movimentado</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {resumo.totalPeso.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} KG
          </p>
          <span className="text-[11px] text-slate-500">Soma das NFs</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-lg shadow-emerald-600/20">
          <span className="text-[11px] font-extrabold uppercase text-emerald-100 block">Total a Receber GMAX</span>
          <p className="text-2xl font-black mt-1">
            R$ {resumo.valorTotalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-100">Soma automática das coletas</span>
        </div>
      </div>

      {/* BARRA DE DIGITAÇÃO RÁPIDA (ESTILO PLANILHA COM SALVAMENTO IMEDIATO) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 dark:border-blue-500/30 rounded-2xl p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>⚡</span> {editingId ? 'Editando Lançamento da Planilha' : 'Lançamento Rápido de Coleta / Transbordo (Salva na Hora)'}
            </h2>
            <p className="text-xs text-slate-500">
              Preencha os campos da Nota Fiscal e pressione <strong>Enter</strong> ou clique em <strong>Salvar Coleta</strong>. A cidade já preenche o valor padrão automaticamente (ex: Piracicaba/Americana/Limeira/Sumaré = R$ 50 | Araras = R$ 110).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(!showImportModal)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              📋 Colar Linhas do Excel
            </button>
            <button
              type="button"
              onClick={() => restaurarPlanilhaSemanaPadrao(false)}
              className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 cursor-pointer"
            >
              🔄 Restaurar Semana 19/10 a 23/10
            </button>
          </div>
        </div>

        {/* MODAL DE COLAR DO EXCEL */}
        {showImportModal && (
          <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200">
                Colar várias linhas copiadas do Excel ou CSV
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-xs text-slate-400 hover:text-white">
                ✕ Fechar
              </button>
            </div>
            <textarea
              rows={4}
              value={csvTexto}
              onChange={(e) => setCsvTexto(e.target.value)}
              placeholder="Cole aqui as linhas da planilha (ex: 1,COLETA,LUITEX,644089,1,VOL,0.4,KG,2026-10-19,AMERICANA,LUIZ,DA MATA,50)"
              className="w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 text-xs font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleImportarCsvColado}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                {saving ? 'Importando...' : 'Importar e Salvar Tudo no Banco'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSalvarLancamento} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3 items-end">
          <div className="col-span-2 lg:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Período / Semana</label>
            <input
              type="text"
              value={form.semana_ref}
              onChange={(e) => setForm({ ...form, semana_ref: e.target.value.toUpperCase() })}
              placeholder="SEMANA 19/10/26 ATÉ 23/10/26"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
              required
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Serviço</label>
            <select
              value={form.tipo_servico}
              onChange={(e) => handleTipoServicoChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold"
            >
              <option value="COLETA">COLETA</option>
              <option value="TRANSBORDO">TRANSBORDO</option>
            </select>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Empresa (Remetente)</label>
            <input
              type="text"
              value={form.empresa}
              onChange={(e) => setForm({ ...form, empresa: e.target.value.toUpperCase() })}
              placeholder="Ex: TRATORCOM, UNIMIL..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
              required
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Nº NF</label>
            <input
              type="text"
              value={form.nf}
              onChange={(e) => setForm({ ...form, nf: e.target.value })}
              placeholder="151796"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
              required
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Volumes</label>
            <input
              type="number"
              min="1"
              value={form.qtd_volume}
              onChange={(e) => setForm({ ...form, qtd_volume: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Peso (KG)</label>
            <input
              type="number"
              step="0.001"
              value={form.peso_kg}
              onChange={(e) => setForm({ ...form, peso_kg: e.target.value })}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Data</label>
            <input
              type="date"
              value={form.data_coleta}
              onChange={(e) => setForm({ ...form, data_coleta: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold"
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Origem (Cidade)</label>
            <input
              type="text"
              list="cidades-regiao-list"
              value={form.origem}
              onChange={(e) => handleCidadeChange(e.target.value)}
              placeholder="PIRACICABA"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold"
            />
            <datalist id="cidades-regiao-list">
              {CIDADES_REGIAO.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Coletor</label>
            <input
              type="text"
              value={form.coletor}
              onChange={(e) => setForm({ ...form, coletor: e.target.value.toUpperCase() })}
              placeholder="LUIZ"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold"
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">Destino (Cliente Final)</label>
            <input
              type="text"
              value={form.destino}
              onChange={(e) => setForm({ ...form, destino: e.target.value.toUpperCase() })}
              placeholder="COOP. AGRICOLA, DA MATA..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold"
            />
          </div>

          <div className="col-span-1 lg:col-span-1">
            <label className="block text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Valor R$</label>
            <input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="50"
              className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 dark:border-emerald-700 rounded-xl px-2.5 py-2 text-xs font-black text-emerald-700 dark:text-emerald-300"
            />
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-12 flex items-center justify-end gap-2 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...form, empresa: '', nf: '', peso_kg: '', destino: '' });
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                Cancelar Edição
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/25 cursor-pointer"
            >
              {saving ? 'Salvando no Banco...' : editingId ? '💾 Salvar Alteração da Linha' : '➕ Adicionar à Planilha (Salva na Hora)'}
            </button>
          </div>
        </form>
      </div>

      {/* FILTROS DA TABELA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Semana</label>
            <select
              value={filtroSemana}
              onChange={(e) => setFiltroSemana(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold"
            >
              <option value="TODAS">Todas as Semanas</option>
              {semanasDisponiveis.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Tipo do Serviço</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold"
            >
              <option value="TODOS">Todos (Coleta + Transbordo)</option>
              <option value="COLETA">Somente COLETA</option>
              <option value="TRANSBORDO">Somente TRANSBORDO</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400">Cidade Origem</label>
            <select
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold"
            >
              <option value="TODAS">Todas as Cidades</option>
              {Array.from(new Set(registros.map((r) => r.origem))).sort().map((cid) => (
                <option key={cid} value={cid}>{cid}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 max-w-xs">
          <label className="block text-[10px] font-bold uppercase text-slate-400">Buscar Empresa, NF ou Destino</label>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex: TRATORCOM, UNIMIL, 644089..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* PLANILHA ELETRÔNICA DE COLETAS E TRANSBORDOS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📑</span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">
                GMAX TRANSPORTES — {filtroSemana === 'TODAS' ? 'SEMANA 19/10/26 ATÉ 23/10/26' : filtroSemana}
              </h3>
              <p className="text-[11px] text-slate-400">
                Nota: Quando há várias NFs coletadas na mesma empresa (ex: TRATORCOM ou UNIMIL), você pode lançar R$ 0 nas primeiras linhas e o valor cheio do lote (ex: R$ 160) na última NF, exatamente como na planilha!
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-500/30">
            Total da Planilha: R$ {resumo.valorTotalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Carregando lançamentos da planilha GMAX...</div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-500">Nenhum lançamento encontrado para este filtro.</p>
            <button
              onClick={() => restaurarPlanilhaSemanaPadrao(false)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Carregar Lançamentos da Semana 19/10 a 23/10
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-3">Tipo do Serviço</th>
                  <th className="py-3 px-3">Empresa</th>
                  <th className="py-3 px-3">Nº NF</th>
                  <th className="py-3 px-3 text-center">Qtd Volume</th>
                  <th className="py-3 px-3 text-right">Peso</th>
                  <th className="py-3 px-3 text-center">Data</th>
                  <th className="py-3 px-3">Origem</th>
                  <th className="py-3 px-3 text-center">Coletor</th>
                  <th className="py-3 px-3">Destino</th>
                  <th className="py-3 px-3 text-right w-32">Valor Frete (R$)</th>
                  <th className="py-3 px-3 text-center w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {registrosFiltrados.map((reg, index) => (
                  <tr
                    key={reg.id}
                    className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                      reg.tipo_servico === 'TRANSBORDO'
                        ? 'bg-indigo-50/20 dark:bg-indigo-950/10'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">{index + 1}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          reg.tipo_servico === 'COLETA'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                        }`}
                      >
                        {reg.tipo_servico}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white">{reg.empresa}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">{reg.nf}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">
                      {reg.qtd_volume} <span className="text-[10px] text-slate-400">{reg.unid_vol}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {Number(reg.peso_kg).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}{' '}
                      <span className="text-[10px] text-slate-400">{reg.unid_peso}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                      {reg.data_coleta ? new Date(reg.data_coleta + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">{reg.origem}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                        {reg.coletor}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{reg.destino}</td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={reg.valor || ''}
                        placeholder="0,00"
                        onBlur={(e) => {
                          const novo = parseFloat(e.target.value || 0);
                          if (novo !== Number(reg.valor || 0)) {
                            handleAtualizarValorRapido(reg, novo);
                          }
                        }}
                        className={`w-24 text-right rounded-lg px-2 py-1 text-xs font-black border ${
                          reg.valor > 0
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditarLinha(reg)}
                          title="Editar Linha"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 text-blue-600 cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleExcluirLinha(reg.id, reg.nf)}
                          title="Excluir Linha"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 text-rose-600 cursor-pointer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black text-xs">
                  <td colSpan={4} className="py-3.5 px-4">
                    TOTAL GERAL ({resumo.totalColetas} COLETAS / {resumo.totalTransbordos} TRANSBORDOS)
                  </td>
                  <td className="py-3.5 px-3 text-center">{resumo.totalVolumes} VOL</td>
                  <td className="py-3.5 px-3 text-right">
                    {resumo.totalPeso.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} KG
                  </td>
                  <td colSpan={4} className="py-3.5 px-3 text-right text-amber-300 uppercase">
                    Total a Receber da GMAX Transportes:
                  </td>
                  <td className="py-3.5 px-3 text-right text-sm text-emerald-400">
                    R$ {resumo.valorTotalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
