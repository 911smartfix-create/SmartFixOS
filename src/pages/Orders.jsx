import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Search, Plus, LayoutGrid, List, RefreshCcw, User,
  Smartphone, Laptop, Watch, Gamepad2, Headphones, Camera as CameraIcon, Box, Tablet, Image as ImageIcon, Filter,
  Building2, HandCoins, ChevronRight, FolderOpen,
  ClipboardList, FileText, CheckSquare
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import WorkOrderWizard from "../components/workorder/WorkOrderWizard";
import WorkOrderPanelV2 from "@/components/workorder/WorkOrderPanel";
import { ORDER_STATUSES, getStatusConfig, normalizeStatusId, getActiveStatuses } from "@/components/utils/statusRegistry";
import { SafeOrderService } from "@/components/utils/SafeOrderService";
import AdvancedFilters from "../components/orders/AdvancedFilters";
import CreateInvoiceDialog from "../components/invoice/CreateInvoiceDialog";
import OrdersChatbot from "../components/orders/OrdersChatbot";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

// Hook inline para detectar móvil
function useMobileDetect() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return { isMobile };
}

const CACHE_KEYS = {
  ORDERS: 'orders_cache',
  ORDERS_TS: 'orders_cache_ts',
  FEATURE_FLAGS: 'feature_flags_cache',
  FEATURE_FLAGS_TS: 'feature_flags_ts',
  STATUS_FLOW: 'status_flow_cache',
  STATUS_FLOW_TS: 'status_flow_ts'
};

const CACHE_DURATION = {
  ORDERS: 10 * 60 * 1000,
  FEATURE_FLAGS: 30 * 60 * 1000,
  STATUS_FLOW: 30 * 60 * 1000
};

function getCachedData(key, timestampKey, maxAge) {
  try {
    const timestamp = localStorage.getItem(timestampKey);
    if (!timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > maxAge) {
      localStorage.removeItem(key);
      localStorage.removeItem(timestampKey);
      return null;
    }
    
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch(e) {
    console.warn(`Error reading cache for ${key}:`, e);
    return null;
  }
}

function setCachedData(key, timestampKey, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(timestampKey, String(Date.now()));
  } catch (e) {
    console.warn('Cache storage failed:', e);
  }
}

const norm = (v) => (v ? String(v).toLowerCase() : "");
const onlyDigits = (v) => (v || "").replace(/\D+/g, "");
const stripDiacritics = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const slug = (s) => stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), delay); return () => clearTimeout(id); }, [value, delay]);
  return v;
}

function readURLParams() {
  const qp = new URLSearchParams(window.location.search);
  return {
    q: qp.get("q") || "",
    type: qp.get("type") || "all",
    mine: qp.get("mine") === "1",
    view: qp.get("view") || "board",
    order: qp.get("order") || "",
    hideClosed: qp.get("hideClosed") === "1",
    onlyPriority: qp.get("onlyPriority") === "1",
    b2bOnly: qp.get("b2bOnly") === "1",
    showB2BHub: qp.get("showB2BHub") === "1",
  };
}

function writeURLParams(params) {
  const qp = new URLSearchParams(window.location.search);
  Object.entries(params).forEach(([k, v]) => {
    const remove = v === undefined || v === null || v === "" || v === "all" ||
      (k === "mine" && !v) || (k === "hideClosed" && !v) || (k === "onlyPriority" && !v) ||
      (k === "b2bOnly" && !v) || (k === "showB2BHub" && v === true);
    if (remove) qp.delete(k);
    else qp.set(k, v === true ? "1" : String(v));
  });
  const next = `${window.location.pathname}?${qp.toString()}`;
  window.history.replaceState(null, "", next.endsWith("?") ? next.slice(0, -1) : next);
}

const DEVICE_TYPES = [
  { id: "all", label: "Todos", icon: Box },
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "computer", label: "Computer", icon: Laptop },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "console", label: "Console", icon: Gamepad2 },
  { id: "watch", label: "Watch", icon: Watch },
  { id: "accessory", label: "Accesorio", icon: Headphones },
  { id: "camera", label: "Camera", icon: CameraIcon },
];

function resolveTypeId(o) {
  const src = [
    o?.device_type, o?.device_subcategory, o?.device_family, o?.device_model, o?.device_brand,
  ].filter(Boolean).join(" ").toLowerCase();
  const has = (k) => src.includes(k);
  if (has("phone") || has("smartphone") || has("cell") || has("iphone") || has("galaxy") || has("pixel")) return "phone";
  if (has("tablet") || has("ipad") || has("surface") || has("galaxy tab")) return "tablet";
  if (has("computer") || has("laptop") || has("notebook") || has("macbook") || has("chromebook") || has("desktop") || has("pc") || has("imac")) return "computer";
  if (has("console") || has("playstation") || has("ps4") || has("ps5") || has("nintendo") || has("switch") || has("wii")) return "console";
  if (has("watch") || has("reloj")) return "watch";
  if (has("camera") || has("gopro") || has("canon") || has("nikon") || has("dji") || has("drone")) return "camera";
  if (has("accessory") || has("accesorio") || has("airpods") || has("earbuds") || has("headphones") || has("audifonos") || has("audio")) return "accessory";
  return "other";
}

const DeviceIcon = ({ order }) => {
  const t = resolveTypeId(order);
  const Icon =
    t === "phone" ? Smartphone :
    t === "tablet" ? Tablet :
    t === "computer" ? Laptop :
    t === "watch" ? Watch :
    t === "console" ? Gamepad2 :
    t === "camera" ? CameraIcon :
    t === "accessory" ? Headphones :
                        Box;
  return <Icon className="w-4 h-4" />;
};

function PriorityBadge({ priority }) {
  const p = (priority || "normal").toLowerCase();
  const cls =
    p === "urgent" ? "bg-red-600/20 text-red-300 border-red-600/30" :
    p === "high"   ? "bg-orange-500/20 text-orange-300 border-orange-500/30" :
                     "bg-blue-500/20 text-blue-300 border-blue-500/30";
  const label = p === "urgent" ? "Urgente" : p === "high" ? "Alta" : "Normal";
  return <Badge className={`${cls} text-[9px] px-1.5 py-0`}>{label}</Badge>;
}

