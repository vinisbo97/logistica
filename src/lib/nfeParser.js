/**
 * Pré-processa a imagem de uma DANFE real no navegador (Canvas):
 * 1. Remove linhas horizontais e verticais longas das grades/tabelas do padrão SEFAZ
 *    (que ficam coladas a 1px dos números de Peso Bruto, Volumes e NF e atrapalham o Tesseract).
 * 2. Amplia (Upscale) a imagem para ~2400px de largura com interpolação de alta qualidade
 *    para que fontes pequenas de 8px fiquem nítidas (~24px).
 */
export async function preprocessarImagemDanfe(fileOrBlob) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fileOrBlob;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        const origW = img.width || 800;
        const origH = img.height || 1000;

        // 1. Canvas base em resolução natural (limitado a 1200px para limpeza rápida de grade)
        const baseScale = origW > 1200 ? 1200 / origW : 1;
        const w = Math.max(1, Math.round(origW * baseScale));
        const h = Math.max(1, Math.round(origH * baseScale));

        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = w;
        baseCanvas.height = h;
        const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
        baseCtx.drawImage(img, 0, 0, w, h);

        const imgData = baseCtx.getImageData(0, 0, w, h);
        const src = imgData.data;
        const out = new Uint8ClampedArray(src);

        // Limiares proporcionais à largura/altura da DANFE para detectar fios de grade da tabela
        const minHorizRun = Math.max(22, Math.round(w * 0.03));
        const minVertRun = Math.max(16, Math.round(h * 0.022));

        // Remove linhas horizontais longas (bordas das caixas da DANFE)
        for (let y = 0; y < h; y++) {
          let runStart = -1;
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const lum = (src[idx] + src[idx + 1] + src[idx + 2]) / 3;
            if (lum < 200) {
              if (runStart === -1) runStart = x;
            } else {
              if (runStart !== -1 && x - runStart > minHorizRun) {
                for (let rx = runStart; rx < x; rx++) {
                  const rIdx = (y * w + rx) * 4;
                  out[rIdx] = 255;
                  out[rIdx + 1] = 255;
                  out[rIdx + 2] = 255;
                }
              }
              runStart = -1;
            }
          }
          if (runStart !== -1 && w - runStart > minHorizRun) {
            for (let rx = runStart; rx < w; rx++) {
              const rIdx = (y * w + rx) * 4;
              out[rIdx] = 255;
              out[rIdx + 1] = 255;
              out[rIdx + 2] = 255;
            }
          }
        }

        // Remove linhas verticais longas (divisórias de células da DANFE),
        // preservando a região do código de barras no canto superior direito (x > 45% e y < 12%)
        for (let x = 0; x < w; x++) {
          let runStart = -1;
          for (let y = 0; y < h; y++) {
            const isBarcodeZone = x > w * 0.45 && y < h * 0.12;
            const idx = (y * w + x) * 4;
            const lum = (src[idx] + src[idx + 1] + src[idx + 2]) / 3;
            if (!isBarcodeZone && lum < 200) {
              if (runStart === -1) runStart = y;
            } else {
              if (runStart !== -1 && y - runStart > minVertRun) {
                for (let ry = runStart; ry < y; ry++) {
                  const rIdx = (ry * w + x) * 4;
                  out[rIdx] = 255;
                  out[rIdx + 1] = 255;
                  out[rIdx + 2] = 255;
                }
              }
              runStart = -1;
            }
          }
          if (runStart !== -1 && h - runStart > minVertRun) {
            for (let ry = runStart; ry < h; ry++) {
              const rIdx = (ry * w + x) * 4;
              out[rIdx] = 255;
              out[rIdx + 1] = 255;
              out[rIdx + 2] = 255;
            }
          }
        }

        imgData.data.set(out);
        baseCtx.putImageData(imgData, 0, 0);

        // 2. Amplia (Upscale ~2.5x a 3x) para leitura precisa de fontes pequenas pelo Tesseract
        const targetW = Math.min(2600, Math.max(2000, w * 3));
        const scaleUp = targetW / w;
        const upW = Math.round(w * scaleUp);
        const upH = Math.round(h * scaleUp);

        const upCanvas = document.createElement('canvas');
        upCanvas.width = upW;
        upCanvas.height = upH;
        const upCtx = upCanvas.getContext('2d');
        upCtx.fillStyle = '#FFFFFF';
        upCtx.fillRect(0, 0, upW, upH);
        upCtx.imageSmoothingEnabled = true;
        upCtx.imageSmoothingQuality = 'high';
        upCtx.drawImage(baseCanvas, 0, 0, upW, upH);

        upCanvas.toBlob(
          (cleanBlob) => {
            resolve(cleanBlob || fileOrBlob);
          },
          'image/png'
        );
      } catch (e) {
        console.warn('Falha no pré-processamento da DANFE, usando imagem original:', e);
        resolve(fileOrBlob);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(fileOrBlob);
    };

    img.src = url;
  });
}

