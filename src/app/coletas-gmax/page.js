'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseDanfeText } from '@/lib/nfeParser';

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

// Exemplos prontos para você testar com 1 clique se a foto/OCR está funcionando!
const SIMULACOES_NF = [
  {
    nome: 'Simulação 1: LUITEX (Americana)',
    texto: `DANFE
DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
EMITENTE: LUITEX MATERIAIS PARA FIXACAO LTDA
AV. BRASIL, 1500 - AMERICANA - SP
CHAVE DE ACESSO: 35261012345678000190550010006440891234567890
NF-e Nº 644.089
SÉRIE 1
DESTINATÁRIO: DA MATA ACUCAR E ALCOOL S/A
TRANSPORTADOR / VOLUMES:
QUANTIDADE: 2 VOLUMES
ESPÉCIE: VOL
PESO BRUTO: 12.50 KG
PESO LÍQUIDO: 12.00 KG`
  },
  {
    nome: 'Simulação 2: TRATORCOM (Piracicaba)',
    texto: `DANFE NOTA FISCAL ELETRONICA
TRATORCOM PECAS E TRATORES LTDA
DADOS DO EMITENTE: RUA DO PORTO, 300 - PIRACICABA - SP
Nº 151.796 SÉRIE 2
DESTINATÁRIO: COOP. AGRICOLA
DADOS DOS VOLUMES TRANSPORTADOS:
QTD: 1 VOL
PESO BRUTO: 94.00 KG
VALOR TOTAL DA NOTA: R$ 4.250,00`
  },
  {
    nome: 'Simulação 3: SEALVALVE (Araras)',
    texto: `DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRONICA
SEALVALVE INDUSTRIA DE VALVULAS
DISTRITO INDUSTRIAL - ARARAS - SP
NF-e N° 12631
DESTINO: COOP. AGRICOLA
QUANTIDADE: 1 VOL
PESO: 10.00 KG`
  }
];

// Rótulo dinâmico da semana atual
function getRotuloSemanaAtual() {
  const agora = new Date();
  const diaSemana = agora.getDay();
  const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(agora);
  segunda.setDate(agora.getDate() + diffSegunda);

  const sexta = new Date(segunda);
  sexta.setDate(segunda.getDate() + 4);

  const fmt = (d) => {
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = String(d.getFullYear()).slice(-2);
    return `${dia}/${mes}/${ano}`;
  };

  return `COLETAS GMAX - SEMANA ${fmt(segunda)} A ${fmt(sexta)}`;
}