function MoneyPill({ amount, label, okColor=false }) {
  const v = Number(amount || 0);
  const cls = v <= 0
    ? (okColor ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/30" : "bg-gray-600/20 text-gray-300 border-gray-600/30")
    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] text-[10px] ${cls}`}>
      {label}: ${v.toFixed(2)}
    </span>
  );
}

function StatPill({ icon: Icon, value, title }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-1.5 py-[1px] text-[10px] text-gray-200">
      <Icon className="w-3.5 h-3.5" /> {title}: {value}
    </span>
  );
}

function OrderCardCompact({ o, onOpen, badgeClass, label, onSelect, isSelected }) {
  const photosCount = Array.isArray(o.photos_metadata) ? o.photos_metadata.length : (Array.isArray(o.device_photos) ? o.device_photos.length : 0);
  const tasksCount = Array.isArray(o.repair_tasks) ? o.repair_tasks.length : 0;

  return (
    <Card 
      onClick={() => onOpen(o.id)} 
      className={`cursor-pointer p-2 rounded-lg bg-[#0F0F12] hover:border-white/20 transition ${
        isSelected ? 'border-orange-500 ring-2 ring-orange-500/40' : 'border-white/10'
      }`}
    >
      <div className="flex items-start gap-2">
        {onSelect && (
          <div 
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer ${
              isSelected ? 'bg-orange-500 border-orange-500' : 'border-cyan-500/40'
            }`}
            onClick={(e) => { e.stopPropagation(); onSelect(o); }}
          >
            {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
          </div>
        )}
        <div className="w-8 h-8 rounded-md bg-white/10 grid place-items-center text-white/80">
          <DeviceIcon order={o} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-white truncate text-[13px]">{o.order_number || "SIN #ORDEN"}</p>
            <Badge className={`${badgeClass} text-[9px] px-1.5 py-0`}>{label}</Badge>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-gray-400">
            <span className="truncate">{o.customer_name || "—"}{o.customer_phone ? ` • ${o.customer_phone}` : ""}</span>
            <span className="whitespace-nowrap">{o.created_date ? format(new Date(o.created_date), "dd MMM", { locale: es }) : "—"}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-gray-500 truncate">{(o.device_brand || "") + " " + (o.device_model || "")}</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="flex-1 bg-white/10 rounded-full h-1 overflow-hidden">
              <div className="bg-gradient-to-r from-[#FF0000] to-red-700 h-full rounded-full" style={{ width: `${Math.max(0, Math.min(Number(o.progress_percentage || 0), 100))}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{Math.round(Number(o.progress_percentage || 0))}%</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={o.priority} />
            {o.paid ? <MoneyPill amount={o.amount_paid} label="Pagado" okColor /> : <MoneyPill amount={o.balance_due} label="Saldo" />}
            {tasksCount > 0 && <StatPill icon={List} value={tasksCount} title="Tareas" />}
            {photosCount > 0 && <StatPill icon={ImageIcon} value={photosCount} title="Fotos" />}
          </div>
        </div>
      </div>
    </Card>
  );
}

function KanbanColumnLimited({
  status, items, onOpen, onDropOrder, statusLabel, badgeClass,
  limit, expanded, onToggleExpand, onSelect, selectedOrders = []
}) {
  const allowDrop = (e) => e.preventDefault();
  const visible = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <div
      className="flex-1 min-w-[260px] bg-black/25 border border-white/10 rounded-lg p-2"
      onDragOver={allowDrop}
      onDrop={(e) => { e.preventDefault(); const orderId = e.dataTransfer.getData("text/plain"); if (orderId) onDropOrder(orderId, status); }}
    >
      <div className="flex items-center justify-between pb-1 border-b border-white/10">
        <p className="text-[12px] font-semibold text-white/90 truncate">{statusLabel}</p>
        <span className="text-[10px] text-gray-400">{items.length}</span>
      </div>

      <div className="mt-2 space-y-2">
        {visible.length === 0 ? (
          <div className="text-[11px] text-gray-500 bg-black/20 border border-dashed border-white/10 rounded p-2 text-center">Vacío</div>
        ) : visible.map((o) => (
          <div key={o.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)} className="active:opacity-70">
            <OrderCardCompact 
              o={o} 
              onOpen={onOpen} 
              badgeClass={badgeClass} 
              label={statusLabel}
              onSelect={onSelect}
              isSelected={selectedOrders.some(so => so.id === o.id)}
            />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-2">
          <Button
            variant="outline"
            className="w-full h-7 text-[12px] border-white/15 bg-zinc-900/60"
            onClick={() => onToggleExpand(status)}
          >
            {expanded ? "Ver menos" : `Ver más (${items.length - visible.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}

function MobileGroupLimited({ status, items, onOpen, statusLabel, badgeClass, limit, onSelect, selectedOrders = [] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;

  return (
    <details open={open} onToggle={(e)=>setOpen(e.target.open)} className="rounded-lg border border-white/10 bg-black/25 overflow-hidden">
      <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none">
        <span className="text-[13px] font-semibold">{statusLabel}</span>
        <span className="text-[10px] text-gray-400">{items.length} {open ? "▴" : "▾"}</span>
      </summary>
      <div className="px-2 pb-2 space-y-2">
        {visible.length ? visible.map((o) => (
          <OrderCardCompact key={o.id} o={o} onOpen={onOpen} badgeClass={badgeClass} label={statusLabel} />
        )) : (
          <div className="text-[11px] text-gray-500 bg-black/20 border border-dashed border-white/10 rounded p-2 text-center">Vacío</div>
        )}
        {hasMore && (
          <Button
            variant="outline"
            className="w-full h-8 text-[12px] border-white/15 bg-zinc-900/60"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? "Ver menos" : `Ver más (${items.length - visible.length})`}
          </Button>
        )}
      </div>
    </details>
  );
}

const COLOR_CLASSES = [
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "bg-cyan-500/20 text-cyan-300 border-cyan-300/30",
  "bg-pink-500/20 text-pink-500/30",
  "bg-green-600/20 text-green-300 border-green-600/30",
  "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
  "bg-gray-600/20 text-gray-300 border-gray-600/30",
  "bg-red-600/20 text-red-300 border-red-600/30",
];

function B2BHub({ orders, onOpen, onFilterCompany }) {
  const [selectedCompany, setSelectedCompany] = useState(null);

  const groups = useMemo(() => {
    const map = {};
    (orders || []).forEach((o) => {
      const key = o.company_id || o.company_name || "—";
      if (!key) return;
      if (!map[key]) map[key] = { name: o.company_name || key, id: o.company_id, items: [] };
      map[key].items.push(o);
    });
    return Object.values(map).sort((a, b) => (b.items.length - a.items.length));
  }, [orders]);

  if (!groups.length) {
    return (
      <div className="text-[12px] text-gray-400 bg-black/20 border border-dashed border-white/10 rounded p-3">
        No hay órdenes con empresa (B2B).
      </div>
    );
  }

  // Si hay empresa seleccionada, mostrar sus órdenes
  if (selectedCompany) {
    const companyOrders = selectedCompany.items;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setSelectedCompany(null)}
            className="border-white/15 bg-zinc-900/60 h-8 text-[12px]">
            ← Volver
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-bold">{selectedCompany.name}</h3>
            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
              {companyOrders.length} órdenes
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {companyOrders.map(order => (
            <Card key={order.id} className="p-3 rounded-lg bg-[#0F0F12] border-white/10 hover:border-purple-500/30 transition cursor-pointer" onClick={() => onOpen(order.id)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-white font-semibold text-sm">#{order.order_number}</p>
                <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 text-xs">
                  {order.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-300">
                {order.device_brand} {order.device_model}
              </p>
              {order.device_serial && (
                <p className="text-xs text-gray-500 font-mono mt-1">{order.device_serial}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {format(new Date(order.created_date), "dd MMM", { locale: es })}
                </span>
                <span className="text-white font-bold">${Number(order.cost_estimate || 0).toFixed(2)}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Vista principal: solo empresas
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[12px] text-gray-300">
        <Building2 className="w-4 h-4" />
        <span className="font-semibold">Empresas con órdenes</span>
        <span className="text-gray-500">({groups.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
        {groups.map((g) => {
          const open = g.items.filter((x) => !["delivered","cancelled"].includes(slug(x.status || "")));
          const closed = g.items.length - open.length;
          const balance = open.reduce((s, it) => s + Number(it.balance_due || 0), 0);

          return (
            <Card 
              key={g.id || g.name} 
              className="p-3 rounded-lg bg-[#0F0F12] border-white/10 hover:border-purple-500/40 transition cursor-pointer"
              onClick={() => setSelectedCompany(g)}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-white/80" />
                    <p className="font-semibold text-white truncate">{g.name}</p>
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-400">
                    {open.length} abiertas · {closed} cerradas
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-[2px] text-[11px] text-amber-300">
                    <HandCoins className="w-3.5 h-3.5" /> ${balance.toFixed(2)}
                  </div>
                </div>
              </div>


            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const initial = readURLParams();
  const { isMobile } = useMobileDetect();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [view, setView] = useState(initial.view || localStorage.getItem("wo:view") || "board");

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    customerName: "",
    customerId: "",
    deviceBrand: "",
    deviceModel: "",
    dateRangeType: "any",
    dateFrom: null,
    dateTo: null,
    statuses: []
  });

  const [hideClosed, setHideClosed] = useState(true);
  const [onlyPriority, setOnlyPriority] = useState(false);
  const [b2bOnly, setB2bOnly] = useState(false);
  const [showB2BHub, setShowB2BHub] = useState(false);
  const [limitPerColumn, setLimitPerColumn] = useState(Number(localStorage.getItem("wo:limitPerColumn") || 2));
  const [pageSize, setPageSize] = useState(Number(localStorage.getItem("wo:listPageSize") || 30));
  const [page, setPage] = useState(1);
  const [columnCount, setColumnCount] = useState(Number(localStorage.getItem("wo:columnCount") || 2));
  const [expandedStatuses, setExpandedStatuses] = useState(new Set());

  const debouncedSearch = useDebounced(search, 250);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  const [session, setSession] = useState(() => { try { return JSON.parse(sessionStorage.getItem("911-session") || "null"); } catch { return null; } });
  
  useEffect(() => { 
    const iv = setInterval(() => { 
      try { 
        setSession(JSON.parse(sessionStorage.getItem("911-session") || "null")); 
      } catch {} 
    }, 8000); 
    return () => clearInterval(iv); 
  }, []);

  const [statusOrder, setStatusOrder] = useState([
    "intake","diagnosing","awaiting_approval","waiting_parts","in_progress","reparacion_externa","ready_for_pickup","delivered","cancelled"
  ]);
  const [statusLabels, setStatusLabels] = useState({
    intake:"Recepción", diagnosing:"Diagnóstico", awaiting_approval:"Por aprobar",
    waiting_parts:"Esperando piezas", in_progress:"En reparación", reparacion_externa:"Reparación externa",
    ready_for_pickup:"Listo", delivered:"Entregado", cancelled:"Cancelado",
  });
  const [statusColors, setStatusColors] = useState({
    intake: COLOR_CLASSES[0], diagnosing: COLOR_CLASSES[1], awaiting_approval: COLOR_CLASSES[2],
    waiting_parts: COLOR_CLASSES[3], in_progress: COLOR_CLASSES[4], reparacion_externa: COLOR_CLASSES[5],
    ready_for_pickup: COLOR_CLASSES[6], delivered: COLOR_CLASSES[7], cancelled: COLOR_CLASSES[8],
  });

  const [featureFlags, setFeatureFlags] = useState({
    deep_link_open_order: true,
    unified_status_registry: true
  });

  useEffect(() => {
    const loadFlags = async () => {
      try {
        const cached = getCachedData(CACHE_KEYS.FEATURE_FLAGS, CACHE_KEYS.FEATURE_FLAGS_TS, CACHE_DURATION.FEATURE_FLAGS);
        if (cached) {
          setFeatureFlags(cached);
          return;
        }

        let user = null;
        try {
          user = await base44.auth.me();
        } catch (e) {
          const defaults = { deep_link_open_order: true, unified_status_registry: true };
          setFeatureFlags(defaults);
          setCachedData(CACHE_KEYS.FEATURE_FLAGS, CACHE_KEYS.FEATURE_FLAGS_TS, defaults);
          return;
        }

        if (!user) {
          const defaults = { deep_link_open_order: true, unified_status_registry: true };
          setFeatureFlags(defaults);
          setCachedData(CACHE_KEYS.FEATURE_FLAGS, CACHE_KEYS.FEATURE_FLAGS_TS, defaults);
          return;
        }

        const rows = await base44.entities.SystemConfig.filter({ key: "feature_flags" }).catch(() => []);
        const raw = rows?.[0]?.value || rows?.[0]?.value_json;
        let flags = { deep_link_open_order: true, unified_status_registry: true };
        
        if (typeof raw === "string") {
          try { flags = { ...flags, ...JSON.parse(raw) }; } catch (e) { console.error("Error parsing feature flags:", e); }
        } else if (typeof raw === "object" && raw !== null) {
          flags = { ...flags, ...raw };
        }
        
        setFeatureFlags(flags);
        setCachedData(CACHE_KEYS.FEATURE_FLAGS, CACHE_KEYS.FEATURE_FLAGS_TS, flags);
      } catch (e) {
        console.error("Error loading feature flags:", e.message || e);
        const defaults = { deep_link_open_order: true, unified_status_registry: true };
        setFeatureFlags(defaults);
        setCachedData(CACHE_KEYS.FEATURE_FLAGS, CACHE_KEYS.FEATURE_FLAGS_TS, defaults);
      }
    };
    loadFlags();
  }, []);

  async function loadStatusFlowFromConfig() {
    const hardcodedDefaultOrder = [
      "intake","diagnosing","awaiting_approval","waiting_parts","in_progress","reparacion_externa","ready_for_pickup","delivered","cancelled"
    ];
    const hardcodedDefaultLabels = {
      intake:"Recepción", diagnosing:"Diagnóstico", awaiting_approval:"Por aprobar",
      waiting_parts:"Esperando piezas", in_progress:"En reparación", reparacion_externa:"Reparación externa",
      ready_for_pickup:"Listo", delivered:"Entregado", cancelled:"Cancelado",
    };
    const hardcodedDefaultColors = {};
    hardcodedDefaultOrder.forEach((st, i) => hardcodedDefaultColors[st] = COLOR_CLASSES[i % COLOR_CLASSES.length]);

    try {
      const cached = getCachedData(CACHE_KEYS.STATUS_FLOW, CACHE_KEYS.STATUS_FLOW_TS, CACHE_DURATION.STATUS_FLOW);
      if (cached) {
        setStatusOrder(cached.order);
        setStatusLabels(cached.labels);
        setStatusColors(cached.colors);
        return;
      }

      let user = null;
      try {
        user = await base44.auth.me();
      } catch (e) {
        setStatusOrder(hardcodedDefaultOrder);
        setStatusLabels(hardcodedDefaultLabels);
        setStatusColors(hardcodedDefaultColors);
        setCachedData(CACHE_KEYS.STATUS_FLOW, CACHE_KEYS.STATUS_FLOW_TS, {
          order: hardcodedDefaultOrder,
          labels: hardcodedDefaultLabels,
          colors: hardcodedDefaultColors
        });
        return;
      }

      if (!user) {
        setStatusOrder(hardcodedDefaultOrder);
        setStatusLabels(hardcodedDefaultLabels);
        setStatusColors(hardcodedDefaultColors);
        setCachedData(CACHE_KEYS.STATUS_FLOW, CACHE_KEYS.STATUS_FLOW_TS, {
          order: hardcodedDefaultOrder,
          labels: hardcodedDefaultLabels,
          colors: hardcodedDefaultColors
        });
        return;
      }

      let defaultStatusOrder = [];
      let defaultStatusLabels = {};
      let defaultStatusColors = {};

      if (featureFlags.unified_status_registry) {
        const activeStatuses = getActiveStatuses();
        defaultStatusOrder = activeStatuses.map(s => s.id);
        activeStatuses.forEach(s => {
          const config = getStatusConfig(s.id);
          if (config) {
            defaultStatusLabels[s.id] = config.label;
            defaultStatusColors[s.id] = config.colorClass;
          }
        });
      } else {
        defaultStatusOrder = [...hardcodedDefaultOrder];
        defaultStatusLabels = { ...hardcodedDefaultLabels };
        hardcodedDefaultOrder.forEach((st, i) => hardcodedDefaultColors[st] = COLOR_CLASSES[i % COLOR_CLASSES.length]);
      }

      const rows = await base44.entities.SystemConfig.filter({ key: "repair_status.flow_csv" }).catch(e => {
        console.warn("[Orders] Could not load SystemConfig, using defaults:", e.message);
        return [];
      });
      
      const row = Array.isArray(rows) && rows[0];
      const raw = row?.value || row?.value_json || "";
      let csv = typeof raw === "string" ? raw : (raw?.flow || "");
      const parsed = csv.split(",").map(s => s.trim()).filter(Boolean);

      if (parsed.length) {
        const ids = parsed.map(s => slug(s));
        const customLabels = {}; 
        ids.forEach((id, i) => customLabels[id] = parsed[i]);

        defaultStatusLabels = { ...defaultStatusLabels, ...customLabels };
        defaultStatusOrder = ids;

        if (!featureFlags.unified_status_registry) {
            const terminal = ["delivered","cancelled"];
            terminal.forEach(t => { if (!defaultStatusOrder.includes(t)) defaultStatusOrder.push(t); });
        }
      }

      const finalStatusColors = {};
      defaultStatusOrder.forEach((st, i) => {
          if (featureFlags.unified_status_registry) {
              const config = getStatusConfig(st);
              finalStatusColors[st] = config ? config.colorClass : COLOR_CLASSES[i % COLOR_CLASSES.length];
          } else {
              finalStatusColors[st] = COLOR_CLASSES[i % COLOR_CLASSES.length];
          }
      });

      setStatusOrder(defaultStatusOrder);
      setStatusLabels(defaultStatusLabels);
      setStatusColors(finalStatusColors);
      
      setCachedData(CACHE_KEYS.STATUS_FLOW, CACHE_KEYS.STATUS_FLOW_TS, {
        order: defaultStatusOrder,
        labels: defaultStatusLabels,
        colors: finalStatusColors
      });

    } catch (e) {
      console.error("[Orders] Error loading status flow from config:", e.message || e);
      setStatusOrder(hardcodedDefaultOrder);
      setStatusLabels(hardcodedDefaultLabels);
      setStatusColors(hardcodedDefaultColors);
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/") { 
        e.preventDefault(); 
        document.getElementById("wo-search")?.focus?.(); 
      }
      if (e.key === "r" || e.key === "R") {
        localStorage.removeItem(CACHE_KEYS.ORDERS);
        localStorage.removeItem(CACHE_KEYS.ORDERS_TS);
        setRefreshTick(t => t + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    writeURLParams({ q: search, type: typeFilter, mine: mineOnly, view, hideClosed, onlyPriority, b2bOnly, showB2BHub });
    localStorage.setItem("wo:q", search);
    localStorage.setItem("wo:type", typeFilter);
    localStorage.setItem("wo:mine", mineOnly ? "1" : "0");
    localStorage.setItem("wo:view", view);
    localStorage.setItem("wo:hideClosed", hideClosed ? "1" : "0");
    localStorage.setItem("wo:onlyPriority", onlyPriority ? "1" : "0");
    localStorage.setItem("wo:b2bOnly", b2bOnly ? "1" : "0");
    localStorage.setItem("wo:showB2BHub", showB2BHub ? "1" : "0");
    localStorage.setItem("wo:limitPerColumn", String(limitPerColumn));
    localStorage.setItem("wo:listPageSize", String(pageSize));
    localStorage.setItem("wo:columnCount", String(columnCount));
  }, [search, typeFilter, mineOnly, view, hideClosed, onlyPriority, b2bOnly, showB2BHub, limitPerColumn, pageSize, columnCount]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);

        const cached = getCachedData(CACHE_KEYS.ORDERS, CACHE_KEYS.ORDERS_TS, CACHE_DURATION.ORDERS);
        if (cached) {
          if (mounted) {
            setOrders(cached);
            setLoading(false);
          }
        }

        let user = null;
        try {
          user = await base44.auth.me();
        } catch (e) {
          if (mounted) {
            setLoading(false);
            if (!cached) setOrders([]);
          }
          return;
        }

        if (!user) {
          if (mounted) {
            setLoading(false);
            if (!cached) setOrders([]);
          }
          return;
        }

        await loadStatusFlowFromConfig();
        
        const fetchWithTimeout = (promise, timeout = 30000) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Request timeout")), timeout)
            )
          ]);
        };

        let data = [];
        try {
          data = await fetchWithTimeout(
            base44.entities.Order.filter({}, "-updated_date", 100),
            30000
          );
        } catch (fetchError) {
          console.error("[Orders] Error fetching orders:", fetchError.message || fetchError);
          
          if (cached) {
            data = cached;
            if (mounted) {
              console.warn("⚠️ Usando datos en caché por error de red.");
            }
          } else {
            const expiredCache = localStorage.getItem(CACHE_KEYS.ORDERS);
            if (expiredCache) {
              try {
                data = JSON.parse(expiredCache);
              } catch (e) {
                data = [];
              }
            } else {
              data = [];
            }
          }
          
          if (mounted && !cached) {
            console.warn("⚠️ No se pudieron cargar las órdenes. Mostrando datos disponibles.");
          }
        }
        
        if (!mounted) return;
        
        const ordersArray = Array.isArray(data) ? data : [];
        setOrders(ordersArray);
        
        if (ordersArray.length > 0) {
          setCachedData(CACHE_KEYS.ORDERS, CACHE_KEYS.ORDERS_TS, ordersArray);
        }
        
        setLoading(false);

        const orderIdFromUrl = new URLSearchParams(window.location.search).get("order") || "";
        if (orderIdFromUrl && featureFlags.deep_link_open_order) {
          try {
            const found = ordersArray.find((x) => x.id === orderIdFromUrl) ||
                         (await base44.entities.Order.get(orderIdFromUrl).catch(() => null));
            if (found) {
              setSelectedOrder(found);
            }
          } catch (e) {
            console.error("[Orders] Error loading order from URL:", e.message || e);
          }
        }
      } catch (e) {
        console.error("[Orders] Error initial load:", e.message || e);
        if (mounted) {
          setLoading(false);
          
          try {
            const fallbackCache = localStorage.getItem(CACHE_KEYS.ORDERS);
            if (fallbackCache) {
              const fallbackData = JSON.parse(fallbackCache);
              setOrders(Array.isArray(fallbackData) ? fallbackData : []);
            } else {
              setOrders([]);
            }
          } catch (cacheError) {
            setOrders([]);
          }
        }
      }
    };
    load();
    
    return () => { mounted = false; };
  }, [refreshTick, featureFlags]);

  useEffect(() => {
    if (refreshTick === 0) return;
    
    let mounted = true;
    const refresh = async () => {
      if (isRefreshing) return;

      try {
        setIsRefreshing(true);
        
        let user = null;
        try {
          user = await base44.auth.me();
        } catch (e) {
          setIsRefreshing(false);
          return;
        }

        if (!user) {
          setIsRefreshing(false);
          return;
        }

        await loadStatusFlowFromConfig();
        
        const fetchWithRetry = async (retries = 2) => {
          try {
            const promise = base44.entities.Order.filter({}, "-updated_date", 100);
            const timeout = new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Request timeout")), 30000)
            );
            return await Promise.race([promise, timeout]);
          } catch (error) {
            if (retries > 0 && (
              String(error.message).includes("timeout") ||
              String(error.message).includes("Network") ||
              String(error.message).includes("Failed to fetch")
            )) {
              console.warn(`[Orders] Retrying refresh (${retries} left)...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
              return fetchWithRetry(retries - 1);
            }
            throw error;
          }
        };

        let data = [];
        try {
          data = await fetchWithRetry(2);
        } catch (fetchError) {
          console.error("[Orders] Error refreshing orders:", fetchError.message || fetchError);
          
          if (!mounted) return;
          
          const cachedOrders = getCachedData(CACHE_KEYS.ORDERS, CACHE_KEYS.ORDERS_TS, CACHE_DURATION.ORDERS * 2);
          if (cachedOrders) {
            console.warn("⚠️ Error de red. Mostrando datos en caché.");
            setOrders(cachedOrders);
            setCachedData(CACHE_KEYS.ORDERS, CACHE_KEYS.ORDERS_TS, cachedOrders);
          } else {
            console.warn("⚠️ No se pudo actualizar. Mostrando datos anteriores.");
          }
          return;
        }
        
        if (!mounted) return;
        
        if (Array.isArray(data)) {
          setOrders(data);
          setCachedData(CACHE_KEYS.ORDERS, CACHE_KEYS.ORDERS_TS, data);
        }
        
        if (selectedOrder?.id) {
          try { 
            const latest = await base44.entities.Order.get(selectedOrder.id).catch(() => null); 
            if (latest) setSelectedOrder(latest); 
          } catch (e) { 
            console.error("[Orders] Error refreshing selected order:", e.message || e); 
          }
        }
      } catch (e) {
        console.error("[Orders] Error refreshing:", e.message || e);
      } finally {
        setIsRefreshing(false);
      }
    };
    
    const timeoutId = setTimeout(refresh, 1500);
    return () => { 
      clearTimeout(timeoutId);
      mounted = false; 
    };
  }, [refreshTick, featureFlags, selectedOrder?.id, isRefreshing]);

  const refreshNow = useCallback(() => {
    if (isRefreshing) {
      console.log("[Orders] Already refreshing, skipping manual refresh.");
      return;
    }
    
    console.log("[Orders] Manual refresh triggered.");
    localStorage.removeItem(CACHE_KEYS.ORDERS);
    localStorage.removeItem(CACHE_KEYS.ORDERS_TS);
    setRefreshTick(t => t + 1);
  }, [isRefreshing]);

  const filtered = useMemo(() => {
    let data = [...orders];

    if (b2bOnly) data = data.filter((o) => !!(o.company_id || o.company_name));
    if (typeFilter !== "all") {
      data = data.filter((o) => resolveTypeId(o) === typeFilter);
    }
    if (mineOnly && session?.userId) data = data.filter((o) => o.assigned_to === session.userId);
    if (onlyPriority) data = data.filter((o) => ["high", "urgent"].includes((o.priority || "normal").toLowerCase()));

    if (advancedFilters.customerName) {
      const searchTerm = advancedFilters.customerName.toLowerCase();
      data = data.filter(o => 
        (o.customer_name || "").toLowerCase().includes(searchTerm)
      );
    }
    if (advancedFilters.customerId) {
      data = data.filter(o => o.customer_id === advancedFilters.customerId);
    }

    if (advancedFilters.deviceBrand && advancedFilters.deviceBrand !== "all") {
      data = data.filter(o => 
        (o.device_brand || "").toLowerCase() === advancedFilters.deviceBrand.toLowerCase()
      );
    }
    if (advancedFilters.deviceModel && advancedFilters.deviceModel !== "all") {
      data = data.filter(o => 
        (o.device_model || "").toLowerCase() === advancedFilters.deviceModel.toLowerCase()
      );
    }

    if (advancedFilters.dateRangeType !== "any" && advancedFilters.dateFrom && advancedFilters.dateTo) {
      const dateField = advancedFilters.dateRangeType === "created" ? "created_date" : "updated_date";
      const from = startOfDay(advancedFilters.dateFrom);
      const to = endOfDay(advancedFilters.dateTo);
      
      data = data.filter(o => {
        if (!o[dateField]) return false;
        const orderDate = new Date(o[dateField]);
        return isWithinInterval(orderDate, { start: from, end: to });
      });
    }

    if (advancedFilters.statuses.length > 0) {
      data = data.filter(o => {
        const orderStatus = normalizeStatusId(o.status);
        return advancedFilters.statuses.includes(orderStatus);
      });
    }

    const q = norm(debouncedSearch);
    const qd = onlyDigits(debouncedSearch);
    if (q || qd) {
      data = data.filter((o) => {
        const phone = onlyDigits(o.customer_phone);
        const serial = norm(o.device_serial);
        return (
          norm(o.order_number).includes(q) ||
          norm(o.customer_name).includes(q) ||
          (qd && phone.includes(qd)) ||
          norm(o.customer_email).includes(q) ||
          norm(o.device_brand).includes(q) ||
          norm(o.device_model).includes(q) ||
          serial.includes(q) ||
          norm(o.rsid || "").includes(q) ||
          norm(o.company_name || "").includes(q)
        );
      });
    }

    data.sort((a, b) => new Date(b.updated_date || b.created_date || 0).getTime() - new Date(a.updated_date || a.created_date || 0).getTime());
    return data;
  }, [orders, typeFilter, mineOnly, debouncedSearch, session?.userId, onlyPriority, b2bOnly, advancedFilters]);

  const stats = useMemo(() => {
    const total = orders.length;
    const activeStatuses = statusOrder.filter(s => !["delivered", "cancelled"].includes(s));
    const active = orders.filter(o => activeStatuses.includes(normalizeStatusId(o.status))).length;
    const completed = orders.filter(o => normalizeStatusId(o.status) === "delivered").length;
    return { total, active, completed };
  }, [orders, statusOrder]);

  const groupedByStatus = useMemo(() => {
    const g = {};
    statusOrder.forEach((s) => (g[s] = []));
    filtered.forEach((o) => {
      const st = slug(o.status || "");
      if (g[st]) g[st].push(o);
      else (g[st] = [o]);
    });
    return g;
  }, [filtered, statusOrder]);

  const openOrder = async (id) => {
    console.log("[Orders:openOrder] called with:", id);
    try { 
      const fresh = await base44.entities.Order.get(id); 
      console.log("[Orders:openOrder] loaded:", fresh?.order_number);
      setSelectedOrder(fresh || filtered.find((x) => x.id === id) || null); 
    }
    catch (e) {
      console.error("[Orders:openOrder] error:", e);
      setSelectedOrder(filtered.find((x) => x.id === id) || null);
    }
  };

  const dropToStatus = async (orderId, nextStatus) => {
    try {
      await base44.entities.Order.update(orderId, { status: nextStatus });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus, updated_date: new Date().toISOString() } : o)));
      localStorage.removeItem(CACHE_KEYS.ORDERS);
      localStorage.removeItem(CACHE_KEYS.ORDERS_TS);
      setRefreshTick(t => t + 1);
    } catch (e) {
      console.error("Error dropping order to status:", e);
    }
  };

  const handleOrderCreated = async (createdOrder) => { 
    setShowCreate(false); 
    localStorage.removeItem(CACHE_KEYS.ORDERS);
    localStorage.removeItem(CACHE_KEYS.ORDERS_TS);
    setRefreshTick((t) => t + 1); 
    if (createdOrder?.id) {
      setSelectedOrder(createdOrder);
    }
  };



  const handleOrderUpdated = async () => {
    localStorage.removeItem(CACHE_KEYS.ORDERS);
    localStorage.removeItem(CACHE_KEYS.ORDERS_TS);
    setRefreshTick((t) => t + 1);
    
    if (selectedOrder?.id) {
      try { 
        const latest = await base44.entities.Order.get(selectedOrder.id);
        if (latest) setSelectedOrder(latest);
      } catch (e) {
        console.warn("Could not refresh selected order, keeping current data:", e);
      }
    }
  };

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search);
    if (selectedOrder?.id && featureFlags.deep_link_open_order) {
      qp.set("order", selectedOrder.id);
    } else {
      qp.delete("order");
    }
    const next = `${window.location.pathname}?${qp.toString()}`;
    window.history.replaceState(null, "", next.endsWith("?") ? next.slice(0, -1) : next);
  }, [selectedOrder?.id, featureFlags.deep_link_open_order]);

  const toggleExpandStatus = (s) => {
    setExpandedStatuses(prev => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });
  };

  const listPageData = useMemo(() => {
    const end = page * pageSize;
    return filtered.slice(0, end);
  }, [filtered, page, pageSize]);

  const b2bOrders = useMemo(() => orders.filter((o) => !!(o.company_id || o.company_name)), [orders]);
  
  const filterByCompany = (name) => {
    setB2bOnly(true);
    setSearch(name);
    setPage(1);
  };

  // ✅ Hub de Clientes Individual
  const [showCustomerHub, setShowCustomerHub] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const individualCustomerOrders = useMemo(() => 
    orders.filter(o => !o.company_id && !o.company_name && o.customer_id),
    [orders]
  );

  const customerGroups = useMemo(() => {
    const map = {};
    individualCustomerOrders.forEach(o => {
      const key = o.customer_id || o.customer_name;
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          id: o.customer_id,
          name: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          items: []
        };
      }
      map[key].items.push(o);
    });
    return Object.values(map).sort((a, b) => b.items.length - a.items.length);
  }, [individualCustomerOrders]);

  const statusCounts = useMemo(() => {
    const counts = {};
    statusOrder.forEach(s => {
      counts[s] = filtered.filter(o => normalizeStatusId(o.status) === s).length;
    });
    return counts;
  }, [filtered, statusOrder]);

  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.customerName) count++;
    if (advancedFilters.customerId) count++;
    if (advancedFilters.deviceBrand && advancedFilters.deviceBrand !== "all") count++;
    if (advancedFilters.deviceModel && advancedFilters.deviceModel !== "all") count++;
    if (advancedFilters.dateRangeType !== "any" && advancedFilters.dateFrom && advancedFilters.dateTo) count++;
    if (advancedFilters.statuses.length > 0) count++;
    return count;
  }, [advancedFilters]);

  return (
    <div className="min-h-screen pb-20">
      {/* === VISTA MÓVIL === */}
      {isMobile ? (
        <div className="px-3 pt-3 space-y-4">
          {/* Header Compacto */}
          <div className="bg-gradient-to-br from-cyan-600/10 to-emerald-600/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-4 theme-light:bg-white theme-light:border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-white flex items-center gap-2 theme-light:text-gray-900">
                <ClipboardList className="w-6 h-6 text-cyan-500" />
                Órdenes
              </h1>
              <Button
                onClick={() => setShowCreate(true)}
                size="sm"
                className="bg-gradient-to-r from-cyan-600 to-emerald-700 h-9"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
              </Button>
            </div>
            <p className="text-xs text-gray-400 theme-light:text-gray-600">
              {stats.total} órdenes • {stats.active} activas
            </p>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar cliente o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-black/40 border-cyan-500/20 text-white text-sm theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
            />
          </div>

          {/* Hubs - Solo en móvil */}
          <div className="space-y-3">
            {/* Hub B2B */}
            <div
              onClick={() => setShowB2BHub(!showB2BHub)}
              className={`bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 rounded-2xl p-5 cursor-pointer transition-all ${
                showB2BHub 
                  ? 'border-purple-500/60 shadow-[0_8px_32px_rgba(168,85,247,0.4)]'
                  : 'border-purple-500/30 hover:border-purple-500/50'
              } theme-light:from-purple-50 theme-light:to-pink-50 theme-light:border-purple-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg theme-light:text-gray-900">Hub Empresas</p>
                    <p className="text-purple-300 text-xs theme-light:text-purple-600">{b2bOrders.length} órdenes B2B</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-purple-300 transition-transform ${showB2BHub ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* Hub Clientes */}
            <div
              onClick={() => setShowCustomerHub(!showCustomerHub)}
              className={`bg-gradient-to-br from-cyan-600/20 to-emerald-600/20 border-2 rounded-2xl p-5 cursor-pointer transition-all ${
                showCustomerHub
                  ? 'border-cyan-500/60 shadow-[0_8px_32px_rgba(0,168,232,0.4)]'
                  : 'border-cyan-500/30 hover:border-cyan-500/50'
              } theme-light:from-cyan-50 theme-light:to-emerald-50 theme-light:border-cyan-300`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg theme-light:text-gray-900">Hub Clientes</p>
                    <p className="text-cyan-300 text-xs theme-light:text-cyan-600">{customerGroups.length} clientes</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-cyan-300 transition-transform ${showCustomerHub ? 'rotate-90' : ''}`} />
              </div>
            </div>
          </div>

          {/* Contenido de Hubs */}
          {showB2BHub && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <B2BHub orders={b2bOrders} onOpen={openOrder} onFilterCompany={filterByCompany} />
            </div>
          )}

          {showCustomerHub && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              {selectedCustomer ? (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCustomer(null)}
                    className="border-white/15 bg-zinc-900/60 h-9 text-sm w-full">
                    ← Volver a Clientes
                  </Button>
                  <div className="flex items-center gap-2 bg-cyan-600/10 border border-cyan-500/30 rounded-xl p-3 theme-light:bg-cyan-50 theme-light:border-cyan-300">
                    <User className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-white font-bold theme-light:text-gray-900">{selectedCustomer.name}</h3>
                    <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 ml-auto">
                      {selectedCustomer.items.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {selectedCustomer.items.map(order => (
                      <Card key={order.id} className="p-3 rounded-lg bg-[#0F0F12] border-white/10 hover:border-cyan-500/30 transition cursor-pointer theme-light:bg-white" onClick={() => openOrder(order.id)}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-white font-semibold text-sm">#{order.order_number}</p>
                          <Badge className={`${getStatusConfig(order.status).colorClasses} text-xs`}>
                            {getStatusConfig(order.status).label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-300">{order.device_brand} {order.device_model}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {format(new Date(order.created_date), "dd MMM", { locale: es })}
                          </span>
                          <span className="text-white font-bold text-sm">${Number(order.cost_estimate || order.total || 0).toFixed(2)}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerGroups.map(customer => {
                    const open = customer.items.filter(x => !["delivered","cancelled"].includes(normalizeStatusId(x.status || "")));
                    const balance = open.reduce((s, it) => s + Number(it.balance_due || 0), 0);

                    return (
                      <Card 
                        key={customer.id || customer.name}
                        className="p-3 rounded-lg bg-[#0F0F12] border-white/10 hover:border-cyan-500/40 transition cursor-pointer theme-light:bg-white"
                        onClick={() => setSelectedCustomer(customer)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate theme-light:text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-400 theme-light:text-gray-600">{customer.phone}</p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 text-xs theme-light:bg-cyan-100 theme-light:text-cyan-700">
                              {customer.items.length}
                            </Badge>
                            {balance > 0 && (
                              <p className="text-xs text-amber-400 mt-1">${balance.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* === VISTA DESKTOP === */
        <>
          <div className="bg-gradient-to-br from-cyan-600/10 to-emerald-600/10 backdrop-blur-xl border-b border-cyan-500/20 mb-6 rounded-2xl mx-3 mt-3 p-4 sm:p-6 theme-light:bg-white theme-light:border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3 theme-light:text-gray-900">
                  <ClipboardList className="w-8 h-8 text-cyan-500" />
                  Órdenes de Trabajo
                </h1>
                <p className="text-sm text-gray-300 mt-2 theme-light:text-gray-600">
                  {stats.total} órdenes • {stats.active} activas • {stats.completed} completadas
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowInvoiceDialog(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-700 h-12"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Crear Factura B2B
                </Button>
                <Button
                  onClick={() => setShowCreate(true)}
                  className="bg-gradient-to-r from-cyan-600 to-emerald-700 hover:from-cyan-700 hover:to-emerald-800 h-12 shadow-lg shadow-cyan-600/30"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nueva Orden
                </Button>
              </div>
            </div>
          </div>

          <div className="px-3 pb-2 space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <Input
                id="wo-search"
                placeholder="Buscar #, cliente, empresa, teléfono, email, serial/IMEI…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-7 h-9 bg-black/40 border-white/15 text-white text-[13px]"
              />
            </div>

        <div className="flex items-center justify-end gap-1.5">
          <Button 
            variant="outline" 
            className="h-8 px-2 border-white/15 bg-zinc-900/60" 
            onClick={refreshNow} 
            disabled={isRefreshing}
            title="Refrescar (R)"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" className={`h-8 px-2 border-white/15 bg-zinc-900/60 ${view === "board" ? "ring-1 ring-white/30" : ""}`} onClick={() => setView("board")} title="Tablero">
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" className={`h-8 px-2 border-white/15 bg-zinc-900/60 ${view === "list" ? "ring-1 ring-white/30" : ""}`} onClick={() => setView("list")} title="Lista">
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowAdvancedFilters(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
              activeAdvancedFiltersCount > 0
                ? "bg-red-600 text-white border-red-600"
                : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
            }`}
            title="Filtros Avanzados"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {activeAdvancedFiltersCount > 0 && (
              <Badge className="bg-white text-red-600 h-4 px-1 text-[9px]">
                {activeAdvancedFiltersCount}
              </Badge>
            )}
          </button>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {DEVICE_TYPES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setTypeFilter(id); setPage(1); }}
                className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
                  typeFilter === id ? "bg-white text-black border-white" : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setMineOnly((v) => !v); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
              mineOnly ? "bg-white text-black border-white" : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
            }`}
            title="Asignadas a mí"
          >
            <User className="w-3.5 h-3.5" />
            Mías
          </button>

          <button
            onClick={() => { setOnlyPriority(v => !v); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
              onlyPriority ? "bg-white text-black border-white" : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
            }`}
            title="Mostrar solo Alta/Urgente"
          >
            <Filter className="w-3.5 h-3.5" />
            Solo prioridad
          </button>

          <button
            onClick={() => setHideClosed(v => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
              hideClosed ? "bg-white text-black border-white" : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
            }`}
            title="Ocultar/Mostrar cerradas"
          >
            {hideClosed ? "Cerradas ocultas" : "Mostrar cerradas"}
          </button>

          <button
            onClick={() => { setB2bOnly(v => !v); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
              b2bOnly ? "bg-white text-black border-white" : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
            }`}
            title="Mostrar solo órdenes con empresa"
          >
            <Building2 className="w-3.5 h-3.5" />
            Solo B2B
          </button>

          <button
            onClick={() => {
              setShowB2BHub(v => !v);
              if (!showB2BHub) setShowCustomerHub(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
              showB2BHub ? "bg-emerald-500 text-black border-emerald-500" : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
            }`}
            title="Mostrar/ocultar Hub B2B"
          >
            Hub B2B
          </button>

          <button
            onClick={() => {
              setShowCustomerHub(v => !v);
              if (!showCustomerHub) setShowB2BHub(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] transition ${
              showCustomerHub ? "bg-cyan-500 text-black border-cyan-500" : "bg-black/30 border-white/15 text-gray-200 hover:bg-white/10"
            }`}
            title="Mostrar/ocultar Hub de Clientes"
          >
            <User className="w-3.5 h-3.5" />
            Hub Clientes
          </button>

          <div className="ml-auto flex items-center gap-1">
            <label className="text-[11px] text-gray-400">Límite/col:</label>
            <select
              value={limitPerColumn}
              onChange={(e)=>setLimitPerColumn(Number(e.target.value))}
              className="h-7 text-[11px] bg-black/30 border border-white/15 rounded px-2 text-gray-200"
            >
              {[2,5,8,10,12,15,20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            {view === "board" && (
              <>
                <label className="text-[11px] text-gray-400 ml-2">Columnas:</label>
                <select
                  value={columnCount}
                  onChange={(e)=>setColumnCount(Number(e.target.value))}
                  className="h-7 text-[11px] bg-black/30 border border-white/15 rounded px-2 text-gray-200"
                >
                  {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </>
            )}

            {view === "list" && (
              <>
                <label className="text-[11px] text-gray-400 ml-2">Página:</label>
                <select
                  value={pageSize}
                  onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}
                  className="h-7 text-[11px] bg-black/30 border border-white/15 rounded px-2 text-gray-200"
                >
                  {[15,20,30,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </>
            )}
          </div>
            </div>
          </div>

          {showB2BHub ? (
            <div className="px-3 pt-2">
              <B2BHub
                orders={b2bOrders}
                onOpen={openOrder}
                onFilterCompany={filterByCompany}
              />
            </div>
          ) : showCustomerHub ? (
        <div className="px-3 pt-2">
          {selectedCustomer ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCustomer(null)}
                  className="border-white/15 bg-zinc-900/60 h-8 text-[12px]">
                  ← Volver
                </Button>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-white font-bold">{selectedCustomer.name}</h3>
                  <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30">
                    {selectedCustomer.items.length} órdenes
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {selectedCustomer.items.map(order => (
                  <Card key={order.id} className="p-3 rounded-lg bg-[#0F0F12] border-white/10 hover:border-cyan-500/30 transition cursor-pointer" onClick={() => openOrder(order.id)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white font-semibold text-sm">#{order.order_number}</p>
                      <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 text-xs">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-300">
                      {order.device_brand} {order.device_model}
                    </p>
                    {order.device_serial && (
                      <p className="text-xs text-gray-500 font-mono mt-1">{order.device_serial}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">
                        {format(new Date(order.created_date), "dd MMM", { locale: es })}
                      </span>
                      <span className="text-white font-bold">${Number(order.cost_estimate || order.total || 0).toFixed(2)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[12px] text-gray-300">
                <User className="w-4 h-4" />
                <span className="font-semibold">Clientes con órdenes</span>
                <span className="text-gray-500">({customerGroups.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
                {customerGroups.map(customer => {
                  const open = customer.items.filter(x => !["delivered","cancelled"].includes(normalizeStatusId(x.status || "")));
                  const closed = customer.items.length - open.length;
                  const balance = open.reduce((s, it) => s + Number(it.balance_due || 0), 0);

                  return (
                    <Card 
                      key={customer.id || customer.name}
                      className="p-3 rounded-lg bg-[#0F0F12] border-white/10 hover:border-cyan-500/40 transition cursor-pointer"
                      onClick={() => setSelectedCustomer(customer)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-white/80" />
                            <p className="font-semibold text-white truncate">{customer.name}</p>
                          </div>
                          <div className="mt-0.5 text-[11px] text-gray-400">
                            {customer.phone}
                          </div>
                          <div className="mt-0.5 text-[11px] text-gray-400">
                            {open.length} abiertas · {closed} cerradas
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-[2px] text-[11px] text-amber-300">
                            <HandCoins className="w-3.5 h-3.5" /> ${balance.toFixed(2)}
                          </div>
                        </div>
                        </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
            </div>
          ) : (
            <main className="flex-1 overflow-hidden">
          {loading ? (
          <div className="p-3 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="p-2 rounded-lg bg-[#101012] border-white/10 animate-pulse h-[74px]" />
            ))}
          </div>
        ) : view === "board" ? (
          <>
            <div className="hidden md:block h-full overflow-x-auto px-3 py-2">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(260px, 1fr))` }}
              >
                {statusOrder
                  .filter(s => !(hideClosed && (s === "delivered" || s === "cancelled")))
                  .map((s, idx) => (
                    <KanbanColumnLimited
                      key={s}
                      status={s}
                      items={(groupedByStatus[s] || [])}
                      onOpen={openOrder}
                      onDropOrder={dropToStatus}
                      statusLabel={statusLabels[s] || s}
                      badgeClass={statusColors[s] || COLOR_CLASSES[idx % COLOR_CLASSES.length]}
                      limit={limitPerColumn}
                      expanded={expandedStatuses.has(s)}
                      onToggleExpand={toggleExpandStatus}
                      onSelect={null}
                      selectedOrders={[]}
                    />
                ))}
              </div>

              {!hideClosed && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 px-1 mb-1">Cerradas</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(2, Math.min(4, columnCount))}, minmax(260px, 1fr))` }}>
                    {["delivered","cancelled"].map((s, idx) => (
                      <KanbanColumnLimited
                        key={s}
                        status={s}
                        items={(groupedByStatus[s] || [])}
                        onOpen={openOrder}
                        onDropOrder={dropToStatus}
                        statusLabel={statusLabels[s] || s}
                        badgeClass={statusColors[s] || COLOR_CLASSES[idx % COLOR_CLASSES.length]}
                        limit={limitPerColumn}
                        expanded={expandedStatuses.has(s)}
                        onToggleExpand={toggleExpandStatus}
                        onSelect={null}
                        selectedOrders={[]}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:hidden h-full overflow-y-auto px-3 py-2 space-y-2">
              {statusOrder
                .filter(s => !(hideClosed && ["delivered","cancelled"].includes(s)))
                .map((s, idx) => (
                  <MobileGroupLimited
                    key={s}
                    status={s}
                    items={(groupedByStatus[s] || [])}
                    onOpen={openOrder}
                    statusLabel={statusLabels[s] || s}
                    badgeClass={statusColors[s] || COLOR_CLASSES[idx % COLOR_CLASSES.length]}
                    limit={limitPerColumn}
                    onSelect={null}
                    selectedOrders={[]}
                  />
                ))}
                </div>
          </>
        ) : (
          <div className="px-3 py-2 max-w-6xl mx-auto space-y-1.5">
            {listPageData.map((o) => {
              const st = slug(o.status || "");
              const lbl = statusLabels[st] || o.status || "";
              const cls = statusColors[st] || COLOR_CLASSES[0];
              const photosCount = Array.isArray(o.photos_metadata) ? o.photos_metadata.length : (Array.isArray(o.device_photos) ? o.device_photos.length : 0);
              const tasksCount = Array.isArray(o.repair_tasks) ? o.repair_tasks.length : 0;
              return (
                <div key={o.id} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center rounded-lg border border-white/10 bg-[#101012] px-2 py-2 hover:border-white/20">
                  <div className="w-8 h-8 rounded-md bg-white/10 grid place-items-center text-white/80">
                    <DeviceIcon order={o} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate text-[13px]">
                          {o.order_number || "SIN #ORDEN"} {o.company_name ? <span className="text-[11px] text-emerald-300 ml-1">· {o.company_name}</span> : null}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {o.customer_name || "—"}{o.customer_phone ? ` • ${o.customer_phone}` : ""} • {(o.device_brand || "") + " " + (o.device_model || "")}
                        </div>
                      </div>
                      <Badge className={`${cls} text-[9px] px-1.5 py-0 whitespace-nowrap`}>{lbl}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <PriorityBadge priority={o.priority} />
                      {o.paid ? <MoneyPill amount={o.amount_paid} label="Pagado" okColor /> : <MoneyPill amount={o.balance_due} label="Saldo" />}
                      {tasksCount > 0 && <StatPill icon={List} value={tasksCount} title="Tareas" />}
                      {photosCount > 0 && <StatPill icon={ImageIcon} value={photosCount} title="Fotos" />}
                    </div>
                  </div>
                  <Button size="sm" className="h-7 px-2 bg-red-600 hover:bg-red-700" onClick={() => openOrder(o.id)}>Abrir</Button>
                </div>
              );
            })}

            {listPageData.length < filtered.length && (
              <div className="pt-2 flex justify-center">
                <Button
                  variant="outline"
                  className="h-9 px-4 border-white/15 bg-zinc-900/60"
                  onClick={() => setPage(p => p + 1)}
                >
                  Cargar más ({filtered.length - listPageData.length})
                </Button>
              </div>
            )}
              </div>
            )}
            </main>
          )}
        </>
      )}

      {selectedOrder?.id && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm">
          <WorkOrderPanelV2
            key={selectedOrder.id}
            orderId={selectedOrder.id}
            onUpdate={handleOrderUpdated}
            onClose={() => setSelectedOrder(null)}
            onDelete={async () => { 
                setSelectedOrder(null); 
                localStorage.removeItem(CACHE_KEYS.ORDERS);
                localStorage.removeItem(CACHE_KEYS.ORDERS_TS);
                setRefreshTick(t => t + 1); 
            }}
          />
        </div>
      )}

      <AdvancedFilters
        open={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        onApply={setAdvancedFilters}
        currentFilters={advancedFilters}
        allStatuses={statusOrder.map(s => ({id: s, label: statusLabels[s] || s}))}
      />

      <CreateInvoiceDialog
        open={showInvoiceDialog}
        onClose={(shouldRefresh) => {
          setShowInvoiceDialog(false);
          if (shouldRefresh) refreshNow();
        }}
      />

      <WorkOrderWizard open={showCreate} onClose={() => setShowCreate(false)} onSuccess={handleOrderCreated} />

      {/* 🤖 Orders Chatbot */}
      <OrdersChatbot orders={orders} onOpenOrder={openOrder} />
    </div>
  );
}