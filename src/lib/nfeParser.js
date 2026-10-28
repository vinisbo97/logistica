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

  // 1. Chave de acesso de 44 dígitos (se visível no OCR)
  const chaveMatch = text.replace(/\s+/g, '').match(/\d{44}/);
  if (chaveMatch) {
    chaveAcesso = chaveMatch[0];
    // Em chaves de 44 dígitos, o número da NF são os dígitos da posição 25 a 34 (9 dígitos)
    const nfFromChave = parseInt(chaveAcesso.substring(25, 34), 10);
    if (nfFromChave && !isNaN(nfFromChave)) {
      nf = String(nfFromChave);
    }
  }

  // 2. Busca de Número da Nota Fiscal (DANFE / NF-e / N° / Nº)
  if (!nf) {
    const nfRegexes = [
      /(?:N[º°\.\s]*|NF(?:-e)?[\s\.\:\º\°]*|DOCUMENTO\s+AUXILIAR[^\d]*)\s*(\d{1,3}(?:\.\d{3})*|\d{3,9})/i,
      /N[ºo]\s*(\d+)/i,
      /(\d{5,9})/
    ];
    for (const rx of nfRegexes) {
      const m = text.match(rx);
      if (m && m[1]) {
        const val = m[1].replace(/\./g, '');
        if (parseInt(val, 10) > 0 && val.length <= 9) {
          nf = val;
          break;
        }
      }
    }
  }

  // 3. Busca de Cidades Conhecidas da Região (Origem)
  const cidades = [
    'PIRACICABA', 'AMERICANA', 'SANTA BARBARA D\'OESTE', 'SANTA BARBARA', 'SBO',
    'LIMEIRA', 'ARARAS', 'SUMARE', 'SUMARÉ', 'PAULINIA', 'PAULÍNIA',
    'RIO CLARO', 'INDAIATUBA', 'LOUVEIRA', 'JUNDIAI', 'JUNDIAÍ',
    'ITUPEVA', 'SOROCABA', 'GUARULHOS', 'CAMPINAS'
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

  // 4. Busca de Peso Bruto / Líquido
  const pesoMatch = text.match(/(?:PESO\s+BRUTO|PESO\s+L[ÍI]QUIDO|PESO)\s*[:\.]?\s*(\d+[,\.]\d+)/i);
  if (pesoMatch) {
    peso = pesoMatch[1].replace(',', '.');
  } else {
    const kgMatch = text.match(/(\d+[,\.]\d+)\s*(?:KG|QUILOS)/i);
    if (kgMatch) {
      peso = kgMatch[1].replace(',', '.');
    }
  }

  // 5. Quantidade de Volumes
  const volMatch = text.match(/(?:QUANTIDADE|QTD|VOLUMES?)\s*[:\.]?\s*(\d+)/i);
  if (volMatch) {
    qtdVol = volMatch[1];
  }

  // 6. Razão Social / Nome da Empresa (Emitente da NF)
  // Geralmente nas 5 primeiras linhas do documento fiscal
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const l = lines[i].toUpperCase();
    if (
      l.includes('DANFE') ||
      l.includes('DOCUMENTO') ||
      l.includes('NOTA FISCAL') ||
      l.includes('ELETRÔNICA') ||
      l.includes('CHAVE') ||
      l.length < 3
    ) {
      continue;
    }
    // Provável nome da empresa
    empresa = lines[i].replace(/[^\w\s\.\-\&]/g, '').trim();
    break;
  }

  // 7. Destinatário (Destino)
  const destMatch = text.match(/(?:DESTINAT[ÁA]RIO|DESTINO|ENTREGA\s+EM)\s*[:\.\-]?\s*([^\n\r]{3,40})/i);
  if (destMatch) {
    destino = destMatch[1].replace(/[^\w\s\.\-]/g, '').trim().toUpperCase();
  }

  return {
    nf,
    empresa: empresa.toUpperCase(),
    origem: origem || 'PIRACICABA',
    destino,
    peso,
    qtdVol: qtdVol || '1',
    chaveAcesso
  };
}