/**
 * Executa o OCR completo em uma imagem de DANFE usando pré-processamento + modo de bloco/tabela (PSM 6)
 */
export async function lerImagemDanfeOcr(fileOrBlob, onProgress) {
  if (onProgress) onProgress(25);
  const imagemLimpa = await preprocessarImagemDanfe(fileOrBlob);
  if (onProgress) onProgress(45);

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por');
  await worker.setParameters({
    tessedit_pageseg_mode: '6'
  });
  if (onProgress) onProgress(70);

  const ret = await worker.recognize(imagemLimpa);
  await worker.terminate();
  if (onProgress) onProgress(95);

  const texto = ret?.data?.text || '';
  return {
    texto,
    dados: parseDanfeText(texto)
  };
}

/**
 * Normaliza string de peso brasileiro (ex: "1.250,500" -> "1250,500", "2,500" -> "2,500")
 */
function normalizarPesoExtraido(raw) {
  if (!raw) return '';
  let limpo = String(raw).trim();
  if (limpo.includes(',') && limpo.includes('.')) {
    limpo = limpo.replace(/\./g, '');
  }
  return limpo;
}

export function parseDanfeText(text) {
  if (!text) return {};

  const clean = text.replace(/\r/g, '');
  const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);

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
      /N[º°o\.\s]*(\d{3}\.\d{3}\.\d{3}|\d{1,3}\.\d{3})/i,
      /(?:N[º°\.\s]*|NF(?:-e)?[\s\.\:\º\°]*|NOTA\s+FISCAL[^\d]*)\s*(\d{1,3}(?:\.\d{3})+|\d{4,9})/i,
      /N[ºo°\.\s]+(\d{3,9})/i,
      /(?:S[EÉ]RIE[^\d]*\d+[^\d]+N[º°\.\s]*)(\d{3,9})/i,
      /\b(\d{5,8})\b/
    ];

    for (const rx of nfPatterns) {
      const m = text.match(rx);
      if (m && m[1]) {
        const val = m[1].replace(/\./g, '').replace(/^0+/, '');
        if (val && parseInt(val, 10) > 0) {
          nf = val;
          break;
        }
      }
    }
  }

  // 3. Busca de Cidades da Região de Coleta (prioriza o bloco do Emitente antes de DESTINATÁRIO)
  const cidades = [
    'PIRACICABA', 'AMERICANA', "SANTA BARBARA D'OESTE", 'SANTA BARBARA', 'SBO',
    'LIMEIRA', 'ARARAS', 'SUMARE', 'SUMARÉ', 'PAULINIA', 'PAULÍNIA',
    'RIO CLARO', 'INDAIATUBA', 'LOUVEIRA', 'JUNDIAI', 'JUNDIAÍ',
    'ITUPEVA', 'SOROCABA', 'GUARULHOS', 'CAMPINAS', 'VALINHOS', 'VINHEDO'
  ];

  const textUpper = text.toUpperCase();
  const idxDestinatario = textUpper.search(/DESTINAT[ÁA]RIO/);
  const blocoEmitente = idxDestinatario > 0 ? textUpper.substring(0, idxDestinatario) : textUpper;

  const normalizarCidade = (cid) => {
    if (cid === 'SUMARÉ') return 'SUMARE';
    if (cid === 'PAULÍNIA') return 'PAULINIA';
    if (cid === 'JUNDIAÍ') return 'JUNDIAI';
    if (cid === 'SANTA BARBARA' || cid === 'SBO') return "SANTA BARBARA D'OESTE";
    return cid;
  };

  for (const cid of cidades) {
    if (blocoEmitente.includes(cid)) {
      origem = normalizarCidade(cid);
      break;
    }
  }
  if (!origem) {
    for (const cid of cidades) {
      if (textUpper.includes(cid)) {
        origem = normalizarCidade(cid);
        break;
      }
    }
  }

  // 4. PESO BRUTO / LÍQUIDO e QUANTIDADE DE VOLUMES (Suporta layout real SEFAZ multi-linha e linha única)
  // 4A. Tenta primeiro na mesma linha (ex: "PESO BRUTO (KG): 480,00")
  const pesoSameLine = text.match(
    /(?:PESO\s+BRUTO(?:\s*\([^\)]*\))?|PESO\s+L[ÍI]QUIDO(?:\s*\([^\)]*\))?)\s*[:\.]?\s*(\d{1,3}(?:\.\d{3})*[,\.]\d+|\d+[,\.]\d+)/i
  );
  if (pesoSameLine && pesoSameLine[1]) {
    peso = normalizarPesoExtraido(pesoSameLine[1]);
  }

  const volSameLine = text.match(/(?:QUANTIDADE(?:\s+DE\s+VOLUMES)?|QTD\s+VOL(?:UMES)?|VOLUMES?)\s*[:\.]?\s*(\d{1,5})\b/i);
  if (volSameLine && volSameLine[1]) {
    qtdVol = volSameLine[1];
  }

  // 4B. Layout oficial SEFAZ: Cabeçalho "QUANTIDADE | ESPÉCIE | MARCA | NUMERAÇÃO | PESO BRUTO (Kg) | PESO LÍQUIDO (Kg)"
  // em uma linha e os valores (ex: "1   2,500   2,500" ou "10 CAIXAS   145,800   140,000") na linha de baixo!
  for (let i = 0; i < lines.length; i++) {
    const lineU = lines[i].toUpperCase();
    const isHeaderVolumesPeso =
      (lineU.includes('PESO BRUTO') || lineU.includes('PESO LIQUIDO') || lineU.includes('PESO LÍQUIDO')) ||
      (lineU.includes('QUANTIDADE') && (lineU.includes('ESPECIE') || lineU.includes('ESPÉCIE') || lineU.includes('MARCA') || lineU.includes('NUMERACAO') || lineU.includes('NUMERAÇÃO')));

    if (isHeaderVolumesPeso) {
      // Examina as próximas 1 a 3 linhas abaixo do cabeçalho (antes de DADOS DO PRODUTO)
      for (let j = i + 1; j <= Math.min(lines.length - 1, i + 3); j++) {
        const valLine = lines[j].trim();
        const valLineU = valLine.toUpperCase();
        if (
          valLineU.includes('DADOS DO PRODUTO') ||
          valLineU.includes('DESCRIÇÃO DO PRODUTO') ||
          valLineU.includes('DESCRICAO DO PRODUTO') ||
          valLineU.includes('CALCULO DO ISSQN') ||
          valLineU.includes('CÁLCULO DO ISSQN')
        ) {
          break;
        }

        // Busca todos os números decimais na linha de valores (ex: ["2,500", "2,500"] ou ["1.250,500", "1.200,000"])
        const decimais = valLine.match(/\d{1,3}(?:\.\d{3})*,\d{1,4}|\d+\.\d{1,4}/g);
        if (decimais && decimais.length > 0) {
          if (!peso) {
            // Se houver 2 ou mais decimais no final da linha (Peso Bruto e Peso Líquido), o penúltimo é o Peso Bruto
            const candidatoPesoBruto = decimais.length >= 2 ? decimais[decimais.length - 2] : decimais[0];
            peso = normalizarPesoExtraido(candidatoPesoBruto);
          }

          // Verifica se o primeiro número inteiro no início da linha é a QUANTIDADE de volumes (ex: "1 2,500 2,500")
          const intInicio = valLine.match(/^(\d{1,5})\b/);
          if (intInicio && intInicio[1]) {
            // Garante que esse inteiro inicial não é a parte inteira do próprio decimal de peso
            const primeiroDecimal = decimais[0];
            if (!valLine.startsWith(primeiroDecimal)) {
              qtdVol = intInicio[1];
            }
          }
          break;
        } else {
          // Caso a linha tenha apenas a quantidade inteira sem peso decimal
          const onlyInt = valLine.match(/^(\d{1,5})(?:\s+[A-ZÇÃÕÁÉÍÓÚ]+)?$/i);
          if (onlyInt && onlyInt[1]) {
            qtdVol = onlyInt[1];
          }
        }
      }
      if (peso) break;
    }
  }

  // 4C. Fallback adicional caso o OCR tenha lido a seção TRANSPORTADOR / VOLUMES e haja padrão "<int> <decimal> <decimal>"
  if (!peso) {
    const idxTransp = lines.findIndex((l) => /TRANSPORTADOR|VOLUMES\s+TRANSPORTADOS/i.test(l));
    if (idxTransp !== -1) {
      for (let k = idxTransp + 1; k < Math.min(lines.length, idxTransp + 10); k++) {
        const l = lines[k];
        if (/DADOS\s+DO\s+PRODUTO|DESCRI[ÇC][ÃA]O\s+DO\s+PRODUTO/i.test(l)) break;
        const mLinhaPeso = l.match(/^(\d{1,5})\s+(?:[A-ZÇÃÕ\s]+\s+)?(\d{1,3}(?:\.\d{3})*,\d{2,4}|\d+\.\d{2,4})(?:\s+(\d{1,3}(?:\.\d{3})*,\d{2,4}|\d+\.\d{2,4}))?/i);
        if (mLinhaPeso) {
          qtdVol = mLinhaPeso[1];
          peso = normalizarPesoExtraido(mLinhaPeso[2]);
          break;
        }
      }
    }
  }

  // 4D. Último fallback para número seguido de KG
  if (!peso) {
    const kgMatch = text.match(/(\d{1,3}(?:\.\d{3})*[,\.]\d+)\s*(?:KG|QUILOS)\b/i);
    if (kgMatch) {
      peso = normalizarPesoExtraido(kgMatch[1]);
    }
  }

  // 5. Razão Social / Nome da Empresa (Emitente)
  const empresasConhecidas = [
    'LUITEX', 'CANEPARTS', 'REZENFLEX', 'COLVADIS', 'UCAF', 'SEALVALVE',
    'KRAHENBUHL', 'DELTALAB', 'ALUCEL', 'TRATORCOM', 'UNIMIL', 'BIOCHIMECAL',
    'AZTRA', 'SALARINOX', 'APOLINOX', 'ELEPIRA', 'INOXRIO', 'DIMENSIONAL',
    'RAESA', 'ANASTACIO', 'AÇOFERA', 'ACOFERA', 'SAFETECH', 'DINAMICA',
    'DINÂMICA', 'NATINALFLEX', 'ENGINSTREL', 'HEXIS', 'LEMAGI', 'MATISA', 'SETORIAL'
  ];

  for (const emp of empresasConhecidas) {
    if (blocoEmitente.includes(emp)) {
      empresa = emp.replace('ACOFERA', 'AÇOFERA').replace('DINÂMICA', 'DINAMICA');
      break;
    }
  }

  if (!empresa) {
    // No padrão SEFAZ, o nome do emitente fica nas primeiras linhas logo abaixo de "IDENTIFICAÇÃO DO EMITENTE"
    // e antes do endereço (RUA, AV, RODOVIA, CEP, FONE, NATUREZA DE OPERAÇÃO)
    const partesEmitente = [];
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      let l = lines[i].toUpperCase().trim();

      // Remove ruídos das colunas da direita (DANFE / DOCUMENTO AUXILIAR / CHAVE DE ACESSO)
      l = l
        .replace(/IDENTIFICA[ÇC][ÃA]O\s+DO\s+EMITENTE/g, '')
        .replace(/DOCUMENTO\s+AUXILIAR.*/g, '')
        .replace(/DA\s+NOTA\s+FISCAL.*/g, '')
        .replace(/NOTA\s+FISCAL\s+ELETR[ÔO]NICA.*/g, '')
        .replace(/0\s*[\-\.]\s*ENTRADA.*/g, '')
        .replace(/1\s*[\-\.]\s*SA[ÍI]DA.*/g, '')
        .replace(/CHAVE\s+DE\s+ACESSO.*/g, '')
        .replace(/CONSULTA\s+DE\s+AUTENTICIDADE.*/g, '')
        .replace(/\bDANFE\b/g, '')
        .replace(/^[^A-Z0-9]+/, '')
        .trim();

      if (!l || l.length < 3) continue;

      // Para quando encontrar linha de endereço ou natureza da operação
      if (
        /^(RUA|AV\.?|AVENIDA|ROD\.?|RODOVIA|ESTRADA|ALAMEDA|PRA[ÇC]A|CEP|TEL|FONE|NATUREZA\s+DE\s+OPERA)/i.test(l) ||
        /\bCEP\s*[:\-]?\s*\d{5}/i.test(l)
      ) {
        break;
      }

      partesEmitente.push(l);
      if (partesEmitente.length >= 2) break;
    }

    if (partesEmitente.length > 0) {
      empresa = partesEmitente.join(' ').replace(/\s+/g, ' ').trim();
    }
  }

  // 6. Destinatário (Destino final)
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
    // No padrão SEFAZ, abaixo de "DESTINATÁRIO / REMETENTE" -> "NOME / RAZÃO SOCIAL   CNPJ/CPF   DATA DA EMISSÃO"
    // a linha seguinte traz: "<RAZÃO SOCIAL DO DESTINATÁRIO> <CNPJ/CPF> <DATA>"
    for (let i = 0; i < lines.length; i++) {
      const lU = lines[i].toUpperCase();
      if (lU.includes('DESTINATÁRIO') || lU.includes('DESTINATARIO') || (lU.includes('NOME') && lU.includes('RAZ') && lU.includes('SOCIAL'))) {
        // Verifica se a própria linha já tem o nome após ":" (layout simplificado)
        const sameLineMatch = lines[i].match(/(?:NOME\s*\/\s*RAZ[ÃA]O\s+SOCIAL|DESTINAT[ÁA]RIO(?:\s*\/\s*REMETENTE)?)\s*[:\-]\s*(.+)/i);
        if (sameLineMatch && sameLineMatch[1] && !/CNPJ|CPF|DATA/i.test(sameLineMatch[1])) {
          destino = sameLineMatch[1].trim().toUpperCase();
          break;
        }

        // Caso padrão SEFAZ: olha a próxima linha que não seja o cabeçalho "NOME / RAZÃO SOCIAL"
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 2); j++) {
          const cand = lines[j].trim();
          const candU = cand.toUpperCase();
          if (candU.includes('NOME') && candU.includes('SOCIAL')) continue;
          if (candU.startsWith('ENDEREÇO') || candU.startsWith('ENDERECO')) break;

          // Remove CNPJ/CPF e Data do final da linha
          const limpo = cand
            .replace(/\b\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[\-\s]?\d{2}\b.*/g, '')
            .replace(/\b\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2}\b.*/g, '')
            .replace(/\b\d{2}\/\d{2}\/\d{4}\b.*/g, '')
            .replace(/[^\w\s\.\-\&ÇÃÕÁÉÍÓÚÂÊÔ]/gi, '')
            .trim()
            .toUpperCase();

          if (limpo.length >= 3) {
            destino = limpo;
            break;
          }
        }
        if (destino) break;
      }
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
