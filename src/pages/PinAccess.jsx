import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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

  // 🟢 Verificar si ya hay sesión activa
  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    const session = localStorage.getItem("employee_session");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed && parsed.id) {
          navigate("/Dashboard", { replace: true });
          return;
        }
      } catch (e) {
        localStorage.removeItem("employee_session");
        sessionStorage.removeItem("911-session");
      }
    }

    setIsReady(true);
  }, [navigate]);

  // 🟢 Teclado numérico
  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
      setError("");
      navigator.vibrate?.(30);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError("");
    navigator.vibrate?.(20);
    }
  ;

  // 🟢 VALIDACIÓN REAL con /api/login
  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError("PIN debe tener 4 dígitos");
      toast.error("PIN debe tener 4 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError("PIN incorrecto o usuario inactivo");
        toast.error("PIN incorrecto o usuario inactivo");
        setPin("");
        navigator.vibrate?.([100, 50, 100]);
        return;
      }

      // Sesión real desde la base de datos
      const session = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem("employee_session", JSON.stringify(session));
      sessionStorage.setItem("911-session", JSON.stringify(session));

      navigator.vibrate?.([50, 100, 50]);

      toast.success(`¡Bienvenido, ${session.name}!`);

      setTimeout(() => {
        navigate("/Dashboard", { replace: true });
      }, 600);
    } catch (error) {
      console.error("Error en validación:", error);
      toast.error("Error al conectar con el servidor");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  // 🟢 Listener del teclado físico
  useEffect(() => {
    if (step !== "pin") return;

    const handleKeyPress = (e) => {
      if (e.key === "Enter" && pin.length === 4) handleSubmit();
      if (e.key === "Backspace") handleBackspace();
      if (e.key >= "0" && e.key <= "9") handleNumberClick(e.key);
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [step, pin]);

  // 🟢 Pantalla inicial (cargando)
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

  // 🟢 Pantalla de bienvenida
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

              <button
                onClick={() => setStep("pin")}
                className="w-full group relative overflow-hidden bg-gradient-to-r from-cyan-600 via-emerald-600 to-lime-600 rounded-2xl p-6 sm:p-8 border-2 border-cyan-500/40 shadow-[0_16px_64px_rgba(0,168,232,0.4)]">
                <div className="relative flex items-center justify-center gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-white text-xl sm:text-2xl font-black">
                      Entrar al Sistema
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-white/80" />
                </div>
              </button>

              <div className="mt-12 sm:mt-16 space-y-2">
                <p className="text-gray-600 text-xs sm:text-sm">🔐 Sistema seguro y encriptado</p>
                <p className="text-gray-700 text-xs">
                  SmartFixOS v2.0 • © {new Date().getFullYear()} 911 SmartFix
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 🟢 Pantalla del PIN (teclado)
  const numbers = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [null, 0, "⌫"],
  ];

  return (
    <>
      <div className="pinaccess-fullscreen-container">

        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <button
            onClick={() => {
              setStep("welcome");
              setPin("");
              setError("");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 backdrop-blur-xl border-2 border-white/10 rounded-xl text-white">
            <ArrowLeft className="w-5 h-5" /> Volver
          </button>
        </div>

        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white">Acceso Personal</h1>
              </div>
              <p className="text-gray-400 text-sm">Ingresa tu PIN para continuar</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border-2 border-cyan-500/30 rounded-2xl p-8 mb-6">
              <div className="flex justify-center gap-4 mb-4">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-16 h-16 rounded-full border-4 ${
                      pin.length > i
                        ? "bg-gradient-to-br from-cyan-500 to-emerald-500"
                        : "bg-slate-800/50 border-slate-700"
                    }`}
                  />
                ))}
              </div>

              {error && (
                <p className="text-center text-red-400 text-sm font-semibold animate-pulse">
                  ⚠️ {error}
                </p>
              )}
            </div>

            <div className="space-y-4 mb-6">
              {numbers.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-3 gap-4">
                  {row.map((num, colIndex) => {
                    if (num === null) return <div key={colIndex}></div>;

                    if (num === "⌫")
                      return (
                        <button
                          key="backspace"
                          onClick={handleBackspace}
                          disabled={!pin.length || loading}
                          className="h-20 rounded-2xl bg-red-600/30 border-2 border-red-500/40 text-red-300">
                          <Delete className="w-7 h-7 mx-auto" />
                        </button>
                      );

                    return (
                      <button
                        key={num}
                        onClick={() => handleNumberClick(String(num))}
                        disabled={loading || pin.length >= 4}
                        className="h-20 rounded-2xl bg-slate-700/60 border-2 border-cyan-500/30 text-white text-3xl font-black">
                        {num}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={pin.length !== 4 || loading}
              className="w-full h-20 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 border-2 border-emerald-500/50 text-white text-xl font-black">
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Validando...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <Check className="w-7 h-7" /> Acceder
                </div>
              )}
            </button>

            <div className="text-center mt-8">
              <p className="text-gray-500 text-xs">🔐 Acceso seguro con PIN de 4 dígitos</p>
              <p className="text-gray-600 text-xs">SmartFixOS v2.0</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
