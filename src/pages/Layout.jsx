
import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/components/utils/helpers";
import { Toaster } from "sonner";
// 👈 MIGRACIÓN: Usar dataClient unificado
import { dataClient } from "@/components/api/dataClient";
import { useVirtualKeyboard } from "@/components/utils/KeyboardAwareLayout";
import { I18nProvider } from "@/components/utils/i18n";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { LowStockMonitor } from "@/components/notifications/LowStockMonitor";
import {
  Home,
  ClipboardList,
  Wallet,
  Users
} from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");
  const { keyboardOpen } = useVirtualKeyboard();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Detectar si estamos en el Dashboard
  const isDashboard = useMemo(() => 
    location.pathname === "/" || location.pathname === "/Dashboard",
    [location.pathname]
  );

  // ✅ Detectar si estamos en PinAccess
  const isPinAccess = useMemo(() => 
    location.pathname === "/PinAccess",
    [location.pathname]
  );

  // ✅ CARGAR CONTEO DE NOTIFICACIONES
  const loadUnreadCount = async (userId) => {
    if (!userId) return;
    try {
      const notifications = await dataClient.entities.Notification.filter({
        user_id: userId,
        is_read: false
      });
      setUnreadCount(notifications?.length || 0);
    } catch (error) {
      console.error("Error loading unread count:", error);
      setUnreadCount(0);
    }
  };

  // ✅ CARGAR USUARIO - SOLO SI NO ESTAMOS EN PINACCESS
  useEffect(() => {
    // Si estamos en páginas públicas, NO cargar usuario
    if (isPinAccess) {
      setUser(null);
      return;
    }

    // Cargar usuario solo en páginas protegidas
    let isMounted = true;
    
    (async () => {
      try {
        const u = await dataClient.auth.me();
        if (isMounted && u) {
          setUser(u);
          // Cargar conteo de notificaciones
          if (u.id) {
            loadUnreadCount(u.id);
          }
          
          // AI NOTE: Iniciar monitor de stock bajo solo para admins
          if (u.role === 'admin' || u.role === 'manager') {
            LowStockMonitor.checkLowStockProducts();
          }
        }
      } catch (err) {
        if (isMounted) {
          console.log("Layout: No user session detected");
          setUser(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isPinAccess]);

  // ✅ REFRESCAR CONTEO CADA 30 SEGUNDOS Y ESCUCHAR EVENTOS
  useEffect(() => {
    if (!user?.id || isPinAccess) return;

    const interval = setInterval(() => {
      if (user?.id) {
        loadUnreadCount(user.id);
      }
    }, 30000);

    // ✅ Escuchar eventos de notificaciones
    const handleNotificationEvent = () => {
      if (user?.id) loadUnreadCount(user.id);
    };

    window.addEventListener('notification-created', handleNotificationEvent);
    window.addEventListener('notification-read', handleNotificationEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-created', handleNotificationEvent);
      window.removeEventListener('notification-read', handleNotificationEvent);
    };
  }, [user?.id, isPinAccess]);

  // ✅ Load theme on mount
  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        const configs = await dataClient.entities.AppSettings.filter({ slug: "app-theme" });
        if (isMounted && configs?.length) {
          const savedTheme = configs[0].payload?.theme || "dark";
          setTheme(savedTheme);
          if (savedTheme === "light") {
            document.documentElement.classList.add("theme-light");
            document.documentElement.classList.remove("theme-dark");
          } else {
            document.documentElement.classList.remove("theme-light");
            document.documentElement.classList.add("theme-dark");
          }
        }
      } catch (error) {
        console.error("Error loading theme:", error);
        // Fallback to dark theme
        if (isMounted) {
          setTheme("dark");
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const darkBgUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f767a3d5fce1486d4cf555/572f84138_IMG_0296.png";
  const lightBgUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f767a3d5fce1486d4cf555/5e30d189f_IMG_1003.png";

  return (
    <I18nProvider>
      <div
        className={`flex h-screen flex-col relative ${theme === "light" ? "text-gray-900" : "text-slate-100"}`}
        style={{
          backgroundImage: isPinAccess ? 'none' : `url(${theme === "light" ? lightBgUrl : darkBgUrl})`,
          backgroundColor: '#000000',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
      {/* Overlay para mejorar legibilidad - SOLO SI NO ES PINACCESS */}
      {!isPinAccess && (
        <div className={`fixed inset-0 -z-10 ${theme === "light" ? "bg-[#F5F5F5]/95" : "bg-black/70"} backdrop-blur-sm`} />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          className: theme === "light"
            ? 'bg-white border-gray-200 text-gray-900 shadow-lg'
            : 'bg-black/90 backdrop-blur-xl border border-white/10 text-white',
          style: theme === "light"
            ? {
                background: 'white',
                border: '1px solid #E5E7EB',
                color: '#111827',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }
            : {
                background: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'white',
              },
        }}
        richColors
      />

      {/* === Barra superior - OCULTA EN PINACCESS === */}
      {!isPinAccess && (
        <header
          className={`
            fixed top-0 left-0 right-0 z-40
            w-full
            ${theme === "light" ? "bg-white/95" : "bg-black/25"} backdrop-blur-xl
            ${theme === "light" ? "border-b border-gray-200" : "border-b border-white/10"}
            ${theme === "light" ? "shadow-sm" : "shadow-[0_2px_10px_rgba(0,0,0,0.2)]"}
            flex items-center justify-center
            px-4 sm:px-6
            h-20 sm:h-28
          `}
          style={{ pointerEvents: 'auto' }}
        >
          {/* ✅ NAVEGACIÓN EN LÍNEA RECTA MÁS COMPACTA - SOLO si NO estamos en Dashboard Y SOLO EN DESKTOP */}
          {!isDashboard && (
            <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
              <div className="relative w-[380px] sm:w-[450px] h-full flex items-center justify-center pointer-events-auto">

                <Link
                  to={createPageUrl("Dashboard")}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-xl transition-all shadow-lg hover:scale-110 active:scale-95 ${
                    location.pathname === "/" || location.pathname === "/Dashboard"
                      ? theme === "light"
                        ? "bg-gradient-to-br from-cyan-200 to-cyan-300 text-cyan-800 border-2 border-cyan-400 scale-110 shadow-[0_8px_24px_rgba(8,145,178,0.4)]"
                        : "bg-gradient-to-br from-cyan-600/50 to-cyan-700/50 text-cyan-200 border-2 border-cyan-500/60 scale-110 shadow-[0_8px_24px_rgba(0,168,232,0.4)]"
                      : theme === "light"
                        ? "bg-gradient-to-br from-cyan-100 to-cyan-200 hover:from-cyan-200 hover:to-cyan-300 text-cyan-700 border-2 border-cyan-300"
                        : "bg-gradient-to-br from-cyan-600/30 to-cyan-700/30 hover:from-cyan-600/50 hover:to-cyan-700/50 text-cyan-300 border-2 border-cyan-500/40"
                  }`}
                  title="Inicio"
                >
                  <Home className="w-5 h-5 sm:w-6 sm:h-6" />
                </Link>

                <Link
                  to={createPageUrl("Orders")}
                  className={`absolute left-14 sm:left-16 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-xl transition-all shadow-lg hover:scale-110 active:scale-95 ${
                    location.pathname.includes("Orders")
                      ? theme === "light"
                        ? "bg-gradient-to-br from-blue-200 to-blue-300 text-blue-800 border-2 border-blue-400 scale-110 shadow-[0_8px_24px_rgba(59,130,246,0.4)]"
                        : "bg-gradient-to-br from-blue-600/50 to-blue-700/50 text-blue-200 border-2 border-blue-500/60 scale-110 shadow-[0_8px_24px_rgba(59,130,246,0.4)]"
                      : theme === "light"
                        ? "bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 border-2 border-blue-300"
                        : "bg-gradient-to-br from-blue-600/30 to-blue-700/30 hover:from-blue-600/50 hover:to-blue-700/50 text-blue-300 border-2 border-blue-500/40"
                  }`}
                  title="Órdenes"
                >
                  <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
                </Link>

                <Link
                  to={createPageUrl("POS")}
                  className={`absolute right-14 sm:right-16 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-xl transition-all shadow-lg hover:scale-110 active:scale-95 ${
                    location.pathname.includes("POS")
                      ? theme === "light"
                        ? "bg-gradient-to-br from-lime-200 to-emerald-300 text-emerald-800 border-2 border-emerald-400 scale-110 shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
                        : "bg-gradient-to-br from-lime-600/50 to-emerald-700/50 text-emerald-200 border-2 border-emerald-500/60 scale-110 shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
                      : theme === "light"
                        ? "bg-gradient-to-br from-lime-100 to-emerald-200 hover:from-lime-200 hover:to-emerald-300 text-emerald-700 border-2 border-emerald-300"
                        : "bg-gradient-to-br from-lime-600/30 to-emerald-700/30 hover:from-lime-600/50 hover:to-emerald-700/50 text-emerald-300 border-2 border-emerald-500/40"
                  }`}
                  title="Punto de Venta"
                >
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
                </Link>

                <Link
                  to={createPageUrl("Customers")}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 p-3 sm:p-3.5 rounded-xl transition-all shadow-lg hover:scale-110 active:scale-95 ${
                    location.pathname.includes("Customers")
                      ? theme === "light"
                        ? "bg-gradient-to-br from-emerald-200 to-green-300 text-green-800 border-2 border-green-400 scale-110 shadow-[0_8px_24px_rgba(5,150,105,0.4)]"
                        : "bg-gradient-to-br from-emerald-600/50 to-green-700/50 text-green-200 border-2 border-green-500/60 scale-110 shadow-[0_8px_24px_rgba(5,150,105,0.4)]"
                      : theme === "light"
                        ? "bg-gradient-to-br from-emerald-100 to-green-200 hover:from-emerald-200 hover:to-green-300 text-green-700 border-2 border-emerald-300"
                        : "bg-gradient-to-br from-emerald-600/30 to-green-700/30 hover:from-emerald-600/50 hover:to-green-700/50 text-emerald-300 border-2 border-emerald-500/40"
                  }`}
                  title="Clientes"
                >
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </Link>
              </div>
            </div>
          )}

          {/* ✅ Logo CENTRADO - AHORA ES BOTÓN DE NOTIFICACIONES */}
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && user?.id) {
                loadUnreadCount(user.id);
              }
            }}
            className="relative z-10 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            title="Notificaciones"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 blur-2xl animate-pulse" />
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f767a3d5fce1486d4cf555/e9bc537e2_DynamicsmartfixosLogowithGearandDevice.png"
              alt="SmartFixOS - Notificaciones"
              className="relative h-16 sm:h-24 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,168,232,0.6)]"
            />
            
            {/* ✅ BADGE DE NOTIFICACIONES NO LEÍDAS */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                <span className="text-white font-bold text-xs sm:text-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </div>
            )}
          </button>
        </header>
      )}

      {/* ✅ Panel de Notificaciones DIRECTO */}
      {showNotifications && user && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)}>
          <div 
            className="absolute top-24 sm:top-32 left-1/2 -translate-x-1/2 w-[95vw] max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <NotificationDropdown 
              user={user} 
              onClose={() => {
                setShowNotifications(false);
                if (user?.id) {
                  loadUnreadCount(user.id);
                }
              }} 
            />
          </div>
        </div>
      )}

      {/* === Contenido === */}
      <main 
        className={`flex-1 overflow-y-auto px-3 sm:px-5 ${isPinAccess ? 'pt-0' : 'pt-[88px] sm:pt-[116px]'} pb-20 md:pb-16`}
        data-pointer-overlay="off"
      >
        <div data-pointer-target="on">
          {children}
        </div>
      </main>

      {/* === Dock inferior Desktop - OCULTO EN PINACCESS === */}
      {!isPinAccess && (
        <footer
          className={`
            hidden md:block
            fixed bottom-0 left-0 right-0 z-40
            ${theme === "light" ? "bg-white/95" : "bg-slate-950/60"} backdrop-blur-xl
            ${theme === "light" ? "border-t border-gray-200" : "border-t border-white/10"} text-center
            py-1.5 text-[0.65rem] ${theme === "light" ? "text-gray-500" : "text-gray-400"}
            transition-all duration-200
            ${theme === "light" ? "shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" : ""}
            ${keyboardOpen ? "opacity-0 pointer-events-none" : "opacity-100"}
            pointer-events-none
          `}
        >
          <span className="pointer-events-auto">
            © {new Date().getFullYear()} SmartAppFix v2.0
          </span>
        </footer>
      )}

      {/* 📱 iOS Glass Bottom Nav - OCULTA EN PINACCESS */}
      {!isPinAccess && <MobileBottomNav />}

      {/* ===== CSS GLOBAL PARA TEMAS Y ANIMACIONES ===== */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* ✅ ANIMACIÓN DE BOTONES ACTIVOS */
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 8px 24px rgba(0, 168, 232, 0.4);
          }
          50% {
            box-shadow: 0 12px 32px rgba(16, 185, 129, 0.6);
          }
        }

        header a.scale-110 {
          animation: pulseGlow 2s ease-in-out infinite;
        }
      `}</style>
      </div>
      </I18nProvider>
      );
      }
