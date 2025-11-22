// ============================================
// 🌐 SISTEMA DE INTERNACIONALIZACIÓN i18n
// Traducciones completas ES/EN para SmartFixOS
// ============================================

import React, { createContext, useContext, useState, useEffect } from "react";
import { dataClient } from "@/components/api/dataClient";

const TRANSLATIONS = {
  es: {
    // === GENERAL ===
    dashboard: "Inicio",
    orders: "Órdenes",
    customers: "Clientes",
    inventory: "Inventario",
    pos: "Punto de Venta",
    settings: "Configuración",
    reports: "Reportes",
    search: "Buscar",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    add: "Añadir",
    close: "Cerrar",
    confirm: "Confirmar",
    back: "Volver",
    next: "Continuar",
    loading: "Cargando",
    noResults: "Sin resultados",
    
    // === DASHBOARD ===
    todaySales: "Ventas del Día",
    revenue: "Ingresos",
    expenses: "Gastos",
    profit: "Ganancia",
    recentOrders: "Órdenes Recientes",
    quickActions: "Acciones Rápidas",
    newOrder: "Nueva Orden",
    quickSale: "Venta Rápida",
    openDrawer: "Abrir Caja",
    closeDrawer: "Cerrar Caja",
    
    // === ORDERS ===
    workOrders: "Órdenes de Trabajo",
    orderNumber: "Número de Orden",
    customer: "Cliente",
    device: "Dispositivo",
    status: "Estado",
    created: "Creada",
    updated: "Actualizada",
    assignedTo: "Asignado a",
    priority: "Prioridad",
    estimatedCompletion: "Fecha Estimada",
    problem: "Problema",
    notes: "Notas",
    timeline: "Historial",
    
    // === STATUS ===
    intake: "Recepción",
    diagnosing: "Diagnóstico",
    awaiting_approval: "Por Aprobar",
    pending_order: "Pendiente a Ordenar",
    waiting_order: "Esperando Orden",
    waiting_parts: "Esperando Piezas",
    reparacion_externa: "Reparación Externa",
    in_progress: "En Reparación",
    ready_for_pickup: "Listo para Recoger",
    delivered: "Entregado",
    cancelled: "Cancelado",
    
    // === CUSTOMERS ===
    customerName: "Nombre del Cliente",
    phone: "Teléfono",
    email: "Email",
    address: "Dirección",
    totalOrders: "Total Órdenes",
    loyaltyPoints: "Puntos",
    totalSpent: "Total Gastado",
    
    // === POS ===
    cart: "Carrito",
    subtotal: "Subtotal",
    tax: "IVU",
    total: "Total",
    paymentMethod: "Método de Pago",
    cash: "Efectivo",
    card: "Tarjeta",
    athMovil: "ATH Móvil",
    transfer: "Transferencia",
    check: "Cheque",
    cashReceived: "Efectivo Recibido",
    change: "Cambio",
    completeSale: "Completar Venta",
    products: "Productos",
    services: "Servicios",
    offers: "Ofertas",
    
    // === INVENTORY ===
    productName: "Nombre del Producto",
    sku: "SKU",
    price: "Precio",
    cost: "Costo",
    stock: "Stock",
    minStock: "Stock Mínimo",
    category: "Categoría",
    supplier: "Proveedor",
    active: "Activo",
    inactive: "Inactivo",
    
    // === WIZARD ===
    newWorkOrder: "Nueva Orden de Trabajo",
    customerInfo: "Datos del Cliente",
    deviceInfo: "Información del Dispositivo",
    problemDescription: "Descripción del Problema",
    deviceSecurity: "Seguridad del Dispositivo",
    checklist: "Checklist",
    summary: "Resumen",
    firstName: "Nombre",
    lastName: "Apellidos",
    deviceType: "Tipo",
    brand: "Marca",
    model: "Modelo",
    serial: "Serie/IMEI",
    pin: "PIN",
    password: "Contraseña",
    pattern: "Patrón",
    
    // === SETTINGS ===
    generalSettings: "Configuración General",
    businessInfo: "Información del Negocio",
    businessName: "Nombre del Negocio",
    businessPhone: "Teléfono Principal",
    businessEmail: "Email Principal",
    businessAddress: "Dirección Física",
    hours: "Horario de Atención",
    socialMedia: "Redes Sociales",
    policies: "Políticas",
    appearance: "Apariencia",
    security: "Seguridad",
    notifications: "Notificaciones",
    catalog: "Catálogo",
    users: "Usuarios",
    
    // === COMMON ACTIONS ===
    createOrder: "Crear Orden",
    updateStatus: "Actualizar Estado",
    addPayment: "Agregar Pago",
    sendEmail: "Enviar Email",
    sendWhatsApp: "Enviar WhatsApp",
    printReceipt: "Imprimir Recibo",
    export: "Exportar",
    import: "Importar",
    
    // === MESSAGES ===
    successSaved: "Guardado exitosamente",
    errorSaving: "Error al guardar",
    confirmDelete: "¿Confirmar eliminación?",
    itemAdded: "Item añadido",
    itemRemoved: "Item eliminado",
    orderCreated: "Orden creada exitosamente",
    saleCompleted: "Venta procesada",
    emailSent: "Email enviado",
    
    // === FINANCIAL ===
    paymentMethods: "Métodos de Pago",
    taxRate: "Tasa de IVU",
    cashRegister: "Caja Registradora",
    openingBalance: "Saldo Inicial",
    closingBalance: "Saldo Final",
    expected: "Esperado",
    counted: "Contado",
    difference: "Diferencia",
    
    // === TIME ===
    today: "Hoy",
    yesterday: "Ayer",
    thisWeek: "Esta Semana",
    thisMonth: "Este Mes",
    custom: "Personalizado",
    
    // === WIZARD STEPS ===
    step: "Paso",
    of: "de",
    
    // === AI INSIGHTS ===
    aiInsights: "Insights Financieros IA",
    generatingSummary: "Analizando...",
    generateReport: "Generar Reporte IA",
    financialSummary: "Resumen Financiero",
    kpis: "Indicadores Clave",
    predictiveAnalysis: "Análisis Predictivo",
    recommendations: "Recomendaciones",
    
    // === DASHBOARD ===
    cashRegister: "Caja Abierta",
    openCashRegister: "Abrir Caja",
    closeCashRegister: "Cerrar Caja",
    manageTransactions: "Gestiona movimientos",
    cashClosed: "Caja cerrada",
    transactions: "Movimientos",
    today: "Hoy",
    revenue: "Ingresos",
    expenses: "Gastos",
    netProfit: "Utilidad",
    shift: "Turno",
    open: "Abierto",
    closed: "Cerrado",
    sales: "ventas",
    searchOrders: "Buscar órdenes",
    newOrder: "Nueva Orden",
    noOrdersFound: "No se encontraron órdenes",
    priceList: "Lista de Precios",
    searchProducts: "Buscar productos/servicios…",
    service: "Servicio",
    product: "Producto",
    outOfStock: "Agotado"
  },
  
  en: {
    // === GENERAL ===
    dashboard: "Dashboard",
    orders: "Orders",
    customers: "Customers",
    inventory: "Inventory",
    pos: "Point of Sale",
    settings: "Settings",
    reports: "Reports",
    search: "Search",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    close: "Close",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    loading: "Loading",
    noResults: "No results",
    
    // === DASHBOARD ===
    todaySales: "Today's Sales",
    revenue: "Revenue",
    expenses: "Expenses",
    profit: "Profit",
    recentOrders: "Recent Orders",
    quickActions: "Quick Actions",
    newOrder: "New Order",
    quickSale: "Quick Sale",
    openDrawer: "Open Drawer",
    closeDrawer: "Close Drawer",
    
    // === ORDERS ===
    workOrders: "Work Orders",
    orderNumber: "Order Number",
    customer: "Customer",
    device: "Device",
    status: "Status",
    created: "Created",
    updated: "Updated",
    assignedTo: "Assigned To",
    priority: "Priority",
    estimatedCompletion: "Estimated Date",
    problem: "Issue",
    notes: "Notes",
    timeline: "Timeline",
    
    // === STATUS ===
    intake: "Intake",
    diagnosing: "Diagnosing",
    awaiting_approval: "Awaiting Approval",
    pending_order: "Pending Order",
    waiting_order: "Waiting Order",
    waiting_parts: "Waiting Parts",
    reparacion_externa: "External Repair",
    in_progress: "In Progress",
    ready_for_pickup: "Ready for Pickup",
    delivered: "Delivered",
    cancelled: "Cancelled",
    
    // === CUSTOMERS ===
    customerName: "Customer Name",
    phone: "Phone",
    email: "Email",
    address: "Address",
    totalOrders: "Total Orders",
    loyaltyPoints: "Points",
    totalSpent: "Total Spent",
    
    // === POS ===
    cart: "Cart",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
    paymentMethod: "Payment Method",
    cash: "Cash",
    card: "Card",
    athMovil: "ATH Móvil",
    transfer: "Transfer",
    check: "Check",
    cashReceived: "Cash Received",
    change: "Change",
    completeSale: "Complete Sale",
    products: "Products",
    services: "Services",
    offers: "Offers",
    
    // === INVENTORY ===
    productName: "Product Name",
    sku: "SKU",
    price: "Price",
    cost: "Cost",
    stock: "Stock",
    minStock: "Min Stock",
    category: "Category",
    supplier: "Supplier",
    active: "Active",
    inactive: "Inactive",
    
    // === WIZARD ===
    newWorkOrder: "New Work Order",
    customerInfo: "Customer Information",
    deviceInfo: "Device Information",
    problemDescription: "Problem Description",
    deviceSecurity: "Device Security",
    checklist: "Checklist",
    summary: "Summary",
    firstName: "First Name",
    lastName: "Last Name",
    deviceType: "Type",
    brand: "Brand",
    model: "Model",
    serial: "Serial/IMEI",
    pin: "PIN",
    password: "Password",
    pattern: "Pattern",
    
    // === SETTINGS ===
    generalSettings: "General Settings",
    businessInfo: "Business Information",
    businessName: "Business Name",
    businessPhone: "Main Phone",
    businessEmail: "Main Email",
    businessAddress: "Physical Address",
    hours: "Business Hours",
    socialMedia: "Social Media",
    policies: "Policies",
    appearance: "Appearance",
    security: "Security",
    notifications: "Notifications",
    catalog: "Catalog",
    users: "Users",
    
    // === COMMON ACTIONS ===
    createOrder: "Create Order",
    updateStatus: "Update Status",
    addPayment: "Add Payment",
    sendEmail: "Send Email",
    sendWhatsApp: "Send WhatsApp",
    printReceipt: "Print Receipt",
    export: "Export",
    import: "Import",
    
    // === MESSAGES ===
    successSaved: "Saved successfully",
    errorSaving: "Error saving",
    confirmDelete: "Confirm deletion?",
    itemAdded: "Item added",
    itemRemoved: "Item removed",
    orderCreated: "Order created successfully",
    saleCompleted: "Sale completed",
    emailSent: "Email sent",
    
    // === FINANCIAL ===
    paymentMethods: "Payment Methods",
    taxRate: "Tax Rate",
    cashRegister: "Cash Register",
    openingBalance: "Opening Balance",
    closingBalance: "Closing Balance",
    expected: "Expected",
    counted: "Counted",
    difference: "Difference",
    
    // === TIME ===
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",
    custom: "Custom",
    
    // === WIZARD STEPS ===
    step: "Step",
    of: "of",
    
    // === AI INSIGHTS ===
    aiInsights: "AI Financial Insights",
    generatingSummary: "Analyzing...",
    generateReport: "Generate AI Report",
    financialSummary: "Financial Summary",
    kpis: "Key Performance Indicators",
    predictiveAnalysis: "Predictive Analysis",
    recommendations: "Recommendations",
    
    // === DASHBOARD ===
    cashRegister: "Cash Register Open",
    openCashRegister: "Open Cash Register",
    closeCashRegister: "Close Cash Register",
    manageTransactions: "Manage transactions",
    cashClosed: "Cash register closed",
    transactions: "Transactions",
    today: "Today",
    revenue: "Revenue",
    expenses: "Expenses",
    netProfit: "Net Profit",
    shift: "Shift",
    open: "Open",
    closed: "Closed",
    sales: "sales",
    searchOrders: "Search orders",
    newOrder: "New Order",
    noOrdersFound: "No orders found",
    priceList: "Price List",
    searchProducts: "Search products/services…",
    service: "Service",
    product: "Product",
    outOfStock: "Out of Stock"
  }
};

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState("es");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const configs = await dataClient.entities.AppSettings.filter({ slug: "app-main-settings" });
      if (configs?.length && configs[0].payload?.language) {
        setLanguage(configs[0].payload.language);
      }
    } catch (error) {
      console.log("Using default language (es)");
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (newLang) => {
    setLanguage(newLang);
    
    try {
      const configs = await dataClient.entities.AppSettings.filter({ slug: "app-main-settings" });
      if (configs?.length) {
        const updatedPayload = { ...configs[0].payload, language: newLang };
        await dataClient.entities.AppSettings.update(configs[0].id, {
          payload: updatedPayload
        });
      }
    } catch (error) {
      console.error("Error saving language:", error);
    }
  };

  const t = (key) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['es']?.[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t, loading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

// Alias for compatibility
export const useTranslation = useI18n;

// Helper para traducciones inline
export const t = (key, lang = 'es') => {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['es']?.[key] || key;
};

export default I18nContext;