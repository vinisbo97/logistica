'use client';
import "./globals.css";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname, useRouter } from 'next/navigation';

export default function RootLayout({ children }) {
  const [theme, setTheme] = useState('light');
  const [empresa, setEmpresa] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('pslog-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        const { data } = await supabase.from('configuracoes_empresa').select('*').limit(1).maybeSingle();
        if (data) setEmpresa(data);
      } else {
        setIsAuthenticated(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
      setSessionChecked(true);
    }
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('pslog-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const isDark = theme === 'dark';

  // Se for a página de login, renderiza apenas o login isolado
  if (pathname === '/login') {
    return (
      <html lang="pt-BR" data-theme={theme}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-screen overflow-hidden font-sans">
          {children}
        </body>
      </html>
    );
  }

  // Enquanto verifica a sessão, mostra apenas uma tela de carregamento limpa (bloqueia o dashboard)
  if (!sessionChecked) {
    return (
      <html lang="pt-BR" data-theme={theme}>
        <body className="bg-slate-50 dark:bg-slate-950 flex items-center justify-center h-screen font-sans">
          <div className="text-slate-400 animate-pulse text-sm">Carregando PS Logística...</div>
        </body>
      </html>
    );
  }

  // Se não estiver autenticado, bloqueia a exibição do painel e redireciona
  if (!isAuthenticated) {
    return (
      <html lang="pt-BR" data-theme={theme}>
        <body className="bg-slate-50 dark:bg-slate-950 flex items-center justify-center h-screen font-sans">
          <div className="text-slate-400 animate-pulse text-sm">Redirecionando para o login...</div>
        </body>
      </html>
    );
  }

  // Se estiver autenticado, renderiza o sistema completo normalmente
  return (
    <html lang="pt-BR" data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-screen overflow-hidden font-sans">
        
        <div className="flex h-full">
          
          {/* SIDEBAR */}
          <aside className="w-[280px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm z-10">
            
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {empresa?.logo_url ? (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm">
                    <img src={empresa.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 flex-shrink-0">
                    {empresa?.nome_fantasia ? empresa.nome_fantasia.substring(0, 2).toUpperCase() : 'PS'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="m-0 text-base font-bold text-slate-900 dark:text-white truncate">
                    {empresa?.nome_fantasia || 'PS LOGÍSTICA'}
                  </h1>
                  <p className="m-0 text-xs text-slate-500 dark:text-slate-400 truncate">Gestão de Transportes</p>
                </div>
              </div>
            </div>
            
            {/* NAV */}
            <nav className="flex-1 p-6 space-y-1 overflow-y-auto">
              {[
                { href: '/', label: 'Dashboard', icon: '🏠' },
                { href: '/clientes', label: 'Clientes', icon: '👥' },
                { href: '/cotacoes', label: 'Cotações', icon: '📄' },
                { href: '/financeiro', label: 'Financeiro', icon: '💰' },
                { href: '/relatorios', label: 'Relatórios', icon: '📊' },
                { href: '/entregas', label: 'Entregas', icon: '🚚' },
                { href: '/veiculos', label: 'Veículos', icon: '🚛' },
                { href: '/configuracoes', label: 'Configurações', icon: '⚙️' },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-all">
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">v1.3.0</span>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer transition-colors"
              >
                Sair do Sistema
              </button>
            </div>
          </aside>

          {/* CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* HEADER */}
            <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shadow-xs">
              <div className="flex-1">
                <h2 className="m-0 text-sm font-medium text-slate-500 dark:text-slate-400">Painel de Controle</h2>
              </div>
              
              <div className="flex items-center gap-6">
                <button onClick={toggleTheme} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer text-base hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                  {isDark ? '☀️' : '🌙'}
                </button>
                
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-700">
                  <div className="text-right">
                    <p className="m-0 text-sm font-bold text-slate-900 dark:text-white">Administrador</p>
                    <p className="m-0 text-xs text-emerald-500 font-medium">Online</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
                    {empresa?.nome_fantasia ? empresa.nome_fantasia.substring(0, 2).toUpperCase() : 'PS'}
                  </div>
                </div>
              </div>
            </header>
            
            {/* MAIN */}
            <main className="flex-1 p-8 overflow-y-auto bg-slate-100 dark:bg-slate-950">
              <div className="max-w-6xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}