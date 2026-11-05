import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `Você é um Agente de Inteligência Artificial especialista em Logística de Transporte Rodoviário de Cargas no Brasil e leitura de DANFE / NF-e (Nota Fiscal Eletrônica).
Cada empresa fornecedora pode enviar a Nota Fiscal em um modelo/layout diferente:
- Modelo Retrato padrão SEFAZ;
- Modelo Paisagem (deitada/horizontal);
- DANFE Simplificada / Etiqueta;
- Notas com o quadro "DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES" no topo da página ou no rodapé;
- Notas em ambiente de homologação onde o nome impresso diz "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO", mas o CNPJ revela a empresa real na Receita Federal.

REGRAS DE INTERPRETAÇÃO DO AGENTE DE IA:
1. EMPRESA (empresa - Emitente / Local de Coleta):
   - É quem emitiu a nota fiscal.
   - Se o texto da nota tiver "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO" ou estiver ilegível/truncado, USE OBRIGATORIAMENTE o nome fantasia ou razão social curta do CNPJ do Emitente retornado pela Receita Federal!
   - Prefira o nome curto comercial (ex: "LUITEX", "ESSYSTEM", "TRATORCOM", "RAESA", "SEALVALVE", "CANEPARTS", "REZENFLEX", "COLVADIS", "UCAF", "KRAHENBUHL", "DELTALAB", "ALUCEL", "UNIMIL", "BIOCHIMECAL", "AZTRA", "SALARINOX", "APOLINOX", "ELEPIRA", "INOXRIO", "DIMENSIONAL", "ANASTACIO", "AÇOFERA", "SAFETECH", "DINAMICA", "NATINALFLEX", "ENGINSTREL", "HEXIS", "LEMAGI", "MATISA", "SETORIAL").
2. Nº DA NOTA FISCAL (nf):
   - Número da NF sem zeros à esquerda e sem pontos (ex: "25577").
   - Se houver Chave de Acesso de 44 dígitos, os dígitos da posição 26 a 34 (substring(25, 34)) são a fonte mais confiável do número da NF.
3. CIDADE DE ORIGEM (origem):
   - Município do EMITENTE (onde a carga foi coletada), em letras MAIÚSCULAS e sem UF (ex: "PIRACICABA", "AMERICANA", "SANTA BARBARA D'OESTE", "LIMEIRA", "ARARAS", "SUMARE", "PAULINIA", "RIO CLARO").
   - Confirme pelo município do CNPJ do Emitente na Receita Federal se disponível.
4. DESTINO (destino - Destinatário / Cliente Final):
   - É o cliente comprador no quadro "DESTINATÁRIO / REMETENTE".
   - Se na nota estiver "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO", USE OBRIGATORIAMENTE o nome fantasia ou razão social curta do 2º CNPJ (Destinatário) retornado pela Receita Federal!
   - Verifique também o quadro "DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES" (esteja ele no topo ou no rodapé da nota), pois muitas vezes a usina/cliente de entrega final (ex: DA MATA, COOP. AGRICOLA, BARRALCOOL, ITAMARATI, CRV, RAIZEN) está informada lá.
5. QUANTIDADE DE VOLUMES (qtdVol):
   - Número inteiro de volumes transportados (coluna "QUANTIDADE" em "VOLUMES TRANSPORTADOS", ou informado dentro de "DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES"). Se não encontrar, retorne "1".
6. PESO BRUTO EM KG (peso):
   - Peso Bruto em KG no formato numérico brasileiro (ex: "2,500", "85,50", "142,00").
   - Procure tanto na linha abaixo do cabeçalho "PESO BRUTO (Kg)" / "PESO LÍQUIDO (Kg)" quanto dentro do campo "DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES" (no topo ou no rodapé).

Responda ESTRITAMENTE em JSON válido (sem blocos markdown):
{
  "empresa": "",
  "nf": "",
  "origem": "",
  "destino": "",
  "qtdVol": "1",
  "peso": "",
  "explicacaoIa": "Resumo curto de 1 frase do que o Agente de IA interpretou (ex: layout identificado, CNPJ consultado na Receita, peso e volumes extraídos)"
}`;

