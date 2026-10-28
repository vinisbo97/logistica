'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

// Comprime e redimensiona a foto no celular para enviar rápido no 4G/Wi-Fi e gerar link permanente
function comprimirImagemParaBase64(fileOrBlob, maxWidth = 1100, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            const r2 = new FileReader();
            r2.onloadend = () => resolve({ blob, base64: r2.result });
            r2.readAsDataURL(blob);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

export default function AppColetaBarracaoPage() {
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [etapa, setEtapa] = useState('inicio'); // 'inicio' | 'camera' | 'lendo' | 'confirmar' | 'sucesso'
  const [progressoOcr, setProgressoOcr] = useState(0);
  const [fotoPreview, setFotoPreview] = useState('');
  const [fotoBlob, setFotoBlob] = useState(null);
  const [fotoBase64, setFotoBase64] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [ultimasEnviadas, setUltimasEnviadas] = useState([]);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [dadosNf, setDadosNf] = useState({
    empresa: '',
    nf: '',
    qtd_vol: '1',
    peso: '',
    origem: 'PIRACICABA',
    destino: '',
    tipo: 'COLETA',
    coletor: 'LUIZ'
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraNativaInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    verificarSessaoELimparAntigas();

    // Captura evento de instalação de App no Android/Chrome (PWA)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      pararCamera();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function verificarSessaoELimparAntigas() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }
    const email = session.user?.email || '';
    setUserEmail(email);
    setIsAdmin(email.toLowerCase() !== 'coleta@pslog.com');

    await carregarHistorico15Dias();
  }

  // Carrega fotos dos últimos 15 dias e apaga automaticamente fotos com mais de 15 dias para não lotar o banco
  async function carregarHistorico15Dias() {
    try {
      const { data } = await supabase
        .from('cotacoes')
        .select('*')
        .ilike('descricao', 'GMAX_EXCEL:%')
        .order('id', { ascending: false })
        .limit(60);

      if (!data) return;

      const limite15DiasMs = 15 * 24 * 60 * 60 * 1000;
      const agoraMs = Date.now();
      const recentes = [];

      for (const row of data) {
        try {
          const parsed = JSON.parse(row.descricao.replace('GMAX_EXCEL:', ''));
          // Se tiver foto salva há mais de 15 dias, limpa a foto mantendo os dados da planilha intactos!
          if (parsed.foto_timestamp && agoraMs - parsed.foto_timestamp > limite15DiasMs && (parsed.foto_url || parsed.foto_base64)) {
            const semFoto = { ...parsed, foto_url: null, foto_base64: null, foto_expirada: true };
            await supabase
              .from('cotacoes')
              .update({ descricao: `GMAX_EXCEL:${JSON.stringify(semFoto)}` })
              .eq('id', row.id);
          } else if (parsed.empresa || parsed.nf) {
            recentes.push({ id: row.id, ...parsed });
          }
        } catch (e) {}
      }

      setUltimasEnviadas(recentes.slice(0, 15));
    } catch (err) {
      console.error(err);
    }
  }

  async function instalarAppNoCelular() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        'Para colocar o ícone deste Aplicativo na tela inicial do celular:\n\n' +
        '📱 No Android (Chrome): Toque nos 3 pontinhos no canto superior direito e escolha "Adicionar à tela inicial" ou "Instalar aplicativo".\n\n' +
        '🍎 No iPhone (Safari): Toque no botão "Compartilhar" (quadradinho com seta na barra inferior) e escolha "Adicionar à Tela de Início".'
      );
    }
  }

  // Abre câmera traseira ao vivo ou câmera nativa do aparelho
  async function abrirCameraTraseira() {
    setEtapa('camera');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        cameraNativaInputRef.current?.click();
      }
    } catch (err) {
      pararCamera();
      cameraNativaInputRef.current?.click();
    }
  }

  function pararCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function baterFotoDaCameraAoVivo() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          pararCamera();
          processarFotoTirada(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  }

  function handleFotoNativaCelular(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setEtapa('inicio');
      return;
    }
    pararCamera();
    processarFotoTirada(file);
  }

  async function processarFotoTirada(fileOrBlob) {
    setEtapa('lendo');
    setProgressoOcr(15);

    // Comprime a imagem para guardar por 15 dias sem pesar
    const { blob, base64 } = await comprimirImagemParaBase64(fileOrBlob);
    setFotoBlob(blob);
    setFotoBase64(base64);
    setFotoPreview(base64);
    setProgressoOcr(35);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('por');
      setProgressoOcr(65);

      const ret = await worker.recognize(blob);
      await worker.terminate();
      setProgressoOcr(95);

      const lido = parseDanfeText(ret.data.text);
      setDadosNf({
        empresa: lido.empresa || '',
        nf: lido.nf || '',
        qtd_vol: lido.qtdVol || '1',
        peso: lido.peso || '',
        origem: lido.origem || 'PIRACICABA',
        destino: lido.destino || '',
        tipo: 'COLETA',
        coletor: 'LUIZ'
      });
    } catch (err) {
      console.error('Erro OCR:', err);
      setDadosNf({
        empresa: '',
        nf: '',
        qtd_vol: '1',
        peso: '',
        origem: 'PIRACICABA',
        destino: '',
        tipo: 'COLETA',
        coletor: 'LUIZ'
      });
    } finally {
      setProgressoOcr(100);
      setEtapa('confirmar');
    }
  }

  async function confirmarEGravarNaPlanilha(e) {
    e.preventDefault();
    setSalvando(true);

    try {
      const semanaAtual = getRotuloSemanaAtual();
      let publicFotoUrl = '';

      // 1. Tenta subir a foto no bucket 'fotos-nfe' do Supabase Storage
      if (fotoBlob) {
        const nomeArquivo = `nf_${dadosNf.nf || 'sem_num'}_${Date.now()}.jpg`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('fotos-nfe')
          .upload(nomeArquivo, fotoBlob, { contentType: 'image/jpeg', upsert: true });

        if (!upErr && upData) {
          const { data: pubUrl } = supabase.storage.from('fotos-nfe').getPublicUrl(nomeArquivo);
          publicFotoUrl = pubUrl?.publicUrl || '';
        }
      }

      const valorCalculado =
        dadosNf.tipo === 'TRANSBORDO' ? 0 : VALORES_PADRAO[dadosNf.origem.toUpperCase()] || 50;

      const registroPlanilha = {
        semana_nome: semanaAtual,
        seq: '',
        tipo: dadosNf.tipo || 'COLETA',
        empresa: (dadosNf.empresa || 'NF FOTOGRAFADA').toUpperCase(),
        nf: String(dadosNf.nf || ''),
        qtd_vol: dadosNf.qtd_vol || '1',
        unid_vol: 'VOL',
        peso: dadosNf.peso || '0',
        unid_peso: 'KG',
        data: new Date().toISOString().split('T')[0],
        origem: (dadosNf.origem || 'PIRACICABA').toUpperCase(),
        coletor: (dadosNf.coletor || 'LUIZ').toUpperCase(),
        destino: (dadosNf.destino || '').toUpperCase(),
        valor: valorCalculado,
        foto_url: publicFotoUrl || fotoBase64, // Guarda link do Storage ou Base64 comprimida por 15 dias
        foto_timestamp: Date.now(),
        enviado_por: userEmail || 'App Celular Barracão'
      };

      const payload = {
        codigo_rastreio: `GMAX-${registroPlanilha.nf || Math.floor(1000 + Math.random() * 9000)}`,
        cliente: registroPlanilha.empresa,
        origem: registroPlanilha.origem,
        destino: registroPlanilha.destino,
        tipo_veiculo: registroPlanilha.tipo,
        peso_estimado: `${registroPlanilha.peso} KG`,
        valor: valorCalculado,
        motorista_nome: registroPlanilha.coletor,
        nota_fiscal: registroPlanilha.nf,
        previsao_entrega: registroPlanilha.data,
        descricao: `GMAX_EXCEL:${JSON.stringify(registroPlanilha)}`,
        status: 'Planilha GMAX'
      };

      const { error } = await supabase.from('cotacoes').insert([payload]);
      if (error) throw error;

      await carregarHistorico15Dias();
      setEtapa('sucesso');
    } catch (err) {
      console.error(err);
      alert('Erro ao gravar na planilha. Verifique a conexão com a internet e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleSair() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#060B18] text-white flex flex-col justify-between pb-8 select-none">
      {/* INPUT CÂMERA TRASEIRA NATIVA DO CELULAR */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraNativaInputRef}
        onChange={handleFotoNativaCelular}
        className="hidden"
      />

      <datalist id="cidades-app-coleta">
        {CIDADES_REGIAO.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* CABEÇALHO SIMPLES E DIRETO PARA O CELULAR */}
      <header className="bg-[#107C41] px-4 py-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white text-[#107C41] flex items-center justify-center font-black text-xl shadow-md">
            PS
          </div>
          <div>
            <h1 className="text-base font-black leading-tight">APP DE COLETA — NF</h1>
            <p className="text-[11px] text-emerald-100 font-semibold">
              Fotografe a Nota Fiscal p/ gravar na Planilha
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/coletas-gmax"
              className="px-3 py-2 rounded-xl bg-white text-[#107C41] text-xs font-black shadow-sm"
            >
              📑 Ver Planilha
            </Link>
          )}
          <button
            onClick={handleSair}
            className="px-3 py-2 rounded-xl bg-black/25 hover:bg-black/40 text-white text-xs font-bold"
          >
            Sair
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO APP */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-6 space-y-6">
        {/* ETAPA 1: TELA INICIAL COM BOTÃO GIGANTE DE TIRAR FOTO */}
        {etapa === 'inicio' && (
          <>
            <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
              <div className="w-20 h-20 rounded-3xl bg-amber-400 text-slate-950 flex items-center justify-center text-4xl mx-auto shadow-lg shadow-amber-400/20">
                📸
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white">Fotografar Nota Fiscal</h2>
                <p className="text-sm text-slate-300">
                  Toque no botão amarelo abaixo para abrir a <strong>câmera traseira</strong>, bater a foto da nota e enviar direto para a planilha da semana.
                </p>
              </div>

              {/* BOTÃO PRINCIPAL: ABRE A CÂMERA TRASEIRA NATIVA DO CELULAR (MAIS FÁCIL E COM FOCO AUTOMÁTICO) */}
              <button
                onClick={() => cameraNativaInputRef.current?.click()}
                className="w-full py-6 rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-slate-950 font-black text-xl shadow-xl shadow-amber-400/25 flex items-center justify-center gap-3 cursor-pointer transition-all"
              >
                <span className="text-3xl">📷</span> TIRAR FOTO DA NOTA
              </button>

              {/* OPÇÃO SECUNDÁRIA: CÂMERA DENTRO DA TELA */}
              <button
                onClick={abrirCameraTraseira}
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer"
              >
                Abrir visor de câmera dentro da tela
              </button>
            </div>

            {/* BOTÃO PARA INSTALAR COMO APLICATIVO NA TELA INICIAL DO CELULAR */}
            <div className="bg-blue-950/50 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📲</span>
                <div>
                  <h3 className="text-xs font-black text-white uppercase">Instalar Aplicativo no Celular</h3>
                  <p className="text-[11px] text-blue-200">
                    Cria um ícone na tela inicial do celular para entrar com 1 toque.
                  </p>
                </div>
              </div>
              <button
                onClick={instalarAppNoCelular}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shrink-0 shadow-md cursor-pointer"
              >
                Instalar App
              </button>
            </div>

            {/* ÚLTIMAS NOTAS FOTOGRAFADAS (GUARDADAS POR 15 DIAS PARA CONFERÊNCIA) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  🗂️ Últimas Notas Fotografadas (Salvas por 15 dias)
                </h3>
                <span className="text-[11px] text-emerald-400 font-bold">
                  {ultimasEnviadas.length} registradas
                </span>
              </div>

              {ultimasEnviadas.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-400">
                  Nenhuma foto tirada hoje ainda.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {ultimasEnviadas.map((item, i) => (
                    <div
                      key={item.id || i}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {(item.foto_url || item.foto_base64) ? (
                          <button
                            onClick={() => setFotoAmpliada(item.foto_url || item.foto_base64)}
                            className="w-12 h-12 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 relative group"
                          >
                            <img
                              src={item.foto_url || item.foto_base64}
                              alt="Foto NF"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0">
                            📄
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate">
                            {item.empresa || 'EMPRESA'} — NF {item.nf || 'S/N'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            📍 {item.origem} • {item.qtd_vol || 1} VOL • {item.peso || 0} KG
                          </p>
                        </div>
                      </div>

                      {(item.foto_url || item.foto_base64) && (
                        <button
                          onClick={() => setFotoAmpliada(item.foto_url || item.foto_base64)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-300 shrink-0"
                        >
                          Ver Foto
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ETAPA 2: VISOR DE CÂMERA AO VIVO */}
        {etapa === 'camera' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] border-2 border-amber-400">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex items-end justify-center p-3">
                <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Aponte para o topo da Nota Fiscal
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  pararCamera();
                  setEtapa('inicio');
                }}
                className="py-4 rounded-2xl bg-slate-800 text-white font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={baterFotoDaCameraAoVivo}
                className="py-4 rounded-2xl bg-amber-400 text-slate-950 font-black text-base shadow-lg"
              >
                📸 BATER FOTO
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: LENDO A FOTO AUTOMATICAMENTE */}
        {etapa === 'lendo' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5">
            <div className="text-5xl animate-bounce">🔍</div>
            <h2 className="text-xl font-black text-white">Lendo os dados da Nota Fiscal...</h2>
            <p className="text-xs text-slate-400">
              Identificando empresa, número da nota, cidade de origem e peso automaticamente.
            </p>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${progressoOcr}%` }}
              />
            </div>
          </div>
        )}

        {/* ETAPA 4: CONFIRMAÇÃO SUPER SIMPLES COM LETRAS GRANDES */}
        {etapa === 'confirmar' && (
          <form onSubmit={confirmarEGravarNaPlanilha} className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase text-emerald-400 block">
                  Foto Capturada com Sucesso
                </span>
                <h2 className="text-lg font-black text-white">Confira ou Complete os Dados</h2>
              </div>
              {fotoPreview && (
                <img
                  src={fotoPreview}
                  alt="Miniatura NF"
                  onClick={() => setFotoAmpliada(fotoPreview)}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-amber-400 cursor-pointer"
                />
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">
                  Nome da Empresa (De onde coletou) *
                </label>
                <input
                  type="text"
                  value={dadosNf.empresa}
                  onChange={(e) => setDadosNf({ ...dadosNf, empresa: e.target.value.toUpperCase() })}
                  placeholder="Ex: TRATORCOM, LUITEX, UNIMIL..."
                  className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-black text-white uppercase focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">
                    Nº da Nota Fiscal *
                  </label>
                  <input
                    type="text"
                    value={dadosNf.nf}
                    onChange={(e) => setDadosNf({ ...dadosNf, nf: e.target.value })}
                    placeholder="Ex: 151796"
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base font-mono font-black text-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">
                    Cidade Origem
                  </label>
                  <input
                    type="text"
                    list="cidades-app-coleta"
                    value={dadosNf.origem}
                    onChange={(e) => setDadosNf({ ...dadosNf, origem: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-sm font-black text-white uppercase focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">
                    Qtd Volumes
                  </label>
                  <input
                    type="number"
                    value={dadosNf.qtd_vol}
                    onChange={(e) => setDadosNf({ ...dadosNf, qtd_vol: e.target.value })}
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-base font-black text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">
                    Peso (KG)
                  </label>
                  <input
                    type="text"
                    value={dadosNf.peso}
                    onChange={(e) => setDadosNf({ ...dadosNf, peso: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-base font-mono font-black text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-300 mb-1">
                  Destino (Cliente Final)
                </label>
                <input
                  type="text"
                  value={dadosNf.destino}
                  onChange={(e) => setDadosNf({ ...dadosNf, destino: e.target.value.toUpperCase() })}
                  placeholder="Ex: COOP. AGRICOLA, DA MATA..."
                  className="w-full bg-slate-800 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3 text-base font-black text-white uppercase focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEtapa('inicio')}
                className="py-4 rounded-2xl bg-slate-800 text-slate-300 font-bold text-sm"
              >
                Tirar Outra Foto
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/25 cursor-pointer"
              >
                {salvando ? 'GRAVANDO...' : '✅ SALVAR NA PLANILHA'}
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 5: TELA DE SUCESSO GIGANTE */}
        {etapa === 'sucesso' && (
          <div className="bg-emerald-950/90 border-2 border-emerald-400 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-4xl mx-auto font-black shadow-lg">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">GRAVADO COM SUCESSO!</h2>
              <p className="text-sm text-emerald-200">
                A Nota Fiscal <strong>{dadosNf.nf}</strong> ({dadosNf.empresa}) e a foto já estão salvas na planilha da semana!
              </p>
            </div>

            <button
              onClick={() => {
                setFotoPreview('');
                setFotoBlob(null);
                setEtapa('inicio');
              }}
              className="w-full py-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-xl cursor-pointer"
            >
              📸 FOTOGRAFAR PRÓXIMA NOTA
            </button>
          </div>
        )}
      </main>

      {/* MODAL PARA AMPLIAR A FOTO DA NOTA FISCAL */}
      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
        >
          <div className="max-w-2xl w-full space-y-3">
            <div className="flex justify-between items-center text-white">
              <span className="text-xs font-bold uppercase text-amber-400">
                📸 Foto Arquivada da Nota Fiscal (Conferência 15 Dias)
              </span>
              <button
                onClick={() => setFotoAmpliada(null)}
                className="px-4 py-1.5 rounded-xl bg-white/20 text-xs font-bold"
              >
                ✕ Fechar Foto
              </button>
            </div>
            <img
              src={fotoAmpliada}
              alt="Foto Nota Fiscal Ampliada"
              className="w-full max-h-[80vh] object-contain rounded-2xl border-2 border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
