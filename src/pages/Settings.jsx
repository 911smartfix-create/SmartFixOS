import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Database, Users, Palette, Shield, Bell, Printer,
  Settings, Loader2, Trash2, Globe,
  Save, Eye, EyeOff, Plus, Search, Edit2, Check, X, Package,
  DollarSign, BarChart3, Clock, Mail, Smartphone, Building2,
  Key, Lock, Activity, Cpu, HardDrive, Server,
  UserCircle, Sparkles, ExternalLink, ClipboardList, CheckSquare,
  Camera, Wrench, ChevronRight, ChevronDown, FileText, Receipt,
  Wallet, Calendar, TrendingDown, CreditCard, AlertCircle,
  Landmark, Fingerprint, ShieldAlert, ShieldCheck, History,
  LogIn, LogOut, Download, Upload, AlertTriangle } from
"lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import ImportExportTab from "../components/settings/ImportExportTab";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const [users, setUsers] = useState([]);
  const [searchUsers, setSearchUsers] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState({});

  const [externalLinks, setExternalLinks] = useState([]);
  const [editingLink, setEditingLink] = useState(null);
  const [searchLinks, setSearchLinks] = useState("");

  const [wizardConfig, setWizardConfig] = useState(null);

  const [editingPreset, setEditingPreset] = useState(null);
  const [presetLabel, setPresetLabel] = useState("");
  const [presetText, setPresetText] = useState("");

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedBrands, setExpandedBrands] = useState({});
  const [editingCatalogItem, setEditingCatalogItem] = useState(null);
  const [catalogItemType, setCatalogItemType] = useState(null);

  const [theme, setTheme] = useState("dark");

  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    card: true,
    ath_movil: true,
    bank_transfer: false,
    check: false
  });

  const [appConfig, setAppConfig] = useState({
    business_name: "911 SmartFix",
    business_phone: "",
    business_email: "",
    business_address: "",
    website: "",
    hours_weekdays: "",
    hours_saturday: "",
    hours_sunday: "",
    hours_holidays: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    twitter: "",
    warranty_policy: "",
    return_policy: "",
    terms_conditions: "",
    logo_url: "",
    slogan: "",
    primary_color: "#DC2626",
    receipt_footer: "",
    business_registration: "",
    auto_print_receipt: true,
    tax_rate: 11.5,
    currency: "USD",
    timezone: "America/Puerto_Rico",
    language: "es"
  });

  useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "general") loadAppConfig();
    if (activeTab === "links") loadExternalLinks();
    if (activeTab === "wizard") loadWizardConfig();
    if (activeTab === "catalog") loadCatalogData();
    if (activeTab === "appearance") loadTheme();
    if (activeTab === "financial") loadPaymentMethods(); // New: Load payment methods for financial tab
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await base44.entities.User.list("-created_date", 100);
      setUsers(allUsers || []);
    } catch (error) {
      toast.error("Error cargando usuarios");
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppConfig = async () => {
    try {
      const configs = await base44.entities.AppSettings.filter({ slug: "app-main-settings" });
      if (configs?.length) {
        setAppConfig({ ...appConfig, ...configs[0].payload });
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const saveAppConfig = async () => {
    setLoading(true);
    try {
      if (!appConfig.business_name || !appConfig.business_phone || !appConfig.business_email) {
        toast.error("Nombre, teléfono y email del negocio son requeridos.");
        setLoading(false);
        return;
      }

      const configs = await base44.entities.AppSettings.filter({ slug: "app-main-settings" });
      if (configs?.length) {
        await base44.entities.AppSettings.update(configs[0].id, { payload: appConfig });
      } else {
        await base44.entities.AppSettings.create({
          slug: "app-main-settings",
          payload: appConfig,
          description: "Configuración principal"
        });
      }
      toast.success("✅ Configuración guardada");
      
      // Si cambió el idioma, recargar después de 2 segundos
      const oldLang = appConfig.language;
      if (oldLang !== (configs[0]?.payload?.language)) {
        setTimeout(() => {
          toast.info("🌐 Recargando para aplicar el nuevo idioma...");
          setTimeout(() => window.location.reload(), 1000);
        }, 1500);
      }
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const loadExternalLinks = async () => {
    try {
      const allLinks = await base44.entities.ExternalLink.list("order", 100);
      setExternalLinks(allLinks || []);
    } catch (error) {
      toast.error("Error cargando enlaces");
    }
  };

  const handleSaveLink = async () => {
    if (!editingLink.name || !editingLink.url) {
      toast.error("Nombre y URL son requeridos");
      return;
    }

    setLoading(true);
    try {
      if (editingLink.id) {
        await base44.entities.ExternalLink.update(editingLink.id, editingLink);
        toast.success("✅ Enlace actualizado");
      } else {
        await base44.entities.ExternalLink.create({
          ...editingLink,
          order: externalLinks.length + 1
        });
        toast.success("✅ Enlace creado");
      }
      setEditingLink(null);
      loadExternalLinks();
    } catch (error) {
      console.error("Error saving link:", error);
      toast.error("Error al guardar enlace");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (link) => {
    if (!confirm(`¿Eliminar "${link.name}"?`)) return;

    setLoading(true);
    try {
      await base44.entities.ExternalLink.delete(link.id);
      toast.success("Enlace eliminado");
      loadExternalLinks();
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const filteredLinks = externalLinks.filter((l) => {
    const q = searchLinks.toLowerCase();
    return (l.name || "").toLowerCase().includes(q) ||
    (l.url || "").toLowerCase().includes(q) ||
    (l.description || "").toLowerCase().includes(q) ||
    (l.category || "").toLowerCase().includes(q);
  });

  const loadWizardConfig = async () => {
    try {
      const configs = await base44.entities.WorkOrderWizardConfig.list();
      if (configs?.length) {
        setWizardConfig(configs[0]);
      } else {
        setWizardConfig({
          steps_enabled: {
            customer: true,
            device: true,
            problem: true,
            security: true,
            checklist: true,
            summary: true
          },
          steps_order: ["customer", "device", "problem", "security", "checklist", "summary"],
          customer_search_enabled: true,
          customer_fields_required: {
            name: true,
            last_name: false,
            phone: true,
            email: false
          },
          device_auto_family: true,
          problem_presets: [
          { label: "Pantalla", text: "Pantalla rota / touch no responde" },
          { label: "Batería", text: "Batería se descarga rápido / se apaga" },
          { label: "Puerto", text: "No carga / puerto dañado" }],

          media_config: {
            max_files: 10,
            max_size_mb: 10,
            required: false,
            allow_video: true,
            camera_first: true
          },
          security_config: {
            pin_required: false,
            password_required: false,
            pattern_enabled: true,
            encrypt_data: true
          },
          auto_send_email: true,
          default_status: "intake",
          auto_assign: false,
          active: true
        });
      }
    } catch (error) {
      console.error("Error loading wizard config:", error);
    }
  };

  const saveWizardConfig = async () => {
    setLoading(true);
    try {
      if (wizardConfig?.id) {
        await base44.entities.WorkOrderWizardConfig.update(wizardConfig.id, wizardConfig);
        toast.success("✅ Configuración del wizard guardada");
      } else {
        await base44.entities.WorkOrderWizardConfig.create(wizardConfig);
        toast.success("✅ Configuración del wizard creada");
      }
      loadWizardConfig();
    } catch (error) {
      toast.error("Error al guardar configuración");
      console.error("Error saving wizard config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPreset = () => {
    setEditingPreset(-1);
    setPresetLabel("");
    setPresetText("");
  };

  const handleEditPreset = (index) => {
    const preset = wizardConfig.problem_presets[index];
    setEditingPreset(index);
    setPresetLabel(preset.label);
    setPresetText(preset.text);
  };

  const handleSavePreset = () => {
    if (!presetLabel.trim() || !presetText.trim()) {
      toast.error("Label y texto son requeridos");
      return;
    }

    const newPreset = { label: presetLabel, text: presetText };
    let updatedPresets = [...(wizardConfig.problem_presets || [])];

    if (editingPreset === -1) {
      updatedPresets.push(newPreset);
    } else {
      updatedPresets[editingPreset] = newPreset;
    }

    setWizardConfig({
      ...wizardConfig,
      problem_presets: updatedPresets
    });

    setEditingPreset(null);
    setPresetLabel("");
    setPresetText("");
    toast.success("Preset guardado");
  };

  const handleDeletePreset = (index) => {
    if (!confirm("¿Eliminar este preset?")) return;

    const updatedPresets = wizardConfig.problem_presets.filter((_, i) => i !== index);
    setWizardConfig({
      ...wizardConfig,
      problem_presets: updatedPresets
    });
    toast.success("Preset eliminado");
  };

  const loadTheme = async () => {
    try {
      const configs = await base44.entities.AppSettings.filter({ slug: "app-theme" });
      if (configs?.length) {
        const savedTheme = configs[0].payload?.theme || "dark";
        setTheme(savedTheme);
        applyTheme(savedTheme);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const applyTheme = (themeName) => {
    if (themeName === "light") {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("theme-dark");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("theme-dark");
      document.documentElement.classList.add("dark");
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);

    setLoading(true);
    try {
      const configs = await base44.entities.AppSettings.filter({ slug: "app-theme" });
      if (configs?.length) {
        await base44.entities.AppSettings.update(configs[0].id, {
          payload: { theme: newTheme }
        });
      } else {
        await base44.entities.AppSettings.create({
          slug: "app-theme",
          payload: { theme: newTheme },
          description: "Tema de la aplicación"
        });
      }
      toast.success(`✅ Tema ${newTheme === "light" ? "claro" : "oscuro"} aplicado`);

      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Error al guardar tema");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const configs = await base44.entities.AppSettings.filter({ slug: "payment-methods" });
      if (configs?.length) {
        setPaymentMethods({
          cash: true,
          card: true,
          ath_movil: true,
          bank_transfer: false,
          check: false,
          ...configs[0].payload
        });
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
    }
  };

  const savePaymentMethods = async () => {
    setLoading(true);
    try {
      const configs = await base44.entities.AppSettings.filter({ slug: "payment-methods" });
      if (configs?.length) {
        await base44.entities.AppSettings.update(configs[0].id, {
          payload: paymentMethods
        });
      } else {
        await base44.entities.AppSettings.create({
          slug: "payment-methods",
          payload: paymentMethods,
          description: "Métodos de pago habilitados"
        });
      }
      toast.success("✅ Métodos de pago actualizados");
    } catch (error) {
      toast.error("Error al guardar métodos de pago");
      console.error("Error saving payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogData = async () => {
    setLoading(true);
    try {
      const [categoriesData, brandsData, modelsData] = await Promise.all([
      base44.entities.DeviceCategory.list("order"),
      base44.entities.Brand.list("order"),
      base44.entities.DeviceModel.list("order")]
      );

      setCategories(categoriesData || []);
      setBrands(brandsData || []);
      setModels(modelsData || []);
    } catch (error) {
      console.error("Error loading catalog:", error);
      toast.error("Error cargando catálogo");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const toggleBrand = (brandId) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brandId]: !prev[brandId]
    }));
  };

  const handleAddCategory = () => {
    setEditingCatalogItem({
      name: "",
      icon: "📱",
      active: true,
      order: categories.length + 1
    });
    setCatalogItemType("category");
  };

  const handleAddBrand = (categoryId) => {
    setEditingCatalogItem({
      name: "",
      category_id: categoryId,
      active: true,
      order: brands.filter((b) => b.category_id === categoryId).length + 1
    });
    setCatalogItemType("brand");
  };

  const handleAddModel = (brandId, brand) => {
    setEditingCatalogItem({
      name: "",
      brand_id: brandId,
      brand: brand.name,
      active: true,
      order: models.filter((m) => m.brand_id === brandId).length + 1
    });
    setCatalogItemType("model");
  };

  const handleEditCatalogItem = (item, type) => {
    setEditingCatalogItem(item);
    setCatalogItemType(type);
  };

  const handleSaveCatalogItem = async () => {
    if (!editingCatalogItem.name) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      if (catalogItemType === "category") {
        if (editingCatalogItem.id) {
          await base44.entities.DeviceCategory.update(editingCatalogItem.id, editingCatalogItem);
          toast.success("✅ Categoría actualizada");
        } else {
          await base44.entities.DeviceCategory.create(editingCatalogItem);
          toast.success("✅ Categoría creada");
        }
      } else if (catalogItemType === "brand") {
        if (editingCatalogItem.id) {
          await base44.entities.Brand.update(editingCatalogItem.id, editingCatalogItem);
          toast.success("✅ Marca actualizada");
        } else {
          await base44.entities.Brand.create(editingCatalogItem);
          toast.success("✅ Marca creada");
        }
      } else if (catalogItemType === "model") {
        if (editingCatalogItem.id) {
          await base44.entities.DeviceModel.update(editingCatalogItem.id, editingCatalogItem);
          toast.success("✅ Modelo actualizado");
        } else {
          await base44.entities.DeviceModel.create(editingCatalogItem);
          toast.success("✅ Modelo creado");
        }
      }

      setEditingCatalogItem(null);
      setCatalogItemType(null);
      loadCatalogData();
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCatalogItem = async (item, type) => {
    let confirmMessage = `¿Eliminar "${item.name}"?`;

    if (type === "category") {
      const categoryBrands = brands.filter((b) => b.category_id === item.id);
      if (categoryBrands.length > 0) {
        confirmMessage += `\n\n⚠️ Esto eliminará ${categoryBrands.length} marca(s) y todos sus modelos.`;
      }
    } else if (type === "brand") {
      const brandModels = models.filter((m) => m.brand_id === item.id);
      if (brandModels.length > 0) {
        confirmMessage += `\n\n⚠️ Esto eliminará ${brandModels.length} modelo(s).`;
      }
    }

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      if (type === "category") {
        const categoryBrands = brands.filter((b) => b.category_id === item.id);
        for (const brand of categoryBrands) {
          const brandModels = models.filter((m) => m.brand_id === brand.id);
          for (const model of brandModels) {
            await base44.entities.DeviceModel.delete(model.id);
          }
          await base44.entities.Brand.delete(brand.id);
        }
        await base44.entities.DeviceCategory.delete(item.id);
        toast.success("Categoría y sus elementos eliminados");
      } else if (type === "brand") {
        const brandModels = models.filter((m) => m.brand_id === item.id);
        for (const model of brandModels) {
          await base44.entities.DeviceModel.delete(model.id);
        }
        await base44.entities.Brand.delete(item.id);
        toast.success("Marca y modelos eliminados");
      } else if (type === "model") {
        await base44.entities.DeviceModel.delete(item.id);
        toast.success("Modelo eliminado");
      }

      loadCatalogData();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCatalogItemActive = async (item, type) => {
    setLoading(true);
    try {
      const newActive = !item.active;

      if (type === "category") {
        await base44.entities.DeviceCategory.update(item.id, { active: newActive });
      } else if (type === "brand") {
        await base44.entities.Brand.update(item.id, { active: newActive });
      } else if (type === "model") {
        await base44.entities.DeviceModel.update(item.id, { active: newActive });
      }

      toast.success(newActive ? "Activado" : "Desactivado");
      loadCatalogData();
    } catch (error) {
      toast.error("Error al cambiar estado");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchUsers.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q) ||
    (u.employee_code || "").toLowerCase().includes(q);
  });

  const handleSaveUser = async () => {
    if (!editingUser.full_name || !editingUser.email || !editingUser.pin || !editingUser.employee_code || !editingUser.phone || !editingUser.position) {
      toast.error("Por favor completa todos los campos obligatorios.");
      return;
    }

    if (editingUser.pin.length !== 4 || !/^\d{4}$/.test(editingUser.pin)) {
      toast.error("El PIN debe tener exactamente 4 dígitos numéricos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingUser.email)) {
      toast.error("Email inválido.");
      return;
    }

    setLoading(true);
    try {
      if (editingUser.id) {
        await base44.entities.User.update(editingUser.id, editingUser);
        toast.success("✅ Usuario actualizado correctamente");
      } else {
        const newUserPayload = {
          full_name: editingUser.full_name,
          email: editingUser.email,
          role: editingUser.role || "technician",
          employee_code: editingUser.employee_code,
          pin: editingUser.pin,
          position: editingUser.position,
          phone: editingUser.phone,
          hourly_rate: editingUser.hourly_rate || 0,
          active: editingUser.active !== false,
          permissions: editingUser.permissions || {
            create_orders: true,
            process_sales: true,
            view_reports: false,
            view_financials: false,
            manage_inventory: false,
            manage_employees: false,
            manage_cash_drawer: false,
            apply_discounts: false,
            process_refunds: false,
            edit_time_entries: false
          }
        };
        await base44.entities.User.create(newUserPayload);
        toast.success("✅ Usuario creado correctamente");
      }

      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Error al guardar usuario: " + (error.message || "Error desconocido"));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    setLoading(true);
    try {
      await base44.entities.User.update(user.id, { active: !user.active });
      toast.success(user.active ? "Desactivado" : "Activado");
      loadUsers();
    } catch (error) {
      console.error("Error toggling user active status:", error);
      toast.error("Error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    // ✅ VALIDAR: No eliminar el último admin
    if (user.role === "admin") {
      const adminCount = users.filter(u => u.role === "admin" && u.id !== user.id).length;
      if (adminCount === 0) {
        toast.error("❌ No se puede eliminar el último administrador");
        return;
      }
    }

    const confirmMsg = `¿Eliminar a "${user.full_name || user.email}"?\n\n⚠️ Acción irreversible`;
    if (!confirm(confirmMsg)) return;

    // ✅ Confirmación adicional para admins
    if (user.role === "admin") {
      const verify = prompt("Para confirmar, escribe: ELIMINAR");
      if (verify !== "ELIMINAR") {
        toast.error("Eliminación cancelada");
        return;
      }
    }

    setLoading(true);
    try {
      await base44.entities.User.delete(user.id);
      toast.success(`✅ ${user.full_name || user.email} eliminado`);
      loadUsers();
      window.dispatchEvent(new Event("user-deleted"));
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar: " + (error.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 theme-light:bg-gray-50">
      <div className="bg-gradient-to-r from-cyan-600/10 to-emerald-600/10 backdrop-blur-xl border-b border-cyan-500/20 p-6 theme-light:bg-white theme-light:border-gray-200">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 theme-light:text-gray-900">⚙️ Configuración</h1>
          <p className="text-cyan-200/80 theme-light:text-gray-600">Panel de control y ajustes del sistema</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-black/60 border-2 border-cyan-500/20 p-1 flex-wrap h-auto theme-light:bg-gray-100 theme-light:border-gray-300">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Settings className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="catalog"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Database className="w-4 h-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger
              value="wizard"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <ClipboardList className="w-4 h-4" />
              Nueva Orden
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Users className="w-4 h-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger
              value="links"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <ExternalLink className="w-4 h-4" />
              Enlaces
            </TabsTrigger>
            <TabsTrigger
              value="inventory"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Package className="w-4 h-4" />
              Inventario
            </TabsTrigger>
            <TabsTrigger
              value="financial"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <DollarSign className="w-4 h-4" />
              Finanzas
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Bell className="w-4 h-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Palette className="w-4 h-4" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Shield className="w-4 h-4" />
              Seguridad
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">

              <Activity className="w-4 h-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="import_export" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white flex items-center gap-2">
              <Download className="w-4 h-4" />Datos
            </TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información del Negocio */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-red-500" />
                    Información del Negocio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Nombre del Negocio *</label>
                    <Input
                      value={appConfig.business_name}
                      onChange={(e) => setAppConfig({ ...appConfig, business_name: e.target.value })}
                      placeholder="911 SmartFix"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Teléfono Principal *</label>
                    <Input
                      value={appConfig.business_phone}
                      onChange={(e) => setAppConfig({ ...appConfig, business_phone: e.target.value })}
                      placeholder="(787) 123-4567"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Email Principal *</label>
                    <Input
                      value={appConfig.business_email}
                      onChange={(e) => setAppConfig({ ...appConfig, business_email: e.target.value })}
                      placeholder="contacto@911smartfix.com"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Dirección Física</label>
                    <Input
                      value={appConfig.business_address}
                      onChange={(e) => setAppConfig({ ...appConfig, business_address: e.target.value })}
                      placeholder="123 Calle Principal, San Juan, PR 00901"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Sitio Web</label>
                    <Input
                      value={appConfig.website || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, website: e.target.value })}
                      placeholder="https://www.911smartfix.com"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                </CardContent>
              </Card>

              {/* Regional y Moneda */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-red-500" />
                    Regional y Fiscal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">IVU / Impuesto (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={appConfig.tax_rate}
                      onChange={(e) => setAppConfig({ ...appConfig, tax_rate: parseFloat(e.target.value) })}
                      className="bg-black/40 border-white/15 text-white" />

                    <p className="text-xs text-gray-500 mt-1">Tasa de impuesto aplicada a las ventas</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Moneda</label>
                    <select
                      value={appConfig.currency}
                      onChange={(e) => setAppConfig({ ...appConfig, currency: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white">

                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Zona Horaria</label>
                    <select
                      value={appConfig.timezone}
                      onChange={(e) => setAppConfig({ ...appConfig, timezone: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white">

                      <option value="America/Puerto_Rico">Puerto Rico (AST)</option>
                      <option value="America/New_York">Nueva York (EST/EDT)</option>
                      <option value="America/Los_Angeles">Los Ángeles (PST/PDT)</option>
                      <option value="America/Chicago">Chicago (CST/CDT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Idioma Principal del Sistema</label>
                    <select
                      value={appConfig.language}
                      onChange={(e) => setAppConfig({ ...appConfig, language: e.target.value })}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white">

                      <option value="es">🇪🇸 Español</option>
                      <option value="en">🇺🇸 English</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      ⚠️ Al cambiar el idioma, guarda la configuración y recarga la página para ver los cambios en todo el sistema.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Horario de Operación */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-500" />
                    Horario de Atención
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-300 text-xs mb-1 block">Lunes - Viernes</label>
                      <Input
                        value={appConfig.hours_weekdays || ""}
                        onChange={(e) => setAppConfig({ ...appConfig, hours_weekdays: e.target.value })}
                        placeholder="9:00 AM - 6:00 PM"
                        className="bg-black/40 border-white/15 text-white text-sm" />

                    </div>
                    <div>
                      <label className="text-gray-300 text-xs mb-1 block">Sábados</label>
                      <Input
                        value={appConfig.hours_saturday || ""}
                        onChange={(e) => setAppConfig({ ...appConfig, hours_saturday: e.target.value })}
                        placeholder="10:00 AM - 4:00 PM"
                        className="bg-black/40 border-white/15 text-white text-sm" />

                    </div>
                    <div>
                      <label className="text-gray-300 text-xs mb-1 block">Domingos</label>
                      <Input
                        value={appConfig.hours_sunday || ""}
                        onChange={(e) => setAppConfig({ ...appConfig, hours_sunday: e.target.value })}
                        placeholder="Cerrado"
                        className="bg-black/40 border-white/15 text-white text-sm" />

                    </div>
                    <div>
                      <label className="text-gray-300 text-xs mb-1 block">Días Festivos</label>
                      <Input
                        value={appConfig.hours_holidays || ""}
                        onChange={(e) => setAppConfig({ ...appConfig, hours_holidays: e.target.value })}
                        placeholder="Cerrado / Especial"
                        className="bg-black/40 border-white/15 text-white text-sm" />

                    </div>
                  </div>
                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 mt-3">
                    <p className="text-blue-300 text-xs">
                      💡 Este horario se mostrará en recibos y comunicaciones con clientes
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Redes Sociales */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-red-500" />
                    Redes Sociales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-gray-300 text-xs mb-1 block">WhatsApp Business</label>
                    <Input
                      value={appConfig.whatsapp || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, whatsapp: e.target.value })}
                      placeholder="+1 787 123 4567"
                      className="bg-black/40 border-white/15 text-white text-sm" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-xs mb-1 block">Facebook</label>
                    <Input
                      value={appConfig.facebook || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, facebook: e.target.value })}
                      placeholder="https://facebook.com/911smartfix"
                      className="bg-black/40 border-white/15 text-white text-sm" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-xs mb-1 block">Instagram</label>
                    <Input
                      value={appConfig.instagram || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, instagram: e.target.value })}
                      placeholder="@911smartfix"
                      className="bg-black/40 border-white/15 text-white text-sm" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-xs mb-1 block">Twitter / X</label>
                    <Input
                      value={appConfig.twitter || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, twitter: e.target.value })}
                      placeholder="@911smartfix"
                      className="bg-black/40 border-white/15 text-white text-sm" />

                  </div>
                </CardContent>
              </Card>

              {/* Políticas de Negocio */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    Políticas y Términos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Política de Garantía</label>
                      <textarea
                        value={appConfig.warranty_policy || ""}
                        onChange={(e) => setAppConfig({ ...appConfig, warranty_policy: e.target.value })}
                        placeholder="Ej: 90 días en reparaciones, 30 días en piezas..."
                        rows={4}
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none" />

                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Política de Devoluciones</label>
                      <textarea
                        value={appConfig.return_policy || ""}
                        onChange={(e) => setAppConfig({ ...appConfig, return_policy: e.target.value })}
                        placeholder="Ej: 14 días para devoluciones con recibo..."
                        rows={4}
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none" />

                    </div>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Términos y Condiciones</label>
                    <textarea
                      value={appConfig.terms_conditions || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, terms_conditions: e.target.value })}
                      placeholder="Términos generales del servicio..."
                      rows={6}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none" />

                    <p className="text-xs text-gray-500 mt-1">Se mostrará en órdenes y firma del cliente</p>
                  </div>
                </CardContent>
              </Card>

              {/* Branding y Apariencia */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-red-500" />
                    Logo y Marca
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">URL del Logo</label>
                    <Input
                      value={appConfig.logo_url || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, logo_url: e.target.value })}
                      placeholder="https://..."
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                  {appConfig.logo_url &&
                  <div className="p-4 bg-black/30 rounded-lg border border-white/10">
                      <p className="text-xs text-gray-400 mb-2">Vista previa:</p>
                      <img
                      src={appConfig.logo_url}
                      alt="Logo preview"
                      className="h-16 object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }} />

                    </div>
                  }
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Slogan / Tagline</label>
                    <Input
                      value={appConfig.slogan || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, slogan: e.target.value })}
                      placeholder="Tu taller de confianza"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Color Principal (Hex)</label>
                    <div className="flex gap-2">
                      <Input
                        value={appConfig.primary_color || "#DC2626"}
                        onChange={(e) => setAppConfig({ ...appConfig, primary_color: e.target.value })}
                        placeholder="#DC2626"
                        className="bg-black/40 border-white/15 text-white flex-1" />

                      <div
                        className="w-12 h-10 rounded-lg border-2 border-white/20"
                        style={{ backgroundColor: appConfig.primary_color || "#DC2626" }} />

                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Configuración de Recibos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-red-500" />
                    Recibos y Facturación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Mensaje en Recibos</label>
                    <textarea
                      value={appConfig.receipt_footer || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, receipt_footer: e.target.value })}
                      placeholder="¡Gracias por su compra! Garantía de 90 días en reparaciones."
                      rows={3}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Número de Registro Mercantil</label>
                    <Input
                      value={appConfig.business_registration || ""}
                      onChange={(e) => setAppConfig({ ...appConfig, business_registration: e.target.value })}
                      placeholder="Ej: 123456789"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>
                  <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appConfig.auto_print_receipt !== false}
                      onChange={(e) => setAppConfig({ ...appConfig, auto_print_receipt: e.target.checked })}
                      className="hidden" />

                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    appConfig.auto_print_receipt ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                      {appConfig.auto_print_receipt && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-white text-sm">Imprimir recibo automáticamente</span>
                  </label>
                </CardContent>
              </Card>
            </div>

            {/* Botón de Guardar - Full Width */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={saveAppConfig}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 px-8 h-12 text-lg shadow-[0_8px_32px_rgba(220,38,38,0.4)] w-full max-w-sm">

                {loading ?
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando...
                  </> :

                <>
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Configuración General
                  </>
                }
              </Button>
            </div>
          </TabsContent>

          {/* CATALOG - SOLO MANUAL, SIN PRE-CARGADO */}
          <TabsContent value="catalog" className="space-y-6">
            <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-6 h-6 text-red-500" />
                    Gestión Manual del Catálogo
                  </CardTitle>
                  <Button onClick={handleAddCategory} className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900">
                    <Plus className="w-4 h-4 mr-2" />Nueva Categoría
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories.map((category) => {
                    const categoryBrands = brands.filter((b) => b.category_id === category.id);
                    const isExpanded = expandedCategories[category.id];

                    return (
                      <div key={category.id} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                        <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                          <div className="flex items-center gap-3 flex-1">
                            <button onClick={() => toggleCategory(category.id)} className="text-gray-400 hover:text-white">
                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </button>
                            <span className="text-2xl">{category.icon || "📦"}</span>
                            <div className="flex-1">
                              <h3 className="text-white font-bold">{category.name}</h3>
                              <p className="text-xs text-gray-400">{categoryBrands.length} marca(s)</p>
                            </div>
                            <Badge className={category.active ? "bg-green-600/20 text-green-300 border-green-600/30" : "bg-gray-600/20 text-gray-300 border-gray-600/30"}>
                              {category.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="flex gap-2 ml-3">
                            <Button size="sm" variant="outline" onClick={() => handleAddBrand(category.id)} className="bg-background text-slate-900 px-3 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-9 border-white/15 hover:bg-white/10">
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditCatalogItem(category, "category")} className="bg-background text-slate-900 px-3 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border hover:text-accent-foreground h-9 border-white/15 hover:bg-white/10">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleToggleCatalogItemActive(category, "category")} className={category.active ? "border-red-600/50 text-red-400 hover:bg-red-600/20" : "border-green-600/50 text-green-400 hover:bg-green-600/20"}>
                              {category.active ? <Lock className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteCatalogItem(category, "category")} className="border-red-600/50 text-red-400 hover:bg-red-600/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {isExpanded &&
                        <div className="pl-12 pr-4 pb-4 space-y-2">
                            {categoryBrands.map((brand) => {
                            const brandModels = models.filter((m) => m.brand_id === brand.id);
                            const isBrandExpanded = expandedBrands[brand.id];

                            return (
                              <div key={brand.id} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                                  <div className="p-3 flex items-center justify-between hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-3 flex-1">
                                      <button onClick={() => toggleBrand(brand.id)} className="text-gray-400 hover:text-white">
                                        {isBrandExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                      </button>
                                      <div className="flex-1">
                                        <h4 className="text-white font-semibold text-sm">{brand.name}</h4>
                                        <p className="text-xs text-gray-400">{brandModels.length} modelo(s)</p>
                                      </div>
                                      <Badge className={brand.active ? "bg-green-600/20 text-green-300 border-green-600/30 text-xs" : "bg-gray-600/20 text-gray-300 border-gray-600/30 text-xs"}>
                                        {brand.active ? "Activo" : "Inactivo"}
                                      </Badge>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <Button size="sm" variant="outline" onClick={() => handleAddModel(brand.id, brand)} className="border-white/15 text-white hover:bg-white/10 h-8 w-8 p-0">
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleEditCatalogItem(brand, "brand")} className="border-white/15 text-white hover:bg-white/10 h-8 w-8 p-0">
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleToggleCatalogItemActive(brand, "brand")} className={`h-8 w-8 p-0 ${brand.active ? "border-red-600/50 text-red-400 hover:bg-red-600/20" : "border-green-600/50 text-green-400 hover:bg-green-600/20"}`}>
                                        {brand.active ? <Lock className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => handleDeleteCatalogItem(brand, "brand")} className="border-red-600/50 text-red-400 hover:bg-red-600/20 h-8 w-8 p-0">
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {isBrandExpanded && brandModels.length > 0 &&
                                <div className="pl-8 pr-3 pb-3 space-y-1">
                                      {brandModels.map((model) =>
                                  <div key={model.id} className="flex items-center justify-between p-2 bg-black/30 border border-white/10 rounded-lg hover:bg-white/5 transition-all">
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <Smartphone className="w-4 h-4 text-gray-500" />
                                            <span className="text-white text-sm truncate">{model.name}</span>
                                            <Badge className={model.active ? "bg-green-600/20 text-green-300 border-green-600/30 text-xs" : "bg-gray-600/20 text-gray-300 border-gray-600/30 text-xs"}>
                                              {model.active ? "✓" : "✗"}
                                            </Badge>
                                          </div>
                                          <div className="flex gap-1 ml-2">
                                            <Button size="sm" variant="outline" onClick={() => handleEditCatalogItem(model, "model")} className="border-white/15 text-white hover:bg-white/10 h-7 w-7 p-0">
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleToggleCatalogItemActive(model, "model")} className={`h-7 w-7 p-0 ${model.active ? "border-red-600/50 text-red-400 hover:bg-red-600/20" : "border-green-600/50 text-green-400 hover:bg-green-600/20"}`}>
                                              {model.active ? <Lock className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleDeleteCatalogItem(model, "model")} className="border-red-600/50 text-red-400 hover:bg-red-600/20 h-7 w-7 p-0">
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                  )}
                                    </div>
                                }

                                  {isBrandExpanded && brandModels.length === 0 &&
                                <div className="pl-8 pr-3 pb-3">
                                      <div className="text-center py-6 text-gray-500 text-sm">
                                        <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p>Sin modelos</p>
                                        <Button size="sm" onClick={() => handleAddModel(brand.id, brand)} className="mt-2 bg-blue-600 hover:bg-blue-700">
                                          <Plus className="w-3 h-3 mr-1" />Añadir
                                        </Button>
                                      </div>
                                    </div>
                                }
                                </div>);

                          })}

                            {categoryBrands.length === 0 &&
                          <div className="text-center py-6 text-gray-500">
                                <p className="text-sm">Sin marcas en esta categoría</p>
                                <Button size="sm" onClick={() => handleAddBrand(category.id)} className="mt-2 bg-blue-600 hover:bg-blue-700">
                                  <Plus className="w-3 h-3 mr-1" />Añadir Marca
                                </Button>
                              </div>
                          }
                          </div>
                        }
                      </div>);

                  })}

                  {categories.length === 0 &&
                  <div className="text-center py-12">
                      <Database className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
                      <p className="text-gray-400 mb-4">No hay categorías configuradas</p>
                      <Button onClick={handleAddCategory} className="bg-red-600 hover:bg-red-700">
                        <Plus className="w-4 h-4 mr-2" />Crear Primera Categoría
                      </Button>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WIZARD TAB - REDESIGNED */}
          <TabsContent value="wizard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pasos del Wizard */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-red-500" />
                    Pasos Habilitados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {wizardConfig && Object.entries(wizardConfig.steps_enabled || {}).map(([key, enabled]) =>
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    enabled ?
                    "bg-red-600/20 border-red-600/50 text-white" :
                    "bg-black/20 border-white/10 text-gray-300 hover:bg-white/5"}`
                    }>

                      <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        steps_enabled: {
                          ...wizardConfig.steps_enabled,
                          [key]: e.target.checked
                        }
                      })}
                      className="hidden" />

                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    enabled ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                        {enabled && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className="font-medium capitalize flex-1">{key.replace('_', ' ')}</span>
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Campos de Cliente Requeridos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500" />
                    Campos de Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {wizardConfig && Object.entries(wizardConfig.customer_fields_required || {}).map(([key, required]) =>
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    required ?
                    "bg-blue-600/20 border-blue-600/50 text-white" :
                    "bg-black/20 border-white/10 text-gray-300 hover:bg-white/5"}`
                    }>

                      <input
                      type="checkbox"
                      checked={required}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        customer_fields_required: {
                          ...wizardConfig.customer_fields_required,
                          [key]: e.target.checked
                        }
                      })}
                      className="hidden" />

                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    required ? "bg-blue-600 border-blue-600" : "border-gray-500"}`
                    }>
                        {required && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className="font-medium capitalize flex-1">{key.replace('_', ' ')}</span>
                      <Badge className="text-xs">
                        {required ? "Requerido" : "Opcional"}
                      </Badge>
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Configuración de Fotos/Videos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-red-500" />
                    Fotos y Videos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Máximo de Archivos</label>
                    <Input
                      type="number"
                      value={wizardConfig?.media_config?.max_files || 10}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        media_config: {
                          ...wizardConfig.media_config,
                          max_files: parseInt(e.target.value)
                        }
                      })}
                      className="bg-black/40 border-white/15 text-white"
                      min="1"
                      max="50" />

                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Tamaño Máximo (MB)</label>
                    <Input
                      type="number"
                      value={wizardConfig?.media_config?.max_size_mb || 10}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        media_config: {
                          ...wizardConfig.media_config,
                          max_size_mb: parseInt(e.target.value)
                        }
                      })}
                      className="bg-black/40 border-white/15 text-white"
                      min="1"
                      max="100" />

                  </div>
                  <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wizardConfig?.media_config?.allow_video || false}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        media_config: {
                          ...wizardConfig.media_config,
                          allow_video: e.target.checked
                        }
                      })}
                      className="hidden" />

                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    wizardConfig?.media_config?.allow_video ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                      {wizardConfig?.media_config?.allow_video && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-white text-sm">Permitir videos</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-black/30 border border-white/10 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wizardConfig?.media_config?.camera_first || false}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        media_config: {
                          ...wizardConfig.media_config,
                          camera_first: e.target.checked
                        }
                      })}
                      className="hidden" />

                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    wizardConfig?.media_config?.camera_first ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                      {wizardConfig?.media_config?.camera_first && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-white text-sm">Cámara como opción principal</span>
                  </label>
                </CardContent>
              </Card>

              {/* Seguridad del Dispositivo */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-500" />
                    Seguridad del Dispositivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  { key: "pin_required", label: "PIN requerido" },
                  { key: "password_required", label: "Contraseña requerida" },
                  { key: "pattern_enabled", label: "Patrón habilitado" },
                  { key: "encrypt_data", label: "Cifrar datos sensibles" }].
                  map((item) =>
                  <label
                    key={item.key}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    wizardConfig?.security_config?.[item.key] ?
                    "bg-amber-600/20 border-amber-600/50 text-white" :
                    "bg-black/20 border-white/10 text-gray-300 hover:bg-white/5"}`
                    }>

                      <input
                      type="checkbox"
                      checked={wizardConfig?.security_config?.[item.key] || false}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        security_config: {
                          ...wizardConfig.security_config,
                          [item.key]: e.target.checked
                        }
                      })}
                      className="hidden" />

                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    wizardConfig?.security_config?.[item.key] ? "bg-amber-600 border-amber-600" : "border-gray-500"}`
                    }>
                        {wizardConfig?.security_config?.[item.key] && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className="font-medium flex-1">{item.label}</span>
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Opciones Generales */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-red-500" />
                    Comportamiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={wizardConfig?.auto_send_email || false}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        auto_send_email: e.target.checked
                      })}
                      className="hidden" />

                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    wizardConfig?.auto_send_email ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                      {wizardConfig?.auto_send_email && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <Mail className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium flex-1">Enviar email automáticamente</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={wizardConfig?.auto_assign || false}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        auto_assign: e.target.checked
                      })}
                      className="hidden" />

                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    wizardConfig?.auto_assign ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                      {wizardConfig?.auto_assign && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <UserCircle className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium flex-1">Auto-asignar al creador</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={wizardConfig?.customer_search_enabled || false}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        customer_search_enabled: e.target.checked
                      })}
                      className="hidden" />

                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    wizardConfig?.customer_search_enabled ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                      {wizardConfig?.customer_search_enabled && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <Search className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-medium flex-1">Búsqueda de clientes</span>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input
                      type="checkbox"
                      checked={wizardConfig?.device_auto_family || false}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        device_auto_family: e.target.checked
                      })}
                      className="hidden" />

                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    wizardConfig?.device_auto_family ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                      {wizardConfig?.device_auto_family && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <Smartphone className="w-5 h-5 text-emerald-400" />
                    <span className="text-white font-medium flex-1">Inferir familia automáticamente</span>
                  </label>
                </CardContent>
              </Card>

              {/* Estado Inicial */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-500" />
                    Estado y Flujo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Estado Inicial de Órdenes</label>
                    <select
                      value={wizardConfig?.default_status || "intake"}
                      onChange={(e) => setWizardConfig({
                        ...wizardConfig,
                        default_status: e.target.value
                      })}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white">

                      <option value="intake">Recepción</option>
                      <option value="diagnosing">Diagnóstico</option>
                      <option value="awaiting_approval">Esperando Aprobación</option>
                      <option value="in_progress">En Reparación</option>
                    </select>
                  </div>
                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4">
                    <p className="text-blue-300 text-xs">
                      💡 Las órdenes nuevas se crearán con este estado inicial
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Presets de Problemas */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-red-500" />
                      Presets de Problemas Comunes
                    </CardTitle>
                    <Button
                      onClick={handleAddPreset}
                      size="sm"
                      className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900">

                      <Plus className="w-4 h-4 mr-1" />
                      Añadir Preset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {wizardConfig && (wizardConfig.problem_presets || []).length > 0 ?
                    wizardConfig.problem_presets.map((preset, i) =>
                    <div
                      key={i}
                      className="flex items-start justify-between bg-black/30 border border-white/10 rounded-xl p-4 hover:border-red-600/50 transition-all group">

                          <div className="flex-1 min-w-0 mr-3">
                            <div className="text-white font-medium text-sm mb-1 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                                <Wrench className="w-4 h-4 text-red-400" />
                              </div>
                              {preset.label}
                            </div>
                            <p className="text-gray-400 text-xs line-clamp-2">{preset.text}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPreset(i)}
                          className="border-white/15 hover:bg-white/10 h-8 w-8 p-0">

                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePreset(i)}
                          className="border-red-600/50 text-red-400 hover:bg-red-600/20 h-8 w-8 p-0">

                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                    ) :

                    <div className="col-span-1 md:col-span-2 text-center py-12">
                        <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
                        <p className="text-gray-400 mb-4">No hay presets configurados</p>
                        <Button
                        onClick={handleAddPreset}
                        className="bg-red-600 hover:bg-red-700">

                          <Plus className="w-4 h-4 mr-2" />
                          Crear Primer Preset
                        </Button>
                      </div>
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botón de Guardar - Full Width */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={saveWizardConfig}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 px-8 h-12 text-lg shadow-[0_8px_32px_rgba(220,38,38,0.4)] w-full max-w-sm">

                {loading ?
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando...
                  </> :

                <>
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Configuración del Wizard
                  </>
                }
              </Button>
            </div>
          </TabsContent>

          {/* USERS TAB - REDESIGNED COMPLETO */}
          <TabsContent value="users" className="space-y-6">
            {/* Grid Principal */}
            <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-white flex items-center gap-3 text-2xl mb-2">
                      <Users className="w-7 h-7 text-red-500" />
                      Gestión de Usuarios
                    </CardTitle>
                    <p className="text-gray-400 text-sm">Administra usuarios, roles, permisos y credenciales del sistema</p>
                  </div>
                  <Button
                    onClick={() => setEditingUser({
                      full_name: "",
                      email: "",
                      role: "technician",
                      employee_code: "",
                      pin: "",
                      position: "",
                      phone: "",
                      hourly_rate: 0,
                      active: true,
                      permissions: {
                        create_orders: true,
                        process_sales: true,
                        view_reports: false,
                        view_financials: false,
                        manage_inventory: false,
                        manage_employees: false,
                        manage_cash_drawer: false,
                        apply_discounts: false,
                        process_refunds: false,
                        edit_time_entries: false
                      }
                    })}
                    className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 shadow-[0_4px_16px_rgba(220,38,38,0.4)] whitespace-nowrap">

                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Usuario
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Búsqueda */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre, email o código de empleado..."
                    value={searchUsers}
                    onChange={(e) => setSearchUsers(e.target.value)}
                    className="pl-12 bg-black/40 border-white/15 text-white h-12 text-base" />

                </div>

                {/* Grid de usuarios */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {loading ?
                  <div className="col-span-full flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                    </div> :
                  filteredUsers.length === 0 ?
                  <div className="col-span-full text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
                      <p className="text-gray-400 mb-4">
                        {searchUsers ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                      </p>
                      {!searchUsers &&
                    <Button
                      onClick={() => setEditingUser({
                        full_name: "",
                        email: "",
                        role: "technician",
                        employee_code: "",
                        pin: "",
                        position: "",
                        phone: "",
                        hourly_rate: 0,
                        active: true,
                        permissions: {
                          create_orders: true,
                          process_sales: true,
                          view_reports: false,
                          view_financials: false,
                          manage_inventory: false,
                          manage_employees: false,
                          manage_cash_drawer: false,
                          apply_discounts: false,
                          process_refunds: false,
                          edit_time_entries: false
                        }
                      })}
                      className="bg-red-600 hover:bg-red-700">

                          <Plus className="w-4 h-4 mr-2" />
                          Crear Primer Usuario
                        </Button>
                    }
                    </div> :

                  filteredUsers.map((user) =>
                  <div
                    key={user.id}
                    className="group bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-red-600/50 transition-all hover:shadow-[0_8px_32px_rgba(220,38,38,0.2)]">

                        <div className="flex items-start gap-4 mb-4">
                          {/* Avatar */}
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-[0_4px_16px_rgba(220,38,38,0.4)] group-hover:scale-110 transition-transform flex-shrink-0">
                            <UserCircle className="w-10 h-10 text-white" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-bold text-lg truncate mb-1">
                              {user.full_name || "Sin nombre"}
                            </h3>
                            <p className="text-gray-400 text-sm truncate mb-1">{user.email}</p>
                            <p className="text-gray-500 text-xs truncate">
                              {user.employee_code ? `Código: ${user.employee_code}` : "Sin código"}
                              {user.position ? ` • ${user.position}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/10">
                          <Badge className={
                      user.role === "admin" ? "bg-red-600/20 text-red-300 border-red-600/30" :
                      user.role === "manager" ? "bg-blue-600/20 text-blue-300 border-blue-600/30" :
                      user.role === "technician" ? "bg-purple-600/20 text-purple-300 border-purple-600/30" :
                      "bg-gray-600/20 text-gray-300 border-gray-600/30"
                      }>
                            {user.role === "admin" ? "Admin" :
                        user.role === "manager" ? "Manager" :
                        user.role === "technician" ? "Técnico" :
                        user.role || "Usuario"}
                          </Badge>
                          <Badge className={
                      user.active ?
                      "bg-green-600/20 text-green-300 border-green-600/30" :
                      "bg-gray-600/20 text-gray-300 border-gray-600/30"
                      }>
                            {user.active ? "✓ Activo" : "✗ Inactivo"}
                          </Badge>
                          {user.pin &&
                      <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30">
                              🔐 PIN configurado
                            </Badge>
                      }
                        </div>

                        {/* Info adicional */}
                        <div className="space-y-2 mb-4 text-xs">
                          {user.phone &&
                      <div className="flex items-center gap-2 text-gray-400">
                              <Smartphone className="w-3 h-3" />
                              <span>{user.phone}</span>
                            </div>
                      }
                          {user.hourly_rate > 0 &&
                      <div className="flex items-center gap-2 text-gray-400">
                              <DollarSign className="w-3 h-3" />
                              <span>${user.hourly_rate}/hr</span>
                            </div>
                      }
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(user)}
                            className="flex-1 border-white/15 text-white hover:bg-white/10">
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(user)}
                            className={user.active ? "border-amber-600/50 text-amber-400 hover:bg-amber-600/20 px-3" : "border-green-600/50 text-green-400 hover:bg-green-600/20 px-3"}>
                            {user.active ? <Lock className="w-4 h-4" /> : <Key className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(user)}
                            disabled={loading}
                            className="border-red-600/50 text-red-400 hover:bg-red-600/20 px-3">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                  )
                  }
                </div>
              </CardContent>
            </Card>

            {/* Información de roles */}
            <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  Guía de Roles del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Admin */}
                  <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-5 hover:border-red-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-400" />
                      </div>
                      <h4 className="text-red-300 font-bold text-lg">Admin</h4>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Acceso completo al sistema. Puede gestionar usuarios, configuración, ver finanzas y modificar cualquier aspecto del negocio.
                    </p>
                  </div>

                  {/* Manager */}
                  <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-5 hover:border-blue-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-blue-400" />
                      </div>
                      <h4 className="text-blue-300 font-bold text-lg">Manager</h4>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Supervisión operativa. Acceso a reportes, gestión de inventario, finanzas y supervisión de órdenes de trabajo.
                    </p>
                  </div>

                  {/* Técnico */}
                  <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-5 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-purple-400" />
                      </div>
                      <h4 className="text-purple-300 font-bold text-lg">Técnico</h4>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Personal de reparación. Puede crear órdenes, actualizar estados y trabajar en reparaciones asignadas.
                    </p>
                  </div>

                  {/* Cajero */}
                  <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-5 hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h4 className="text-emerald-300 font-bold text-lg">Cajero</h4>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Acceso al POS, procesamiento de ventas y gestión de caja registradora.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LINKS TAB */}
          <TabsContent value="links" className="space-y-4">
            <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <ExternalLink className="w-6 h-6 text-red-500" />
                    Enlaces Externos
                  </CardTitle>
                  <Button
                    onClick={() => setEditingLink({
                      name: "",
                      url: "",
                      description: "",
                      category: "other",
                      icon: "🔗",
                      active: true,
                      opens_in: "new_tab"
                    })}
                    className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900">

                    <Plus className="w-4 h-4 mr-2" />Añadir Enlace
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Buscar enlaces..."
                    value={searchLinks}
                    onChange={(e) => setSearchLinks(e.target.value)}
                    className="pl-10 bg-black/40 border-white/15 text-white" />

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredLinks.map((link) =>
                  <div key={link.id} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-red-600/50 transition-all group">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl flex-shrink-0">{link.icon || "🔗"}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold truncate">{link.name}</h3>
                          <p className="text-gray-400 text-sm truncate">{link.url}</p>
                          {link.description &&
                        <p className="text-gray-500 text-xs mt-1 truncate">{link.description}</p>
                        }
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30 text-xs whitespace-nowrap">
                              {link.category.replace(/_/g, ' ')}
                            </Badge>
                            <Badge className={link.active ? "bg-green-600/20 text-green-300 border-green-600/30 text-xs whitespace-nowrap" : "bg-gray-600/20 text-gray-300 border-gray-600/30 text-xs whitespace-nowrap"}>
                              {link.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingLink(link)}
                          className="border-white/15 text-white hover:bg-white/10">

                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteLink(link)}
                          className="border-red-600/50 text-red-400 hover:bg-red-600/20">

                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredLinks.length === 0 &&
                  <div className="col-span-1 lg:col-span-2 text-center py-12">
                      <ExternalLink className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-50" />
                      <p className="text-gray-400">{searchLinks ? "Sin resultados" : "No hay enlaces configurados"}</p>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVENTORY TAB - REDESIGNED */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gestión de Stock */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-red-500" />
                    Gestión de Stock
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Stock Mínimo Global</label>
                    <Input
                      type="number"
                      defaultValue="5"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="5" />

                    <p className="text-xs text-gray-500 mt-1">Nivel de stock que genera alertas por defecto</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Stock Crítico</label>
                    <Input
                      type="number"
                      defaultValue="2"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="2" />

                    <p className="text-xs text-gray-500 mt-1">Nivel crítico que genera alertas urgentes</p>
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Auto-descontar stock</span>
                      <p className="text-xs text-gray-400 mt-1">Descontar automáticamente al procesar ventas</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Permitir stock negativo</span>
                      <p className="text-xs text-gray-400 mt-1">Útil para pre-órdenes</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Configuración de Precios */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-red-500" />
                    Precios y Márgenes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Margen de Ganancia (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      defaultValue="40"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="40" />

                    <p className="text-xs text-gray-500 mt-1">Margen por defecto para nuevos productos</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Redondeo de Precios</label>
                    <select
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                      defaultValue="none">

                      <option value="none">Sin redondeo</option>
                      <option value="0.99">Terminar en .99</option>
                      <option value="0.95">Terminar en .95</option>
                      <option value="nearest">Al dólar más cercano</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Aplicar IVU a productos</span>
                      <p className="text-xs text-gray-400 mt-1">11.5% de impuesto por defecto</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Mostrar precio con IVU</span>
                      <p className="text-xs text-gray-400 mt-1">Incluir IVU en precio de etiqueta</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Códigos de Barras y SKU */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-red-500" />
                    Códigos y Seguimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Formato de SKU</label>
                    <select
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                      defaultValue="auto">

                      <option value="auto">Auto-generado</option>
                      <option value="manual">Manual</option>
                      <option value="barcode">Basado en código de barras</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Prefijo de SKU</label>
                    <Input
                      defaultValue="PRD-"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="PRD-" />

                    <p className="text-xs text-gray-500 mt-1">Ejemplo: PRD-0001, PRD-0002...</p>
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Requerir código de barras</span>
                      <p className="text-xs text-gray-400 mt-1">Obligatorio al crear productos</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Habilitar escáner</span>
                      <p className="text-xs text-gray-400 mt-1">Usar cámara como escáner de códigos</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Alertas y Notificaciones */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-500" />
                    Alertas de Inventario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  { key: "low_stock", label: "Stock bajo", description: "Notificar cuando un producto llegue al mínimo" },
                  { key: "out_of_stock", label: "Agotado", description: "Alerta cuando stock llegue a cero" },
                  { key: "expiring_soon", label: "Por vencer", description: "Productos próximos a caducar" },
                  { key: "price_changes", label: "Cambios de precio", description: "Notificar actualizaciones de precios" }].
                  map((alert) =>
                  <label
                    key={alert.key}
                    className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                      <input type="checkbox" defaultChecked className="hidden" />
                      <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium">{alert.label}</span>
                        <p className="text-xs text-gray-400 mt-1">{alert.description}</p>
                      </div>
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Valuación y Contabilidad */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-500" />
                    Valuación de Inventario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Método de Valuación</label>
                    <select
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                      defaultValue="fifo">

                      <option value="fifo">FIFO (Primero en entrar, primero en salir)</option>
                      <option value="lifo">LIFO (Último en entrar, primero en salir)</option>
                      <option value="average">Costo Promedio</option>
                      <option value="specific">Identificación Específica</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Método contable para calcular costo de ventas</p>
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Rastrear movimientos</span>
                      <p className="text-xs text-gray-400 mt-1">Registrar historial de movimientos de inventario</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Seguimiento por lote</span>
                      <p className="text-xs text-gray-400 mt-1">Para productos con fecha de caducidad</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Categorías de Productos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-red-500" />
                    Categorías de Productos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-black/20 border border-white/10 rounded-xl p-3 max-h-64 overflow-y-auto scrollbar-thin">
                    {["Pantallas", "Baterías", "Cargadores", "Cables", "Cases", "Accesorios", "Herramientas", "Otros"].map((cat, i) =>
                    <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                            <Package className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="text-white font-medium">{cat}</span>
                        </div>
                        <Badge className="bg-green-600/20 text-green-300 border-green-600/30 text-xs">
                          Activo
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm">

                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Categoría
                  </Button>
                </CardContent>
              </Card>

              {/* Proveedores */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-red-500" />
                      Proveedores Predeterminados
                    </CardTitle>
                    <Button
                      className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
                      size="sm">

                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Proveedor
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                    { name: "TechParts PR", email: "orders@techparts.pr", phone: "(787) 555-0100", terms: "NET-30" },
                    { name: "Mobile Solutions", email: "sales@mobilesolutions.com", phone: "(787) 555-0200", terms: "NET-15" }].
                    map((supplier, i) =>
                    <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-4 hover:border-red-600/50 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-white font-bold mb-1">{supplier.name}</h4>
                            <p className="text-gray-400 text-xs">{supplier.email}</p>
                            <p className="text-400 text-xs">{supplier.phone}</p>
                          </div>
                          <Badge className="bg-emerald-600/20 text-emerald-300 border-emerald-600/30 text-xs">
                            {supplier.terms}
                          </Badge>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-white/10">
                          <Button size="sm" variant="outline" className="flex-1 border-white/15 text-white hover:bg-white/10">
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-600/50 text-red-400 hover:bg-red-600/20 px-3">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Configuración de Órdenes de Compra */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-red-500" />
                    Órdenes de Compra
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Formato de PO #</label>
                    <Input
                      defaultValue="PO-{YYYY}-{####}"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="PO-{YYYY}-{####}" />

                    <p className="text-xs text-gray-500 mt-1">Ej: PO-2025-0001</p>
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Requerir aprobación</span>
                      <p className="text-xs text-gray-400 mt-1">POs sobre $500 requieren aprobación</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Actualizar costos automáticamente</span>
                      <p className="text-xs text-gray-400 mt-1">Al recibir orden de compra</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Reportes de Inventario */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    Reportes y Análisis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Reporte semanal automático</span>
                      <p className="text-xs text-gray-400 mt-1">Enviar resumen cada lunes</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-red-600 bg-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Análisis de rotación</span>
                      <p className="text-xs text-gray-400 mt-1">Mostrar productos de baja rotación</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Sugerencias de reorden</span>
                      <p className="text-xs text-gray-400 mt-1">IA sugiere cuándo reordenar</p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => toast.success("✅ Configuración de inventario guardada")}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 px-8 h-12 text-lg shadow-[0_8px_32px_rgba(220,38,38,0.4)] w-full max-w-sm">

                {loading ?
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando...
                  </> :

                <>
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Configuración de Inventario
                  </>
                }
              </Button>
            </div>
          </TabsContent>

          {/* FINANCIAL TAB - REDESIGNED */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Métodos de Pago */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-red-500" />
                    Métodos de Pago Habilitados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  {
                    key: "cash",
                    label: "Efectivo",
                    icon: Wallet,
                    color: "emerald",
                    description: "Aceptar pagos en efectivo"
                  },
                  {
                    key: "card",
                    label: "Tarjeta de Crédito/Débito",
                    icon: CreditCard,
                    color: "blue",
                    description: "Terminal de tarjetas"
                  },
                  {
                    key: "ath_movil",
                    label: "ATH Móvil",
                    icon: Smartphone,
                    color: "orange",
                    description: "Pagos móviles ATH"
                  },
                  {
                    key: "bank_transfer",
                    label: "Transferencia Bancaria",
                    icon: Landmark,
                    color: "purple",
                    description: "Transferencias directas"
                  },
                  {
                    key: "check",
                    label: "Cheque",
                    icon: FileText,
                    color: "gray",
                    description: "Aceptar cheques"
                  }].
                  map((method) => {
                    const Icon = method.icon;
                    const isEnabled = paymentMethods[method.key];
                    return (
                      <label
                        key={method.key}
                        className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => setPaymentMethods({
                            ...paymentMethods,
                            [method.key]: e.target.checked
                          })}
                          className="hidden" />

                        <div className={`w-6 h-6 rounded-lg border-2 ${isEnabled ? "bg-red-600 border-red-600" : "border-gray-500"} flex items-center justify-center`}>
                          {isEnabled && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <Icon className={`w-5 h-5 text-${method.color}-400`} />
                        <div className="flex-1">
                          <span className="text-white font-medium">{method.label}</span>
                          <p className="text-xs text-gray-400 mt-0.5">{method.description}</p>
                        </div>
                      </label>);

                  })}
                </CardContent>
              </Card>

              {/* Configuración de Impuestos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-red-500" />
                    Configuración de Impuestos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Tasa de IVU (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue="11.5"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="11.5" />

                    <p className="text-xs text-gray-500 mt-1">Tasa de impuesto aplicada a ventas</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Número de Registro Mercantil</label>
                    <Input
                      defaultValue=""
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="123-45-6789" />

                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Incluir IVU en precios</span>
                      <p className="text-xs text-gray-400 mt-0.5">Mostrar precios con impuesto incluido</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Clientes exentos de IVU</span>
                      <p className="text-xs text-gray-400 mt-0.5">Permitir ventas sin IVU para clientes especiales</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Configuración de Caja */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-red-500" />
                    Gestión de Caja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Fondo Inicial Sugerido ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue="200.00"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="200.00" />

                    <p className="text-xs text-gray-500 mt-1">Cantidad recomendada para abrir caja</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Límite de Efectivo en Caja ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue="2000.00"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="2000.00" />

                    <p className="text-xs text-gray-500 mt-1">Alerta cuando se exceda este monto</p>
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Requerir conteo al cerrar</span>
                      <p className="text-xs text-gray-400 mt-0.5">Contar efectivo físicamente al cierre</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Enviar reporte de cierre por email</span>
                      <p className="text-xs text-gray-400 mt-0.5">Email automático a administradores</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Configuración de Recibos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-red-500" />
                    Recibos y Facturación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Formato de Número de Recibo</label>
                    <Input
                      defaultValue="REC-{YYYY}-{####}"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="REC-{YYYY}-{####}" />

                    <p className="text-xs text-gray-500 mt-1">Ejemplo: REC-2025-0001</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Mensaje en Pie de Recibo</label>
                    <textarea
                      defaultValue="¡Gracias por su compra! Garantía de 90 días en reparaciones."
                      rows={3}
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none" />

                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Imprimir automáticamente</span>
                      <p className="text-xs text-gray-400 mt-0.5">Imprimir recibo después de cada venta</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Enviar recibo por email</span>
                      <p className="text-xs text-gray-400 mt-0.5">Si el cliente tiene email registrado</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Categorías de Gastos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    Categorías de Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-black/20 border border-white/10 rounded-xl p-3 max-h-64 overflow-y-auto scrollbar-thin">
                    {[
                    { key: "rent", label: "Renta", color: "red" },
                    { key: "utilities", label: "Utilidades (Luz, Agua, Internet)", color: "yellow" },
                    { key: "supplies", label: "Suministros", color: "blue" },
                    { key: "payroll", label: "Nómina", color: "purple" },
                    { key: "parts", label: "Piezas/Inventario", color: "emerald" },
                    { key: "maintenance", label: "Mantenimiento", color: "orange" },
                    { key: "insurance", label: "Seguros", color: "indigo" },
                    { key: "taxes", label: "Impuestos", color: "red" },
                    { key: "other_expense", label: "Otros Gastos", color: "gray" }].
                    map((cat, i) =>
                    <div key={cat.key} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-${cat.color}-600/20 border border-${cat.color}-500/30 flex items-center justify-center`}>
                            <DollarSign className={`w-4 h-4 text-${cat.color}-400`} />
                          </div>
                          <span className="text-white font-medium">{cat.label}</span>
                        </div>
                        <Badge className="bg-green-600/20 text-green-300 border-green-600/30 text-xs">
                          Activo
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm">

                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Categoría
                  </Button>
                </CardContent>
              </Card>

              {/* Términos de Pago */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-red-500" />
                    Términos de Pago y Crédito
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Términos de Pago por Defecto</label>
                    <select
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                      defaultValue="NET-30">

                      <option value="IMMEDIATE">Inmediato</option>
                      <option value="NET-15">NET-15 (15 días)</option>
                      <option value="NET-30">NET-30 (30 días)</option>
                      <option value="NET-45">NET-45 (45 días)</option>
                      <option value="NET-60">NET-60 (60 días)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Monto Mínimo para Depósito ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue="50.00"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="50.00" />

                    <p className="text-xs text-gray-500 mt-1">Requerir depósito si el total excede este monto</p>
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Porcentaje de Depósito Sugerido (%)</label>
                    <Input
                      type="number"
                      step="1"
                      defaultValue="50"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="50" />

                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Permitir pagos parciales</span>
                      <p className="text-xs text-gray-400 mt-0.5">Clientes pueden pagar en múltiples abonos</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Reportes Financieros */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-red-500" />
                    Reportes Financieros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Reporte diario automático</span>
                      <p className="text-xs text-gray-400 mt-0.5">Enviar resumen cada noche a las 11 PM</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Reporte semanal</span>
                      <p className="text-xs text-gray-400 mt-0.5">Resumen cada lunes por la mañana</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Reporte mensual</span>
                      <p className="text-xs text-gray-400 mt-0.5">Resumen el primer día de cada mes</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Incluir gráficas en reportes</span>
                      <p className="text-xs text-gray-400 mt-0.5">Agregar visualizaciones de datos</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Alertas Financieras */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-500" />
                    Alertas Financieras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Meta Diaria de Ventas ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue="1000.00"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="1000.00" />

                    <p className="text-xs text-gray-500 mt-1">Notificar si no se alcanza</p>
                  </div>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Alerta de gastos altos</span>
                      <p className="text-xs text-gray-400 mt-0.5">Si gastos {' > '} 30% de ingresos del día</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Alerta de efectivo alto en caja</span>
                      <p className="text-xs text-gray-400 mt-0.5">Notificar cuando se exceda el límite</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Alerta de descuadre en caja</span>
                      <p className="text-xs text-gray-400 mt-0.5">Si diferencia {' > '} $10 al cerrar</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Moneda y Regional */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-red-500" />
                    Configuración Regional y Moneda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Moneda Principal</label>
                      <select
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                        defaultValue="USD">

                        <option value="USD">USD - Dólar Estadounidense ($)</option>
                        <option value="EUR">EUR - Euro (€)</option>
                        <option value="GBP">GBP - Libra Esterlina (£)</option>
                        <option value="MXN">MXN - Peso Mexicano ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Formato de Número</label>
                      <select
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                        defaultValue="en-US">

                        <option value="en-US">1,234.56 (Estados Unidos)</option>
                        <option value="es-ES">1.234,56 (España)</option>
                        <option value="de-DE">1.234,56 (Alemania)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Zona Horaria</label>
                      <select
                        className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                        defaultValue="America/Puerto_Rico">

                        <option value="America/Puerto_Rico">Puerto Rico (AST)</option>
                        <option value="America/New_York">Nueva York (EST)</option>
                        <option value="America/Los_Angeles">Los Ángeles (PST)</option>
                        <option value="America/Chicago">Chicago (CST)</option>
                        <option value="America/Mexico_City">Ciudad de México (CST)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Integraciones Contables */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-red-500" />
                    Integraciones Contables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                    { name: "QuickBooks", status: "available", color: "emerald" },
                    { name: "Xero", status: "available", color: "blue" },
                    { name: "FreshBooks", status: "available", color: "orange" }].
                    map((integration) =>
                    <div key={integration.name} className="bg-black/30 border border-white/10 rounded-xl p-5 hover:border-red-600/50 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-bold text-lg mb-1">{integration.name}</h4>
                            <Badge className={`bg-${integration.color}-600/20 text-${integration.color}-300 border-${integration.color}-600/30 text-xs`}>
                              {integration.status === "available" ? "Disponible" : "Conectado"}
                            </Badge>
                          </div>
                          <Database className="w-8 h-8 text-gray-600" />
                        </div>
                        <p className="text-gray-400 text-xs mb-4">
                          Sincroniza ventas, gastos y reportes automáticamente
                        </p>
                        <Button
                        variant="outline"
                        className="w-full border-white/15 text-white hover:bg-white/10"
                        size="sm">

                          {integration.status === "available" ? "Conectar" : "Configurar"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={savePaymentMethods} // Updated to call savePaymentMethods
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 px-8 h-12 text-lg shadow-[0_8px_32px_rgba(220,38,38,0.4)] w-full max-w-sm">

                {loading ?
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando...
                  </> :

                <>
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Métodos de Pago
                  </>
                }
              </Button>
            </div>
          </TabsContent>

          {/* NOTIFICATIONS TAB - REDESIGNED */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuración de Email */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-red-500" />
                    Notificaciones por Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Nombre del Remitente</label>
                      <Input
                        defaultValue="911 SmartFix"
                        className="bg-black/40 border-white/15 text-white"
                        placeholder="911 SmartFix" />

                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Email de Respuesta</label>
                      <Input
                        type="email"
                        defaultValue="info@911smartfix.com"
                        className="bg-black/40 border-white/15 text-white"
                        placeholder="info@911smartfix.com" />

                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      Eventos de Email Automático
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                      { key: "order_created", label: "Orden Creada", description: "Enviar confirmación al cliente", color: "blue" },
                      { key: "order_status_changed", label: "Cambio de Estado", description: "Notificar cambios en el estado", color: "purple" },
                      { key: "order_ready", label: "Orden Lista", description: "Equipo listo para recoger", color: "green" },
                      { key: "payment_received", label: "Pago Recibido", description: "Confirmación de pago", color: "emerald" },
                      { key: "order_delayed", label: "Orden Retrasada", description: "Notificar retrasos", color: "yellow" },
                      { key: "order_completed", label: "Orden Completada", description: "Finalización del servicio", color: "green" }].
                      map((event) =>
                      <label
                        key={event.key}
                        className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                          <input type="checkbox" defaultChecked className="hidden" />
                          <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <span className="text-white font-medium block">{event.label}</span>
                            <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-bold mb-3">Plantilla de Email</h4>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                      <div>
                        <label className="text-gray-300 text-xs mb-1 block">Encabezado</label>
                        <textarea
                          defaultValue="Gracias por confiar en 911 SmartFix"
                          rows={2}
                          className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none" />

                      </div>
                      <div>
                        <label className="text-gray-300 text-xs mb-1 block">Pie de página</label>
                        <textarea
                          defaultValue="Servicio de calidad garantizado | 787-555-0100"
                          rows={2}
                          className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none" />

                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SMS/WhatsApp */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-red-500" />
                    SMS y WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Habilitar SMS</span>
                      <p className="text-xs text-gray-400 mt-0.5">Enviar notificaciones por SMS</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">WhatsApp Business</span>
                      <p className="text-xs text-gray-400 mt-0.5">Integración con WhatsApp</p>
                    </div>
                  </label>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Número de WhatsApp Business</label>
                    <Input
                      type="tel"
                      defaultValue="+1 787 555 0100"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="+1 787 555 0100" />

                  </div>

                  <div>
                    <h4 className="text-white font-semibold mb-2 text-sm">Eventos por SMS/WhatsApp</h4>
                    <div className="space-y-2">
                      {[
                      { key: "order_ready_sms", label: "Orden Lista", icon: "✅" },
                      { key: "payment_reminder_sms", label: "Recordatorio de Pago", icon: "💰" },
                      { key: "urgent_updates_sms", label: "Actualizaciones Urgentes", icon: "🚨" }].
                      map((event) =>
                      <label
                        key={event.key}
                        className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                          <input type="checkbox" defaultChecked={event.key === "order_ready_sms"} className="hidden" />
                          <div className={`w-5 h-5 rounded border-2 ${event.key === "order_ready_sms" ? "bg-red-600 border-red-600" : "border-gray-500"} flex items-center justify-center`}>
                            {event.key === "order_ready_sms" && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm mr-2">{event.icon}</span>
                          <span className="text-white text-sm">{event.label}</span>
                        </label>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notificaciones In-App */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-500" />
                    Notificaciones In-App
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  { key: "new_order", label: "Nueva Orden", description: "Notificar al equipo" },
                  { key: "order_assigned", label: "Orden Asignada", description: "Notificar al técnico" },
                  { key: "status_change", label: "Cambio de Estado", description: "Actualización de orden" },
                  { key: "low_stock", label: "Stock Bajo", description: "Alertas de inventario" },
                  { key: "payment_received", label: "Pago Recibido", description: "Confirmación de pago" },
                  { key: "daily_summary", label: "Resumen Diario", description: "Reporte del día" }].
                  map((notif) =>
                  <label
                    key={notif.key}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                      <input type="checkbox" defaultChecked className="hidden" />
                      <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium text-sm block">{notif.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{notif.description}</p>
                      </div>
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Recordatorios Automáticos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-500" />
                    Recordatorios Automáticos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-white font-semibold mb-3 text-sm">Recordatorios para Clientes</h4>
                    <div className="space-y-3">
                      <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                          <input type="checkbox" defaultChecked className="hidden" />
                          <div className="w-5 h-5 rounded border-2 bg-red-600 border-red-600 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-white font-medium text-sm">Recordatorio de Recogida</span>
                        </label>
                        <div className="ml-8">
                          <label className="text-gray-400 text-xs mb-1 block">Días después de "Listo"</label>
                          <Input
                            type="number"
                            defaultValue="3"
                            min="1"
                            max="30"
                            className="bg-black/40 border-white/15 text-white text-sm w-24" />

                        </div>
                      </div>

                      <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                        <label className="flex items-center gap-3 mb-3 cursor-pointer">
                          <input type="checkbox" defaultChecked className="hidden" />
                          <div className="w-5 h-5 rounded border-2 bg-red-600 border-red-600 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-white font-medium text-sm">Recordatorio de Pago</span>
                        </label>
                        <div className="ml-8">
                          <label className="text-gray-400 text-xs mb-1 block">Días antes de vencer</label>
                          <Input
                            type="number"
                            defaultValue="2"
                            min="1"
                            max="30"
                            className="bg-black/40 border-white/15 text-white text-sm w-24" />

                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-semibold mb-3 text-sm">Seguimiento Post-Servicio</h4>
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                      <input type="checkbox" className="hidden" />
                      <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium text-sm">Encuesta de Satisfacción</span>
                        <p className="text-xs text-gray-400 mt-0.5">7 días después del servicio</p>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Alertas para el Equipo */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Alertas para el Equipo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  {
                    key: "overdue_orders",
                    label: "Órdenes Vencidas",
                    description: "Alertar órdenes que exceden tiempo estimado",
                    icon: Clock,
                    color: "red"
                  },
                  {
                    key: "unassigned_orders",
                    label: "Órdenes Sin Asignar",
                    description: "Órdenes sin técnico asignado > 1 hora",
                    icon: Users,
                    color: "orange"
                  },
                  {
                    key: "low_stock_alert",
                    label: "Stock Bajo",
                    description: "Productos por debajo del mínimo",
                    icon: Package,
                    color: "yellow"
                  },
                  {
                    key: "high_value_orders",
                    label: "Órdenes de Alto Valor",
                    description: "Órdenes > $500 requieren atención",
                    icon: DollarSign,
                    color: "green"
                  }].
                  map((alert) => {
                    const Icon = alert.icon;
                    return (
                      <label
                        key={alert.key}
                        className="flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                        <input type="checkbox" defaultChecked className="hidden" />
                        <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <Icon className={`w-5 h-5 text-${alert.color}-400 flex-shrink-0 mt-0.5`} />
                        <div className="flex-1">
                          <span className="text-white font-medium text-sm block">{alert.label}</span>
                          <p className="text-xs text-gray-400 mt-0.5">{alert.description}</p>
                        </div>
                      </label>);

                  })}
                </CardContent>
              </Card>

              {/* Notificaciones Push */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    Notificaciones Push
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-600/10 to-purple-800/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-bold">Push Notifications</h4>
                        <p className="text-purple-300 text-xs">Notificaciones del navegador</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="sm">

                      Solicitar Permisos
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                      <input type="checkbox" defaultChecked className="hidden" />
                      <div className="w-5 h-5 rounded border-2 bg-red-600 border-red-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-white text-sm">Sonido de notificación</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                      <input type="checkbox" defaultChecked className="hidden" />
                      <div className="w-5 h-5 rounded border-2 bg-red-600 border-red-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-white text-sm">Mostrar en escritorio</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Configuración de Horarios */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-red-500" />
                    Horarios de Notificación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                      <input type="checkbox" defaultChecked className="hidden" />
                      <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium">Respetar Horario de No Molestar</span>
                        <p className="text-xs text-gray-400 mt-0.5">No enviar notificaciones fuera del horario laboral</p>
                      </div>
                    </label>

                    <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Hora de Inicio</label>
                        <Input
                          type="time"
                          defaultValue="08:00"
                          className="bg-black/40 border-white/15 text-white text-sm" />

                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Hora de Fin</label>
                        <Input
                          type="time"
                          defaultValue="20:00"
                          className="bg-black/40 border-white/15 text-white text-sm" />

                      </div>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <h4 className="text-white font-semibold mb-3 text-sm">Días de la Semana</h4>
                    <div className="flex flex-wrap gap-2">
                      {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day, idx) =>
                      <label key={day} className="cursor-pointer">
                          <input type="checkbox" defaultChecked={idx < 6} className="hidden" />
                          <div className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        idx < 6 ?
                        "bg-red-600 border-red-600 text-white" :
                        "border-gray-500 text-gray-400 hover:border-red-600"}`
                        }>
                            {day}
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => toast.success("✅ Configuración de notificaciones guardada")}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 px-8 h-12 text-lg shadow-[0_8px_32px_rgba(220,38,38,0.4)] w-full max-w-sm">

                {loading ?
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando...
                  </> :

                <>
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Configuración de Notificaciones
                  </>
                }
              </Button>
            </div>
          </TabsContent>

          {/* APPEARANCE - SIMPLIFICADO */}
          <TabsContent value="appearance" className="space-y-4">
            <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Palette className="w-6 h-6 text-red-500" />
                  Tema Visual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-lg">Seleccionar Tema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleThemeChange("dark")}
                      disabled={loading}
                      className={`group relative p-6 rounded-2xl border-2 transition-all ${
                      theme === "dark" ?
                      "bg-gradient-to-br from-slate-900 to-black border-red-500 shadow-[0_8px_32px_rgba(220,38,38,0.4)]" :
                      "bg-black/40 border-white/10 hover:border-white/20"}`
                      }>

                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-white font-bold text-lg mb-1">🌙 Tema Oscuro</h4>
                          <p className="text-gray-400 text-sm">Fondo oscuro profesional</p>
                        </div>
                        {theme === "dark" &&
                        <div className="bg-red-600 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        }
                      </div>
                      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-white/10">
                        <div className="flex gap-2 mb-2">
                          <div className="w-12 h-12 rounded-lg bg-red-600"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-white/20 rounded"></div>
                            <div className="h-3 bg-white/10 rounded w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleThemeChange("light")}
                      disabled={loading}
                      className={`group relative p-6 rounded-2xl border-2 transition-all ${
                      theme === "light" ?
                      "bg-gradient-to-br from-white to-gray-100 border-red-500 shadow-[0_8px_32px_rgba(220,38,38,0.4)]" :
                      "bg-white/5 border-white/10 hover:border-white/20"}`
                      }>

                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className={`font-bold text-lg mb-1 ${theme === "light" ? "text-gray-900" : "text-white"}`}>☀️ Tema Claro</h4>
                          <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>Fondo claro minimalista</p>
                        </div>
                        {theme === "light" &&
                        <div className="bg-red-600 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        }
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                        <div className="flex gap-2 mb-2">
                          <div className="w-12 h-12 rounded-lg bg-red-600"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-300 rounded"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY TAB - REDESIGNED */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Autenticación y Acceso */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-red-500" />
                    Autenticación y Acceso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Longitud Mínima de PIN</label>
                    <select
                      className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                      defaultValue="4">

                      <option value="4">4 dígitos</option>
                      <option value="5">5 dígitos</option>
                      <option value="6">6 dígitos</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Tiempo de Sesión (minutos)</label>
                    <Input
                      type="number"
                      defaultValue="480"
                      min="5"
                      max="1440"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="480" />

                    <p className="text-xs text-gray-500 mt-1">Sesión expira después de este tiempo de inactividad</p>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Intentos Fallidos Permitidos</label>
                    <Input
                      type="number"
                      defaultValue="3"
                      min="1"
                      max="10"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="3" />

                    <p className="text-xs text-gray-500 mt-1">Bloquear temporalmente después de X intentos</p>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Duración de Bloqueo (minutos)</label>
                    <Input
                      type="number"
                      defaultValue="15"
                      min="1"
                      max="60"
                      className="bg-black/40 border-white/15 text-white"
                      placeholder="15" />

                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Requerir PIN al iniciar</span>
                      <p className="text-xs text-gray-400 mt-0.5">Autenticación obligatoria al abrir la app</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Permitir recordar sesión</span>
                      <p className="text-xs text-gray-400 mt-0.5">Mantener sesión activa por 7 días</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Autenticación Biométrica */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-red-500" />
                    Autenticación Biométrica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Habilitar Face ID / Touch ID</span>
                      <p className="text-xs text-gray-400 mt-0.5">Login rápido con biométricos</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Requerir PIN como fallback</span>
                      <p className="text-xs text-gray-400 mt-0.5">PIN obligatorio si falla biométrico</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Permitir múltiples dispositivos</span>
                      <p className="text-xs text-gray-400 mt-0.5">Usuario puede registrar varios dispositivos</p>
                    </div>
                  </label>

                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mt-4">
                    <h4 className="text-blue-300 font-bold text-sm mb-2">Dispositivos Registrados</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">iPhone 15 Pro • Safari</span>
                        <Badge className="bg-green-600/20 text-green-300 border-green-600/30">Activo</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">Samsung Galaxy • Chrome</span>
                        <Badge className="bg-green-600/20 text-green-300 border-green-600/30">Activo</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Políticas de Contraseña */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-red-500" />
                    Políticas de Contraseña
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  {
                    key: "require_uppercase",
                    label: "Requerir mayúsculas",
                    description: "Al menos una letra mayúscula"
                  },
                  {
                    key: "require_lowercase",
                    label: "Requerir minúsculas",
                    description: "Al menos una letra minúscula"
                  },
                  {
                    key: "require_numbers",
                    label: "Requerir números",
                    description: "Al menos un número"
                  },
                  {
                    key: "require_special",
                    label: "Requerir caracteres especiales",
                    description: "Al menos un símbolo (!@#$%)"
                  }].
                  map((policy) =>
                  <label
                    key={policy.key}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                      <input type="checkbox" defaultChecked className="hidden" />
                      <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium text-sm">{policy.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{policy.description}</p>
                      </div>
                    </label>
                  )}

                  <div className="mt-4">
                    <label className="text-gray-300 text-sm mb-2 block">Longitud Mínima de Contraseña</label>
                    <Input
                      type="number"
                      defaultValue="8"
                      min="4"
                      max="32"
                      className="bg-black/40 border-white/15 text-white" />

                  </div>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Caducidad de Contraseña (días)</label>
                    <Input
                      type="number"
                      defaultValue="90"
                      min="0"
                      max="365"
                      className="bg-black/40 border-white/15 text-white" />

                    <p className="text-xs text-gray-500 mt-1">0 = sin caducidad</p>
                  </div>
                </CardContent>
              </Card>

              {/* Auditoría y Logs */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-red-500" />
                    Auditoría y Registros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  {
                    key: "log_logins",
                    label: "Registrar inicios de sesión",
                    description: "Log de todos los logins exitosos y fallidos"
                  },
                  {
                    key: "log_data_changes",
                    label: "Registrar cambios de datos",
                    description: "Auditar modificaciones a órdenes y clientes"
                  },
                  {
                    key: "log_financial",
                    label: "Registrar operaciones financieras",
                    description: "Log completo de ventas y movimientos de caja"
                  },
                  {
                    key: "log_inventory",
                    label: "Registrar cambios de inventario",
                    description: "Rastrear movimientos de stock"
                  },
                  {
                    key: "log_user_actions",
                    label: "Registrar acciones de usuarios",
                    description: "Todas las acciones importantes del equipo"
                  }].
                  map((log) =>
                  <label
                    key={log.key}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                      <input type="checkbox" defaultChecked className="hidden" />
                      <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium text-sm">{log.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{log.description}</p>
                      </div>
                    </label>
                  )}

                  <div className="mt-4">
                    <label className="text-gray-300 text-sm mb-2 block">Retención de Logs (días)</label>
                    <Input
                      type="number"
                      defaultValue="90"
                      min="7"
                      max="365"
                      className="bg-black/40 border-white/15 text-white" />

                    <p className="text-xs text-gray-500 mt-1">Logs más antiguos se eliminan automáticamente</p>
                  </div>
                </CardContent>
              </Card>

              {/* Seguridad de Datos */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    Protección de Datos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Cifrar datos de clientes</span>
                      <p className="text-xs text-gray-400 mt-0.5">Cifrado AES-256 para datos sensibles</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Cifrar PINs de seguridad de equipos</span>
                      <p className="text-xs text-gray-400 mt-0.5">Proteger contraseñas y patrones</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Enmascarar datos en logs</span>
                      <p className="text-xs text-gray-400 mt-0.5">Ocultar info sensible en registros</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Cifrado de comunicaciones</span>
                      <p className="text-xs text-gray-400 mt-0.5">HTTPS obligatorio para todas las conexiones</p>
                    </div>
                  </label>

                  <div className="bg-amber-600/10 border border-amber-500/20 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <h4 className="text-amber-300 font-bold text-sm">Estado de Seguridad</h4>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Cifrado de datos:</span>
                        <span className="text-green-400 font-bold">✓ Activo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Conexión HTTPS:</span>
                        <span className="text-green-400 font-bold">✓ Activo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Nivel de seguridad:</span>
                        <Badge className="bg-green-600/20 text-green-300 border-green-600/30">Alto</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Permisos y Roles */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-red-500" />
                    Control de Acceso por Rol
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-white font-semibold mb-3 text-sm">Restricciones por Defecto</h4>
                    <div className="space-y-2">
                      {[
                      { role: "Administrador", color: "red", access: "Acceso completo sin restricciones" },
                      { role: "Manager", color: "blue", access: "Finanzas, reportes, inventario" },
                      { role: "Técnico", color: "purple", access: "Solo órdenes asignadas" },
                      { role: "Cajero", color: "emerald", access: "Solo POS y caja" }].
                      map((item) =>
                      <div key={item.role} className={`bg-${item.color}-600/10 border border-${item.color}-500/30 rounded-lg p-3`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-${item.color}-300 font-bold text-sm`}>{item.role}</span>
                            <Button size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/10 h-7 px-2 text-xs">
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-gray-400 text-xs">{item.access}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Validar permisos en cada acción</span>
                      <p className="text-xs text-gray-400 mt-0.5">Verificación estricta de permisos</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Restricciones de Acceso */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-red-500" />
                    Restricciones de Acceso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Restringir por IP</span>
                      <p className="text-xs text-gray-400 mt-0.5">Solo permitir desde IPs específicas</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Restringir por ubicación</span>
                      <p className="text-xs text-gray-400 mt-0.5">Geofencing para acceso local</p>
                    </div>
                  </label>

                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Horario de Acceso</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          type="time"
                          defaultValue="06:00"
                          className="bg-black/40 border-white/15 text-white text-sm" />

                        <p className="text-xs text-gray-500 mt-1">Desde</p>
                      </div>
                      <div>
                        <Input
                          type="time"
                          defaultValue="23:00"
                          className="bg-black/40 border-white/15 text-white text-sm" />

                        <p className="text-xs text-gray-500 mt-1">Hasta</p>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Alertar accesos fuera de horario</span>
                      <p className="text-xs text-gray-400 mt-0.5">Notificar a admins si hay acceso nocturno</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Backups y Recuperación */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-red-500" />
                    Respaldos y Recuperación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Configuración de Backups */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-gray-300 text-sm mb-2 block">Frecuencia de Backup Automático</label>
                        <select
                          className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white"
                          defaultValue="daily">

                          <option value="hourly">Cada hora</option>
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                          <option value="manual">Solo manual</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-gray-300 text-sm mb-2 block">Retención de Backups (días)</label>
                        <Input
                          type="number"
                          defaultValue="30"
                          min="7"
                          max="365"
                          className="bg-black/40 border-white/15 text-white" />

                      </div>

                      <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                        <input type="checkbox" defaultChecked className="hidden" />
                        <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-medium">Incluir fotos en backup</span>
                          <p className="text-xs text-gray-400 mt-0.5">Respaldar archivos multimedia</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                        <input type="checkbox" defaultChecked className="hidden" />
                        <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="text-white font-medium">Notificar backups exitosos</span>
                          <p className="text-xs text-gray-400 mt-0.5">Email a admins después de cada backup</p>
                        </div>
                      </label>
                    </div>

                    {/* Estado de Backups */}
                    <div className="space-y-3">
                      <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Check className="w-5 h-5 text-emerald-400" />
                          <h4 className="text-emerald-300 font-bold">Último Backup Exitoso</h4>
                        </div>
                        <div className="space-y-1 text-xs text-gray-300">
                          <p>Fecha: 4 de Noviembre, 2025 - 11:45 PM</p>
                          <p>Tamaño: 245 MB</p>
                          <p>Registros: 1,234 órdenes, 567 clientes</p>
                        </div>
                      </div>

                      <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                        <h4 className="text-white font-bold text-sm mb-3">Backups Disponibles</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {[
                          { date: "04/11/2025", size: "245 MB" },
                          { date: "03/11/2025", size: "243 MB" },
                          { date: "02/11/2025", size: "241 MB" }].
                          map((backup, i) =>
                          <div key={i} className="flex items-center justify-between text-xs p-2 bg-black/20 rounded-lg">
                              <span className="text-gray-300">{backup.date} • {backup.size}</span>
                              <Button size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/10 h-6 px-2">
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900">
                        <Download className="w-4 h-4 mr-2" />
                        Crear Backup Ahora
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alertas de Seguridad */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Alertas de Seguridad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                  {
                    key: "alert_failed_logins",
                    label: "Intentos fallidos de login",
                    description: "Notificar después de 3 intentos fallidos",
                    severity: "high"
                  },
                  {
                    key: "alert_new_device",
                    label: "Nuevo dispositivo detectado",
                    description: "Alertar cuando se conecta un dispositivo nuevo",
                    severity: "medium"
                  },
                  {
                    key: "alert_permission_change",
                    label: "Cambios de permisos",
                    description: "Notificar modificaciones a roles/permisos",
                    severity: "high"
                  },
                  {
                    key: "alert_data_export",
                    label: "Exportación de datos",
                    description: "Alertar cuando se exportan datos masivos",
                    severity: "medium"
                  },
                  {
                    key: "alert_unusual_activity",
                    label: "Actividad inusual",
                    description: "Patrón de uso sospechoso o anormal",
                    severity: "high"
                  }].
                  map((alert) =>
                  <label
                    key={alert.key}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">

                      <input type="checkbox" defaultChecked={alert.severity === "high"} className="hidden" />
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    alert.severity === "high" ? "bg-red-600 border-red-600" : "border-gray-500"}`
                    }>
                        {alert.severity === "high" && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{alert.label}</span>
                          <Badge className={
                        alert.severity === "high" ?
                        "bg-red-600/20 text-red-300 border-red-600/30 text-xs" :
                        "bg-yellow-600/20 text-yellow-300 border-yellow-600/30 text-xs"
                        }>
                            {alert.severity === "high" ? "Alta" : "Media"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{alert.description}</p>
                      </div>
                    </label>
                  )}
                </CardContent>
              </Card>

              {/* Cumplimiento y Privacidad */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    Cumplimiento y Privacidad
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Cumplimiento GDPR/CCPA</span>
                      <p className="text-xs text-gray-400 mt-0.5">Derecho al olvido y portabilidad de datos</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Anonimizar datos antiguos</span>
                      <p className="text-xs text-gray-400 mt-0.5">Después de 2 años sin actividad</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                    <input type="checkbox" defaultChecked className="hidden" />
                    <div className="w-6 h-6 rounded-lg border-2 bg-red-600 border-red-600 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-medium">Consentimiento de datos</span>
                      <p className="text-xs text-gray-400 mt-0.5">Requerir consentimiento explícito para comunicaciones</p>
                    </div>
                  </label>

                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mt-4">
                    <p className="text-blue-300 text-xs mb-2">📋 Políticas Activas</p>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p>✓ Derecho de acceso a datos personales</p>
                      <p>✓ Derecho de rectificación</p>
                      <p>✓ Derecho al olvido (eliminación)</p>
                      <p>✓ Portabilidad de datos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Autenticación de Dos Factores */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-red-500" />
                    Autenticación de Dos Factores (2FA)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* SMS 2FA */}
                    <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                          <Smartphone className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold">SMS</h4>
                          <Badge className="bg-gray-600/20 text-gray-300 border-gray-600/30 text-xs">Desactivado</Badge>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs mb-4">Código de 6 dígitos vía SMS</p>
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                        Habilitar
                      </Button>
                    </div>

                    {/* Email 2FA */}
                    <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                          <Mail className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold">Email</h4>
                          <Badge className="bg-green-600/20 text-green-300 border-green-600/30 text-xs">Activo</Badge>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs mb-4">Código de verificación por email</p>
                      <Button size="sm" variant="outline" className="w-full border-white/15 text-white hover:bg-white/10">
                        Configurar
                      </Button>
                    </div>

                    {/* Authenticator App */}
                    <div className="bg-black/30 border border-white/10 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                          <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-white font-bold">Authenticator</h4>
                          <Badge className="bg-gray-600/20 text-gray-300 border-gray-600/30 text-xs">Desactivado</Badge>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs mb-4">Google Authenticator, Authy, etc.</p>
                      <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                        Habilitar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5">
                      <input type="checkbox" className="hidden" />
                      <div className="w-6 h-6 rounded-lg border-2 border-gray-500 flex items-center justify-center">
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-medium">Requerir 2FA para administradores</span>
                        <p className="text-xs text-gray-400 mt-0.5">Autenticación adicional obligatoria para roles admin</p>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Registro de Actividad Reciente */}
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-red-500" />
                    Actividad de Seguridad Reciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {[
                      {
                        type: "login_success",
                        user: "Yuka (Admin)",
                        action: "Inicio de sesión exitoso",
                        time: "Hace 5 minutos",
                        severity: "normal"
                      },
                      {
                        type: "permission_change",
                        user: "Yuka (Admin)",
                        action: "Modificó permisos de Francis",
                        time: "Hace 1 hora",
                        severity: "high"
                      },
                      {
                        type: "failed_login",
                        user: "Unknown",
                        action: "Intento fallido de login",
                        time: "Hace 2 horas",
                        severity: "warning"
                      },
                      {
                        type: "backup_created",
                        user: "Sistema",
                        action: "Backup automático completado",
                        time: "Hace 3 horas",
                        severity: "normal"
                      },
                      {
                        type: "data_export",
                        user: "Tiffany (Manager)",
                        action: "Exportó reporte de ventas",
                        time: "Hace 5 horas",
                        severity: "medium"
                      }].
                      map((event, i) =>
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      event.severity === "high" ? "bg-red-600/10 border-red-500/30" :
                      event.severity === "warning" ? "bg-yellow-600/10 border-yellow-500/30" :
                      event.severity === "medium" ? "bg-blue-600/10 border-blue-500/30" :
                      "bg-black/20 border-white/10"}`
                      }>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        event.severity === "high" ? "bg-red-600/30 border border-red-500/40" :
                        event.severity === "warning" ? "bg-yellow-600/30 border border-yellow-500/40" :
                        event.severity === "medium" ? "bg-blue-600/30 border border-blue-500/40" :
                        "bg-gray-600/30 border border-gray-500/40"}`
                        }>
                            {event.type === "login_success" && <LogIn className="w-4 h-4 text-green-400" />}
                            {event.type === "failed_login" && <LogOut className="w-4 h-4 text-red-400" />}
                            {event.type === "permission_change" && <Shield className="w-4 h-4 text-amber-400" />}
                            {event.type === "backup_created" && <Download className="w-4 h-4 text-blue-400" />}
                            {event.type === "data_export" && <Upload className="w-4 h-4 text-purple-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{event.action}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{event.user} • {event.time}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400">Mostrando últimos 5 eventos</p>
                    <Button size="sm" variant="outline" className="border-white/15 text-white hover:bg-white/10">
                      Ver Todos los Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => toast.success("✅ Configuración de seguridad guardada")}
                disabled={loading}
                className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 px-8 h-12 text-lg shadow-[0_8px_32px_rgba(220,38,38,0.4)] w-full max-w-sm">

                {loading ?
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando...
                  </> :

                <>
                    <Save className="w-5 h-5 mr-2" />
                    Guardar Configuración de Seguridad
                  </>
                }
              </Button>
            </div>
          </TabsContent>

          {/* SYSTEM */}
          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-red-500" />
                    Rendimiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-black/30 border border-white/10 rounded-xl">
                      <span className="text-gray-300 text-sm">Cache</span>
                      <Check className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-red-500" />
                    Almacenamiento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                    <div className="text-gray-400 text-xs mb-1">Archivos</div>
                    <div className="text-white font-bold">2.4 GB</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-red-500" />
                    Actividad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                    <div className="text-gray-400 text-xs mb-1">Uptime</div>
                    <div className="text-emerald-400 font-bold">99.9%</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="import_export">
            <ImportExportTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Modal */}
      {editingUser &&
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-5xl my-8 shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <UserCircle className="w-8 h-8 text-red-500" />
                {editingUser.id ? "Editar" : "Nuevo"} Usuario
              </h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-bold mb-4">Información</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Nombre *</label>
                      <Input value={editingUser.full_name || ""} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} className="bg-black/40 border-white/15 text-white h-11" />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Email *</label>
                      <Input type="email" value={editingUser.email || ""} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="bg-black/40 border-white/15 text-white h-11" />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Rol *</label>
                      <select value={editingUser.role || "user"} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-3 text-white">
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="technician">Técnico</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">PIN *</label>
                      <div className="relative">
                        <Input type={showPassword[editingUser.id] ? "text" : "password"} value={editingUser.pin || ""} onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="bg-black/40 border-white/15 text-white pr-12 h-11" maxLength={4} inputMode="numeric" />
                        <button type="button" onClick={() => setShowPassword((prev) => ({ ...prev, [editingUser.id]: !prev[editingUser.id] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                          {showPassword[editingUser.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Código de Empleado *</label>
                      <Input value={editingUser.employee_code || ""} onChange={(e) => setEditingUser({ ...editingUser, employee_code: e.target.value })} className="bg-black/40 border-white/15 text-white h-11" placeholder="EMP-001" />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Teléfono *</label>
                      <Input value={editingUser.phone || ""} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} className="bg-black/40 border-white/15 text-white h-11" placeholder="(787) 555-1234" />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Posición *</label>
                      <Input value={editingUser.position || ""} onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })} className="bg-black/40 border-white/15 text-white h-11" placeholder="Técnico Principal" />
                    </div>
                    <div>
                      <label className="text-gray-300 text-sm mb-2 block">Salario por Hora ($)</label>
                      <Input type="number" value={editingUser.hourly_rate || 0} onChange={(e) => setEditingUser({ ...editingUser, hourly_rate: parseFloat(e.target.value) })} className="bg-black/40 border-white/15 text-white h-11" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-bold mb-4">Permisos</h3>
                <div className="grid gap-2">
                  {[
                { key: "create_orders", label: "Crear Órdenes" },
                { key: "process_sales", label: "Procesar Ventas" },
                { key: "view_reports", label: "Ver Reportes" },
                { key: "view_financials", label: "Ver Finanzas" },
                { key: "manage_inventory", label: "Gestionar Inventario" },
                { key: "manage_employees", label: "Gestionar Empleados" },
                { key: "manage_cash_drawer", label: "Gestionar Caja" },
                { key: "apply_discounts", label: "Aplicar Descuentos" },
                { key: "process_refunds", label: "Procesar Reembolsos" },
                { key: "edit_time_entries", label: "Editar Entradas de Tiempo" }].

                map((perm) => {
                  const isChecked = editingUser.permissions?.[perm.key];
                  return (
                    <label key={perm.key} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    isChecked ? "bg-red-600/20 border-red-600/50 text-white" : "bg-black/20 border-white/10 text-gray-300 hover:bg-white/5"}`
                    }>
                          <input type="checkbox" checked={isChecked || false} onChange={(e) => setEditingUser({ ...editingUser, permissions: { ...editingUser.permissions, [perm.key]: e.target.checked } })} className="hidden" />
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${isChecked ? "bg-red-600 border-red-600" : "border-gray-500"}`}>
                            {isChecked && <Check className="w-4 h-4 text-white" />}
                          </div>
                          <span className="font-medium">{perm.label}</span>
                        </label>);

                })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-white/10 mt-8">
              <Button variant="outline" onClick={() => setEditingUser(null)} className="bg-background text-slate-900 px-8 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground border-white/15 hover:bg-white/10 h-12">
                Cancelar
              </Button>
              <Button onClick={handleSaveUser} className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 shadow-[0_8px_32px_rgba(220,38,38,0.5)] px-8 h-12" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Edit Link Modal */}
      {editingLink &&
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-2xl my-8 shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <ExternalLink className="w-7 h-7 text-red-500" />
                {editingLink.id ? "Editar Enlace" : "Nuevo Enlace"}
              </h2>
              <button onClick={() => setEditingLink(null)} className="text-gray-400 hover:text-white">
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Nombre *</label>
                  <Input
                  value={editingLink.name || ""}
                  onChange={(e) => setEditingLink({ ...editingLink, name: e.target.value })}
                  className="bg-black/40 border-white/15 text-white"
                  placeholder="GSM Unlock USA" />

                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Ícono (emoji)</label>
                  <Input
                  value={editingLink.icon || ""}
                  onChange={(e) => setEditingLink({ ...editingLink, icon: e.target.value })}
                  className="bg-black/40 border-white/15 text-white"
                  placeholder="🔓"
                  maxLength={2} />

                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-2 block">URL *</label>
                <Input
                value={editingLink.url || ""}
                onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
                className="bg-black/40 border-white/15 text-white"
                placeholder="https://www.ejemplo.com" />

              </div>

              <div>
                <label className="text-gray-300 text-sm mb-2 block">Descripción</label>
                <Input
                value={editingLink.description || ""}
                onChange={(e) => setEditingLink({ ...editingLink, description: e.target.value })}
                className="bg-black/40 border-white/15 text-white"
                placeholder="Servicio para verificar IMEI" />

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Categoría</label>
                  <select
                  value={editingLink.category || "other"}
                  onChange={(e) => setEditingLink({ ...editingLink, category: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white">

                    <option value="imei_check">IMEI Check</option>
                    <option value="unlock_service">Unlock Service</option>
                    <option value="parts_supplier">Proveedor de Piezas</option>
                    <option value="tools">Herramientas</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Abrir en</label>
                  <select
                  value={editingLink.opens_in || "new_tab"}
                  onChange={(e) => setEditingLink({ ...editingLink, opens_in: e.target.value })}
                  className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white">

                    <option value="new_tab">Nueva pestaña</option>
                    <option value="same_tab">Misma pestaña</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-black/30 border border-white/10 rounded-xl cursor-pointer">
                <input
                type="checkbox"
                checked={editingLink.active !== false}
                onChange={(e) => setEditingLink({ ...editingLink, active: e.target.checked })}
                className="hidden" />

                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
              editingLink.active !== false ? "bg-red-600 border-red-600" : "border-gray-500"}`
              }>
                  {editingLink.active !== false && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-white font-medium">Enlace activo</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
              <Button
              variant="outline"
              onClick={() => setEditingLink(null)}
              className="border-white/15 text-white hover:bg-white/10 px-6">

                Cancelar
              </Button>
              <Button
              onClick={handleSaveLink}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-6"
              disabled={loading}>

                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Edit Catalog Item Modal */}
      {editingCatalogItem && catalogItemType &&
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-2xl my-8 shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                {catalogItemType === "category" && <Database className="w-7 h-7 text-red-500" />}
                {catalogItemType === "brand" && <Building2 className="w-7 h-7 text-blue-500" />}
                {catalogItemType === "model" && <Smartphone className="w-7 h-7 text-purple-500" />}
                {editingCatalogItem.id ? "Editar" : "Nuevo"} {catalogItemType === "category" ? "Categoría" : catalogItemType === "brand" ? "Marca" : "Modelo"}
              </h2>
              <button onClick={() => {setEditingCatalogItem(null);setCatalogItemType(null);}} className="text-gray-400 hover:text-white">
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Nombre *</label>
                <Input
                value={editingCatalogItem.name || ""}
                onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, name: e.target.value })}
                className="bg-black/40 border-white/15 text-white h-12"
                placeholder={catalogItemType === "category" ? "Smartphone" : catalogItemType === "brand" ? "Apple" : "iPhone 15 Pro Max"} />

              </div>

              {catalogItemType === "category" &&
            <div>
                  <label className="text-gray-300 text-sm mb-2 block">Ícono (emoji)</label>
                  <Input
                value={editingCatalogItem.icon || ""}
                onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, icon: e.target.value })}
                className="bg-black/40 border-white/15 text-white h-12"
                placeholder="📱"
                maxLength={2} />

                </div>
            }

              {catalogItemType === "model" &&
            <div>
                  <label className="text-gray-300 text-sm mb-2 block">Alias (opcional)</label>
                  <Input
                value={editingCatalogItem.alias || ""}
                onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, alias: e.target.value })}
                className="bg-black/40 border-white/15 text-white h-12"
                placeholder="15PM, 14 Plus..." />

                </div>
            }

              <div>
                <label className="text-gray-300 text-sm mb-2 block">Orden de visualización</label>
                <Input
                type="number"
                value={editingCatalogItem.order || 0}
                onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, order: parseInt(e.target.value) })}
                className="bg-black/40 border-white/15 text-white h-12" />

              </div>

              <label className="flex items-center gap-3 p-4 bg-black/30 border border-white/10 rounded-xl cursor-pointer">
                <input
                type="checkbox"
                checked={editingCatalogItem.active !== false}
                onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, active: e.target.checked })}
                className="hidden" />

                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
              editingCatalogItem.active !== false ? "bg-red-600 border-red-600" : "border-gray-500"}`
              }>
                  {editingCatalogItem.active !== false && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-white font-medium">Activo</span>
              </label>

              {catalogItemType === "model" &&
            <div className="bg-gradient-to-r from-amber-600/10 to-amber-800/10 border border-amber-500/20 rounded-xl p-4">
                  <p className="text-amber-400 text-xs mb-2">💡 Tip</p>
                  <p className="text-gray-300 text-sm">Puedes añadir problemas comunes y piezas sugeridas después de crear el modelo.</p>
                </div>
            }
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
              <Button
              variant="outline"
              onClick={() => {setEditingCatalogItem(null);setCatalogItemType(null);}}
              className="border-white/15 text-white hover:bg-white/10 px-6">

                Cancelar
              </Button>
              <Button
              onClick={handleSaveCatalogItem}
              disabled={loading}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-6">

                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Edit Problem Preset Modal */}
      {editingPreset !== null &&
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Wrench className="w-7 h-7 text-red-500" />
                {editingPreset === -1 ? "Nuevo" : "Editar"} Preset de Problema
              </h2>
              <button
              onClick={() => {
                setEditingPreset(null);
                setPresetLabel("");
                setPresetText("");
              }}
              className="text-gray-400 hover:text-white">

                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Label / Botón *</label>
                <Input
                value={presetLabel}
                onChange={(e) => setPresetLabel(e.target.value)}
                className="bg-black/40 border-white/15 text-white h-12"
                placeholder="Ej. Pantalla, Batería, Puerto..." />

              </div>

              <div>
                <label className="text-gray-300 text-sm mb-2 block">Texto del Problema *</label>
                <textarea
                value={presetText}
                onChange={(e) => setPresetText(e.target.value)}
                rows={4}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-white text-sm resize-none"
                placeholder="Ej. Pantalla rota / touch no responde" />

              </div>

              <div className="bg-gradient-to-r from-amber-600/10 to-amber-800/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-amber-400 text-xs mb-2">💡 Tip</p>
                <p className="text-gray-300 text-sm">Este texto se insertará automáticamente en el campo de problema cuando el usuario haga click en el botón.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
              <Button
              variant="outline"
              onClick={() => {
                setEditingPreset(null);
                setPresetLabel("");
                setPresetText("");
              }}
              className="border-white/15 text-white hover:bg-white/10 px-6">

                Cancelar
              </Button>
              <Button
              onClick={handleSavePreset}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-6">

                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </div>
        </div>
      }
    </div>);
}