import React, { useState, useEffect, useRef } from "react";
import { dataClient } from "@/components/api/dataClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Receipt,
  CreditCard, Landmark, RefreshCw, Plus, Target, PieChart,
  Edit2, Trash2, Save, Calendar
} from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import OpenDrawerDialog from "../components/cash/OpenDrawerDialog";
import CloseDrawerDialog from "../components/cash/CloseDrawerDialog";
import ExpenseDialog from "../components/financial/ExpenseDialog";
import AlertasWidget from "../components/financial/AlertasWidget";
import ReportesFinancieros from "../components/financial/ReportesFinancieros";
import AIFinancialInsights from "../components/financial/AIFinancialInsights";
import { toast } from "sonner";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card className="bg-gradient-to-br from-[#2B2B2B] to-black border-cyan-500/20 hover:shadow-lg hover:shadow-cyan-600/20 transition-all theme-light:bg-white theme-light:border-gray-200">
    <CardContent className="pt-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide theme-light:text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${
            color === 'green' ? 'text-emerald-400 theme-light:text-emerald-600' :
            color === 'red' ? 'text-red-400 theme-light:text-red-600' :
            color === 'blue' ? 'text-cyan-400 theme-light:text-cyan-600' : 'text-white theme-light:text-gray-900'
          }`}>{value}</p>
        </div>
        <div className={`p-3 rounded-xl border ${
          color === 'green' ? 'bg-emerald-600/20 border-emerald-500/30 theme-light:bg-emerald-100' :
          color === 'red' ? 'bg-red-600/20 border-red-500/30 theme-light:bg-red-100' :
          color === 'blue' ? 'bg-cyan-600/20 border-cyan-500/30 theme-light:bg-cyan-100' : 'bg-gray-600/20 border-gray-500/30'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'green' ? 'text-emerald-400 theme-light:text-emerald-600' :
            color === 'red' ? 'text-red-400 theme-light:text-red-600' :
            color === 'blue' ? 'text-cyan-400 theme-light:text-cyan-600' : 'text-gray-400'
          }`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Financial() {
  const [sales, setSales] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDrawer, setCurrentDrawer] = useState(null);
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);
  const [showCloseDrawer, setShowCloseDrawer] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("sales");
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [showFixedExpenseDialog, setShowFixedExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const isFetching = useRef(false);
  
  useEffect(() => {
    loadData();
    
    const handleRefresh = () => {
      if (!isFetching.current) {
        loadData();
      }
    };
    
    window.addEventListener("sale-completed", handleRefresh);
    window.addEventListener("drawer-closed", handleRefresh);
    window.addEventListener("drawer-opened", handleRefresh);

    return () => {
      window.removeEventListener("sale-completed", handleRefresh);
      window.removeEventListener("drawer-closed", handleRefresh);
      window.removeEventListener("drawer-opened", handleRefresh);
    };
  }, []);

  const loadData = async () => {
    if (isFetching.current) return;
    
    isFetching.current = true;
    setLoading(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      const [salesData, transactionsData, registers, fixedExpensesData] = await Promise.all([
        dataClient.entities.Sale.list("-created_date", 500),
        dataClient.entities.Transaction.list("-created_date", 500),
        dataClient.entities.CashRegister.filter({ date: today }),
        dataClient.entities.FixedExpense.filter({ active: true }, "priority")
      ]);

      const validSales = (salesData || []).filter(s => !s.voided);
      const expenseTransactions = (transactionsData || []).filter(t => t.type === 'expense');

      setSales(validSales);
      setTransactions(transactionsData || []);
      setExpenses(expenseTransactions);
      setFixedExpenses(fixedExpensesData || []);

      const openRegister = registers?.find(r => r.status === 'open');
      setDrawerOpen(!!openRegister);
      setCurrentDrawer(openRegister);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Error cargando datos financieros");
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  const revenueTransactions = transactions.filter(t => t.type === 'revenue');
  const totalRevenue = revenueTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const todayRevenue = revenueTransactions.filter(t => {
    try {
      return isWithinInterval(new Date(t.created_date), { start: todayStart, end: todayEnd });
    } catch { return false; }
  }).reduce((sum, t) => sum + (t.amount || 0), 0);

  const todayExpenses = expenses.filter(e => {
    try {
      return isWithinInterval(new Date(e.created_date), { start: todayStart, end: todayEnd });
    } catch { return false; }
  }).reduce((sum, e) => sum + (e.amount || 0), 0);

  const todayNetProfit = todayRevenue - todayExpenses;

  const dailyAllocations = fixedExpenses.map(expense => ({
    ...expense,
    daily_amount: todayNetProfit > 0 ? (todayNetProfit * (expense.percentage / 100)) : 0,
    actual_percentage: expense.percentage
  })).sort((a, b) => a.priority - b.priority);

  const paymentMethodIcons = { cash: Wallet, card: CreditCard, ath_movil: Landmark, mixed: DollarSign };

  const handleActionSuccess = () => {
    setShowOpenDrawer(false);
    setShowCloseDrawer(false);
    setShowExpenseDialog(false);
    setShowFixedExpenseDialog(false);
    setEditingExpense(null);
    setTimeout(() => loadData(), 2000);
  };

  const handleSaveFixedExpense = async (expenseData) => {
    try {
      if (editingExpense) {
        await dataClient.entities.FixedExpense.update(editingExpense.id, expenseData);
        toast.success("Gasto actualizado");
      } else {
        await dataClient.entities.FixedExpense.create(expenseData);
        toast.success("Gasto creado");
      }
      handleActionSuccess();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    }
  };

  const handleDeleteFixedExpense = async (expenseId) => {
    if (!confirm("¿Eliminar este gasto fijo?")) return;
    try {
      await dataClient.entities.FixedExpense.delete(expenseId);
      toast.success("Gasto eliminado");
      setTimeout(() => loadData(), 2000);
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar");
    }
  };

  const getCategoryIcon = (category) => {
    const icons = { rent: "🏢", utilities: "⚡", payroll: "👥", inventory: "📦", marketing: "📢", insurance: "🛡️", maintenance: "🔧", savings: "💎", taxes: "🧾", other: "📝" };
    return icons[category] || "💰";
  };

  const handleManualRefresh = () => {
    if (loading || isFetching.current) {
      toast.warning("⏳ Ya hay una actualización en curso");
      return;
    }
    toast.info("🔄 Actualizando datos...");
    loadData();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_45%,#000_90%)] theme-light:bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="bg-gradient-to-br from-cyan-600/10 to-emerald-600/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,168,232,0.3)] theme-light:bg-white theme-light:border-gray-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 theme-light:text-gray-900">
            <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-500" />
            Finanzas
          </h1>
        </div>

        <AlertasWidget />

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleManualRefresh} disabled={loading} variant="outline" className="border-cyan-500/20 h-9 text-sm theme-light:border-gray-300">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button onClick={() => setShowExpenseDialog(true)} className="bg-orange-600 hover:bg-orange-700 h-9 text-sm">
            <Plus className="w-4 h-4 mr-2" />Registrar Gasto
          </Button>

          {drawerOpen ? (
            <Button onClick={() => setShowCloseDrawer(true)} className="bg-red-800 hover:bg-red-900 h-9 text-sm">
              <Wallet className="w-4 h-4 mr-2" />Cerrar Caja
            </Button>
          ) : (
            <Button onClick={() => setShowOpenDrawer(true)} className="bg-emerald-600 hover:bg-emerald-700 h-9 text-sm">
              <Wallet className="w-4 h-4 mr-2" />Abrir Caja
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Ingresos" value={`$${totalRevenue.toFixed(2)}`} icon={TrendingUp} color="green" />
          <StatCard title="Gastos" value={`$${totalExpenses.toFixed(2)}`} icon={TrendingDown} color="red" />
          <StatCard title="Utilidad Neta" value={`$${netProfit.toFixed(2)}`} icon={DollarSign} color={netProfit >= 0 ? "green" : "red"} />
          <StatCard title="Ventas" value={sales.length} icon={Receipt} color="blue" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-black/40 border border-cyan-500/20 backdrop-blur-xl w-full grid grid-cols-2 sm:grid-cols-5 gap-1 theme-light:bg-white">
            <TabsTrigger value="sales" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
              💵 Ventas
            </TabsTrigger>
            <TabsTrigger value="allocations" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
              💰 Gastos Fijos
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
              💸 Gastos
            </TabsTrigger>
            <TabsTrigger value="reportes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-xs sm:text-sm">
              📊 Reportes
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white text-xs sm:text-sm">
              ✨ IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card className="bg-gradient-to-br from-[#2B2B2B] to-black border-cyan-500/20 theme-light:bg-white">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between theme-light:text-gray-900">
                  <span>💵 Ventas</span>
                  <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-500/30 theme-light:bg-emerald-100">${totalRevenue.toFixed(2)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="p-12 text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-cyan-500" />
                    <p className="text-gray-400">Cargando...</p>
                  </div>
                ) : sales.length === 0 ? (
                  <div className="p-12 text-center">
                    <Receipt className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-xl font-bold text-gray-400">No hay ventas</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {sales.map((s) => {
                      const Icon = paymentMethodIcons[s.payment_method] || DollarSign;
                      return (
                        <div key={s.id} className="p-4 bg-black/30 rounded-xl border border-cyan-500/10 theme-light:bg-gray-50">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge className="bg-cyan-600/20 text-cyan-300 font-mono theme-light:bg-cyan-100">{s.sale_number}</Badge>
                                <Badge variant="outline" className="capitalize flex items-center gap-1.5">
                                  <Icon className="w-3 h-3" />
                                  {s.payment_method === 'ath_movil' ? 'ATH' : s.payment_method}
                                </Badge>
                              </div>
                              <p className="text-white text-sm theme-light:text-gray-900">{s.customer_name || 'Cliente'} • {s.items?.length || 0} items</p>
                              <p className="text-gray-500 text-xs">{format(new Date(s.created_date), 'dd/MM/yyyy HH:mm')}</p>
                            </div>
                            <p className="text-3xl font-black text-emerald-400 theme-light:text-emerald-600">${(s.total || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocations" className="space-y-6">
            <div className="bg-gradient-to-br from-cyan-600/20 to-emerald-600/20 border-2 border-cyan-500/40 rounded-2xl p-6 theme-light:bg-white">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-cyan-400" />
                <div>
                  <h3 className="text-white font-bold text-xl theme-light:text-gray-900">Utilidad de Hoy: {format(new Date(), "dd 'de' MMMM", { locale: es })}</h3>
                  <p className="text-gray-400 text-sm theme-light:text-gray-600">Los % se calculan sobre esta ganancia</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/30 rounded-xl p-4 border border-emerald-500/20 theme-light:bg-emerald-50">
                  <p className="text-sm text-emerald-200 mb-1 theme-light:text-emerald-700">💵 Ingresos de Hoy</p>
                  <p className="text-3xl font-black text-emerald-400 theme-light:text-emerald-600">${todayRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4 border border-red-500/20 theme-light:bg-red-50">
                  <p className="text-sm text-red-200 mb-1 theme-light:text-red-700">💸 Gastos de Hoy</p>
                  <p className="text-3xl font-black text-red-400 theme-light:text-red-600">${todayExpenses.toFixed(2)}</p>
                </div>
                <div className="bg-black/30 rounded-xl p-4 border border-cyan-500/20 theme-light:bg-cyan-50">
                  <p className="text-sm text-cyan-200 mb-1 theme-light:text-cyan-700">✨ Utilidad de Hoy</p>
                  <p className={`text-3xl font-black ${todayNetProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>${todayNetProfit.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => { setEditingExpense(null); setShowFixedExpenseDialog(true); }} className="bg-gradient-to-r from-cyan-600 to-emerald-700">
                <Plus className="w-4 h-4 mr-2" />Añadir Gasto Fijo
              </Button>
            </div>

            <div className="space-y-4">
              {fixedExpenses.length === 0 ? (
                <Card className="bg-gradient-to-br from-amber-600/10 to-amber-800/10 border-amber-500/20 theme-light:bg-white">
                  <CardContent className="p-12 text-center">
                    <PieChart className="w-20 h-20 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2 theme-light:text-gray-900">No hay gastos fijos</h3>
                    <Button onClick={() => setShowFixedExpenseDialog(true)} className="bg-gradient-to-r from-cyan-600 to-emerald-700 mt-4">
                      <Plus className="w-4 h-4 mr-2" />Crear Primer Gasto
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                dailyAllocations.map((allocation) => (
                  <Card key={allocation.id} className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-cyan-500/20 theme-light:bg-white">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-600/30 to-emerald-600/30 flex items-center justify-center text-3xl border border-cyan-500/30">
                            {allocation.icon || getCategoryIcon(allocation.category)}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white theme-light:text-gray-900">{allocation.name}</h3>
                            <Badge className="bg-cyan-600/30 text-cyan-200 font-mono theme-light:bg-cyan-100">{allocation.actual_percentage}%</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Apartar hoy</p>
                          <p className="text-3xl font-black text-emerald-400 theme-light:text-emerald-600">${allocation.daily_amount.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingExpense(allocation); setShowFixedExpenseDialog(true); }} className="text-cyan-400 hover:bg-cyan-600/20">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteFixedExpense(allocation.id)} className="text-red-400 hover:bg-red-600/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <Card className="bg-gradient-to-br from-[#2B2B2B] to-black border-cyan-500/20 theme-light:bg-white">
              <CardHeader><CardTitle className="text-white theme-light:text-gray-900">Gastos Registrados</CardTitle></CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay gastos</p>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((e) => (
                      <div key={e.id} className="p-3 bg-black/30 rounded-lg border border-red-500/10 theme-light:bg-gray-50">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-white text-sm theme-light:text-gray-900">{e.description}</p>
                            <p className="text-gray-500 text-xs">{format(new Date(e.created_date), 'dd/MM/yyyy HH:mm')}</p>
                          </div>
                          <p className="text-red-400 font-bold theme-light:text-red-600">${e.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reportes">
            <ReportesFinancieros />
          </TabsContent>

          <TabsContent value="ai">
            <AIFinancialInsights sales={sales} expenses={expenses} period="month" />
          </TabsContent>
        </Tabs>
      </div>

      {showOpenDrawer && <OpenDrawerDialog open={showOpenDrawer} onClose={() => setShowOpenDrawer(false)} onSuccess={handleActionSuccess} />}
      {showCloseDrawer && <CloseDrawerDialog open={showCloseDrawer} onClose={() => setShowCloseDrawer(false)} onSuccess={handleActionSuccess} drawer={currentDrawer} />}
      {showExpenseDialog && <ExpenseDialog open={showExpenseDialog} onClose={() => setShowExpenseDialog(false)} onSuccess={handleActionSuccess} drawer={currentDrawer} />}
      {showFixedExpenseDialog && <FixedExpenseDialog open={showFixedExpenseDialog} onClose={() => { setShowFixedExpenseDialog(false); setEditingExpense(null); }} onSave={handleSaveFixedExpense} expense={editingExpense} />}
    </div>
  );
}

function FixedExpenseDialog({ open, onClose, onSave, expense }) {
  const [formData, setFormData] = useState({
    name: "", category: "other", percentage: "", frequency: "monthly", 
    due_day: "", priority: 5, icon: "💰", notes: "", active: true
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name || "", category: expense.category || "other", percentage: expense.percentage || "",
        frequency: expense.frequency || "monthly", due_day: expense.due_day || "", priority: expense.priority || 5,
        icon: expense.icon || "💰", notes: expense.notes || "", active: expense.active !== false
      });
    } else {
      setFormData({ name: "", category: "other", percentage: "", frequency: "monthly", due_day: "", priority: 5, icon: "💰", notes: "", active: true });
    }
  }, [expense, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.percentage === "") {
      toast.error("Nombre y porcentaje obligatorios");
      return;
    }
    const percentage = parseFloat(formData.percentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast.error("Porcentaje debe estar entre 0 y 100");
      return;
    }
    await onSave({ ...formData, percentage });
  };

  const categories = [
    { value: "rent", label: "Renta", icon: "🏢" }, { value: "utilities", label: "Luz/Agua", icon: "⚡" },
    { value: "payroll", label: "Nómina", icon: "👥" }, { value: "inventory", label: "Inventario", icon: "📦" },
    { value: "savings", label: "Ahorro", icon: "💎" }, { value: "taxes", label: "Impuestos", icon: "🧾" },
    { value: "marketing", label: "Marketing", icon: "📢" }, { value: "insurance", label: "Seguro", icon: "🛡️" },
    { value: "maintenance", label: "Mantenimiento", icon: "🔧" }, { value: "other", label: "Otros", icon: "📝" }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-[#2B2B2B] to-black border-cyan-500/30 max-h-[90vh] overflow-y-auto theme-light:bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2 theme-light:text-gray-900">
            <Target className="w-6 h-6 text-cyan-500" />
            {expense ? "Editar Gasto Fijo" : "Nuevo Gasto Fijo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block theme-light:text-gray-700">Nombre *</label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Renta, Luz, Nómina" className="bg-black/40 border-cyan-500/20 text-white theme-light:bg-white theme-light:text-gray-900" required />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block theme-light:text-gray-700">Categoría</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {categories.map(cat => (
                <button key={cat.value} type="button" onClick={() => setFormData({ ...formData, category: cat.value, icon: cat.icon })}
                  className={`p-3 rounded-xl border-2 transition-all ${formData.category === cat.value ? "bg-gradient-to-br from-cyan-600/80 to-emerald-800/80 border-cyan-300/50 scale-105" : "bg-black/30 border-white/10 hover:border-cyan-500/30"}`}>
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-xs font-medium text-white">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-300 mb-2 block theme-light:text-gray-700">Porcentaje *</label>
            <Input type="number" step="0.1" min="0" max="100" value={formData.percentage} onChange={(e) => setFormData({ ...formData, percentage: e.target.value })} placeholder="30" className="bg-black/40 border-cyan-500/20 text-white text-2xl text-center h-16 theme-light:bg-white theme-light:text-gray-900" required />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/15">Cancelar</Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-cyan-600 to-emerald-700">
              <Save className="w-4 h-4 mr-2" />{expense ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}