function extrairJsonDaResposta(texto) {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch (e) {
    const match = texto.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {}
    }
  }
  return null;
}

async function consultarCnpjReceita(cnpj) {
  const limpo = String(cnpj || '').replace(/\D/g, '');
  if (limpo.length !== 14) return null;

  // 1. Tenta ReceitaWS
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${limpo}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.nome && data.status !== 'ERROR') {
        return {
          cnpj: limpo,
          razao_social: data.nome,
          fantasia: data.fantasia || '',
          municipio: data.municipio || '',
          uf: data.uf || ''
        };
      }
    }
  } catch (e) {}

  // 2. Fallback publica.cnpj.ws
  try {
    const res2 = await fetch(`https://publica.cnpj.ws/cnpj/${limpo}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (res2.ok) {
      const d2 = await res2.json();
      if (d2 && d2.razao_social) {
        return {
          cnpj: limpo,
          razao_social: d2.razao_social,
          fantasia: d2.estabelecimento?.nome_fantasia || '',
          municipio: d2.estabelecimento?.cidade?.nome || '',
          uf: d2.estabelecimento?.estado?.sigla || ''
        };
      }
    }
  } catch (e) {}

  return null;
}

function resumirNomeEmpresa(info) {
  if (!info) return '';
  if (info.fantasia && info.fantasia.trim().length >= 2) {
    return info.fantasia.trim().toUpperCase();
  }
  if (info.razao_social) {
    return info.razao_social
      .replace(/\b(LTDA|EPP|ME|S\/A|S\.A\.|EIRELI|INDUSTRIA|COMERCIO|DE|E)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }
  return '';
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { textoOcrLocal, preExtraido, orientacaoDetectada } = body;

    if (!textoOcrLocal && !preExtraido) {
      return NextResponse.json({ ok: false, motivo: 'Sem texto para analisar' }, { status: 200 });
    }

    // 1. Extrai Chave de Acesso de 44 dígitos e todos os CNPJs presentes na Nota Fiscal
    const chaveMatch = String(textoOcrLocal || '').replace(/[\s\.\-]/g, '').match(/\d{44}/);
    const chaveAcesso = chaveMatch ? chaveMatch[0] : preExtraido?.chaveAcesso || '';

    const cnpjsEncontrados = [];
    if (chaveAcesso && chaveAcesso.length === 44) {
      const cnpjChave = chaveAcesso.substring(6, 20);
      if (!cnpjsEncontrados.includes(cnpjChave)) {
        cnpjsEncontrados.push(cnpjChave);
      }
    }

    const regexCnpjs = String(textoOcrLocal || '').match(/\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[\-\s]?\d{2}/g) || [];
    for (const rawCnpj of regexCnpjs) {
      const limpo = rawCnpj.replace(/\D/g, '');
      if (limpo.length === 14 && !cnpjsEncontrados.includes(limpo)) {
        cnpjsEncontrados.push(limpo);
      }
    }

    // Consulta até os 3 primeiros CNPJs da nota (Emitente, Destinatário, Transportador) na Receita Federal em paralelo
    const consultasCnpj = await Promise.all(
      cnpjsEncontrados.slice(0, 3).map((c) => consultarCnpjReceita(c))
    );
    const infoCnpjs = consultasCnpj.filter(Boolean);

    // 2. Monta o contexto completo para o Agente de IA
    const userPrompt = `${SYSTEM_PROMPT}

ORIENTAÇÃO / FORMATO DA IMAGEM: ${orientacaoDetectada || 'Retrato / Padrão'}

DADOS PRÉ-IDENTIFICADOS PELO PARSER ESTRUTURAL:
${JSON.stringify(preExtraido || {}, null, 2)}

DADOS OFICIAIS DA RECEITA FEDERAL DOS CNPJs ENCONTRADOS NA NOTA (1º geralmente é Emitente/Origem, 2º é Destinatário/Destino):
${JSON.stringify(infoCnpjs, null, 2)}

TEXTO COMPLETO LIDO DA NOTA FISCAL (INCLUINDO TOPO, CORPO E DADOS ADICIONAIS):
${textoOcrLocal}`;

    let resultadoIa = null;
    let provedorUsado = '';

    // Opção A: Agente de IA Rápido Gratuito (openai-fast via Pollinations)
    try {
      const polRes = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai-fast',
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: userPrompt }]
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (polRes.ok) {
        const polData = await polRes.json();
        const content = polData?.choices?.[0]?.message?.content;
        resultadoIa = extrairJsonDaResposta(content);
        if (resultadoIa) {
          provedorUsado = 'Agente IA Logístico + Receita Federal';
        }
      }
    } catch (e) {
      console.warn('Aviso Agente IA openai-fast:', e.message);
    }

    // Fallback determinístico inteligente com os dados da Receita Federal caso o LLM demore
    if (!resultadoIa) {
      const emitenteReceita = infoCnpjs[0] || null;
      const destReceita = infoCnpjs[1] || null;

      let empFinal = preExtraido?.empresa || '';
      if (!empFinal || empFinal.includes('HOMOLOGACAO') || empFinal.includes('HOMOLOGAÇÃO')) {
        empFinal = resumirNomeEmpresa(emitenteReceita) || empFinal;
      }

      let destFinal = preExtraido?.destino || '';
      if (!destFinal || destFinal.includes('HOMOLOGACAO') || destFinal.includes('HOMOLOGAÇÃO')) {
        destFinal = resumirNomeEmpresa(destReceita) || destFinal;
      }

      const origFinal =
        emitenteReceita?.municipio?.toUpperCase() ||
        preExtraido?.origem ||
        'PIRACICABA';

      resultadoIa = {
        empresa: empFinal,
        nf: preExtraido?.nf || '',
        origem: origFinal,
        destino: destFinal,
        qtdVol: preExtraido?.qtdVol || '1',
        peso: preExtraido?.peso || '',
        explicacaoIa:
          infoCnpjs.length > 0
            ? `CNPJ validado na Receita Federal (${resumirNomeEmpresa(emitenteReceita)}${destReceita ? ' → ' + resumirNomeEmpresa(destReceita) : ''})`
            : 'Leitura estrutural multi-layout concluída'
      };
      provedorUsado = 'Agente Estrutural + Receita Federal';
    }

    // Garantia final: se houver Chave de 44 dígitos, o número da NF da chave é 100% exato
    if (chaveAcesso && chaveAcesso.length === 44) {
      const nfChave = parseInt(chaveAcesso.substring(25, 34), 10);
      if (nfChave && !isNaN(nfChave)) {
        resultadoIa.nf = String(nfChave);
      }
    }

    // Se o peso ou volume já tinha sido capturado pelo parser estrutural e a IA deixou vazio, preserva
    if (!resultadoIa.peso && preExtraido?.peso) {
      resultadoIa.peso = preExtraido.peso;
    }
    if ((!resultadoIa.qtdVol || resultadoIa.qtdVol === '0') && preExtraido?.qtdVol) {
      resultadoIa.qtdVol = preExtraido.qtdVol;
    }

    return NextResponse.json({
      ok: true,
      provedor: provedorUsado,
      dados: {
        empresa: String(resultadoIa.empresa || preExtraido?.empresa || '').toUpperCase().trim(),
        nf: String(resultadoIa.nf || preExtraido?.nf || '').replace(/^0+/, '').trim(),
        origem: String(resultadoIa.origem || preExtraido?.origem || 'PIRACICABA').toUpperCase().trim(),
        destino: String(resultadoIa.destino || preExtraido?.destino || '').toUpperCase().trim(),
        qtdVol: String(resultadoIa.qtdVol || preExtraido?.qtdVol || '1').trim(),
        peso: String(resultadoIa.peso || preExtraido?.peso || '').trim(),
        chaveAcesso,
        explicacaoIa:
          resultadoIa.explicacaoIa ||
          'Agente de IA interpretou o layout da nota e validou os campos.'
      }
    });
  } catch (error) {
    console.error('Erro em /api/ia-ler-nfe:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}
