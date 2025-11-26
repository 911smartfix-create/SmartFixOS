import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
// ❌ Quitado base44: ya no se importa
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft, Delete, Check, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

export default function PinAccess() {
  const navigate = useNavigate();
  const [step, setStep] = useState("welcome");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasCheckedSession = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // ✅ Verificar si ya hay sesión activa - SOLO UNA VEZ
  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    const session = localStorage.getItem("employee_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed && parsed.id) {
          console.log("✅ PinAccess: Sesión detectada, redirigiendo a Dashboard");
          navigate("/Dashboard", { replace: true });
          return;
        }
      } catch (e) {
        console.log("⚠️ PinAccess: Sesión corrupta, limpiando");
        localStorage.removeItem("employee_session");
        sessionStorage.removeItem("911-session");
      }
    }
    
    console.log("✅ PinAccess: No hay sesión, mostrando página de acceso");
    setIsReady(true);
  }, [navigate]);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
      setError("");
      
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
    
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  // ✅ Versión nueva: sin base44, con PIN maestro local
  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError("PIN debe tener 4 dígitos");
      toast.error("PIN debe tener 4 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    // 🔥 PIN maestro temporal (puedes cambiarlo)
    const MASTER_PIN = "9110";

    try {
      if (pin === MASTER_PIN) {
        // 🔥 Sesión fake local para poder entrar al sistema
        const session = {
          id: "local-dev-user",
          userId: "local-dev-user",
          userEmail: "dev@smartfixos.local",
          userName: "Developer",
          userRole: "admin",
          employee_code: "DEV-911",
          full_name: "Developer SmartFix",
          email: "dev@smartfixos.local",
          role: "admin",
          loginTime: new Date().toISOString()
        };

        localStorage.setItem("employee_session", JSON.stringify(session));
        sessionStorage.setItem("911-session", JSON.stringify(session));

        if (navigator.vibrate) {
          navigator.vibrate([50, 100, 50]);
        }

        toast.success(`¡Bienvenido, ${session.userName}!`, {
          duration: 2000,
        });

        setTimeout(() => {
          navigate("/Dashboard", { replace: true });
        }, 600);
      } else {
        setError("PIN incorrecto");
        toast.error("PIN incorrecto o usuario inactivo");
        setPin("");

        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 100]);
        }
      }
    } catch (error) {
      console.error("Error en validación de PIN:", error);
      setError("Error al validar PIN");
      toast.error("Error al validar PIN. Intenta nuevamente.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== "pin") return;

    const handleKeyPress = (e) => {
      if (e.key === "Enter" && pin.length === 4) {
        handleSubmit();
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key >= "0" && e.key <= "9") {
        handleNumberClick(e.key);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [step, pin]);

  if (!isReady) {
    return (
      <div className="pinaccess-fullscreen-container">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <>
        <div className="pinaccess-fullscreen-container">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[150px] animate-pulse delay-500"></div>
          </div>

          <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <div className="w-full max-w-lg text-center">
              
              <div className="mb-8 sm:mb-12">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 to-emerald-500/40 blur-3xl animate-pulse"></div>
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f767a3d5fce1486d4cf555/e9bc537e2_DynamicsmartfixosLogowithGearandDevice.png"
                    alt="SmartFixOS"
                    className="relative w-32 h-32 sm:w-40 sm:h-40 object-contain mx-auto drop-shadow-[0_8px_32px_rgba(0,168,232,1)]"
                  />
                </div>
              </div>

              <div className="mb-10 sm:mb-12 space-y-3">
                <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400 bg-clip-text text-transparent">
                  Bienvenido a SmartFixOS
                </h1>
                <p className="text-lg sm:text-xl text-gray-300 font-semibold">
                  Sistema interno de 911 SmartFix
                </p>
                <p className="text-sm sm:text-base text-gray-500 mt-4">
                  Ingresa tu PIN para continuar
                </p>
              </div>

              {/* ✅ BOTÓN ÚNICO - Entrar al sistema */}
              <button
                onClick={() => setStep("pin")}
                className="
                  w-full group relative overflow-hidden
                  bg-gradient-to-r from-cyan-600 via-emerald-600 to-lime-600
                  hover:from-cyan-700 hover:via-emerald-700 hover:to-lime-700
                  rounded-2xl p-6 sm:p-8
                  border-2 border-cyan-500/40
                  shadow-[0_16px_64px_rgba(0,168,232,0.4)]
                  hover:shadow-[0_24px_80px_rgba(0,168,232,0.6)]
                  transition-all duration-300
                  active:scale-98
                "
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                
                <div className="relative flex items-center justify-center gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-white text-xl sm:text-2xl font-black">
                      Entrar al Sistema
                    </p>
                    <p className="text-white/80 text-sm sm:text-base">
                      Acceso seguro con PIN personal
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" />
                </div>
              </button>

              <div className="mt-12 sm:mt-16 space-y-2">
                <p className="text-gray-600 text-xs sm:text-sm">
                  🔐 Sistema seguro y encriptado
                </p>
                <p className="text-gray-700 text-xs">
                  SmartFixOS v2.0 • © {new Date().getFullYear()} 911 SmartFix
                </p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .pinaccess-fullscreen-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            min-height: 100vh;
            min-height: 100dvh;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: radial-gradient(circle at top, #0f172a 0%, #020617 45%, #000 90%);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #000;
          }

          body {
            overscroll-behavior: none;
            -webkit-overflow-scrolling: touch;
          }

          #root {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }

          .active\\:scale-98:active {
            transform: scale(0.98);
          }

          button {
            -webkit-tap-highlight-color: transparent;
            user-select: none;
          }

          * {
            -webkit-tap-highlight-color: transparent;
          }
        `}</style>
      </>
    );
  }

  const numbers = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [null, 0, "⌫"]
  ];

  return (
    <>
      <div className="pinaccess-fullscreen-container">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-[150px] animate-pulse delay-500"></div>
        </div>

        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <button
            onClick={() => {
              setStep("welcome");
              setPin("");
              setError("");
            }}
            className="
              flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-3
              bg-slate-800/60 hover:bg-slate-800/80
              backdrop-blur-xl
              border-2 border-white/10 hover:border-cyan-500/40
              rounded-xl
              text-white text-sm sm:text-base font-semibold
              transition-all duration-200
              active:scale-95
            "
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Volver
          </button>
        </div>

        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-md">
            
            <div className="text-center mb-6 sm:mb-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-emerald-500/30 blur-2xl animate-pulse"></div>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f767a3d5fce1486d4cf555/e9bc537e2_DynamicsmartfixosLogowithGearandDevice.png"
                  alt="SmartFixOS"
                  className="relative h-16 sm:h-20 w-auto object-contain mx-auto drop-shadow-[0_4px_16px_rgba(0,168,232,0.8)]"
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  Acceso Personal
                </h1>
              </div>
              <p className="text-gray-400 text-sm sm:text-base">
                Ingresa tu PIN para continuar
              </p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border-2 border-cyan-500/30 rounded-2xl p-6 sm:p-8 mb-6 shadow-[0_16px_64px_rgba(0,168,232,0.2)]">
              <div className="flex justify-center gap-3 sm:gap-4 mb-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`
                      w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 transition-all duration-300
                      ${pin.length > index
                        ? "bg-gradient-to-br from-cyan-500 to-emerald-500 border-cyan-400 shadow-[0_8px_24px_rgba(0,168,232,0.6)] scale-110"
                        : "bg-slate-800/50 border-slate-700"}
                    `}
                  >
                    {pin.length > index && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white animate-pulse"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="text-center mt-4">
                  <p className="text-red-400 text-sm font-semibold animate-pulse">
                    ⚠️ {error}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4 mb-6">
              {numbers.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-3 gap-3 sm:gap-4">
                  {row.map((num, colIndex) => {
                    const isBackspace = num === "⌫";
                    const isEmpty = num === null;

                    if (isEmpty) {
                      return <div key={`empty-${colIndex}`}></div>;
                    }

                    if (isBackspace) {
                      return (
                        <button
                          key="backspace"
                          onClick={handleBackspace}
                          disabled={pin.length === 0 || loading}
                          className="
                            h-16 sm:h-20 rounded-2xl
                            bg-gradient-to-br from-red-600/30 to-red-800/30
                            border-2 border-red-500/40
                            backdrop-blur-xl
                            hover:from-red-600/50 hover:to-red-800/50 hover:border-red-500/60
                            active:scale-95
                            disabled:opacity-40 disabled:cursor-not-allowed
                            transition-all duration-200
                            shadow-[0_8px_24px_rgba(220,38,38,0.3)]
                            hover:shadow-[0_12px_32px_rgba(220,38,38,0.5)]
                            group
                          "
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-600/0 group-hover:from-red-500/20 group-hover:to-red-600/20 transition-all duration-300 rounded-2xl"></div>
                          <Delete className="w-6 h-6 sm:w-7 sm:h-7 mx-auto text-red-300 relative z-10" />
                        </button>
                      );
                    }

                    return (
                      <button
                        key={num}
                        onClick={() => handleNumberClick(String(num))}
                        disabled={loading || pin.length >= 4}
                        className="
                          h-16 sm:h-20 rounded-2xl
                          bg-gradient-to-br from-slate-700/60 to-slate-800/60
                          border-2 border-cyan-500/30
                          backdrop-blur-xl
                          text-white text-2xl sm:text-3xl font-black
                          hover:from-slate-700/80 hover:to-slate-800/80 hover:border-cyan-400/50
                          active:scale-95
                          disabled:opacity-40 disabled:cursor-not-allowed
                          transition-all duration-200
                          shadow-[0_8px_24px_rgba(0,168,232,0.2)]
                          hover:shadow-[0_12px_32px_rgba(0,168,232,0.4)]
                          relative overflow-hidden
                          group
                        "
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-emerald-500/0 group-hover:from-cyan-500/20 group-hover:to-emerald-500/20 transition-all duration-300"></div>
                        
                        <span className="relative z-10">{num}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={pin.length !== 4 || loading}
              className="
                w-full h-16 sm:h-20 rounded-2xl
                bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600
                hover:from-emerald-700 hover:via-green-700 hover:to-lime-700
                border-2 border-emerald-500/50
                text-white text-lg sm:text-xl font-black
                disabled:opacity-40 disabled:cursor-not-allowed
                active:scale-95
                transition-all duration-200
                shadow-[0_12px_40px_rgba(16,185,129,0.4)]
                hover:shadow-[0_16px_64px_rgba(16,185,129,0.6)]
                relative overflow-hidden
                group
              "
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
              
              <div className="relative z-10 flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6 sm:w-7 sm:h-7" />
                    <span>Acceder</span>
                  </>
                )}
              </div>
            </button>

            <div className="text-center mt-8 space-y-2">
              <p className="text-gray-500 text-xs sm:text-sm">
                🔐 Acceso seguro con PIN de 4 dígitos
              </p>
              <p className="text-gray-600 text-xs">
                SmartFixOS v2.0
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .delay-500 {
          animation-delay: 500ms;
        }

        .delay-1000 {
          animation-delay: 1000ms;
        }

        .pinaccess-fullscreen-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          min-height: 100vh;
          min-height: 100dvh;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: radial-gradient(circle at top, #0f172a 0%, #020617 45%, #000 90%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #000;
        }

        body {
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch;
        }

        #root {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }

        .active\\:scale-98:active,
        .active\\:scale-95:active {
          transform: scale(0.95);
        }

        button {
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        input, select, textarea {
          font-size: 16px !important;
        }

        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </>
  );
}