// ============================================
// 📱 iOS-Style Bottom Navigation Bar
// Liquid Glass Design - iPhone iOS 16/17 inspired
// ============================================

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/components/utils/helpers";
import { Home, ClipboardList, Wallet, Users, Settings } from "lucide-react";

const navItems = [
  { 
    page: "Dashboard", 
    label: "Inicio", 
    icon: Home,
    gradient: "from-cyan-400 to-cyan-600"
  },
  { 
    page: "Orders", 
    label: "Órdenes", 
    icon: ClipboardList,
    gradient: "from-blue-400 to-blue-600"
  },
  { 
    page: "POS", 
    label: "Ventas", 
    icon: Wallet,
    gradient: "from-emerald-400 to-emerald-600"
  },
  { 
    page: "Customers", 
    label: "Clientes", 
    icon: Users,
    gradient: "from-green-400 to-green-600"
  },
  { 
    page: "Settings", 
    label: "Ajustes", 
    icon: Settings,
    gradient: "from-purple-400 to-purple-600"
  }
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        md:hidden
        pb-[env(safe-area-inset-bottom)]
      "
      data-bottom-nav
      data-pointer-target="on"
      role="navigation"
      aria-label="Navegación principal"
    >
      {/* iOS Liquid Glass Background */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-emerald-500/5 to-transparent blur-2xl" />
        
        {/* Glass container */}
        <div className="relative backdrop-blur-2xl bg-black/80 border-t border-white/10 shadow-[0_-10px_40px_rgba(0,168,232,0.15)]">
          {/* Subtle top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
          
          <ul className="grid grid-cols-5 px-2 py-2 gap-1">
            {navItems.map(({ page, label, icon: Icon, gradient }) => {
              const pagePath = createPageUrl(page);
              const isActive = location.pathname === pagePath || 
                              (page === "Dashboard" && location.pathname === "/");

              return (
                <li key={page}>
                  <Link
                    to={pagePath}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 group relative overflow-hidden"
                  >
                    {/* Active background glow */}
                    {isActive && (
                      <>
                        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-20 blur-xl`} />
                        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-10 rounded-2xl`} />
                      </>
                    )}
                    
                    {/* Icon container */}
                    <div className={`
                      relative mb-1 p-2 rounded-xl transition-all duration-300
                      ${isActive 
                        ? `bg-gradient-to-t ${gradient} shadow-lg scale-110` 
                        : 'bg-white/5 group-hover:bg-white/10 group-hover:scale-105'
                      }
                    `}>
                      <Icon 
                        className={`w-5 h-5 transition-all duration-300 ${
                          isActive 
                            ? 'text-white drop-shadow-[0_2px_8px_rgba(0,168,232,0.6)]' 
                            : 'text-gray-400 group-hover:text-gray-200'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    
                    {/* Label */}
                    <span className={`
                      text-[10px] font-semibold leading-tight transition-all duration-300
                      ${isActive 
                        ? `bg-gradient-to-r ${gradient} bg-clip-text text-transparent` 
                        : 'text-gray-400 group-hover:text-gray-200'
                      }
                    `}>
                      {label}
                    </span>

                    {/* Active indicator dot */}
                    {isActive && (
                      <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-gradient-to-r ${gradient} shadow-lg animate-pulse`} />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <style>{`
        /* iOS-style spring animation */
        @keyframes spring {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        [data-bottom-nav] a:active .relative.mb-1 {
          animation: spring 0.3s ease-in-out;
        }

        /* Smooth glass blur */
        @supports (backdrop-filter: blur(20px)) {
          [data-bottom-nav] > div > div {
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
          }
        }
      `}</style>
    </nav>
  );
}