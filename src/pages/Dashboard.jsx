import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { dataClient } from "@/components/api/dataClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Wallet, StickyNote, Search, Clock,
  Settings as SettingsIcon, Users } from
"lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/components/utils/helpers";
import { useI18n } from "@/components/utils/i18n";
import WorkOrderWizard from "../components/workorder/WorkOrderWizard";
import OpenDrawerDialog from "../components/cash/OpenDrawerDialog";
import CloseDrawerDialog from "../components/cash/CloseDrawerDialog";
import SendNoteModal from "../components/dashboard/SendNoteModal";
import { ORDER_STATUSES, getStatusConfig, normalizeStatusId } from "@/components/utils/statusRegistry";
import WorkOrderPanel from "../components/workorder/WorkOrderPanel";
import ExternalLinksPanel from "../components/dashboard/ExternalLinksPanel";
import NotificationPanel from "../components/notifications/NotificationPanel";
import UserMenuModal from "../components/layout/UserMenuModal";
import InventoryAlertsWidget from "../components/dashboard/InventoryAlertsWidget";
import { getCachedStatus, subscribeToCashRegister } from "../components/cash/CashRegisterService";
import SmartNotificationsEngine from "../components/notifications/SmartNotificationsEngine";

function readSessionSync() {
  try {
    const raw = localStorage.getItem("employee_session") || sessionStorage.getItem("911-session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div className={`min-w-[260px] max-w-sm rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md ${
      toast.variant === "error" ? "bg-gradient-to-r from-red-600/90 to-red-800/90 border-red-400 text-white" : "bg-gradient-to-r from-emerald-600/90 to-emerald-800/90 border-emerald-400 text-white"}`
      }>
        <div className="font-semibold">{toast.title}</div>
        {toast.message && <div className="text-sm opacity-90">{toast.message}</div>}
        <button className="mt-2 text-xs underline opacity-90 hover:opacity-100" onClick={onClose}>Cerrar</button>
      </div>
    </div>);

}

const SimplifiedOrderCard = ({ order, onSelect }) => {
  const statusConfig = getStatusConfig(order.status);
  return (
    <div onClick={() => onSelect(order.id)} className="p-3 bg-black/40 backdrop-blur-xl rounded-lg border border-cyan-500/20 hover:border-cyan-600/50 cursor-pointer transition-all theme-light:bg-white theme-light:border-gray-200">
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm truncate theme-light:text-gray-900">{order.order_number || "SIN #"}</p>
          <p className="text-xs text-gray-200/70 truncate theme-light:text-gray-600">{order.customer_name || "—"}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-md border text-xs whitespace-nowrap ${statusConfig.colorClasses}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>);

};

function useAnnouncement(session) {
  const [note, setNote] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const announcements = await dataClient.entities.Announcement.filter({ active: true }, "-sent_at", 1);
      if (announcements?.length) {
        const latest = announcements[0];
        setNote(latest.message || "");
        setUpdatedAt(latest.sent_at || latest.created_date);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  return { note, setNote, updatedAt, load };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [session, setSession] = useState(() => readSessionSync());
  const hasRedirected = useRef(false);
  const sessionRef = useRef(session);
  const [loading, setLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(() => getCachedStatus().isOpen);
  const [currentDrawer, setCurrentDrawer] = useState(() => getCachedStatus().drawer);

  const [recentOrders, setRecentOrders] = useState([]);
  const [priceListItems, setPriceListItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceSearch, setPriceSearch] = useState("");
  const [showWorkOrderWizard, setShowWorkOrderWizard] = useState(false);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);
  const lastFetchRef = useRef(0);

  const [stats, setStats] = useState({ revenue: 0, expenses: 0, net: 0, salesCount: 0 });

  const { note, updatedAt } = useAnnouncement(session);
  const [toast, setToast] = useState(null);
  const [showSendNoteModal, setShowSendNoteModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const showToast = (title, message = "", variant = "success") => {
    setToast({ title, message, variant });
    setTimeout(() => setToast(null), 2500);
  };

  // ✅ REDIRECCIÓN A PINACCESS SI NO HAY SESIÓN
  useEffect(() => {
    if (!session && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/PinAccess", { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    const unsubscribe = subscribeToCashRegister(({ isOpen, drawer }) => {
      setDrawerOpen(isOpen);
      setCurrentDrawer(drawer);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // 🤖 Ejecutar motor de notificaciones inteligentes cada 6 horas
    const runSmartChecks = async () => {
      const lastRun = localStorage.getItem('smart_notifications_last_run');
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000); // 6 hours in milliseconds
      
      if (!lastRun || parseInt(lastRun) < sixHoursAgo) {
        console.log('🤖 Ejecutando motor de notificaciones inteligentes...');
        await SmartNotificationsEngine.runAllChecks();
        localStorage.setItem('smart_notifications_last_run', Date.now().toString());
      }
    };

    runSmartChecks(); // Run on component mount

    // Ejecutar cada 6 horas
    const interval = setInterval(runSmartChecks, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval); // Clean up the interval on unmount
  }, []); // Empty dependency array means this effect runs once on mount

  const loadFinancialStats = useCallback(async () => {
    // ✅ NO CARGAR STATS SI LA CAJA ESTÁ CERRADA
    if (!drawerOpen) {
      console.log("🔒 Dashboard: Caja cerrada, NO cargar estadísticas");
      return;
    }
    
    try {
      const now = new Date();
      const startDate = startOfDay(now);

      const sales = await dataClient.entities.Sale.list("-created_date", 300);
      await delay(1000);
      const transactions = await dataClient.entities.Transaction.list("-created_date", 300);

      const filteredSales = (sales || []).filter((s) => !s.voided && new Date(s.created_date) >= startDate);
      const filteredExpenses = (transactions || []).filter((t) => t.type === "expense" && new Date(t.created_date) >= startDate);

      const revenue = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
      const expenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      setStats({ revenue, expenses, net: revenue - expenses, salesCount: filteredSales.length });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (session && drawerOpen) loadFinancialStats();
  }, [session, drawerOpen, loadFinancialStats]);

  useEffect(() => {
    const handleSale = () => setTimeout(() => loadFinancialStats(), 3000);
    const handleCashClosed = () => {
      console.log("🔄 Dashboard: Caja cerrada, reseteando estadísticas a $0");
      setStats({ revenue: 0, expenses: 0, net: 0, salesCount: 0 });
    };
    
    window.addEventListener("sale-completed", handleSale);
    window.addEventListener("cash-register-closed", handleCashClosed);
    
    return () => {
      window.removeEventListener("sale-completed", handleSale);
      window.removeEventListener("cash-register-closed", handleCashClosed);
    };
  }, [loadFinancialStats]);

  useEffect(() => {
    const tick = () => {
      const s = readSessionSync();
      setSession((prev) => JSON.stringify(prev) !== JSON.stringify(s) ? s : prev);
    };
    const iv = setInterval(tick, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const loadFreshData = useCallback(async () => {
    if (!sessionRef.current?.userId) return;

    const now = Date.now();
    if (now - lastFetchRef.current < 120000) return;
    lastFetchRef.current = now;

    setLoading(true);
    try {
      await dataClient.auth.me();

      let orderFilter = sessionRef.current.userRole === "technician" ? { assigned_to: sessionRef.current.userId } : {};

      const orders = await dataClient.entities.Order.filter(orderFilter, "-updated_date", 100);
      await delay(1000);
      const products = await dataClient.entities.Product.filter({ active: true }, "-created_date", 30);
      await delay(1000);
      const services = await dataClient.entities.Service.filter({ active: true }, "-created_date", 30);

      const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
      const priceListData = [...products.map((p) => ({ ...p, type: "product" })), ...services.map((s) => ({ ...s, type: "service" }))];

      setRecentOrders(activeOrders);
      setPriceListItems(priceListData);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;

    loadFreshData();

    const iv = setInterval(() => loadFreshData(), 300000);
    return () => clearInterval(iv);
  }, [session, loadFreshData]);

  const handleNavigate = (path) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(createPageUrl(path));
  };

  const handleProtectedNavigate = async (path) => {
    if (session?.userRole === "admin" || session?.userRole === "manager") {
      handleNavigate(path);
      return;
    }
    const adminPin = prompt("🔐 PIN de administrador:");
    if (!adminPin) return;
    try {
      const admins = await dataClient.entities.User.filter({ role: "admin", pin: adminPin, active: true });
      if (admins?.length > 0) {
        showToast("✅ Acceso concedido");
        handleNavigate(path);
      } else {
        showToast("❌ PIN incorrecto", "Acceso denegado", "error");
      }
    } catch {
      showToast("❌ Error", "Intenta nuevamente", "error");
    }
  };

  const handleOrderSelect = (orderId) => navigate(createPageUrl(`Orders?order=${orderId}`));
  const handleNavigateWithFilter = (statusId) => navigate(createPageUrl(`Orders?status=${statusId}`));

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return recentOrders.slice(0, 12);
    return recentOrders.filter((o) =>
    String(o.order_number).toLowerCase().includes(q) ||
    String(o.customer_name).toLowerCase().includes(q) ||
    String(o.customer_phone).toLowerCase().includes(q)
    );
  }, [recentOrders, searchTerm]);

  const filteredPriceList = useMemo(() => {
    const q = priceSearch.trim().toLowerCase();
    if (!q) return [];
    return priceListItems.filter((i) => i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)).slice(0, 30);
  }, [priceListItems, priceSearch]);

  const stockPill = (item) => {
    if (item.type !== "product" || typeof item.stock !== "number") return null;
    const cls = item.stock <= 0 ? "bg-red-600/20 text-red-300 border-red-600/30" : item.stock <= (item.min_stock || 0) ? "bg-yellow-600/20 text-yellow-300" : "bg-emerald-600/20 text-emerald-300";
    return <span className={`px-2 py-0.5 rounded-md border text-xs ${cls}`}>{item.stock <= 0 ? t('outOfStock') : item.stock}</span>;
  };

  const statusCounts = useMemo(() => {
    const counts = {};
    ORDER_STATUSES.filter((s) => s.isActive).forEach((s) => {counts[s.id] = 0;});
    recentOrders.forEach((order) => {
      const normalized = normalizeStatusId(order.status);
      if (counts.hasOwnProperty(normalized)) counts[normalized]++;
    });
    return counts;
  }, [recentOrders]);

  // ✅ SI NO HAY SESIÓN, NO RENDERIZAR (YA SE REDIRIGIÓ)
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-6 pb-6">
        <div className="max-w-[1920px] mx-auto space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-br from-cyan-600/10 to-emerald-600/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,168,232,0.3)] theme-light:bg-white theme-light:border-gray-200">
            <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 mb-4">
              <p className="text-gray-200/70 text-xs sm:text-sm theme-light:text-gray-600">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })} — {session?.userName}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {session &&
                <Button onClick={() => setShowUserMenu(true)} variant="outline" className="h-9 px-3 rounded-full bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border-cyan-500/30 text-white text-xs theme-light:from-cyan-50 theme-light:to-emerald-50">
                    <Users className="w-4 h-4 mr-1.5" />
                    {session.userName}
                  </Button>
                }

                {(session?.userRole === "admin" || session?.userRole === "manager") &&
                <>
                    <Button onClick={() => handleNavigate("TimeTracking")} variant="outline" className="h-9 px-3 rounded-full bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border-cyan-500/30 text-white text-xs">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Ponches
                    </Button>
                    <Button onClick={() => handleNavigate("Settings")} variant="outline" className="h-9 px-3 rounded-full bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border-cyan-500/30 text-white text-xs">
                      <SettingsIcon className="w-4 h-4 mr-1.5" />
                      Settings
                    </Button>
                    <Button onClick={() => setShowSendNoteModal(true)} variant="outline" className="h-9 px-3 rounded-full bg-gradient-to-r from-lime-600/20 to-emerald-600/20 border-lime-500/30 text-white text-xs">
                      <StickyNote className="w-4 h-4 mr-1.5" />
                      Nota
                    </Button>
                  </>
                }
              </div>
            </div>

            <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <Button onClick={() => handleNavigate("Orders")} className="bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-14 flex-col gap-1">
                <ClipboardList className="w-5 h-5" />
                <span className="text-xs font-medium">Órdenes</span>
              </Button>
              <Button onClick={() => handleNavigate("POS")} className="bg-gradient-to-br from-lime-500 to-emerald-600 hover:from-lime-600 hover:to-emerald-700 h-14 flex-col gap-1">
                <Wallet className="w-5 h-5" />
                <span className="text-xs font-medium">POS</span>
              </Button>
              <Button onClick={() => handleNavigate("Customers")} className="bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 h-14 flex-col gap-1">
                <Users className="w-5 h-5" />
                <span className="text-xs font-medium">Clientes</span>
              </Button>
              <Button onClick={() => handleProtectedNavigate("Inventory")} className="bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 h-14 flex-col gap-1">
                <ClipboardList className="w-5 h-5" />
                <span className="text-xs font-medium">Inventario</span>
              </Button>
              <Button onClick={() => handleProtectedNavigate("Financial")} className="bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 h-14 flex-col gap-1">
                <Wallet className="w-5 h-5" />
                <span className="text-xs font-medium">Finanzas</span>
              </Button>
              <Button onClick={() => handleProtectedNavigate("Reports")} className="bg-gradient-to-br from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 h-14 flex-col gap-1">
                <ClipboardList className="w-5 h-5" />
                <span className="text-xs font-medium">Reportes</span>
              </Button>
            </nav>
          </div>

          <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 backdrop-blur-xl border border-emerald-500/30 theme-light:from-emerald-50 theme-light:to-emerald-100">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Wallet className="w-8 h-8 text-emerald-300 theme-light:text-emerald-600" />
                <div className="flex-1">
                  <h3 className="text-slate-50 text-lg font-bold theme-light:text-gray-900">
                    {drawerOpen ? `${t('cashRegister')} ✅` : t('openCashRegister')}
                  </h3>
                  <p className="text-sm text-emerald-50/80 theme-light:text-emerald-700">
                    {drawerOpen ? t('manageTransactions') : t('cashClosed')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {drawerOpen ?
                  <>
                      <Button onClick={() => handleNavigate("Financial")} className="bg-gradient-to-r from-cyan-600 to-emerald-700">
                        <Wallet className="w-4 h-4 mr-2" />{t('transactions')}
                      </Button>
                      <Button onClick={() => setShowCloseDrawer(true)} className="bg-gradient-to-r from-red-600 to-red-800">
                        {t('closeCashRegister')}
                      </Button>
                    </> :

                  <Button onClick={() => setShowOpenDrawer(true)} className="bg-gradient-to-r from-emerald-600 to-emerald-800">
                      <Wallet className="w-4 h-4 mr-2" />{t('openCashRegister')}
                    </Button>
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border border-cyan-500/20 theme-light:bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg theme-light:text-gray-900">💰 {t('financialSummary')} - {t('today')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4 theme-light:bg-emerald-50">
                  <p className="text-emerald-300 text-sm font-semibold theme-light:text-emerald-700">{t('revenue')}</p>
                  <p className="text-white text-2xl font-black theme-light:text-gray-900">${stats.revenue.toFixed(2)}</p>
                  <p className="text-emerald-300 text-xs mt-1 theme-light:text-emerald-600">{stats.salesCount} {t('sales')}</p>
                </div>
                <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 theme-light:bg-red-50">
                  <p className="text-red-300 text-sm font-semibold theme-light:text-red-700">{t('expenses')}</p>
                  <p className="text-white text-2xl font-black theme-light:text-gray-900">${stats.expenses.toFixed(2)}</p>
                </div>
                <div className={`${stats.net >= 0 ? 'bg-cyan-600/20 border-cyan-500/30' : 'bg-red-600/20 border-red-500/30'} border rounded-xl p-4`}>
                  <p className={`${stats.net >= 0 ? 'text-cyan-300' : 'text-red-300'} text-sm font-semibold`}>{t('netProfit')}</p>
                  <p className={`${stats.net >= 0 ? 'text-cyan-400' : 'text-red-400'} text-2xl font-black`}>${stats.net.toFixed(2)}</p>
                </div>
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-xl p-4 theme-light:bg-blue-50">
                  <p className="text-blue-300 text-sm font-semibold theme-light:text-blue-700">{t('shift')}</p>
                  <p className="text-white text-lg font-black theme-light:text-gray-900">
                    {drawerOpen ? t('open') : t('closed')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border border-cyan-500/20 theme-light:bg-white">
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-base flex items-center gap-2 theme-light:text-gray-900">🔍 {t('searchOrders')}</h3>
                <Button onClick={() => setShowWorkOrderWizard(true)} className="bg-gradient-to-r from-cyan-600 to-emerald-700 h-9 px-4">
                  <ClipboardList className="w-4 h-4 mr-2" />{t('newOrder')}
                </Button>
              </div>

              <div className="relative">
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('searchOrders')} className="bg-black/20 border border-cyan-500/20 pl-8 pr-2 rounded-md h-10 text-sm text-slate-50 w-full outline-none focus:ring-2 focus:ring-cyan-500/60 theme-light:bg-white theme-light:text-gray-900" />
                <Search className="w-4 h-4 text-gray-200/60 absolute left-2.5 top-1/2 -translate-y-1/2 theme-light:text-gray-500" />
              </div>

              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.filter((s) => s.isActive).map((status) => {
                  const count = statusCounts[status.id] || 0;
                  return (
                    <button key={status.id} onClick={() => handleNavigateWithFilter(status.id)} disabled={count === 0} className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium disabled:opacity-50 ${status.id === "pending_order" ? "bg-gradient-to-r from-red-600 to-red-800 text-white animate-pulse" : `${status.colorClasses} border`}`}>
                      {status.id === "pending_order" && "🚨 "}{status.label.toUpperCase()} ({count})
                    </button>);

                })}
              </div>

              {searchTerm &&
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredOrders.length === 0 ?
                <p className="text-gray-400 text-sm text-center py-4">{t('noOrdersFound')}</p> :

                filteredOrders.slice(0, 5).map((order) => <SimplifiedOrderCard key={order.id} order={order} onSelect={handleOrderSelect} />)
                }
                </div>
              }
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur-xl border border-cyan-500/20 theme-light:bg-white">
            <CardContent className="p-3 sm:p-4 space-y-3">
              <h3 className="text-white font-bold flex items-center gap-2 theme-light:text-gray-900">💰 {t('priceList')}</h3>
              <div className="relative">
                <input value={priceSearch} onChange={(e) => setPriceSearch(e.target.value)} placeholder={t('searchProducts')} className="bg-black/20 border border-cyan-500/20 pl-8 pr-2 rounded-md h-10 text-sm text-slate-50 w-full outline-none focus:ring-2 focus:ring-cyan-500/60 theme-light:bg-white theme-light:text-gray-900" />
                <Search className="w-4 h-4 text-gray-200/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {priceSearch && filteredPriceList.length > 0 &&
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredPriceList.map((item) =>
                <div key={`${item.type}-${item.id}`} className="p-3 bg-black/20 border border-cyan-500/10 rounded-lg theme-light:bg-gray-50">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-white font-semibold text-sm truncate theme-light:text-gray-900">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={item.type === "service" ? "bg-blue-600/20 text-blue-300 text-xs" : "bg-emerald-600/20 text-emerald-300 text-xs"}>
                              {item.type === "service" ? t('service') : t('product')}
                            </Badge>
                            {stockPill(item)}
                          </div>
                        </div>
                        <p className="text-emerald-400 font-bold text-lg theme-light:text-emerald-600">${(item.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                )}
                </div>
              }
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InventoryAlertsWidget />
            <ExternalLinksPanel />
            <NotificationPanel />
          </div>
        </div>
      </div>

      {showWorkOrderWizard && <WorkOrderWizard open={showWorkOrderWizard} onClose={() => setShowWorkOrderWizard(false)} onSuccess={() => loadFreshData()} />}
      {showOpenDrawer && <OpenDrawerDialog open={showOpenDrawer} onClose={() => setShowOpenDrawer(false)} onSuccess={() => {setShowOpenDrawer(false);showToast("✅ Caja abierta");}} />}
      {showCloseDrawer && currentDrawer && <CloseDrawerDialog open={showCloseDrawer} onClose={() => setShowCloseDrawer(false)} drawer={currentDrawer} onSuccess={() => {setShowCloseDrawer(false);showToast("✅ Caja cerrada");}} />}
      {showSendNoteModal && <SendNoteModal open={showSendNoteModal} onClose={() => setShowSendNoteModal(false)} />}
      {session && <UserMenuModal open={showUserMenu} onClose={() => setShowUserMenu(false)} user={{ id: session.userId, email: session.userEmail, full_name: session.userName, role: session.userRole }} />}
    </div>);

}