export default function PlanilhaGmaxPage() {
  const [semanasDisponiveis, setSemanasDisponiveis] = useState([]);
  const [semanaAtiva, setSemanaAtiva] = useState(getRotuloSemanaAtual());
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('Salvo na Nuvem');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // Modal para criar nova semana
  const [showNovaSemanaModal, setShowNovaSemanaModal] = useState(false);
  const [nomeNovaSemana, setNomeNovaSemana] = useState('');

  // Câmera / Leitor de Foto da NFe (OCR no Celular / Desktop)
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState('');
  const [ocrDadosExtraidos, setOcrDadosExtraidos] = useState(null);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Inputs de arquivo (Câmera Traseira nativa e Galeria/Arquivo)
  const cameraTraseiraInputRef = useRef(null);
  const galeriaInputRef = useRef(null);

  useEffect(() => {
    carregarSemanas();
  }, []);

  useEffect(() => {
    if (semanaAtiva) {
      carregarLinhasDaSemana(semanaAtiva);
    }
  }, [semanaAtiva]);

  // Limpa stream de câmera ao desmontar
  useEffect(() => {
    return () => {
      pararCameraAoVivo();
    };
  }, []);

  async function carregarSemanas() {
    try {
      const { data } = await supabase
        .from('cotacoes')
        .select('descricao')
        .ilike('descricao', 'GMAX_EXCEL:%');

      const setSem = new Set();
      setSem.add(getRotuloSemanaAtual());
      setSem.add('COLETAS GMAX - SEMANA 19/10/26 A 23/10/26');

      if (data) {
        data.forEach((d) => {
          try {
            const parsed = JSON.parse(d.descricao.replace('GMAX_EXCEL:', ''));
            if (parsed.semana_nome) setSem.add(parsed.semana_nome);
          } catch (e) {}
        });
      }

      const lista = Array.from(setSem);
      setSemanasDisponiveis(lista);
      if (!lista.includes(semanaAtiva)) {
        setSemanaAtiva(lista[0]);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function carregarLinhasDaSemana(nomeSemana) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cotacoes')
        .select('*')
        .ilike('descricao', 'GMAX_EXCEL:%')
        .order('id', { ascending: true });

      if (error) throw error;

      const linhasFiltradas = [];
      if (data) {
        data.forEach((d) => {
          try {
            const raw = JSON.parse(d.descricao.replace('GMAX_EXCEL:', ''));
            const sem = raw.semana_nome || 'COLETAS GMAX - SEMANA 19/10/26 A 23/10/26';
            if (sem === nomeSemana) {
              linhasFiltradas.push({ dbId: d.id, ...raw });
            }
          } catch (e) {}
        });
      }

      while (linhasFiltradas.length < 35) {
        linhasFiltradas.push(criarLinhaVazia(linhasFiltradas.length + 1, nomeSemana));
      }
      setLinhas(linhasFiltradas);
    } catch (err) {
      console.error(err);
      notificar('error', 'Erro ao carregar dados da semana.');
    } finally {
      setLoading(false);
    }
  }

  function criarLinhaVazia(seqIndex, semNome = semanaAtiva) {
    return {
      dbId: null,
      semana_nome: semNome,
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

  async function atualizarCelula(index, campo, valor) {
    const novasLinhas = [...linhas];
    const linhaAtual = { ...novasLinhas[index], [campo]: valor, semana_nome: semanaAtiva };

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

  function handleCriarNovaSemana(e) {
    e.preventDefault();
    const nomeLimpo = nomeNovaSemana.trim().toUpperCase();
    if (!nomeLimpo) return;

    if (!semanasDisponiveis.includes(nomeLimpo)) {
      setSemanasDisponiveis([nomeLimpo, ...semanasDisponiveis]);
    }
    setSemanaAtiva(nomeLimpo);
    setNomeNovaSemana('');
    setShowNovaSemanaModal(false);
    notificar('success', `Nova planilha criada: ${nomeLimpo}`);
  }

  function adicionarLinha() {
    setLinhas([...linhas, criarLinhaVazia(linhas.length + 1, semanaAtiva)]);
  }

  async function excluirLinha(index) {
    const linha = linhas[index];
    if (linha.dbId) {
      if (confirm(`Remover lançamento da NF ${linha.nf || index + 1}?`)) {
        await supabase.from('cotacoes').delete().eq('id', linha.dbId);
        const copy = [...linhas];
        copy.splice(index, 1);
        copy.push(criarLinhaVazia(copy.length + 1, semanaAtiva));
        setLinhas(copy);
        notificar('success', 'Lançamento excluído com sucesso.');
      }
    } else {
      const copy = [...linhas];
      copy[index] = criarLinhaVazia(index + 1, semanaAtiva);
      setLinhas(copy);
    }
  }

  // ==========================================
  // CÂMERA TRASEIRA FORÇADA VIA WEBCAM API OU CAPTURE
  // ==========================================
  async function iniciarCameraTraseiraAoVivo() {
    setCameraAtiva(true);
    setShowOcrModal(true);
    setOcrDadosExtraidos(null);
    setOcrPreviewUrl('');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // facingMode: { exact: "environment" } ou fallback { ideal: "environment" } força a câmera TRASEIRA
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        // Se o navegador não suportar getUserMedia direto, abre o seletor com capture="environment"
        cameraTraseiraInputRef.current?.click();
      }
    } catch (err) {
      console.warn('Não foi possível abrir stream direto, usando input capture:', err);
      pararCameraAoVivo();
      cameraTraseiraInputRef.current?.click();
    }
  }

  function pararCameraAoVivo() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraAtiva(false);
  }

  // Captura o frame do vídeo e roda o OCR
  function capturarFotoDaCameraAoVivo() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        pararCameraAoVivo();
        processarImagemOcr(blob);
      }
    }, 'image/jpeg', 0.92);
  }

  // Recebe imagem via arquivo (ou foto tirada) e processa
  async function handleArquivoFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    pararCameraAoVivo();
    processarImagemOcr(file);
  }

  async function processarImagemOcr(fileOrBlob) {
    const preview = URL.createObjectURL(fileOrBlob);
    setOcrPreviewUrl(preview);
    setShowOcrModal(true);
    setOcrLoading(true);
    setOcrProgress(15);

    try {
      const { createWorker } = await import('tesseract.js');
      setOcrProgress(35);

      const worker = await createWorker('por');
      setOcrProgress(65);

      const ret = await worker.recognize(fileOrBlob);
      await worker.terminate();
      setOcrProgress(90);

      const textoLido = ret.data.text;
      const extraido = parseDanfeText(textoLido);

      setOcrDadosExtraidos({
        ...extraido,
        textoCompleto: textoLido
      });
      notificar('success', 'Foto lida com sucesso! Confira e confirme.');
    } catch (err) {
      console.error('Erro no OCR:', err);
      notificar('error', 'Não foi possível ler todos os dados automaticamente. Preencha manualmente.');
      setOcrDadosExtraidos({
        nf: '',
        empresa: '',
        origem: 'PIRACICABA',
        destino: '',
        peso: '',
        qtdVol: '1'
      });
    } finally {
      setOcrLoading(false);
      setOcrProgress(100);
    }
  }

  // SIMULAÇÃO DE TESTE COM 1 CLIQUE
  function simularTesteLeituraNFe(simulacao) {
    pararCameraAoVivo();
    setOcrPreviewUrl('');
    setShowOcrModal(true);
    setOcrLoading(true);
    setOcrProgress(50);

    setTimeout(() => {
      const extraido = parseDanfeText(simulacao.texto);
      setOcrDadosExtraidos({
        ...extraido,
        textoCompleto: simulacao.texto
      });
      setOcrLoading(false);
      setOcrProgress(100);
      notificar('success', `Teste simulado carregado com sucesso: ${simulacao.nome}`);
    }, 600);
  }

  async function confirmarInserirOcrNaPlanilha() {
    if (!ocrDadosExtraidos) return;

    let idxVazia = linhas.findIndex((l) => !l.empresa && !l.nf);
    const novasLinhas = [...linhas];

    const novaLinha = {
      dbId: null,
      semana_nome: semanaAtiva,
      seq: idxVazia !== -1 ? String(idxVazia + 1) : String(linhas.length + 1),
      tipo: 'COLETA',
      empresa: ocrDadosExtraidos.empresa || 'NOVA COLETA',
      nf: ocrDadosExtraidos.nf || '',
      qtd_vol: ocrDadosExtraidos.qtdVol || '1',
      unid_vol: 'VOL',
      peso: ocrDadosExtraidos.peso || '',
      unid_peso: 'KG',
      data: new Date().toISOString().split('T')[0],
      origem: ocrDadosExtraidos.origem || 'PIRACICABA',
      coletor: 'LUIZ',
      destino: ocrDadosExtraidos.destino || '',
      valor: VALORES_PADRAO[ocrDadosExtraidos.origem] || 50
    };

    if (idxVazia !== -1) {
      novasLinhas[idxVazia] = novaLinha;
    } else {
      novasLinhas.push(novaLinha);
      idxVazia = novasLinhas.length - 1;
    }

    setLinhas(novasLinhas);
    setShowOcrModal(false);
    setOcrPreviewUrl('');
    setOcrDadosExtraidos(null);
    pararCameraAoVivo();

    try {
      const idSalvo = await persistirLinhaNoBanco(novaLinha);
      if (idSalvo) {
        novaLinha.dbId = idSalvo;
        novasLinhas[idxVazia] = novaLinha;
        setLinhas([...novasLinhas]);
      }
      notificar('success', `NF ${novaLinha.nf || ''} (${novaLinha.empresa}) inserida e salva na planilha!`);
    } catch (e) {
      console.error(e);
    }
  }

  function notificar(tipo, texto) {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 4500);
  }

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

  function exportarPlanilhaExcelGmax() {
    const nomeArquivo = `${semanaAtiva.replace(/[^a-zA-Z0-9\s\-]/g, '').trim()}.csv`;
    const csvRows = [];
    csvRows.push(',,,,,,,,,,,,');
    csvRows.push(`,TIPO DO SERVIÇO,${semanaAtiva},,,,,,,,,,`);
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
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notificar('success', `Planilha baixada: ${nomeArquivo}`);
  }

  function gerarPdfGmax() {
    const doc = new jsPDF('landscape');
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`PS LOGÍSTICA — BORDERÔ DE COLETAS E TRANSBORDOS GMAX`, 14, 11);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${semanaAtiva}   |   Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 18);

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
      head: [['#', 'TIPO', 'EMPRESA', 'Nº NF', 'VOL', 'PESO', 'DATA', 'ORIGEM', 'COLETOR', 'DESTINO', 'VALOR']],
      body,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 1.8 },
      foot: [[
        '',
        'RESUMO',
        `${totais.preenchidas} NOTAS FISCAIS`,
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

    const nomePdf = `${semanaAtiva.replace(/[^a-zA-Z0-9\s\-]/g, '').trim()}.pdf`;
    doc.save(nomePdf);
    notificar('success', `PDF gerado com sucesso: ${nomePdf}`);
  }

  return (
    <div className="space-y-4 pb-12">
      <datalist id="cidades-regiao-sugestoes">
        {CIDADES_REGIAO.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* 1. INPUT FORÇANDO CÂMERA TRASEIRA (capture="environment") */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraTraseiraInputRef}
        onChange={handleArquivoFoto}
        className="hidden"
      />

      {/* 2. INPUT PARA ESCOLHER DA GALERIA / FOTOS JÁ TIRADAS NO CELULAR */}
      <input
        type="file"
        accept="image/*"
        ref={galeriaInputRef}
        onChange={handleArquivoFoto}
        className="hidden"
      />

      {/* BARRA SUPERIOR EXCEL */}
      <div className="bg-[#107C41] text-white p-4 sm:p-5 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white text-[#107C41] rounded-2xl flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              XLS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase bg-white/20 px-2.5 py-0.5 rounded-full tracking-wider">
                  Controle Semanal GMAX
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${savingStatus === 'Salvando...' ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-emerald-300 text-emerald-950'}`}>
                  ● {savingStatus}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                {semanaAtiva}
              </h1>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO: CÂMERA TRASEIRA + SIMULAR TESTE + EXPORTAR */}
          <div className="flex flex-wrap items-center gap-2">
            {/* BOTÃO CÂMERA TRASEIRA */}
            <button
              onClick={iniciarCameraTraseiraAoVivo}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-2"
              title="Abre a câmera traseira do celular para ler a Nota Fiscal"
            >
              <span className="text-base">📸</span> Câmera Traseira (NF)
            </button>

            {/* BOTÃO SELECIONAR FOTO DA GALERIA */}
            <button
              onClick={() => galeriaInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer flex items-center gap-1.5"
              title="Escolher uma foto de NF já tirada no celular"
            >
              🖼️ Da Galeria
            </button>

            {/* BOTÃO SIMULAR TESTES PRONTOS */}
            <button
              onClick={() => setShowOcrModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              🧪 Simular Testes de NF
            </button>

            <button
              onClick={() => setShowNovaSemanaModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer flex items-center gap-1.5"
            >
              📅 + Nova Semana
            </button>

            <button
              onClick={exportarPlanilhaExcelGmax}
              className="px-4 py-2.5 rounded-xl bg-white text-[#107C41] hover:bg-emerald-50 text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              📊 Baixar Planilha (.csv)
            </button>

            <button
              onClick={gerarPdfGmax}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              📄 Gerar PDF p/ E-mail
            </button>
          </div>
        </div>

        {/* GUIAS DE SEMANAS */}
        <div className="pt-2 border-t border-white/20 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold uppercase text-white/70 whitespace-nowrap mr-1">
            Semanas:
          </span>
          {semanasDisponiveis.map((sem) => (
            <button
              key={sem}
              onClick={() => setSemanaAtiva(sem)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                semanaAtiva === sem
                  ? 'bg-white text-[#107C41] shadow-md font-black'
                  : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15'
              }`}
            >
              📑 {sem}
            </button>
          ))}
        </div>
      </div>

      {mensagem.texto && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
            mensagem.tipo === 'success'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : 'bg-rose-100 text-rose-900 border-rose-300'
          }`}
        >
          <span>{mensagem.texto}</span>
          <button onClick={() => setMensagem({ tipo: '', texto: '' })} className="underline text-[11px]">
            ✕
          </button>
        </div>
      )}

      {/* TOTALIZADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Notas na Semana</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totais.preenchidas}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Coletas (Luiz)</span>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{totais.coletas}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Transbordos GMAX</span>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{totais.transbordos}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Volumes (VOL)</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totais.volumes}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Peso Total</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totais.pesoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} KG</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl p-3 shadow-md">
          <span className="text-[10px] font-bold uppercase text-emerald-100">Total a Receber GMAX</span>
          <p className="text-xl font-black mt-0.5">R$ {totais.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* GRADE EXCEL */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
            <span>🖱️</span>
            <span>Grade Semanal: digite direto nas células ou clique em <strong>📸 Câmera Traseira</strong> no celular para preencher em 2 segundos!</span>
          </div>
          <button
            onClick={adicionarLinha}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] cursor-pointer"
          >
            + Inserir Linha
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-slate-500 animate-pulse">Carregando planilha da semana...</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
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
                  <th className="w-16 border-r border-slate-300 dark:border-slate-700 py-2.5 px-2 text-center">FOTO NF</th>
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

                    <td className="border-r border-slate-200 dark:border-slate-800 p-0 text-center">
                      {(row.foto_url || row.foto_base64) ? (
                        <button
                          onClick={() => window.open(row.foto_url || row.foto_base64, '_blank')}
                          title="Ver foto da NF tirada no barracão (salva por 15 dias)"
                          className="px-2 py-1 rounded bg-amber-400/20 text-amber-600 dark:text-amber-300 font-bold text-[10px] hover:bg-amber-400/40 cursor-pointer"
                        >
                          📸 Ver
                        </button>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>
                      )}
                    </td>

                    <td className="p-0 text-center">
                      {(row.empresa || row.nf || row.valor) ? (
                        <button
                          onClick={() => excluirLinha(idx)}
                          title="Remover linha"
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
                    TOTAL GERAL ({totais.preenchidas} NOTAS NA SEMANA)
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
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: NOVA SEMANA */}
      {showNovaSemanaModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>📅</span> Criar Nova Semana de Coletas
            </h3>
            <p className="text-xs text-slate-500">
              Ao virar a semana (ex: toda segunda-feira), crie a nova planilha para arquivar a anterior e começar os novos lançamentos.
            </p>

            <form onSubmit={handleCriarNovaSemana} className="space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold uppercase text-slate-400 mb-1">
                  Nome da Semana (Ex: COLETAS GMAX - SEMANA 26/10 A 30/10)
                </label>
                <input
                  type="text"
                  value={nomeNovaSemana}
                  onChange={(e) => setNomeNovaSemana(e.target.value)}
                  placeholder={getRotuloSemanaAtual()}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold uppercase"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNovaSemanaModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#107C41] hover:bg-emerald-600 text-white text-xs font-black shadow-md"
                >
                  Criar Planilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CÂMERA TRASEIRA AO VIVO / OCR / SIMULAÇÃO DE TESTE */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📸</span> Leitura de Nota Fiscal (Câmera Traseira & OCR)
              </h3>
              <button
                onClick={() => {
                  pararCameraAoVivo();
                  setShowOcrModal(false);
                  setOcrDadosExtraidos(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Fechar
              </button>
            </div>

            {/* SEÇÃO 1: CÂMERA AO VIVO TRASEIRA (STREAM DE VÍDEO) */}
            {cameraAtiva && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-amber-400 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-2 border-dashed border-white/50 pointer-events-none m-6 rounded-xl flex items-center justify-center">
                    <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded">
                      Enquadre a Nota Fiscal / DANFE aqui
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={pararCameraAoVivo}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                  >
                    Cancelar Câmera
                  </button>
                  <button
                    type="button"
                    onClick={capturarFotoDaCameraAoVivo}
                    className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    📸 Capturar Foto e Ler Dados
                  </button>
                </div>
              </div>
            )}

            {/* SEÇÃO 2: PROCESSANDO OCR */}
            {ocrLoading && (
              <div className="py-12 text-center space-y-4">
                <div className="inline-block animate-spin text-3xl">🔄</div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Lendo número da NF, empresa, peso e cidade de origem...
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
                  <div
                    className="bg-[#107C41] h-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* SEÇÃO 3: RESULTADOS IDENTIFICADOS */}
            {!cameraAtiva && !ocrLoading && ocrDadosExtraidos && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-bold flex items-center gap-2">
                  <span>✅</span> Dados identificados com sucesso! Confira e clique em confirmar:
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Empresa (Emitente / Remetente)
                    </label>
                    <input
                      type="text"
                      value={ocrDadosExtraidos.empresa || ''}
                      onChange={(e) => setOcrDadosExtraidos({ ...ocrDadosExtraidos, empresa: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Nº da Nota Fiscal
                    </label>
                    <input
                      type="text"
                      value={ocrDadosExtraidos.nf || ''}
                      onChange={(e) => setOcrDadosExtraidos({ ...ocrDadosExtraidos, nf: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Cidade de Origem (Coleta)
                    </label>
                    <input
                      type="text"
                      list="cidades-regiao-sugestoes"
                      value={ocrDadosExtraidos.origem || 'PIRACICABA'}
                      onChange={(e) => setOcrDadosExtraidos({ ...ocrDadosExtraidos, origem: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Volumes
                    </label>
                    <input
                      type="number"
                      value={ocrDadosExtraidos.qtdVol || '1'}
                      onChange={(e) => setOcrDadosExtraidos({ ...ocrDadosExtraidos, qtdVol: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Peso (KG)
                    </label>
                    <input
                      type="text"
                      value={ocrDadosExtraidos.peso || ''}
                      onChange={(e) => setOcrDadosExtraidos({ ...ocrDadosExtraidos, peso: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">
                      Destino (Cliente Final)
                    </label>
                    <input
                      type="text"
                      value={ocrDadosExtraidos.destino || ''}
                      onChange={(e) => setOcrDadosExtraidos({ ...ocrDadosExtraidos, destino: e.target.value.toUpperCase() })}
                      placeholder="Ex: COOP. AGRICOLA, DA MATA..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOcrDadosExtraidos(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={confirmarInserirOcrNaPlanilha}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    ✓ Inserir e Salvar na Planilha
                  </button>
                </div>
              </div>
            )}

            {/* SEÇÃO 4: BOTÕES PARA SIMULAR TESTES DE NF COM 1 CLIQUE */}
            {!cameraAtiva && !ocrLoading && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  🧪 Testar funcionamento do leitor com simulações de notas fiscais:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SIMULACOES_NF.map((sim, i) => (
                    <button
                      key={i}
                      onClick={() => simularTesteLeituraNFe(sim)}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 text-left text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
                    >
                      <span className="block text-[10px] text-blue-600 dark:text-blue-400 uppercase font-black">
                        Teste #{i + 1}
                      </span>
                      {sim.nome.split(':')[1] || sim.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
