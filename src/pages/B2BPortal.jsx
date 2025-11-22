import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardList, FileText, DollarSign, Search, Eye, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { getStatusConfig, normalizeStatusId } from "@/components/utils/statusRegistry";

export default function B2BPortal() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("b2b_portal_token");
    if (savedToken) {
      setToken(savedToken);
      loadPortalData(savedToken);
    }
  }, []);

  const loadPortalData = async (accessToken) => {
    setLoading(true);
    try {
      const customers = await base44.entities.Customer.filter({ 
        portal_access_token: accessToken,
        portal_access_enabled: true,
        is_b2b: true
      });

      if (!customers || customers.length === 0) {
        toast.error("Token inválido o acceso no autorizado");
        localStorage.removeItem("b2b_portal_token");
        setToken("");
        setCustomer(null);
        return;
      }

      const company = customers[0];
      setCustomer(company);

      const companyOrders = await base44.entities.Order.filter({
        company_id: company.id
      }, "-updated_date");

      const companyInvoices = await base44.entities.Invoice.filter({
        company_name: company.company_name
      }, "-created_date");

      setOrders(companyOrders || []);
      setInvoices(companyInvoices || []);
      toast.success(`Bienvenido, ${company.company_name}`);

    } catch (error) {
      console.error("Error loading B2B portal:", error);
      toast.error("Error cargando datos del portal");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!tokenInput.trim()) {
      toast.error("Ingresa tu token de acceso");
      return;
    }
    localStorage.setItem("b2b_portal_token", tokenInput);
    setToken(tokenInput);
    loadPortalData(tokenInput);
  };

  const handleLogout = () => {
    localStorage.removeItem("b2b_portal_token");
    setToken("");
    setCustomer(null);
    setOrders([]);
    setInvoices([]);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o => 
      (o.order_number || "").toLowerCase().includes(q) ||
      (o.device_brand || "").toLowerCase().includes(q) ||
      (o.device_model || "").toLowerCase().includes(q) ||
      (o.initial_problem || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(normalizeStatusId(o.status))).length;
    const totalBalance = orders.reduce((sum, o) => sum + Number(o.balance_due || 0), 0);
    const totalInvoices = invoices.length;
    const unpaidInvoices = invoices.filter(i => i.status !== "paid").length;

    return { totalOrders, activeOrders, totalBalance, totalInvoices, unpaidInvoices };
  }, [orders, invoices]);

  if (!token || !customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-xl border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center gap-3">
              <Building2 className="w-8 h-8 text-purple-400" />
              Portal B2B
            </CardTitle>
            <p className="text-gray-400 text-sm mt-2">
              Acceso exclusivo para clientes empresariales
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-gray-300 mb-2 block">Token de Acceso</label>
              <Input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Ingresa tu token de acceso..."
                className="bg-black/40 border-purple-500/30 text-white h-12" />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              {loading ? "Verificando..." : "Acceder"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Contacta a tu representante para obtener tu token de acceso
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-slate-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 backdrop-blur-xl border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-purple-400" />
                  {customer.company_name}
                </h1>
                <p className="text-gray-300 mt-2">
                  Contacto Principal: {customer.billing_contact_person}
                </p>
                {customer.company_tax_id && (
                  <p className="text-gray-400 text-sm mt-1">Tax ID: {customer.company_tax_id}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => loadPortalData(token)}
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-600/20">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="border-white/15 text-gray-300">
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-black/40 border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-cyan-600/20 grid place-items-center">
                  <ClipboardList className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                  <p className="text-xs text-gray-400">Órdenes Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-600/20 grid place-items-center">
                  <ClipboardList className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.activeOrders}</p>
                  <p className="text-xs text-gray-400">En Proceso</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-600/20 grid place-items-center">
                  <DollarSign className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${stats.totalBalance.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Balance Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-purple-600/20 grid place-items-center">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.unpaidInvoices}</p>
                  <p className="text-xs text-gray-400">Facturas Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Crédito disponible */}
        {customer.credit_limit > 0 && (
          <Card className="bg-black/40 border-lime-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Límite de Crédito</p>
                  <p className="text-2xl font-bold text-white">${customer.credit_limit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Balance Usado</p>
                  <p className="text-xl font-bold text-amber-400">${stats.totalBalance.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Disponible</p>
                  <p className="text-xl font-bold text-lime-400">
                    ${(customer.credit_limit - stats.totalBalance).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-3 w-full bg-black/40 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-lime-500 to-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.totalBalance / customer.credit_limit) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Términos de pago */}
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-gray-300">Términos de Pago:</p>
            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 text-sm">
              {customer.payment_terms || "NET-30"}
            </Badge>
          </CardContent>
        </Card>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por orden, equipo, problema..."
            className="pl-10 bg-black/40 border-purple-500/20 text-white h-12" />
        </div>

        {/* Órdenes */}
        <Card className="bg-black/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              Órdenes de Trabajo ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {search ? "No se encontraron resultados" : "No hay órdenes registradas"}
              </div>
            ) : (
              filtered.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <Card key={order.id} className="bg-black/60 border-white/10 hover:border-purple-500/30 transition">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-white font-semibold">#{order.order_number}</p>
                            <Badge className={statusConfig.colorClasses}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300">
                            {order.device_brand} {order.device_model}
                          </p>
                          {order.device_serial && (
                            <p className="text-xs text-gray-500 font-mono mt-1">{order.device_serial}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                            {order.initial_problem}
                          </p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-gray-500">
                              Creada: {format(new Date(order.created_date), "dd MMM yyyy", { locale: es })}
                            </span>
                            {order.balance_due > 0 && (
                              <Badge className="bg-amber-600/20 text-amber-300 border-amber-500/30 text-xs">
                                Balance: ${Number(order.balance_due).toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-purple-500/30 text-purple-300 hover:bg-purple-600/20">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Facturas */}
        {invoices.length > 0 && (
          <Card className="bg-black/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Facturas ({invoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="bg-black/60 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-white font-semibold">Factura #{invoice.invoice_number}</p>
                          <Badge className={
                            invoice.status === "paid" ? "bg-green-600/20 text-green-300 border-green-500/30" :
                            invoice.status === "sent" ? "bg-blue-600/20 text-blue-300 border-blue-500/30" :
                            "bg-gray-600/20 text-gray-300 border-gray-500/30"
                          }>
                            {invoice.status === "paid" ? "Pagada" :
                             invoice.status === "sent" ? "Enviada" :
                             invoice.status === "cancelled" ? "Cancelada" : "Borrador"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400">
                          Órdenes incluidas: {invoice.work_order_numbers?.join(", ") || "—"}
                        </p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className="text-xs text-gray-500">
                            {format(new Date(invoice.created_date), "dd MMM yyyy", { locale: es })}
                          </span>
                          {invoice.due_date && (
                            <span className="text-xs text-amber-400">
                              Vence: {format(new Date(invoice.due_date), "dd MMM yyyy", { locale: es })}
                            </span>
                          )}
                          <span className="text-lg font-bold text-white">
                            ${Number(invoice.total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!invoice.pdf_url}
                        className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/20">
                        <Download className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Contactos */}
        {customer.b2b_contacts && customer.b2b_contacts.length > 0 && (
          <Card className="bg-black/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                Contactos de la Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customer.b2b_contacts.map((contact, index) => (
                  <div key={index} className="bg-black/40 border border-white/10 rounded-lg p-3">
                    <p className="text-white font-semibold flex items-center gap-2">
                      {contact.name}
                      {contact.is_primary && (
                        <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 text-xs">
                          Principal
                        </Badge>
                      )}
                    </p>
                    {contact.role && <p className="text-xs text-gray-400 mt-1">{contact.role}</p>}
                    {contact.email && <p className="text-xs text-gray-300 mt-1">{contact.email}</p>}
                    {contact.phone && <p className="text-xs text-gray-300">{contact.phone}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}