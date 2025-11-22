// === Inventory.jsx — ORGANIZADO POR CATEGORÍAS DE DISPOSITIVOS ===
// iPhone, iPad, MacBook → Pantallas, Baterías, Servicios

import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Smartphone,
  Tablet,
  Laptop,
  AlertTriangle,
  FileText,
  Upload,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  Globe,
  Tag,
  CheckSquare,
  Monitor,
  Battery,
  Wrench,
  Box,
  Truck, // 👈 icono para botón "Nueva Orden"
  Sparkles,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter, // 👈 DialogFooter añadido
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// 👇 IMPORTS CORREGIDOS (vuelven a la carpeta components/inventory)
import SuppliersDialog from "../components/inventory/SuppliersDialog"; // 👈 FIX path
import PurchaseOrderDialog from "../components/inventory/PurchaseOrderDialog"; // 👈 FIX path
import NotificationService from "../components/notifications/NotificationService"; // 👈 FIX path
import DiscountBadge, {
  formatPriceWithDiscount,
} from "../components/inventory/DiscountBadge"; // 👈 FIX path
import SetDiscountDialog from "../components/inventory/SetDiscountDialog"; // 👈 FIX path
import ManageCategoriesDialog from "../components/inventory/ManageCategoriesDialog"; // 👈 FIX path
import InventoryReports from "../components/inventory/InventoryReports"; // 👈 FIX path
import InventoryChatbot from "../components/inventory/InventoryChatbot"; // 👈 FIX path

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const ICON_MAP = {
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Box,
  Battery,
  Wrench,
  Watch: Smartphone,
  Headphones: Box,
  Speaker: Box,
  Camera: Box,
  Gamepad: Box,
  Cpu: Box,
  HardDrive: Box,
  Wifi: Wrench,
  Cable: Wrench,
};

