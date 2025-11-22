
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  LogOut, 
  UserCircle, 
  ShieldCheck, 
  Bell,
  Settings,
  ChevronRight
} from "lucide-react";
import { Label } from "@/components/ui/label";
import NotificationService from "../notifications/NotificationService";

export default function UserMenuModal({ open, onClose, user }) {
  const navigate = useNavigate();
  const [punchStatus, setPunchStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // ✅ NUEVO: estado para el usuario actual

  useEffect(() => {
    if (open && user) {
      checkPunchStatus();
      loadNotificationSettings();
      loadCurrentUser(); // ✅ NUEVO: cargar el usuario completo
    }
  }, [open, user]);

  // ✅ NUEVO: Cargar el usuario completo desde la DB para obtener el rol actualizado
  const loadCurrentUser = async () => {
    try {
      if (user?.id) {
        const fullUser = await base44.entities.User.get(user.id);
        setCurrentUser(fullUser);
      } else {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error loading current user:", error);
      setCurrentUser(user);
    }
  };

  const checkPunchStatus = async () => {
    try {
      const timeEntryId = sessionStorage.getItem("timeEntryId");
      if (timeEntryId) {
        const entry = await base44.entities.TimeEntry.get(timeEntryId).catch(() => null);
        if (entry && !entry.clock_out) {
          setPunchStatus(entry);
          return;
        }
      }

      const openEntries = await base44.entities.TimeEntry.filter({
        employee_id: user.id,
        clock_out: null
      });

      if (openEntries?.length > 0) {
        setPunchStatus(openEntries[0]);
        sessionStorage.setItem("timeEntryId", openEntries[0].id);
      } else {
        setPunchStatus(null);
      }
    } catch (error) {
      console.error("Error checking punch status:", error);
      setPunchStatus(null);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await base44.entities.UserNotificationSettings.filter({ user_id: user.id });
      
      if (settings?.length) {
        setNotificationSettings(settings[0]);
      } else {
        // Create default settings
        const defaultSettings = {
          user_id: user.id,
          receive_new_order_notifications: true,
          receive_status_change_notifications: true,
          receive_low_stock_notifications: true,
          receive_order_ready_notifications: true,
          receive_payment_notifications: true,
          receive_urgent_notifications: true,
          receive_assignment_notifications: true,
          channel_web_push: false,
          channel_in_app: true
        };
        
        const created = await base44.entities.UserNotificationSettings.create(defaultSettings);
        setNotificationSettings(created);
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const handlePunchToggle = async () => {
    setLoading(true);
    try {
      if (punchStatus) {
        // Clock out
        await base44.entities.TimeEntry.update(punchStatus.id, {
          clock_out: new Date().toISOString()
        });
        sessionStorage.removeItem("timeEntryId");
        setPunchStatus(null);
      } else {
        // Clock in
        const newEntry = await base44.entities.TimeEntry.create({
          employee_id: user.id,
          employee_name: user.full_name || user.email,
          clock_in: new Date().toISOString()
        });
        sessionStorage.setItem("timeEntryId", newEntry.id);
        setPunchStatus(newEntry);
      }
      
      window.dispatchEvent(new Event("force-refresh"));
    } catch (error) {
      console.error("Error toggling punch:", error);
      alert("Error al registrar ponche");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Check if user is punched in
    if (punchStatus) {
      const confirm = window.confirm(
        "Tienes un turno activo. ¿Deseas cerrar el turno antes de salir?"
      );
      
      if (confirm) {
        try {
          await base44.entities.TimeEntry.update(punchStatus.id, {
            clock_out: new Date().toISOString()
          });
          sessionStorage.removeItem("timeEntryId");
        } catch (error) {
          console.error("Error closing punch:", error);
        }
      }
    }

    // ✅ LIMPIEZA COMPLETA DE SESIÓN
    try {
      // Cerrar modal primero
      onClose();
      
      // Limpiar todos los datos de sesión
      localStorage.removeItem("employee_session");
      sessionStorage.removeItem("911-session");
      sessionStorage.removeItem("timeEntryId");
      
      // Limpiar cualquier otro dato de sesión que pueda existir
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith("dashboard_") || key.includes("session")) {
          sessionStorage.removeItem(key);
        }
      });

      // ✅ Navegar a Welcome usando navigate en lugar de reload
      navigate("/Welcome", { replace: true });
      
    } catch (error) {
      console.error("Error during logout:", error);
      // Fallback: reload solo si hay error
      window.location.href = "/Welcome";
    }
  };

  const handleToggleNotificationSetting = async (key) => {
    if (!notificationSettings) return;

    try {
      const updated = {
        ...notificationSettings,
        [key]: !notificationSettings[key]
      };

      await base44.entities.UserNotificationSettings.update(notificationSettings.id, updated);
      setNotificationSettings(updated);
    } catch (error) {
      console.error("Error updating notification settings:", error);
    }
  };

  const handleEnableWebPush = async () => {
    const granted = await NotificationService.requestPermission();
    
    if (granted) {
      // Save setting
      await handleToggleNotificationSetting("channel_web_push");
      alert("✅ Notificaciones push habilitadas");
    } else {
      alert("❌ Permiso de notificaciones denegado");
    }
  };

  if (!user) return null;

  const displayUser = currentUser || user; // ✅ USAR el usuario completo si está disponible

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-black/90 backdrop-blur-xl border-cyan-500/20 max-w-md shadow-[0_24px_80px_rgba(0,168,232,0.7)] theme-light:bg-white theme-light:border-gray-200 theme-light:shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-3 theme-light:text-gray-900">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-cyan-600/30">
              <UserCircle className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate">{displayUser.full_name || displayUser.email}</p>
              <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-600/30 text-xs mt-1 theme-light:bg-cyan-100 theme-light:text-cyan-700 theme-light:border-cyan-300">
                {displayUser.role || "user"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Punch Status con colores del logo */}
          <div className="bg-gradient-to-br from-cyan-600/10 to-emerald-600/10 border border-cyan-500/20 rounded-xl p-4 theme-light:bg-gradient-to-br theme-light:from-cyan-50 theme-light:to-emerald-50 theme-light:border-cyan-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400 theme-light:text-cyan-600" />
                <span className="text-white font-medium theme-light:text-gray-900">Estado de Turno</span>
              </div>
              <Badge className={punchStatus 
                ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/30 theme-light:bg-emerald-100 theme-light:text-emerald-700 theme-light:border-emerald-300"
                : "bg-gray-600/20 text-gray-300 border-gray-600/30 theme-light:bg-gray-100 theme-light:text-gray-700 theme-light:border-gray-300"
              }>
                {punchStatus ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            
            {punchStatus && (
              <p className="text-xs text-gray-400 mb-3 theme-light:text-gray-600">
                Entrada: {new Date(punchStatus.clock_in).toLocaleString()}
              </p>
            )}

            <Button
              onClick={handlePunchToggle}
              disabled={loading}
              className={`w-full ${
                punchStatus
                  ? "bg-gradient-to-r from-lime-600 to-lime-800 hover:from-lime-700 hover:to-lime-900"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900"
              }`}
            >
              {loading ? "..." : punchStatus ? "Cerrar Turno" : "Abrir Turno"}
            </Button>
          </div>

          {/* Notifications Settings con colores del logo */}
          {!showNotificationSettings ? (
            <button
              onClick={() => setShowNotificationSettings(true)}
              className="w-full bg-gradient-to-br from-teal-600/10 to-cyan-600/10 border border-teal-500/20 rounded-xl p-4 hover:from-teal-600/20 hover:to-cyan-600/20 transition-all text-left theme-light:from-teal-50 theme-light:to-cyan-50 theme-light:border-teal-300 theme-light:hover:from-teal-100 theme-light:hover:to-cyan-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-teal-400 theme-light:text-teal-600" />
                  <span className="text-white font-medium theme-light:text-gray-900">Notificaciones</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 theme-light:text-gray-600" />
              </div>
            </button>
          ) : (
            <div className="bg-gradient-to-br from-teal-600/10 to-cyan-600/10 border border-teal-500/20 rounded-xl p-4 space-y-3 theme-light:from-teal-50 theme-light:to-cyan-50 theme-light:border-teal-300">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold flex items-center gap-2 theme-light:text-gray-900">
                  <Bell className="w-4 h-4 text-teal-400 theme-light:text-teal-600" />
                  Preferencias
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowNotificationSettings(false)}
                  className="text-gray-400 hover:text-white theme-light:text-gray-600 theme-light:hover:text-gray-900"
                >
                  ✕
                </Button>
              </div>

              {notificationSettings && (
                <div className="space-y-2">
                  {[
                    { key: "receive_new_order_notifications", label: "Nuevas órdenes" },
                    { key: "receive_status_change_notifications", label: "Cambios de estado" },
                    { key: "receive_order_ready_notifications", label: "Orden lista" },
                    { key: "receive_low_stock_notifications", label: "Stock bajo" },
                    { key: "receive_assignment_notifications", label: "Asignaciones" },
                  ].map((setting) => (
                    <label
                      key={setting.key}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-cyan-600/10 cursor-pointer theme-light:hover:bg-cyan-50"
                    >
                      <input
                        type="checkbox"
                        checked={notificationSettings[setting.key] !== false}
                        onChange={() => handleToggleNotificationSetting(setting.key)}
                        className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-white theme-light:text-gray-900">{setting.label}</span>
                    </label>
                  ))}

                  <div className="pt-3 border-t border-cyan-500/10 theme-light:border-gray-200">
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-cyan-600/10 cursor-pointer theme-light:hover:bg-cyan-50">
                      <input
                        type="checkbox"
                        checked={notificationSettings.channel_in_app !== false}
                        onChange={() => handleToggleNotificationSetting("channel_in_app")}
                        className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-white theme-light:text-gray-900">Notificaciones in-app</span>
                    </label>

                    <div className="flex items-center gap-3 p-2">
                      <input
                        type="checkbox"
                        checked={notificationSettings.channel_web_push === true}
                        onChange={handleEnableWebPush}
                        className="w-4 h-4 rounded border-gray-600 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-white theme-light:text-gray-900">Push del navegador</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logout Button con gradiente del logo */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-cyan-600/50 text-cyan-400 hover:bg-cyan-600/20 theme-light:border-cyan-300 theme-light:text-cyan-600 theme-light:hover:bg-cyan-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
