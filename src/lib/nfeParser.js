/**
 * Pré-processa a imagem de uma DANFE real no navegador (Canvas):
 * 1. Suporta rotação automática (0°, 90°, 270°) para notas em Paisagem / fotografadas de lado.
 * 2. Remove linhas horizontais e verticais longas das grades/tabelas do padrão SEFAZ
 *    (que ficam coladas a 1px dos números de Peso Bruto, Volumes e NF e atrapalham o Tesseract).
 * 3. Amplia (Upscale) a imagem para ~2400px de largura com interpolação de alta qualidade.
 */
export async function preprocessarImagemDanfe(fileOrBlob, rotationDeg = 0) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { blob: fileOrBlob, orientacao: 'Retrato' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        const rawW = img.width || 800;
        const rawH = img.height || 1000;

        const isRotated90 = rotationDeg === 90 || rotationDeg === 270;
        const origW = isRotated90 ? rawH : rawW;
        const origH = isRotated90 ? rawW : rawH;

        const orientacao =
          rotationDeg !== 0
            ? `Paisagem Rotacionada (${rotationDeg}°)`
            : origW > origH * 1.12
            ? 'Modelo Paisagem (Horizontal)'
            : 'Modelo Retrato (Vertical)';

        // 1. Canvas base em resolução natural (limitado a 1200px para limpeza rápida de grade)
        const baseScale = Math.max(origW, origH) > 1200 ? 1200 / Math.max(origW, origH) : 1;
        const w = Math.max(1, Math.round(origW * baseScale));
        const h = Math.max(1, Math.round(origH * baseScale));

        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = w;
        baseCanvas.height = h;
        const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });

        baseCtx.save();
        if (rotationDeg === 90) {
          baseCtx.translate(w, 0);
          baseCtx.rotate(Math.PI / 2);
          baseCtx.drawImage(img, 0, 0, h, w);
        } else if (rotationDeg === 270) {
          baseCtx.translate(0, h);
          baseCtx.rotate(-Math.PI / 2);
          baseCtx.drawImage(img, 0, 0, h, w);
        } else {
          baseCtx.drawImage(img, 0, 0, w, h);
        }
        baseCtx.restore();

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
        // preservando a região do código de barras no canto superior direito
        for (let x = 0; x < w; x++) {
          let runStart = -1;
          for (let y = 0; y < h; y++) {
            const isBarcodeZone = x > w * 0.4 && y < h * 0.15;
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
            resolve({ blob: cleanBlob || fileOrBlob, orientacao });
          },
          'image/png'
        );
      } catch (e) {
        console.warn('Falha no pré-processamento da DANFE, usando imagem original:', e);
        resolve({ blob: fileOrBlob, orientacao: 'Padrão' });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob: fileOrBlob, orientacao: 'Padrão' });
    };

    img.src = url;
  });
}

function calcularScoreTextoDanfe(texto) {
  if (!texto) return 0;
  const u = texto.toUpperCase();
  let score = 0;
  const chaves = [
    'DANFE',
    'NOTA FISCAL',
    'EMITENTE',
    'DESTINAT',
    'PESO',
    'QUANTIDADE',
    'VALOR',
    'CHAVE',
    'CNPJ',
    'TRANSPORTADOR',
    'NATUREZA'
  ];
  for (const k of chaves) {
    if (u.includes(k)) score++;
  }
  if (/\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}/.test(u)) score += 2;
  return score;
}

/**
 * Executa o OCR completo em uma imagem de DANFE (suportando Retrato, Paisagem e Rotação 90°)
 * e aciona o Agente de Inteligência Artificial (/api/ia-ler-nfe) + Consulta Receita Federal.
 */
