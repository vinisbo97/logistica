export function parseDanfeText(text) {
  if (!text) return {};

  const clean = text.replace(/\r/g, '');
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let nf = '';
  let empresa = '';
  let origem = '';
  let destino = '';
  let peso = '';
  let qtdVol = '1';
  let chaveAcesso = '';

  // 1. Chave de acesso da NFe de 44 dígitos (visível no código de barras ou topo)
  const chaveMatch = text.replace(/[\s\.\-]/g, '').match(/\d{44}/);
  if (chaveMatch) {
    chaveAcesso = chaveMatch[0];
    // Em uma chave de 44 dígitos: posições 25 a 34 (9 dígitos) contêm o número exato da NF
    const nfFromChave = parseInt(chaveAcesso.substring(25, 34), 10);
    if (nfFromChave && !isNaN(nfFromChave)) {
      nf = String(nfFromChave);
    }
  }

  // 2. Busca pelo Número da NF se não achou pela chave
  if (!nf) {
    const nfPatterns = [
      /(?:N[º°\.\s]*|NF(?:-e)?[\s\.\:\º\°]*|NOTA\s+FISCAL[^\d]*)\s*(\d{1,3}(?:\.\d{3})+|\d{4,9})/i,
      /N[ºo°\.\s]+(\d{3,9})/i,
      /(?:S[EÉ]RIE[^\d]*\d+[^\d]+N[º°\.\s]*)(\d{3,9})/i,
      /\b(\d{6,8})\b/
    ];

    for (const rx of nfPatterns) {
      const m = text.match(rx);
      if (m && m[1]) {
        const val = m[1].replace(/\./g, '');
        if (parseInt(val, 10) > 0) {
          nf = val;
          break;
        }
      }
    }
  }

  // 3. Busca de Cidades da Região de Coleta
  const cidades = [
    'PIRACICABA', 'AMERICANA', 'SANTA BARBARA D\'OESTE', 'SANTA BARBARA', 'SBO',
    'LIMEIRA', 'ARARAS', 'SUMARE', 'SUMARÉ', 'PAULINIA', 'PAULÍNIA',
    'RIO CLARO', 'INDAIATUBA', 'LOUVEIRA', 'JUNDIAI', 'JUNDIAÍ',
    'ITUPEVA', 'SOROCABA', 'GUARULHOS', 'CAMPINAS', 'VALINHOS', 'VINHEDO'
  ];

  const textUpper = text.toUpperCase();
  for (const cid of cidades) {
    if (textUpper.includes(cid)) {
      if (cid === 'SUMARÉ') origem = 'SUMARE';
      else if (cid === 'PAULÍNIA') origem = 'PAULINIA';
      else if (cid === 'JUNDIAÍ') origem = 'JUNDIAI';
      else if (cid === 'SANTA BARBARA' || cid === 'SBO') origem = 'SANTA BARBARA D\'OESTE';
      else origem = cid;
      break;
    }
  }

  // 4. Peso Bruto / Líquido
  const pesoMatch = text.match(/(?:PESO\s+BRUTO|PESO\s+L[ÍI]QUIDO|PESO)\s*[:\.]?\s*(\d+[,\.]\d+)/i);
  if (pesoMatch) {
    peso = pesoMatch[1].replace(',', '.');
  } else {
    const kgMatch = text.match(/(\d+[,\.]\d+)\s*(?:KG|QUILOS|VOL)/i);
    if (kgMatch) {
      peso = kgMatch[1].replace(',', '.');
    }
  }

  // 5. Quantidade de Volumes
  const volMatch = text.match(/(?:QUANTIDADE|QTD|VOLUMES?)\s*[:\.]?\s*(\d+)/i);
  if (volMatch) {
    qtdVol = volMatch[1];
  }

  // 6. Razão Social / Nome da Empresa (Emitente)
  // Empresas frequentes da sua rota de coleta
  const empresasConhecidas = [
    'LUITEX', 'CANEPARTS', 'REZENFLEX', 'COLVADIS', 'UCAF', 'SEALVALVE',
    'KRAHENBUHL', 'DELTALAB', 'ALUCEL', 'TRATORCOM', 'UNIMIL', 'BIOCHIMECAL',
    'AZTRA', 'SALARINOX', 'APOLINOX', 'ELEPIRA', 'INOXRIO', 'DIMENSIONAL',
    'RAESA', 'ANASTACIO', 'AÇOFERA', 'ACOFERA', 'VI', 'BRV', 'PEU',
    'SAFETECH', 'DINAMICA', 'DINÂMICA', 'NATINALFLEX', 'ENGINSTREL', 'HEXIS',
    'LEMAGI', 'MATISA', 'SETORIAL', 'PG'
  ];

  for (const emp of empresasConhecidas) {
    if (textUpper.includes(emp)) {
      empresa = emp.replace('ACOFERA', 'AÇOFERA').replace('DINÂMICA', 'DINAMICA');
      break;
    }
  }

  if (!empresa) {
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const l = lines[i].toUpperCase();
      if (
        l.includes('DANFE') ||
        l.includes('DOCUMENTO') ||
        l.includes('NOTA FISCAL') ||
        l.includes('ELETRÔNICA') ||
        l.includes('CHAVE') ||
        l.includes('SEFAZ') ||
        l.length < 3
      ) {
        continue;
      }
      empresa = lines[i].replace(/[^\w\s\.\-\&]/g, '').trim().toUpperCase();
      break;
    }
  }

  // 7. Destinatário (Destino final)
  const destinosConhecidos = [
    'DA MATA', 'COOP. AGRICOLA', 'COOP AGRICOLA', 'AÇUCAR E ALCOOL', 'ACUCAR E ALCOOL',
    'CRV', 'ITAMARATI', 'BARRALCOOL', 'SERTMAX', 'NOVA GALIA', 'COMP. AGRICOLA',
    'CIA CANAVIEIRA', 'CJ SELECTA', 'CIA AGRICOLA', 'ALINE LUCIA', 'CARAMURU',
    'SONORA', 'SCHEFFER'
  ];

  for (const d of destinosConhecidos) {
    if (textUpper.includes(d)) {
      destino = d;
      break;
    }
  }

  if (!destino) {
    const destMatch = text.match(/(?:DESTINAT[ÁA]RIO(?:\s*\/\s*REMETENTE)?|DESTINO|NOME\s*\/\s*RAZ[ÃA]O\s+SOCIAL)\s*[:\.\-]?\s*([^\n\r]{3,40})/i);
    if (destMatch) {
      destino = destMatch[1].replace(/[^\w\s\.\-]/g, '').trim().toUpperCase();
    }
  }

  return {
    nf,
    empresa: empresa || '',
    origem: origem || 'PIRACICABA',
    destino: destino || '',
    peso: peso || '',
    qtdVol: qtdVol || '1',
    chaveAcesso
  };
}
