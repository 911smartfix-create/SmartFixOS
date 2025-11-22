import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Bell,
  BellRing,
  X,
  Check,
  Package,
  AlertTriangle,
  ClipboardList,
  Calendar,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const NOTIFICATION_ICONS = {
  order_assigned: ClipboardList,
  order_ready: Package,
  inventory_alert: AlertTriangle,
  reminder: Calendar,
  order_status_change: ClipboardList,
  default: Bell
};

const NOTIFICATION_COLORS = {
  order_assigned: "text-blue-400 bg-blue-600/20",
  order_ready: "text-green-400 bg-green-600/20",
  inventory_alert: "text-orange-400 bg-orange-600/20",
  reminder: "text-purple-400 bg-purple-600/20",
  order_status_change: "text-cyan-400 bg-cyan-600/20",
  default: "text-gray-400 bg-gray-600/20"
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const lastCheckRef = useRef(Date.now());

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      
      const interval = setInterval(loadNotifications, 30000);
      
      window.addEventListener('new-notification', handleNewNotification);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('new-notification', handleNewNotification);
      };
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
    }
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // ✅ FIX: Usar list() en lugar de filter() para evitar errores
      const allNotifications = await base44.entities.CommunicationQueue.list("-created_date", 50);
      
      // Filtrar por user_id en el frontend
      const userNotifications = allNotifications.filter(n => 
        n.user_id === user.id && n.type === "in_app"
      );

      const sorted = userNotifications.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );

      const recent = sorted.slice(0, 50);
      
      setNotifications(recent);
      
      const unread = recent.filter(n => n.status === "pending" || n.status === "sent").length;
      setUnreadCount(unread);

      const newNotifications = recent.filter(n => 
        new Date(n.created_date) > new Date(lastCheckRef.current) && 
        (n.status === "pending" || n.status === "sent")
      );

      if (newNotifications.length > 0) {
        playNotificationSound();
        showBrowserNotification(newNotifications[0]);
      }

      lastCheckRef.current = Date.now();
    } catch (error) {
      console.error("Error loading notifications:", error);
      // ✅ No mostrar error al usuario, solo loguear
    } finally {
      setLoading(false);
    }
  };

  const handleNewNotification = (event) => {
    loadNotifications();
    if (event.detail?.playSound) {
      playNotificationSound();
    }
  };

  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log("Audio play prevented:", e));
      }
    } catch (error) {
      console.log("Could not play sound:", error);
    }
  };

  const showBrowserNotification = (notification) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(notification.subject || "Nueva notificación", {
          body: notification.body_html?.replace(/<[^>]*>/g, '').substring(0, 100),
          icon: "/favicon.ico",
          badge: "/favicon.ico"
        });
      } catch (e) {
        console.log("Could not show browser notification:", e);
      }
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.log("Notification permission denied:", e);
      }
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await base44.entities.CommunicationQueue.update(notificationId, {
        status: "read",
        read_at: new Date().toISOString()
      });
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: "read" } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const unreadNotifications = notifications.filter(n => 
        n.status === "pending" || n.status === "sent"
      );

      await Promise.all(
        unreadNotifications.map(n =>
          base44.entities.CommunicationQueue.update(n.id, {
            status: "read",
            read_at: new Date().toISOString()
          })
        )
      );

      setNotifications(prev =>
        prev.map(n => ({ ...n, status: "read" }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
    setLoading(false);
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    
    const meta = notification.meta || {};
    
    if (meta.order_id) {
      setIsOpen(false);
      navigate(createPageUrl(`Orders?order=${meta.order_id}`));
    } else if (meta.product_id) {
      setIsOpen(false);
      navigate(createPageUrl("Inventory"));
    } else if (meta.customer_id) {
      setIsOpen(false);
      navigate(createPageUrl("Customers"));
    }
  };

  const getNotificationIcon = (notification) => {
    const type = notification.meta?.notification_type || "default";
    const Icon = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    return Icon;
  };

  const getNotificationColor = (notification) => {
    const type = notification.meta?.notification_type || "default";
    return NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.default;
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="relative text-white hover:bg-white/10"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 animate-pulse" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-[10px] rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <Card className="absolute right-0 top-12 w-96 max-w-[calc(100vw-2rem)] max-h-[600px] z-50 bg-gradient-to-br from-[#2B2B2B] to-black border-red-900/30 shadow-2xl overflow-hidden flex flex-col">
              <div className="sticky top-0 bg-gradient-to-r from-[#2B2B2B] to-black border-b border-white/10 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <p className="text-xs text-gray-400">{unreadCount} sin leer</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      disabled={loading}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Bell className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400 text-sm">No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification);
                      const colorClass = getNotificationColor(notification);
                      const isUnread = notification.status === "pending" || notification.status === "sent";

                      return (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${
                            isUnread ? 'bg-white/5' : ''
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className={`text-sm font-medium ${isUnread ? 'text-white' : 'text-gray-400'}`}>
                                  {notification.subject}
                                </h4>
                                {isUnread && (
                                  <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-1"
                                dangerouslySetInnerHTML={{ 
                                  __html: notification.body_html?.replace(/<[^>]*>/g, '') || '' 
                                }}
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-600">
                                  {formatDistanceToNow(new Date(notification.created_date), { 
                                    addSuffix: true, 
                                    locale: es 
                                  })}
                                </span>
                                {notification.meta?.order_id && (
                                  <ChevronRight className="w-3 h-3 text-gray-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYJGGS57OScTQwOUKfk77RgGws4jtXyzXQrBSx7xvDcjDsOF2S47Oqsa3x/a2BjZHBscF9iY11UWlpWU1BTT0xLSkpKSktNTk9RT1RXWlxqYGNwaH5/bWiZkZiMio+Th4aGhIKBgYCBgIGCg4aGh4iJiouLjI2Ojo+PkJCRkZGSkZKSkpGSkZKRkZGRkZGRkZKRkpKSkpGSkZKRkpGRkZKRkZGRkZKSkpGRkpGSkZKRkZKRkZGRkpKSkpGRkpKRkZKSkpKRkpKSkpGSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKRkpGRkpGSkZKRkpGRkpGRkZKRkZKRkpGRkpKSkZKRkpGSk5KRkpKSkpKSkZKSk5OTlJSUlJSUlJKSkpKSkpKTkpOTlJSUlJSTlJWWl5mZm5ycnp6goaKkpqanqKqrrK2tr7CxsbGxsrK0tLa3t7i4urq7vb2/v8DBwsPExcXGxsfHyMjJycrLzMzMzMzLy8rJycjIxcXEw8LBwL+/vb27urm4t7a2tbSzs7GwsK6urKuqqKempqWjoaGfn52bm5mYlpaUk5KRkI+Njo2Li4qKiYiIh4aFhYSEg4OCgoGBgICAgICAgICAgP//AAD//wAA" type="audio/wav" />
      </audio>
    </>
  );
}