export async function lerImagemDanfeOcr(fileOrBlob, onProgress) {
  if (onProgress) onProgress(15);
  let { blob: imagemLimpa, orientacao } = await preprocessarImagemDanfe(fileOrBlob, 0);
  if (onProgress) onProgress(35);

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por');
  await worker.setParameters({
    tessedit_pageseg_mode: '6'
  });
  if (onProgress) onProgress(55);

  let ret = await worker.recognize(imagemLimpa);
  let texto = ret?.data?.text || '';

  // Se a nota fiscal foi fotografada de lado (ex: nota em Paisagem tirada com celular em pé),
  // o score de palavras da DANFE será baixo. Giramos 90° automaticamente e lemos novamente!
  if (calcularScoreTextoDanfe(texto) < 2) {
    if (onProgress) onProgress(65);
    const rot90 = await preprocessarImagemDanfe(fileOrBlob, 90);
    const ret90 = await worker.recognize(rot90.blob);
    const texto90 = ret90?.data?.text || '';
    if (calcularScoreTextoDanfe(texto90) > calcularScoreTextoDanfe(texto)) {
      texto = texto90;
      orientacao = rot90.orientacao;
    }
  }

  await worker.terminate();
  if (onProgress) onProgress(78);

  const preExtraido = parseDanfeText(texto);

  // Aciona o Agente de IA Logístico + Cruzamento CNPJ Receita Federal no Backend
  if (typeof window !== 'undefined') {
    try {
      const iaRes = await fetch('/api/ia-ler-nfe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textoOcrLocal: texto,
          preExtraido,
          orientacaoDetectada: orientacao
        })
      });

      if (iaRes.ok) {
        const iaJson = await iaRes.json();
        if (iaJson?.ok && iaJson?.dados) {
          if (onProgress) onProgress(98);
          return {
            texto,
            dados: {
              ...preExtraido,
              ...iaJson.dados,
              provedorIa: iaJson.provedor || 'Agente IA Logístico'
            }
          };
        }
      }
    } catch (e) {
      console.warn('Agente IA offline, usando parser estrutural local:', e);
    }
  }

  if (onProgress) onProgress(98);
  return {
    texto,
    dados: {
      ...preExtraido,
      explicacaoIa: `Leitura estrutural concluída (${orientacao})`
    }
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

  // 1. Chave de acesso da NFe de 44 dígitos (visível no código de barras ou topo/lateral)
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

  // 4. PESO BRUTO / LÍQUIDO e QUANTIDADE DE VOLUMES
  // Suporta:
  // - Layout Retrato ou Paisagem padrão SEFAZ (título na linha i, valores na linha i+1);
  // - Dados Adicionais / Informações Complementares (no topo ou no rodapé da nota);
  // - Linha única ("PESO BRUTO: 2,500").
  const pesoSameLine = text.match(
    /(?:PESO\s+BRUTO(?:\s*\([^\)]*\))?|PESO\s+L[ÍI]QUIDO(?:\s*\([^\)]*\))?|PESO\s+TOTAL)\s*[:\.\-]?\s*(\d{1,3}(?:\.\d{3})*[,\.]\d+|\d+[,\.]\d+)/i
  );
  if (pesoSameLine && pesoSameLine[1]) {
    peso = normalizarPesoExtraido(pesoSameLine[1]);
  }

  const volSameLine = text.match(/(?:QUANTIDADE(?:\s+DE\s+VOLUMES)?|QTD\.?\s*VOL(?:UMES)?|VOLUMES?)\s*[:\.\-]?\s*(\d{1,5})\b/i);
  if (volSameLine && volSameLine[1]) {
    qtdVol = volSameLine[1];
  }

  // 4B. Layout oficial SEFAZ (Retrato ou Paisagem): Cabeçalho "QUANTIDADE | ESPÉCIE | MARCA | NUMERAÇÃO | PESO BRUTO (Kg) | PESO LÍQUIDO (Kg)"
  for (let i = 0; i < lines.length; i++) {
    const lineU = lines[i].toUpperCase();
    const isHeaderVolumesPeso =
      (lineU.includes('PESO BRUTO') || lineU.includes('PESO LIQUIDO') || lineU.includes('PESO LÍQUIDO')) ||
      (lineU.includes('QUANTIDADE') && (lineU.includes('ESPECIE') || lineU.includes('ESPÉCIE') || lineU.includes('MARCA') || lineU.includes('NUMERACAO') || lineU.includes('NUMERAÇÃO')));

    if (isHeaderVolumesPeso) {
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

        const decimais = valLine.match(/\d{1,3}(?:\.\d{3})*,\d{1,4}|\d+\.\d{1,4}/g);
        if (decimais && decimais.length > 0) {
          if (!peso) {
            const candidatoPesoBruto = decimais.length >= 2 ? decimais[decimais.length - 2] : decimais[0];
            peso = normalizarPesoExtraido(candidatoPesoBruto);
          }

          const intInicio = valLine.match(/^(\d{1,5})\b/);
          if (intInicio && intInicio[1]) {
            const primeiroDecimal = decimais[0];
            if (!valLine.startsWith(primeiroDecimal)) {
              qtdVol = intInicio[1];
            }
          }
          break;
        } else {
          const onlyInt = valLine.match(/^(\d{1,5})(?:\s+[A-ZÇÃÕÁÉÍÓÚ]+)?$/i);
          if (onlyInt && onlyInt[1]) {
            qtdVol = onlyInt[1];
          }
        }
      }
      if (peso) break;
    }
  }

  // 4C. Fallback seção TRANSPORTADOR / VOLUMES
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

  // 4D. Fallback em Dados Adicionais / Informações Complementares (seja no topo ou rodapé)
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
    'DINÂMICA', 'NATINALFLEX', 'ENGINSTREL', 'HEXIS', 'LEMAGI', 'MATISA', 'SETORIAL', 'ESSYSTEM'
  ];

  for (const emp of empresasConhecidas) {
    if (blocoEmitente.includes(emp)) {
      empresa = emp.replace('ACOFERA', 'AÇOFERA').replace('DINÂMICA', 'DINAMICA');
      break;
    }
  }

  if (!empresa) {
    const partesEmitente = [];
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      let l = lines[i].toUpperCase().trim();

      // Se a nota tiver Dados Adicionais no topo, pula as linhas de Dados Adicionais até achar o Emitente
      if (/DADOS\s+ADICIONAIS|INFORMA[ÇC][ÕO]ES\s+COMPLEMENTARES|RESERVADO\s+AO\s+FISCO/i.test(l)) {
        continue;
      }

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
    for (let i = 0; i < lines.length; i++) {
      const lU = lines[i].toUpperCase();
      if (lU.includes('DESTINATÁRIO') || lU.includes('DESTINATARIO') || (lU.includes('NOME') && lU.includes('RAZ') && lU.includes('SOCIAL'))) {
        const sameLineMatch = lines[i].match(/(?:NOME\s*\/\s*RAZ[ÃA]O\s+SOCIAL|DESTINAT[ÁA]RIO(?:\s*\/\s*REMETENTE)?)\s*[:\-]\s*(.+)/i);
        if (sameLineMatch && sameLineMatch[1] && !/CNPJ|CPF|DATA/i.test(sameLineMatch[1])) {
          destino = sameLineMatch[1].trim().toUpperCase();
          break;
        }

        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 2); j++) {
          const cand = lines[j].trim();
          const candU = cand.toUpperCase();
          if (candU.includes('NOME') && candU.includes('SOCIAL')) continue;
          if (candU.startsWith('ENDEREÇO') || candU.startsWith('ENDERECO')) break;

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