// === Tarjeta de inventario ===
function InventoryCard({ item, onEdit, onDelete, onSelect, isSelected }) {
  const st =
    item.stock <= 0
      ? { tag: "Agotado", color: "text-red-400" }
      : item.stock <= (item.min_stock || 0)
      ? { tag: "Bajo", color: "text-amber-400" }
      : { tag: "OK", color: "text-emerald-400" };

  const priceInfo = formatPriceWithDiscount(item);

  return (
    <div
      className={`bg-[#111]/70 border rounded-2xl p-4 flex flex-col gap-3 hover:shadow-[0_8px_32px_rgba(0,168,232,0.2)] transition theme-light:bg-white theme-light:border-gray-200 ${
        isSelected
          ? "border-orange-500 bg-orange-600/10 ring-2 ring-orange-500/40"
          : "border-cyan-500/20 hover:border-cyan-500/50"
      }`}
      onClick={() => onSelect?.(item)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              isSelected
                ? "bg-orange-500 border-orange-500"
                : "border-cyan-500/40"
            }`}
          >
            {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white leading-tight truncate theme-light:text-gray-900">
              {item.name || "—"}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge className="text-[10px] bg-cyan-600/20 text-cyan-300 border-cyan-600/30 theme-light:bg-cyan-100 theme-light:text-cyan-700">
                {item.device_category || "Otros"}
              </Badge>
              <Badge className="text-[10px] bg-emerald-600/20 text-emerald-300 border-emerald-600/30 theme-light:bg-emerald-100 theme-light:text-emerald-700">
                {item.part_type || "Pieza"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-cyan-600/10"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-300 hover:text-red-200 hover:bg-red-600/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <DiscountBadge product={item} />

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold text-emerald-300 theme-light:text-emerald-600">
              {money(priceInfo.finalPrice)}
            </p>
            {priceInfo.originalPrice && (
              <p className="text-sm text-gray-500 line-through">
                {money(priceInfo.originalPrice)}
              </p>
            )}
          </div>
          {priceInfo.savings > 0 && (
            <p className="text-xs text-orange-400">
              Ahorras {money(priceInfo.savings)}
            </p>
          )}
          <p className="text-xs text-white/30 theme-light:text-gray-500">
            Costo {money(item.cost)}
          </p>
        </div>

        <div className="text-right">
          <p className={`text-lg font-semibold ${st.color}`}>
            {Number(item.stock || 0)}
          </p>
          <p className="text-[10px] text-white/30 theme-light:text-gray-500">
            {st.tag}
          </p>
        </div>
      </div>

      {item.compatibility_models?.length > 0 && (
        <p className="text-[11px] text-white/35 line-clamp-2 theme-light:text-gray-500">
          Compatible: {item.compatibility_models.join(", ")}
        </p>
      )}

      {Number(item.stock || 0) > 0 &&
        Number(item.stock || 0) <= Number(item.min_stock || 0) && (
          <div className="flex items-center gap-2 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-400/30 px-2 py-1 rounded-md theme-light:bg-amber-50 theme-light:text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Bajo stock
          </div>
        )}
    </div>
  );
}

// === Modal para crear/editar item ===
function InventoryItemDialog({
  open,
  onOpenChange,
  value,
  onSave,
  deviceCategories,
  partTypes,
  currentDeviceCategory,
  currentPartType,
  suppliers,
}) {
  const [form, setForm] = useState({
    name: "",
    device_category: "",
    part_type: "",
    price: "",
    cost: "",
    stock: "",
    min_stock: "",
    supplier_id: "",
    supplier_name: "",
    description: "",
    compatibility_models_text: "",
  });

  useEffect(() => {
    if (value) {
      setForm({
        ...value,
        price: value.price || "",
        cost: value.cost || "",
        stock: value.stock || "",
        min_stock: value.min_stock || "",
        supplier_id: value.supplier_id || "",
        supplier_name: value.supplier_name || "",
        compatibility_models_text: Array.isArray(
          value.compatibility_models
        )
          ? value.compatibility_models.join("\n")
          : "",
      });
    } else {
      const defaultCategory =
        currentDeviceCategory ||
        deviceCategories[0]?.icon ||
        deviceCategories[0]?.name?.toLowerCase() ||
        "iphone";
      const defaultPartType =
        currentPartType !== "all"
          ? currentPartType
          : partTypes[0]?.slug || "pantalla";

      setForm({
        name: "",
        device_category: defaultCategory,
        part_type: defaultPartType,
        price: "",
        cost: "",
        stock: "",
        min_stock: "",
        supplier_id: "",
        supplier_name: "",
        description: "",
        compatibility_models_text: "",
      });
    }
  }, [
    value,
    open,
    deviceCategories,
    partTypes,
    currentDeviceCategory,
    currentPartType,
  ]);

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!form.device_category) {
      toast.error("La categoría de dispositivo es requerida");
      return;
    }
    if (!form.part_type) {
      toast.error("El tipo de pieza/servicio es requerido");
      return;
    }
    if (Number(form.price) <= 0) {
      toast.error("El precio de venta debe ser mayor a 0");
      return;
    }
    if (Number(form.cost) <= 0) {
      toast.error("El costo debe ser mayor a 0");
      return;
    }

    const selectedSupplier = suppliers?.find(
      (s) => s.id === form.supplier_id
    );

    const payload = {
      name: form.name.trim(),
      price: Number(form.price || 0),
      cost: Number(form.cost || 0),
      stock: Number(form.stock || 0),
      min_stock: Number(form.min_stock || 0),
      category: `${form.device_category}_${form.part_type}`,
      device_category: form.device_category,
      part_type: form.part_type,
      supplier_id: form.supplier_id || "",
      supplier_name:
        selectedSupplier?.name || form.supplier_name?.trim() || "",
      description: form.description?.trim() || "",
      active: true,
      compatibility_models: (form.compatibility_models_text || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (value?.id) {
      payload.id = value.id;
    }

    console.log("💾 Guardando:", payload);
    await onSave?.(payload, form.device_category, form.part_type);
  };

  const selectedPartType = partTypes.find(
    (pt) => pt.slug === form.part_type
  );
  const isService = selectedPartType?.slug === "servicio";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f10] border border-cyan-500/20 w-[95vw] max-w-2xl max-h-[85vh] p-0 gap-0 theme-light:bg.white theme-light:border-gray-200 flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b border-cyan-500/20 theme-light:border-gray-200 flex-shrink-0">
          <DialogTitle className="text-white text-lg theme-light:text-gray-900">
            {value?.id ? "Editar pieza" : "Nueva pieza"}
          </DialogTitle>
        </DialogHeader>

        <div
          className="overflow-y-auto px-4 py-4 space-y-4 flex-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div>
            <label className="text-xs text-white/50 mb-2 block theme-light:text-gray-600">
              Categoría de Dispositivo *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceCategories.map((cat) => {
                const IconComponent =
                  ICON_MAP[cat.icon_name] || Smartphone;
                const catValue =
                  cat.icon || cat.name.toLowerCase();
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        device_category: catValue,
                      }))
                    }
                    className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                      form.device_category === catValue
                        ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white border-transparent shadow-lg"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 theme-light:bg-gray-100 theme-light:border-gray-300"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block theme-light:text-gray-600">
              Tipo de Pieza/Servicio *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {partTypes.map((type) => {
                const IconComponent =
                  ICON_MAP[type.icon_name] || Monitor;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        part_type: type.slug,
                      }))
                    }
                    className={`flex items-center gap-2 px-3 py-3 rounded-lg border text-sm font-medium transition-all ${
                      form.part_type === type.slug
                        ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white border-transparent shadow-lg"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 theme-light:bg-gray-100 theme-light:border-gray-300"
                    }`}
                  >
                    <IconComponent className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{type.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
              Nombre *
            </label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej: Pantalla iPhone 14 Pro"
              className="bg-black/20 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
                Precio *
              </label>
              <Input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    price: e.target.value,
                  }))
                }
                placeholder="0.00"
                className="bg-black/20 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300"
              />
            </div>

            <div>
              <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
                Costo *
              </label>
              <Input
                type="number"
                step="0.01"
                value={form.cost}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cost: e.target.value }))
                }
                placeholder="0.00"
                className="bg-black/20 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300"
              />
            </div>
          </div>

          {!isService && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
                  Stock
                </label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stock: e.target.value,
                    }))
                  }
                  placeholder="0"
                  className="bg-black/20 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
                  Min
                </label>
                <Input
                  type="number"
                  value={form.min_stock}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      min_stock: e.target.value,
                    }))
                  }
                  placeholder="5"
                  className="bg-black/20 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
              Proveedor
            </label>
            <select
              value={form.supplier_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  supplier_id: e.target.value,
                }))
              }
              className="w-full h-10 px-3 rounded-md bg-black/20 border border-cyan-500/20 text-white theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
            >
              <option value="">Sin proveedor</option>
              {(suppliers || [])
                .filter((s) => s.active !== false)
                .map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
              Descripción
            </label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  description: e.target.value,
                }))
              }
              placeholder="Opcional"
              className="bg-black/20 border-cyan-500/20 h-16 theme-light:bg-white theme-light:border-gray-300"
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block theme-light:text-gray-600">
              Modelos compatibles
            </label>
            <Textarea
              value={form.compatibility_models_text}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  compatibility_models_text: e.target.value,
                }))
              }
              placeholder="Uno por línea (opcional)"
              className="bg-black/20 border-cyan-500/20 h-16 theme-light:bg-white theme-light:border-gray-300"
            />
          </div>

          {/* 👇 CHANGED: quitado el espacio extra que se usaba para el footer sticky */}
          {/* <div className="h-16"></div> */}
        </div>

        <DialogFooter
          className="px-4 py-3 border-t border-cyan-500/20 flex-row gap-2 bg-[#0f0f10] theme-light:bg-white theme-light:border-gray-200 flex-shrink-0" // 👈 CHANGED: sin sticky bottom-0
        >
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/15 flex-1 theme-light:border-gray-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-cyan-600 to-emerald-700 flex-1"
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// === Modal de Órdenes de Compra (historial/listado) ===
function PurchaseOrdersDialog({
  open,
  onOpenChange,
  orders = [],
  onUpload,
  onEdit,
}) {
  const [selectedPO, setSelectedPO] = useState(null);
  const [file, setFile] = useState(null);

  const handleAttach = async () => {
    if (!selectedPO || !file) return;
    await onUpload?.(selectedPO, file);
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f0f10] border border-cyan-500/20 max-w-4xl text-white theme-light:bg-white theme-light:border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white theme-light:text-gray-900">
            Órdenes de Compra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {orders.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8 theme-light:text-gray-500">
              Aún no hay órdenes de compra.
            </p>
          ) : (
            orders.map((po) => (
              <div
                key={po.id}
                onClick={() => setSelectedPO(po.id)}
                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-all cursor-pointer ${
                  selectedPO === po.id
                    ? "border-cyan-500/60 bg-cyan-500/5 theme-light:border-cyan-500 theme-light:bg-cyan-50"
                    : "border-cyan-500/20 hover:border-cyan-500/40 theme-light:border-gray-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white theme-light:text-gray-900">
                      {po.po_number}
                    </p>
                    <Badge
                      className={`text-xs ${
                        po.status === "received"
                          ? "bg-green-600/20 text-green-300 border-green-600/30"
                          : po.status === "ordered"
                          ? "bg-blue-600/20 text-blue-300 border-blue-600/30"
                          : "bg-gray-600/20 text-gray-300 border-gray-600/30"
                      }`}
                    >
                      {po.status === "draft"
                        ? "Borrador"
                        : po.status === "ordered"
                        ? "Ordenado"
                        : po.status === "received"
                        ? "Recibido"
                        : "Cancelado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-white/40 theme-light:text-gray-600">
                    {po.supplier_name || "Suplidor no definido"} • $
                    {Number(po.total_amount || 0).toFixed(2)}
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(po);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 h-8 text-xs"
                >
                  Ver
                </Button>
              </div>
            ))
          )}
        </div>

        {selectedPO && (
          <div className="mt-4 border-t border-cyan-500/20 pt-3 space-y-2 theme-light:border-gray-200">
            <p className="text-xs text-white/40 theme-light:text-gray-600">
              Adjuntar PDF
            </p>
            <Input
              type="file"
              accept="application/pdf"
              className="bg-black/20 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
            />

            <Button
              disabled={!file}
              onClick={handleAttach}
              className="bg-gradient-to-r from-cyan-600 to-emerald-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir PDF
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// === NUEVO: Modal de Detalle / Edición simple de Orden de Compra ===
function PurchaseOrderStatusDialog({
  open,
  onOpenChange,
  poId,
  onUpdated,
}) {
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("draft");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const loadPO = async () => {
      if (!open || !poId) return;
      setLoading(true);
      try {
        const full = await base44.entities.PurchaseOrder.get(
          poId
        );
        setPo(full);
        setStatus(full.status || "draft");
        setExpectedDate(full.expected_date || "");
        setNotes(full.notes || "");
      } catch (err) {
        console.error("Error cargando PO:", err);
        toast.error("No se pudo cargar la orden de compra");
      } finally {
        setLoading(false);
      }
    };
    loadPO();
  }, [open, poId]);

  const handleSave = async () => {
    if (!po) return;
    setSaving(true);
    try {
      await base44.entities.PurchaseOrder.update(po.id, {
        status,
        expected_date: expectedDate || null,
        notes: notes || "",
      });
      toast.success("Orden de compra actualizada");
      await onUpdated?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Error actualizando PO:", err);
      toast.error("No se pudo actualizar la orden de compra");
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (st) => {
    switch (st) {
      case "draft":
        return "Borrador";
      case "ordered":
        return "Ordenado";
      case "received":
        return "Recibido";
      case "cancelled":
        return "Cancelado";
      default:
        return st || "—";
    }
  };

  const items = po?.items || po?.line_items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#020617] border border-cyan-500/30 max-w-3xl text-white theme-light:bg-white theme-light:border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Detalle de Orden de Compra
          </DialogTitle>
        </DialogHeader>

        {loading || !po ? (
          <div className="py-8 text-center text-sm text-white/60 theme-light:text-gray-600">
            Cargando información de la orden...
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
              {/* Info básica */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-3 theme-light:bg-gray-50 theme-light:border-gray-200">
                  <p className="text-[11px] text-white/50 mb-1 theme-light:text-gray-600">
                    Número de PO
                  </p>
                  <p className="font-mono text-sm">
                    {po.po_number || po.id}
                  </p>
                  <p className="text-[11px] text-white/40 mt-2 theme-light:text-gray-500">
                    Suplidor:{" "}
                    <span className="font-semibold text-white theme-light:text-gray-900">
                      {po.supplier_name || "Sin suplidor"}
                    </span>
                  </p>
                </div>

                <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-3 theme-light:bg-gray-50 theme-light:border-gray-200">
                  <p className="text-[11px] text-white/50 mb-1 theme-light:text-gray-600">
                    Estado
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "draft", label: "Borrador" },
                      { value: "ordered", label: "Ordenado" },
                      { value: "received", label: "Recibido" },
                      { value: "cancelled", label: "Cancelado" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${
                          status === opt.value
                            ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white border-transparent"
                            : "bg-black/40 border-white/10 text-white/70 hover:bg-white/5 theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-800"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-3 theme-light:bg-gray-50 theme-light:border-gray-200">
                  <p className="text-[11px] text-white/50 mb-1 theme-light:text-gray-600">
                    Fecha de orden
                  </p>
                  <p className="text-sm">
                    {po.order_date || "—"}
                  </p>
                  {po.received_date && (
                    <p className="text-[11px] text-emerald-300 mt-2 theme-light:text-emerald-700">
                      Recibido: {po.received_date}
                    </p>
                  )}
                </div>
                <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-3 theme-light:bg-gray-50 theme-light:border-gray-200">
                  <p className="text-[11px] text-white/50 mb-1 theme-light:text-gray-600">
                    Fecha esperada
                  </p>
                  <Input
                    type="date"
                    value={expectedDate || ""}
                    onChange={(e) =>
                      setExpectedDate(e.target.value)
                    }
                    className="bg-black/30 border-cyan-500/30 text-sm theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
                  />

                  <p className="text-[11px] text-white/40 mt-1 theme-light:text-gray-500">
                    Opcional. Para seguimiento interno.
                  </p>
                </div>
              </div>

              {/* Productos */}
              <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-3 theme-light:bg-gray-50 theme-light:border-gray-200">
                <p className="text-xs text-white/60 mb-2 flex items-center gap-2 theme-light:text-gray-700">
                  <Box className="w-4 h-4 text-cyan-400" />
                  Productos en la orden ({items.length})
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-white/40 theme-light:text-gray-500">
                    Esta orden no tiene productos asociados.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="text-white/50 theme-light:text-gray-600">
                        <tr>
                          <th className="text-left pb-1">
                            Producto
                          </th>
                          <th className="text-right pb-1">
                            Cant.
                          </th>
                          <th className="text-right pb-1">
                            Costo
                          </th>
                          <th className="text-right pb-1">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-white/90 theme-light:text-gray-900">
                        {items.map((it, idx) => {
                          const qty = Number(it.quantity || 0);
                          const cost = Number(
                            it.unit_cost || it.cost || 0
                          );
                          const lineTotal = qty * cost;
                          return (
                            <tr
                              key={idx}
                              className="border-t border-white/10 theme-light:border-gray-200"
                            >
                              <td className="py-1 pr-2 max-w-[160px] truncate">
                                {it.product_name ||
                                  it.name ||
                                  "—"}
                              </td>
                              <td className="py-1 text-right">
                                {qty}
                              </td>
                              <td className="py-1 text-right">
                                {money(cost)}
                              </td>
                              <td className="py-1 text-right">
                                {money(lineTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-3 text-sm">
                  <div className="text-right">
                    <p className="text-white/50 text-xs theme-light:text-gray-600">
                      Subtotal
                    </p>
                    <p className="font-semibold">
                      {money(
                        po.subtotal ||
                          items.reduce((s, it) => {
                            const q = Number(
                              it.quantity || 0
                            );
                            const c = Number(
                              it.unit_cost ||
                                it.cost ||
                                0
                            );
                            return s + q * c;
                          }, 0)
                      )}
                    </p>
                  </div>
                  {typeof po.tax_amount !== "undefined" && (
                    <div className="text-right">
                      <p className="text-white/50 text-xs theme-light:text-gray-600">
                        Impuestos
                      </p>
                      <p className="font-semibold">
                        {money(po.tax_amount || 0)}
                      </p>
                    </div>
                  )}
                  {typeof po.shipping_cost !== "undefined" && (
                    <div className="text-right">
                      <p className="text-white/50 text-xs theme-light:text-gray-600">
                        Envío
                      </p>
                      <p className="font-semibold">
                        {money(po.shipping_cost || 0)}
                      </p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-white/70 text-xs font-semibold theme-light:text-gray-800">
                      TOTAL
                    </p>
                    <p className="font-bold text-emerald-400 theme-light:text-emerald-600">
                      {money(po.total_amount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="bg-black/40 border border-cyan-500/20 rounded-lg p-3 theme-light:bg-gray-50 theme-light:border-gray-200">
                <p className="text-xs text-white/60 mb-1 theme-light:text-gray-700">
                  Notas
                </p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas internas sobre esta orden..."
                  className="bg-black/30 border-cyan-500/30 text-sm theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-white/40 theme-light:text-gray-500">
                Estado actual:{" "}
                <span className="font-semibold text-white theme-light:text-gray-900">
                  {statusLabel(po.status)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="bg-background text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-9 border-white/20 theme-light:border-gray-300 theme-light:text-gray-800"
                  disabled={saving}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-cyan-600 to-emerald-600"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// === Componente principal ===
export default function Inventory() {
  const [items, setItems] = useState([]);
  const [poList, setPoList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [deviceCategories, setDeviceCategories] = useState([]);
  const [partTypes, setPartTypes] = useState([]);
  const [deviceCategory, setDeviceCategory] = useState(null);
  const [partTypeFilter, setPartTypeFilter] = useState("all");
  const [q, setQ] = useState("");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showPO, setShowPO] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showPODialog, setShowPODialog] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showDiscountDialog, setShowDiscountDialog] =
    useState(false);
  const [showManageCategories, setShowManageCategories] =
    useState(false);
  const [showReports, setShowReports] = useState(false);
  const [viewTab, setViewTab] = useState("products");
  const [page, setPage] = useState(1);
  const [showPOView, setShowPOView] = useState(false);
  const pageSize = 24;

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const [
        pRes,
        poRes,
        supRes,
        woRes,
        catRes,
        ptRes,
      ] = await Promise.allSettled([
        base44.entities.Product?.list?.() ?? [],
        base44.entities.PurchaseOrder?.list?.(
          "-created_date",
          100
        ) ?? [],
        base44.entities.Supplier?.list?.(
          "-created_date"
        ) ?? [],
        base44.entities.Order?.list?.(
          "-created_date",
          100
        ) ?? [],
        base44.entities.DeviceCategory?.list?.() ?? [],
        base44.entities.PartType?.list?.() ?? [],
      ]);

      const prods =
        pRes.status === "fulfilled" ? pRes.value || [] : [];
      const cats =
        catRes.status === "fulfilled" ? catRes.value || [] : [];
      const pts =
        ptRes.status === "fulfilled" ? ptRes.value || [] : [];

      console.log("📦 Inventario cargado:", {
        productos: prods.length,
        categorías: cats.length,
        tipos: pts.length,
        muestraProductos: prods.slice(0, 3).map((p) => ({
          name: p.name,
          device_category: p.device_category,
          part_type: p.part_type,
        })),
      });

      setItems(prods);
      setPoList(
        poRes.status === "fulfilled" ? poRes.value || [] : []
      );
      setSuppliers(
        supRes.status === "fulfilled" ? supRes.value || [] : []
      );
      setWorkOrders(
        woRes.status === "fulfilled" ? woRes.value || [] : []
      );
      setDeviceCategories(cats);
      setPartTypes(pts);

      if (!deviceCategory && cats.length > 0) {
        const initialCategory =
          cats[0].icon || cats[0].name.toLowerCase();
        console.log("🎯 Categoría inicial:", initialCategory);
        setDeviceCategory(initialCategory);
      }
    } catch (err) {
      console.error("Error loading inventory:", err);
    }
  };

  const filtered = useMemo(() => {
    console.log("🔍 Filtrando:", {
      total: items.length,
      deviceCategory,
      partTypeFilter,
      viewTab,
      primerosItems: items.slice(0, 3).map((i) => ({
        name: i.name,
        device_category: i.device_category,
        part_type: i.part_type,
        discount_active: i.discount_active,
      })),
    });

    let list = items.filter((item) => {
      if (item.device_category !== deviceCategory) return false;

      if (viewTab === "offers") {
        return (
          item.discount_active === true &&
          item.discount_percentage > 0
        );
      } else if (viewTab === "services") {
        return item.part_type === "servicio";
      } else {
        if (partTypeFilter !== "all") {
          return item.part_type === partTypeFilter;
        }
        return item.part_type !== "servicio";
      }
    });

    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (it) =>
          String(it.name || "")
            .toLowerCase()
            .includes(t) ||
          String(it.supplier_name || "")
            .toLowerCase()
            .includes(t) ||
          (Array.isArray(it.compatibility_models) &&
            it.compatibility_models
              .join(" ")
              .toLowerCase()
              .includes(t))
      );
    }

    console.log("✅ Items filtrados:", list.length);
    return list;
  }, [items, deviceCategory, partTypeFilter, viewTab, q]);

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / pageSize)
  );
  const pageItems = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleSelectProduct = (item) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === item.id);
      return isSelected
        ? prev.filter((p) => p.id !== item.id)
        : [...prev, item];
    });
  };

  const handleSaveItem = async (
    payload,
    savedCategory,
    savedPartType
  ) => {
    try {
      const oldStock = payload.id
        ? items.find((i) => i.id === payload.id)?.stock
        : null;

      if (payload.id) {
        console.log("✏️ Actualizando pieza:", payload.id, payload);
        await base44.entities.Product.update(
          payload.id,
          payload
        );

        const newStock = Number(payload.stock || 0);
        const minStock = Number(payload.min_stock || 5);

        if (
          newStock <= minStock &&
          (oldStock === null || oldStock > minStock)
        ) {
          const admins =
            await base44.entities.User.list();
          const eligibleUsers = (admins || []).filter(
            (u) =>
              u.role === "admin" || u.role === "manager"
          );

          for (const targetUser of eligibleUsers) {
            if (!targetUser.id || !targetUser.email) continue;
            await NotificationService.createNotification({
              userId: targetUser.id,
              userEmail: targetUser.email,
              type: "low_stock",
              title: `⚠️ Stock bajo: ${payload.name}`,
              body: `Solo quedan ${newStock} unidades (mínimo: ${minStock})`,
              relatedEntityType: "product",
              relatedEntityId: payload.id,
              actionUrl: `/Inventory`,
              actionLabel: "Ver inventario",
              priority:
                newStock === 0 ? "urgent" : "high",
              metadata: {
                product_name: payload.name,
                current_stock: newStock,
                min_stock: minStock,
              },
            });
          }
        }

        await loadInventory();
      } else {
        console.log("➕ Creando nueva pieza:", payload);
        const newItem =
          await base44.entities.Product.create(payload);
        console.log("✅ Pieza creada:", newItem);

        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );
        await loadInventory();

        if (savedPartType === "servicio") {
          setViewTab("services");
        } else {
          setViewTab("products");
        }

        if (savedCategory) {
          console.log(
            "🎯 Cambiando a categoría:",
            savedCategory
          );
          setDeviceCategory(savedCategory);
        }
        if (savedPartType && savedPartType !== "servicio") {
          console.log(
            "🎯 Cambiando a tipo:",
            savedPartType
          );
          setPartTypeFilter(savedPartType);
        }
        setPage(1);
      }

      setShowItemDialog(false);
      setEditing(null);
      toast.success(
        payload.id ? "✅ Actualizado" : "✅ Pieza creada"
      );
    } catch (err) {
      console.error("❌ Error:", err);
      toast.error("No se pudo guardar");
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return;
    try {
      await base44.entities.Product.delete(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      toast.success("Eliminado");
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("No se pudo eliminar");
    }
  };

  const handleUploadPO = async (poId, file) => {
    try {
      const r =
        await base44.integrations.Core.UploadFile({ file });
      const fileUrl = r.file_url || r.url;
      if (fileUrl) {
        await base44.entities.PurchaseOrder.update(poId, {
          attachment_url: fileUrl,
        });
        const po =
          await base44.entities.PurchaseOrder.list(
            "-created_date",
            100
          );
        setPoList(po || []);
        toast.success("PDF adjuntado");
      }
    } catch (err) {
      console.error("Error uploading PDF:", err);
      toast.error("No se pudo adjuntar");
    }
  };

  const handleDiscountSuccess = async () => {
    await loadInventory();
    setSelectedProducts([]);
    setShowDiscountDialog(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_45%,#000_90%)] theme-light:bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-600/10 to-emerald-600/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 mb-6 shadow-[0_8px_32px_rgba(0,168,232,0.3)] theme-light:bg-white theme-light:border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 theme-light:text-gray-900">
                <Sparkles className="w-8 h-8 text-cyan-500" />
                Inventario por Dispositivos
              </h1>
              <p className="text-gray-400 mt-2 theme-light:text-gray-600">
                Piezas y servicios organizados por tipo de equipo
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowReports(true)}
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/10 theme-light:border-emerald-300 theme-light:text-emerald-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Reportes
              </Button>
              <Button
                onClick={() => setShowManageCategories(true)}
                variant="outline"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-600/10 theme-light:border-purple-300 theme-light:text-purple-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Gestionar Categorías
              </Button>
              {selectedProducts.length > 0 && (
                <Button
                  onClick={() => setShowDiscountDialog(true)}
                  className="bg-gradient-to-r from-orange-600 to-red-700 animate-pulse"
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Oferta ({selectedProducts.length})
                </Button>
              )}
              <Button
                onClick={() => setShowSuppliers(true)}
                variant="outline"
                className="bg-background text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 border-cyan-500/20 hover:bg-cyan-600/10 theme-light:border-gray-300"
              >
                <Globe className="w-4 h-4 mr-2" />
                Proveedores
              </Button>
              <Button
                onClick={() => setShowPO(true)}
                variant="outline"
                className="bg-background text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 border-cyan-500/20 hover:bg-cyan-600/10 theme-light:border-gray-300"
              >
                <FileText className="w-4 h-4 mr-2" />
                Órdenes de Compra
              </Button>
              {/* 👇 Botón para crear nueva orden con productos seleccionados (si hay) */}
              <Button
                onClick={() => {
                  setEditingPO(null);
                  setShowPODialog(true);
                }}
                className="bg-gradient-to-r from-sky-600 to-cyan-700 shadow-[0_4px_20px_rgba(0,168,232,0.4)]"
              >
                <Truck className="w-4 h-4 mr-2" />
                Nueva Orden
                {selectedProducts.length > 0 &&
                  ` (${selectedProducts.length})`}
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowItemDialog(true);
                }}
                className="bg-gradient-to-r from-cyan-600 to-emerald-700 shadow-[0_4px_20px_rgba(0,168,232,0.4)]"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nueva Pieza
              </Button>
            </div>
          </div>
        </div>

        {/* Categorías de dispositivos */}
        <div className="bg-black/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 mb-6 theme-light:bg-white theme-light:border-gray-200">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2 theme-light:text-gray-900">
            <Smartphone className="w-5 h-5 text-cyan-400" />
            Categoría de Dispositivo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {deviceCategories.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-white/40 text-sm theme-light:text-gray-600">
                  No hay categorías. Crea una en "Gestionar
                  Categorías"
                </p>
              </div>
            ) : (
              deviceCategories.map((cat) => {
                const IconComponent =
                  ICON_MAP[cat.icon_name] || Smartphone;
                const catValue =
                  cat.icon || cat.name.toLowerCase();
                const count = items.filter(
                  (i) => i.device_category === catValue
                ).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setDeviceCategory(catValue);
                      setPage(1);
                    }}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      deviceCategory === catValue
                        ? "bg-gradient-to-br from-cyan-600 to-emerald-600 text-white border-transparent shadow-[0_8px_24px_rgba(0,168,232,0.4)]"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 theme-light:bg-gray-50 theme-light:border-gray-300"
                    }`}
                  >
                    <IconComponent className="w-8 h-8" />
                    <div className="text-center">
                      <p className="font-bold text-base">
                        {cat.name}
                      </p>
                      <p className="text-xs opacity-70">
                        {count} items
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Filtros de tipo de pieza */}
        <div className="bg-black/40 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6 mb-6 theme-light:bg-white theme-light:border-gray-200">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2 theme-light:text-gray-900">
            <Monitor className="w-5 h-5 text-emerald-400" />
            Tipo de Pieza
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setPartTypeFilter("all");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                partTypeFilter === "all"
                  ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-lg"
                  : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 theme-light:bg-gray-100 theme-light:border-gray-300"
              }`}
            >
              Todas (
              {
                items.filter(
                  (i) => i.device_category === deviceCategory
                ).length
              }
              )
            </button>
            {partTypes
              .filter((pt) => pt.active !== false)
              .map((type) => {
                const IconComponent =
                  ICON_MAP[type.icon_name] || Monitor;
                const count = items.filter(
                  (i) =>
                    i.device_category === deviceCategory &&
                    i.part_type === type.slug
                ).length;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setPartTypeFilter(type.slug);
                      setPage(1);
                    }}
                    className={`flex items.center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      partTypeFilter === type.slug
                        ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-lg"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 theme-light:bg-gray-100 theme-light:border-gray-300"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {type.name} ({count})
                  </button>
                );
              })}
          </div>
        </div>

        {/* Tabs Productos/Ofertas/Servicios */}
        <Tabs
          value={viewTab}
          onValueChange={(v) => {
            setViewTab(v);
            setPage(1);
          }}
          className="mb-6"
        >
          <TabsList className="bg-black/40 border border-cyan-500/20 p-1 w-full grid.grid-cols-3 theme-light:bg-white theme-light:border-gray-200">
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Box className="w-4 h-4 mr-2" />
              Productos
            </TabsTrigger>
            <TabsTrigger
              value="offers"
              className="data-[state=active]:bg-gradient.to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-700 data-[state=active]:text-white"
            >
              <Tag className="w-4 h-4 mr-2" />
              Ofertas
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="data-[state=active]:bg-gradient.to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-700 data-[state=active]:text-white"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Servicios
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Búsqueda */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 theme-light:text-gray-500" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, modelo compatible, proveedor..."
            className="pl-12 h-12 bg-black/25 border-cyan-500/20 text-white text-lg theme-light:bg-white theme-light:border-gray-300"
          />
        </div>

        {/* Grid de items */}
        <div className="min-h-[400px]">
          {pageItems.length === 0 ? (
            <div className="text-center py-16">
              <Box className="w-16 h-16 text-white/20 mx-auto mb-4 theme-light:text-gray-300" />
              <p className="text-white/40 text-lg theme-light:text-gray-600">
                {q
                  ? "No se encontraron resultados"
                  : "No hay items en esta categoría"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {pageItems.map((item) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  isSelected={selectedProducts.some(
                    (p) => p.id === item.id
                  )}
                  onSelect={handleSelectProduct}
                  onEdit={(it) => {
                    setEditing(it);
                    setShowItemDialog(true);
                  }}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Paginación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 text-sm text-white/40 theme-light:text-gray-600">
          <p>
            Mostrando {pageItems.length} de {filtered.length} ítems
          </p>
          <div className="flex.items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={page <= 1}
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              className="border-cyan-500/20 theme-light:border-gray-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3">
              {page} / {pageCount}
            </span>
            <Button
              size="icon"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() =>
                setPage((p) => Math.min(pageCount, p + 1))
              }
              className="border-cyan-500/20 theme-light:border-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dialogs */}
        {showItemDialog && (
          <InventoryItemDialog
            open={showItemDialog}
            onOpenChange={setShowItemDialog}
            value={editing}
            onSave={handleSaveItem}
            deviceCategories={deviceCategories}
            partTypes={partTypes}
            currentDeviceCategory={deviceCategory}
            currentPartType={partTypeFilter}
            suppliers={suppliers}
          />
        )}

        {showReports && (
          <InventoryReports
            open={showReports}
            onClose={() => setShowReports(false)}
          />
        )}

        {showPO && (
          <PurchaseOrdersDialog
            open={showPO}
            onOpenChange={setShowPO}
            orders={poList}
            onUpload={handleUploadPO}
            onEdit={(po) => {
              setEditingPO(po);
              setShowPO(false);
              setShowPOView(true);
            }}
          />
        )}

        {showSuppliers && (
          <SuppliersDialog
            open={showSuppliers}
            onClose={async () => {
              setShowSuppliers(false);
              const supRes =
                await base44.entities.Supplier.list(
                  "-created_date"
                );
              setSuppliers(supRes || []);
            }}
          />
        )}

        {showPODialog && (
          <PurchaseOrderDialog
            open={showPODialog}
            onClose={async (reload) => {
              setShowPODialog(false);
              setEditingPO(null);
              setSelectedProducts([]); // 👈 limpia selección cuando cierras/guardas
              if (reload) await loadInventory(); // 👈 recarga si el dialog indica true
            }}
            purchaseOrder={editingPO}
            suppliers={suppliers}
            products={items}
            workOrders={workOrders}
            initialProducts={selectedProducts} // 👈 pasa selección al wizard
          />
        )}

        {showPOView && editingPO && (
          <PurchaseOrderStatusDialog
            open={showPOView}
            onOpenChange={(open) => {
              if (!open) {
                setShowPOView(false);
                setEditingPO(null);
              }
            }}
            poId={editingPO?.id}
            onUpdated={async () => {
              await loadInventory();
            }}
          />
        )}

        {showDiscountDialog && (
          <SetDiscountDialog
            open={showDiscountDialog}
            onClose={() => setShowDiscountDialog(false)}
            products={selectedProducts}
            onSuccess={handleDiscountSuccess}
          />
        )}

        {showManageCategories && (
          <ManageCategoriesDialog
            open={showManageCategories}
            onClose={() => setShowManageCategories(false)}
            onUpdate={loadInventory}
          />
        )}

        {/* 🤖 Inventory Chatbot */}
        <InventoryChatbot
          products={items.filter(
            (i) => i.part_type !== "servicio"
          )}
          services={items.filter(
            (i) => i.part_type === "servicio"
          )}
          onSelectItem={(item) => {
            setEditing(item);
            setShowItemDialog(true);
          }}
        />
      </div>
    </div>
  );
}
