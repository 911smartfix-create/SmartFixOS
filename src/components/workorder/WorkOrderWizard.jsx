// === WorkOrderWizard.jsx — 911 SmartFix (full, con fotos en email + upsert catálogos/clientes + familia unificada con modelo) ===

import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import NotificationService from "../notifications/NotificationService"; // NEW IMPORT
import { createWelcomeEmail, getBusinessInfo } from "@/components/utils/emailTemplates"; // NEW IMPORT
import {
  User, Smartphone, Wrench, Shield, CheckSquare, ClipboardList,
  X, Mail, Loader2, Camera, Check, Search, Plus, Grid3X3, Eye, Users // Added Users icon
} from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const BG = "bg-[radial-gradient(circle_at_top,_rgba(12,12,12,1)_0%,_rgba(0,0,0,1)_55%,_rgba(0,0,0,1)_100%)]";
const PANEL = "bg-black/35 border border-white/5 rounded-2xl";

// === Estado inicial
const INITIAL_FORM_DATA = {
  customer: {
    name: "",
    last_name: "",
    phone: "",
    email: ""
  },
  existing_customer_id: null,

  // Dispositivo
  device_type: "",
  device_brand: "",
  device_family: "", // se rellena automático según modelo
  device_model: "",
  device_serial: "",

  // Problema y media
  initial_problem: "",
  media_urls: [],

  // Seguridad
  device_password: "",
  device_pin: "", // Added device_pin
  security_pattern: null,

  // Checklist
  checklist_items: [],

  // Estado/otros
  status: "pending_diagnostic",
  selected_items: [],
  suggested_items: [],
  deposit_amount: 0,
  auto_price_on_status: true,
  assigned_to_id: null,
  assigned_to_name: "",
  customer_signature: null,
  customer_signature_date: null
};

const STEPS = [
{ key: "customer", label: "Cliente", icon: User },
{ key: "device", label: "Dispositivo", icon: Smartphone },
{ key: "problem", label: "Problema", icon: Wrench },
{ key: "security", label: "Seguridad", icon: Shield },
{ key: "checklist", label: "Checklist", icon: CheckSquare },
{ key: "summary", label: "Resumen", icon: ClipboardList }];


// 👇 helper para saber “palabra clave” de la familia según tipo + marca
function getFamilyKeywordForFilter(typeName, brandName) {
  const t = (typeName || "").toLowerCase();
  const b = (brandName || "").toLowerCase();

  if (b === "apple") {
    if (t === "smartphone") return "iphone";
    if (t === "tablet") return "ipad";
    if (t === "laptop") return "macbook";
  }

  if (b === "samsung") {
    if (t === "smartphone") return "galaxy";
    if (t === "tablet") return "galaxy tab";
  }

  if (b === "xiaomi") {
    if (t === "smartphone") return "redmi"; // ejemplo
  }

  return "";
}

// 👇 helper para inferir el texto de “familia” que vamos a guardar
function inferFamily(typeName, brandName, modelName) {
  const t = (typeName || "").toLowerCase();
  const b = (brandName || "").toLowerCase();
  const m = (modelName || "").toLowerCase();

  if (b === "apple") {
    if (t === "smartphone" || m.includes("iphone")) return "iPhone";
    if (t === "tablet" || m.includes("ipad")) return "iPad";
    if (t === "laptop" || m.includes("macbook")) return "MacBook";
  }

  if (b === "samsung") {
    if (t === "smartphone" || m.includes("galaxy")) {
      if (m.includes(" tab")) return "Galaxy Tab";
      return "Galaxy";
    }
    if (t === "tablet") return "Galaxy Tab";
  }

  if (b === "xiaomi") {
    if (m.includes("redmi")) return "Redmi";
    if (m.includes("poco")) return "Poco";
    if (m.includes("mi")) return "Mi";
  }

  return "";
}

export default function WorkOrderWizard({ open, onClose, onSuccess, preloadedCustomer }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState(null);

  // Catálogos
  const [types, setTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Cliente search
  const [qCustomer, setQCustomer] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Añadir tipo nuevo
  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  // Patrón modal
  const [patternOpen, setPatternOpen] = useState(false);
  const [patternPath, setPatternPath] = useState([]);

  // ✅ NUEVO: Técnicos disponibles
  const [technicians, setTechnicians] = useState([]);

  const containerRef = useRef(null);

  // ===== Carga inicial =====
  useEffect(() => {
    if (!open) return;
    loadUser();
    loadTypes();
    loadTechnicians(); // ✅ NUEVO: Cargar técnicos

    if (preloadedCustomer) {
      const [firstName, ...lastParts] = (preloadedCustomer.name || "").split(" ");
      setFormData({
        ...INITIAL_FORM_DATA,
        existing_customer_id: preloadedCustomer.id || null,
        customer: {
          name: firstName || "",
          last_name: (lastParts || []).join(" "),
          phone: preloadedCustomer.phone || "",
          email: preloadedCustomer.email || ""
        }
      });
      setCurrentStep(0);
    } else {
      setFormData(INITIAL_FORM_DATA);
      setCurrentStep(0);
    }
  }, [open, preloadedCustomer]);

  // Cascada: tipo → marcas
  useEffect(() => {
    if (!formData.device_type) {
      setBrands([]);setModels([]);return;
    }
    loadBrands();
  }, [formData.device_type]);

  // Cascada: marca → modelos - MEJORADO CON LOGS
  useEffect(() => {
    if (!formData.device_brand) {
      setModels([]);
      return;
    }

    console.log("[Wizard] Cargando modelos para marca:", formData.device_brand);
    loadModelsForBrand(formData.device_brand);
  }, [formData.device_brand]);

  const stepName = STEPS[currentStep]?.key || "customer";

  // AI FIX: b2b in WorkOrderWizard - Validation for B2B vs individual
  const isStepComplete = (step) => {
    switch (step) {
      case "customer":
        if (formData.customer?.is_b2b) {
          // B2B requires: company_name, billing_contact_person, phone, email (tax_id optional)
          return !!(
            formData.customer.company_name?.trim() &&
            formData.customer.billing_contact_person?.trim() &&
            formData.customer.phone?.trim() &&
            formData.customer.email?.trim()
          );
        }
        // Individual requires: name and phone
        return !!formData.customer.name && !!formData.customer.phone;
      
      case "jobs":
        // AI FIX: b2b multi-job support - Jobs step is always valid (can be empty)
        return true;
      case "device":
        return !!formData.device_brand && !!formData.device_model;
      default:
        return true;
    }
  };

  const maxReachable = useMemo(() => {
    for (let i = 0; i < STEPS.length; i++) {
      if (!isStepComplete(STEPS[i].key)) return i;
    }
    return STEPS.length - 1;
  }, [formData]);

  const canProceed = isStepComplete(stepName);
  const goToStep = (idx) => {
    if (idx > maxReachable) return alert("Completa los pasos anteriores primero.");
    setCurrentStep(idx);
  };
  const handleNext = () => currentStep < STEPS.length - 1 ? setCurrentStep((s) => s + 1) : handleSubmit();
  const handleClose = () => {setFormData(INITIAL_FORM_DATA);setCurrentStep(0);onClose && onClose();};

  const updateFormData = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const updateCustomerField = (field, value) => setFormData((prev) => ({ ...prev.customer, customer: { ...prev.customer, [field]: value } }));

  // ===== Loads =====
  async function loadUser() {
    try {const me = await base44.auth.me();setUser(me || null);} catch {setUser(null);}
  }
  async function loadTypes() {
    try {const rows = await base44.entities.DeviceCategory.filter({}, "name");setTypes(rows || []);}
    catch {setTypes([]);}
  }
  async function loadBrands() {
    if (!formData.device_type) {
      setBrands([]);
      return;
    }

    try {
      console.log("[Wizard] Cargando marcas para tipo:", formData.device_type);

      // Buscar la categoría por nombre
      const categories = await base44.entities.DeviceCategory.filter({
        name: formData.device_type,
        active: true
      });

      if (categories?.length) {
        const categoryId = categories[0].id;
        console.log("[Wizard] Categoría encontrada:", categoryId);

        // Buscar marcas por category_id
        const brandsByCategory = await base44.entities.Brand.filter({
          category_id: categoryId,
          active: true
        }, "order");

        console.log("[Wizard] Marcas encontradas:", brandsByCategory?.length || 0);
        setBrands(brandsByCategory || []);
      } else {
        console.log("[Wizard] No se encontró categoría activa");
        setBrands([]);
      }
    } catch (err) {
      console.error("[Wizard] Error cargando marcas:", err);
      setBrands([]);
    }
  }
  async function loadModelsForBrand(brandName) {
    if (!brandName) {
      console.log("[Wizard] No hay marca, limpiando modelos");
      setModels([]);
      return;
    }

    try {
      console.log("[Wizard] Buscando modelos para marca:", brandName);

      // Buscar por nombre de marca (campo "brand")
      const rowsByBrand = await base44.entities.DeviceModel.filter({
        brand: brandName,
        active: true // ✅ SOLO ACTIVOS
      }, "order");
      console.log("[Wizard] Modelos encontrados por campo 'brand':", rowsByBrand?.length || 0);

      if (rowsByBrand?.length) {
        setModels(rowsByBrand);
        console.log("[Wizard] ✅ Modelos cargados:", rowsByBrand.length);
        return;
      }

      // Fallback: buscar por brand_id
      const brands = await base44.entities.Brand.filter({ name: brandName });
      if (brands?.length) {
        const brandId = brands[0].id;
        console.log("[Wizard] Buscando por brand_id:", brandId);
        const rowsById = await base44.entities.DeviceModel.filter({
          brand_id: brandId,
          active: true // ✅ SOLO ACTIVOS
        }, "order");
        console.log("[Wizard] Modelos encontrados por brand_id:", rowsById?.length || 0);
        setModels(rowsById || []);
      } else {
        console.log("[Wizard] ⚠️ No se encontró la marca en la BD");
        setModels([]);
      }
    } catch (err) {
      console.error("[Wizard] ❌ Error cargando modelos:", err);
      setModels([]);
    }
  }

  // ✅ NUEVO: Cargar técnicos
  async function loadTechnicians() {
    try {
      const allUsers = await base44.entities.User.filter({});
      const techs = (allUsers || []).filter((u) =>
      u.role === "technician" || u.role === "admin" || u.role === "manager"
      );
      setTechnicians(techs);
    } catch (err) {
      console.error("Error loading technicians:", err);
      setTechnicians([]);
    }
  }

  // ===== Buscar clientes existentes - FILTRADO POR MODO B2B =====
  async function searchCustomers(q, isB2BMode = false) {
    setSearchingCustomers(true);
    try {
      if (!q || q.trim().length < 2) {
        setCustomerResults([]);
        return;
      }

      const query = q.trim().toLowerCase();

      // Buscar en todos los campos
      const allCustomers = await base44.entities.Customer.list("-updated_date", 200);

      const filtered = allCustomers.filter((c) => {
        // AI FIX: b2b in WorkOrderWizard - STRICT filter by B2B mode
        // En modo B2B solo empresas, en modo individual solo personas
        if (isB2BMode && !c.is_b2b) return false;
        if (!isB2BMode && c.is_b2b) return false;

        const name = (c.name || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase().replace(/\D/g, '');
        const email = (c.email || "").toLowerCase();
        const companyName = (c.company_name || "").toLowerCase();
        const taxId = (c.company_tax_id || "").toLowerCase();
        const searchPhone = query.replace(/\D/g, '');

        // ✅ Match en diferentes campos según el modo
        const exactNameMatch = name === query;
        const startsWithName = name.startsWith(query);
        const containsName = name.includes(query);
        const phoneMatch = phone.includes(searchPhone);
        const emailMatch = email.includes(query);
        
        // Para B2B: también buscar en campos empresariales
        const companyMatch = isB2BMode && companyName.includes(query);
        const taxIdMatch = isB2BMode && taxId.includes(query);

        return exactNameMatch || startsWithName || containsName || phoneMatch || emailMatch || companyMatch || taxIdMatch;
      });

      // ✅ Ordenar: exactos primero, luego por inicio, luego por contiene
      const sorted = filtered.sort((a, b) => {
        const aName = (a.name || "").toLowerCase();
        const bName = (b.name || "").toLowerCase();
        
        const aExact = aName === query;
        const bExact = bName === query;
        const aStarts = aName.startsWith(query);
        const bStarts = bName.startsWith(query);

        // Exactos primero
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Luego los que empiezan
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Luego alfabético
        return aName.localeCompare(bName);
      });

      setCustomerResults(sorted.slice(0, 15));
    } catch (err) {
      console.error("Error searching customers:", err);
      setCustomerResults([]);
    } finally {
      setSearchingCustomers(false);
    }
  }

  // ===== Helpers (seguridad / media / email) =====
  const encryptData = (data) => {try {return btoa(String(data));} catch {return String(data);}};
  const toFileFromDataURL = async (dataURL, filename) => {
    const res = await fetch(dataURL);const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/png" });
  };

  const sendCustomerEmail = async (order, customerEmail, photoUrls = []) => {
    if (!customerEmail) {
      console.log("[Wizard] No customer email, skipping");
      return;
    }

    console.log("[Wizard] 📧 Enviando email profesional a:", customerEmail);
    setSendingEmail(true);

    try {
      const businessInfo = await getBusinessInfo();
      const deviceLine = `${order.device_brand || ""} ${order.device_family || ""} ${order.device_model || ""}`.trim();
      const checklistItems = Array.isArray(order.checklist_items) ? order.checklist_items : [];

      const emailData = createWelcomeEmail({
        orderNumber: order.order_number,
        customerName: formData.customer.name || "Cliente",
        deviceInfo: deviceLine || order.device_type || "tu equipo",
        problem: order.initial_problem || "",
        checklistItems,
        photoUrls,
        businessInfo
      });

      console.log("[Wizard] Enviando con template mejorado...");

      await base44.integrations.Core.SendEmail({
        from_name: businessInfo.business_name || "SmartFixOS",
        to: customerEmail,
        subject: emailData.subject,
        body: emailData.body
      });

      console.log("[Wizard] ✅ Email enviado exitosamente");

      // Registrar evento de email enviado
      try {
        await base44.entities.WorkOrderEvent.create({
          order_id: order.id,
          order_number: order.order_number,
          event_type: "email_sent",
          description: `Email de confirmación enviado a ${customerEmail}`,
          user_name: user?.full_name || user?.email || "Sistema",
          user_id: user?.id || null,
          metadata: {
            email_to: customerEmail,
            subject: emailData.subject,
            reason: "order_created"
          }
        });
      } catch (eventErr) {
        console.warn("[Wizard] No se pudo crear evento:", eventErr);
      }

    } catch (err) {
      console.error("[Wizard] ❌ Error enviando email:", err);
      // Registrar el error en eventos
      try {
        await base44.entities.WorkOrderEvent.create({
          order_id: order.id,
          order_number: order.order_number,
          event_type: "email_failed",
          description: `Error al enviar email: ${err.message}`,
          user_name: user?.full_name || user?.email || "Sistema",
          user_id: user?.id || null,
          metadata: {
            error: err.message,
            email_to: customerEmail
          }
        });
      } catch (e) {
        console.error("Could not log error:", e);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  // ===== Submit: MEJORADO PARA GUARDAR MODELO CORRECTAMENTE =====
  const handleAddAnotherDevice = async () => {
    // Guardar info del cliente del formData actual ANTES de submit
    const customerData = {
      existing_customer_id: formData.existing_customer_id,
      customer: { ...formData.customer }
    };

    setLoading(true);
    
    try {
      // ✅ Crear la orden (sin cerrar el wizard)
      await submitOrderWithoutClosing();

      // ✅ Resetear el wizard con los datos del cliente guardados
      setFormData({
        ...INITIAL_FORM_DATA,
        ...customerData
      });
      setCurrentStep(1); // Volver al paso de dispositivo (índice 1)
    } catch (error) {
      console.error("[Wizard] Error al crear orden:", error);
      alert("Error al crear la orden: " + (error.message || "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  };

  // ✅ Nueva función: submit SIN cerrar el wizard
  const submitOrderWithoutClosing = async () => {
    // (Copiar toda la lógica de handleSubmit EXCEPTO handleClose() al final)
    try {
      // --- A) CLIENTE ---
      let customerId = formData.existing_customer_id || null;
      const customerData = {
        name: formData.customer.is_b2b 
          ? (formData.customer.company_name || "").trim() 
          : `${formData.customer.name} ${formData.customer.last_name}`.trim(),
        phone: formData.customer.phone,
        email: formData.customer.email || "",
        is_b2b: formData.customer.is_b2b || false,
        company_name: formData.customer.company_name || "",
        company_tax_id: formData.customer.company_tax_id || "",
        billing_contact_person: formData.customer.billing_contact_person || ""
      };

      if (!customerId) {
        let existing = [];
        if (formData.customer.phone) {
          existing = await base44.entities.Customer.filter({ phone: formData.customer.phone });
        }
        if ((!existing || !existing.length) && formData.customer.email) {
          existing = await base44.entities.Customer.filter({ email: formData.customer.email });
        }
        if ((!existing || !existing.length) && customerData.name) {
          existing = await base44.entities.Customer.filter({ name: customerData.name });
        }

        if (existing?.length) {
          customerId = existing[0].id;
          await base44.entities.Customer.update(customerId, customerData);
          const c = await base44.entities.Customer.get(customerId);
          await base44.entities.Customer.update(customerId, {
            total_orders: (c?.total_orders || 0) + 1
          });
        } else {
          const created = await base44.entities.Customer.create({
            ...customerData,
            total_orders: 1
          });
          customerId = created.id;
        }
      } else {
        await base44.entities.Customer.update(customerId, customerData);
        const c = await base44.entities.Customer.get(customerId);
        await base44.entities.Customer.update(customerId, {
          total_orders: (c?.total_orders || 0) + 1
        });
      }

      // --- B) CATÁLOGOS ---
      const typeName = (formData.device_type || "").trim();
      const brandName = (formData.device_brand || "").trim();
      const modelName = (formData.device_model || "").trim();

      let categoryId = null;
      let brandId = null;

      if (typeName) {
        const foundCat = await base44.entities.DeviceCategory.filter({ name: typeName });
        if (foundCat?.length) {
          categoryId = foundCat[0].id;
        } else {
          const newCat = await base44.entities.DeviceCategory.create({
            name: typeName,
            active: true,
            order: 1
          });
          categoryId = newCat.id;
        }
      }

      if (brandName && categoryId) {
        const foundBrand = await base44.entities.Brand.filter({ name: brandName });
        if (foundBrand?.length) {
          brandId = foundBrand[0].id;
        } else {
          const newBrand = await base44.entities.Brand.create({
            name: brandName,
            category_id: categoryId,
            active: true,
            order: 1
          });
          brandId = newBrand.id;
        }
      }

      if (modelName && brandId) {
        const foundModel = await base44.entities.DeviceModel.filter({
          name: modelName
        });
        const exactMatch = foundModel?.find((m) => m.brand_id === brandId);
        if (!exactMatch) {
          await base44.entities.DeviceModel.create({
            name: modelName,
            brand_id: brandId,
            active: true,
            order: 1
          });
        }
      }

      // --- C) MEDIA ---
      const photos_metadata = [];
      const photoUrls = [];
      for (const mf of formData.media_urls || []) {
        try {
          if (typeof mf === "object" && mf?.url) {
            photos_metadata.push({
              id: mf.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: mf.type?.startsWith?.("video") ? "video" : "image",
              mime: mf.type || "image/jpeg",
              filename: mf.name || "media",
              publicUrl: mf.url,
              thumbUrl: mf.thumbUrl || mf.url
            });
            photoUrls.push(mf.url);
            continue;
          }
          if (typeof mf === "string" && mf.startsWith("data:")) {
            const file = await toFileFromDataURL(mf, `upload-${Date.now()}.png`);
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            const url = `${uploadResult.file_url}?v=${Date.now()}`;
            photos_metadata.push({
              id: `${Date.now()}-${file.name}`,
              type: "image",
              mime: file.type || "image/jpeg",
              filename: file.name,
              publicUrl: url,
              thumbUrl: url
            });
            photoUrls.push(url);
            continue;
          }
          if (mf instanceof File || mf instanceof Blob) {
            const file = mf instanceof File ? mf : new File([mf], "photo.jpg", { type: mf.type || "image/jpeg" });
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            const url = `${uploadResult.file_url}?v=${Date.now()}`;
            photos_metadata.push({
              id: `${Date.now()}-${file.name}`,
              type: (file.type || "").startsWith("video") ? "video" : "image",
              mime: file.type || "image/jpeg",
              filename: file.name,
              publicUrl: url,
              thumbUrl: url
            });
            photoUrls.push(url);
          }
        } catch (errUp) {
          console.warn("Upload error:", errUp);
        }
      }

      // --- D) SEGURIDAD ---
      let securityData = {
        device_password: formData.device_password ? encryptData(formData.device_password) : null,
        device_pin: formData.device_pin ? encryptData(formData.device_pin) : null
      };

      if (formData.security_pattern?.path?.length) {
        const patternVector = formData.security_pattern.path.join('-');
        securityData.pattern_vector = `pattern:${patternVector}`;
      }

      // --- E) CREAR ORDEN ---
      const orderNumber = `WO-${Date.now().toString().slice(-8)}`;
      let assignedToId = formData.assigned_to_id || null;
      let assignedToName = formData.assigned_to_name || "";
      if (!assignedToId && user?.id) {
        assignedToId = user.id;
        assignedToName = user.full_name || user.email || "";
      }

      const orderData = {
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: formData.customer.is_b2b 
          ? (formData.customer.company_name || "").trim() 
          : `${formData.customer.name} ${formData.customer.last_name}`.trim(),
        customer_phone: formData.customer.phone,
        customer_email: formData.customer.email || "",
        company_id: formData.customer.is_b2b ? customerId : null,
        company_name: formData.customer.is_b2b ? formData.customer.company_name : null,
        device_type: formData.device_type || "phone",
        device_brand: formData.device_brand || "",
        device_family: formData.device_family || "",
        device_model: formData.device_model || "",
        device_serial: formData.device_serial || "",
        initial_problem: formData.initial_problem || "",
        estimated_completion: null,
        photos_metadata,
        device_security: securityData,
        checklist_items: formData.checklist_items || [],
        status: "intake",
        created_by: user?.full_name || user?.email || "System",
        assigned_to: assignedToId,
        assigned_to_name: assignedToName,
        terms_accepted: true,
        selected_items: formData.selected_items || [],
        suggested_items: formData.suggested_items || [],
        auto_price_on_status: formData.auto_price_on_status,
        deposit_amount: formData.deposit_amount || 0,
        customer_signature: formData.customer_signature || null,
        customer_signature_date: formData.customer_signature_date || null,
        order_items: [],
        comments: []
      };

      const newOrder = await base44.entities.Order.create(orderData);

      // --- F) NOTIFICACIONES ---
      try {
        const adminsAndManagers = await base44.entities.User.filter({});
        const eligibleUsers = (adminsAndManagers || []).filter((u) =>
          u.role === "admin" || u.role === "manager"
        );

        for (const targetUser of eligibleUsers) {
          await NotificationService.createNotification({
            userId: targetUser.id,
            userEmail: targetUser.email,
            type: "new_order",
            title: `Nueva orden #${newOrder.order_number}`,
            body: `${newOrder.customer_name} - ${newOrder.device_brand} ${newOrder.device_model}`,
            relatedEntityType: "order",
            relatedEntityId: newOrder.id,
            relatedEntityNumber: newOrder.order_number,
            actionUrl: `/Orders?order=${newOrder.id}`,
            actionLabel: "Ver orden",
            priority: "normal",
            metadata: {
              customer_name: newOrder.customer_name,
              device_type: newOrder.device_type,
              device_model: newOrder.device_model
            }
          });
        }
      } catch (notifError) {
        console.error("Error sending notification:", notifError);
      }

      // --- G) AUDITORÍA ---
      try {
        await base44.entities.WorkOrderEvent.create({
          order_id: newOrder.id,
          order_number: orderNumber,
          event_type: "create",
          description: `Orden creada por ${user?.full_name || user?.email || "System"}`,
          user_name: user?.full_name || user?.email || "System",
          user_id: user?.id,
          user_role: user?.role
        });
      } catch (ee) {
        console.warn("No se pudo crear evento:", ee);
      }

      // --- H) EMAIL ---
      if (formData.customer.email) {
        await sendCustomerEmail(newOrder, formData.customer.email, photoUrls);
      }

      // --- I) EVENTOS DE REFRESH ---
      window.dispatchEvent(new CustomEvent('workorder-created', {
        detail: { order: newOrder }
      }));
      window.dispatchEvent(new Event('force-refresh'));

      console.log("[Wizard] ✅ Orden creada exitosamente:", newOrder.id);
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // --- A) CLIENTE ---
      let customerId = formData.existing_customer_id || null;
      // AI FIX: b2b in WorkOrderWizard - Include B2B fields in customer data + handle name for B2B
      const customerData = {
        name: formData.customer.is_b2b 
          ? (formData.customer.company_name || "").trim() 
          : `${formData.customer.name} ${formData.customer.last_name}`.trim(),
        phone: formData.customer.phone,
        email: formData.customer.email || "",
        is_b2b: formData.customer.is_b2b || false,
        company_name: formData.customer.company_name || "",
        company_tax_id: formData.customer.company_tax_id || "",
        billing_contact_person: formData.customer.billing_contact_person || ""
      };

      if (!customerId) {
        let existing = [];
        if (formData.customer.phone) {
          existing = await base44.entities.Customer.filter({ phone: formData.customer.phone });
        }
        if ((!existing || !existing.length) && formData.customer.email) {
          existing = await base44.entities.Customer.filter({ email: formData.customer.email });
        }
        if ((!existing || !existing.length) && customerData.name) {
          existing = await base44.entities.Customer.filter({ name: customerData.name });
        }

        if (existing?.length) {
          customerId = existing[0].id;
          await base44.entities.Customer.update(customerId, customerData);
          const c = await base44.entities.Customer.get(customerId);
          await base44.entities.Customer.update(customerId, {
            total_orders: (c?.total_orders || 0) + 1
          });
        } else {
          const created = await base44.entities.Customer.create({
            ...customerData,
            total_orders: 1
          });
          customerId = created.id;
        }
      } else {
        await base44.entities.Customer.update(customerId, customerData);
        const c = await base44.entities.Customer.get(customerId);
        await base44.entities.Customer.update(customerId, {
          total_orders: (c?.total_orders || 0) + 1
        });
      }

      // --- B) CATÁLOGOS: GARANTIZAR QUE SE CREE EL MODELO ---
      const typeName = (formData.device_type || "").trim();
      const brandName = (formData.device_brand || "").trim();
      const modelName = (formData.device_model || "").trim();

      let categoryId = null;
      let brandId = null;

      console.log("[Wizard] Guardando catálogos:", { typeName, brandName, modelName });

      // 1. Categoría
      if (typeName) {
        const foundCat = await base44.entities.DeviceCategory.filter({ name: typeName });
        if (foundCat?.length) {
          categoryId = foundCat[0].id;
          console.log("[Wizard] Categoría encontrada:", categoryId);
        } else {
          const newCat = await base44.entities.DeviceCategory.create({
            name: typeName,
            active: true,
            order: 1
          });
          categoryId = newCat.id;
          console.log("[Wizard] Categoría creada:", categoryId);
        }
      }

      // 2. Marca
      if (brandName && categoryId) {
        const foundBrand = await base44.entities.Brand.filter({ name: brandName });
        if (foundBrand?.length) {
          brandId = foundBrand[0].id;
          console.log("[Wizard] Marca encontrada:", brandId);
        } else {
          const newBrand = await base44.entities.Brand.create({
            name: brandName,
            category_id: categoryId,
            active: true,
            order: 1
          });
          brandId = newBrand.id;
          console.log("[Wizard] Marca creada:", brandId);
        }
      }

      // 3. Modelo - GARANTIZAR CREACIÓN
      if (modelName && brandId) {
        console.log("[Wizard] Verificando modelo:", { modelName, brandId });

        // Buscar por nombre Y brand
        const foundModel = await base44.entities.DeviceModel.filter({
          name: modelName
        });

        // Verificar si alguno tiene el mismo brand_id
        const exactMatch = foundModel?.find((m) => m.brand_id === brandId);

        if (!exactMatch) {
          console.log("[Wizard] Modelo no existe, creando...");
          const newModel = await base44.entities.DeviceModel.create({
            name: modelName,
            brand_id: brandId,
            active: true,
            order: 1
          });
          console.log("[Wizard] ✅ Modelo creado exitosamente:", newModel.id);
        } else {
          console.log("[Wizard] ✅ Modelo ya existe:", exactMatch.id);
        }
      } else {
        console.warn("[Wizard] ⚠️ No se puede crear modelo, faltan datos:", { modelName, brandId });
      }

      // --- C) MEDIA ---
      const photos_metadata = [];
      const photoUrls = [];
      for (const mf of formData.media_urls || []) {
        try {
          if (typeof mf === "object" && mf?.url) {
            photos_metadata.push({
              id: mf.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              type: mf.type?.startsWith?.("video") ? "video" : "image",
              mime: mf.type || "image/jpeg",
              filename: mf.name || "media",
              publicUrl: mf.url,
              thumbUrl: mf.thumbUrl || mf.url
            });
            photoUrls.push(mf.url);
            continue;
          }
          if (typeof mf === "string" && mf.startsWith("data:")) {
            const file = await toFileFromDataURL(mf, `upload-${Date.now()}.png`);
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            const url = `${uploadResult.file_url}?v=${Date.now()}`;
            photos_metadata.push({
              id: `${Date.now()}-${file.name}`,
              type: "image",
              mime: file.type || "image/jpeg",
              filename: file.name,
              publicUrl: url,
              thumbUrl: url
            });
            photoUrls.push(url);
            continue;
          }
          if (mf instanceof File || mf instanceof Blob) {
            const file = mf instanceof File ? mf : new File([mf], "photo.jpg", { type: mf.type || "image/jpeg" });
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            const url = `${uploadResult.file_url}?v=${Date.now()}`;
            photos_metadata.push({
              id: `${Date.now()}-${file.name}`,
              type: (file.type || "").startsWith("video") ? "video" : "image",
              mime: file.type || "image/jpeg",
              filename: file.name,
              publicUrl: url,
              thumbUrl: url
            });
            photoUrls.push(url);
          }
        } catch (errUp) {
          console.warn("Upload error:", errUp);
        }
      }

      // --- D) SEGURIDAD - GUARDAR PATRÓN CORRECTAMENTE ---
      let securityData = {
        device_password: formData.device_password ? encryptData(formData.device_password) : null,
        device_pin: formData.device_pin ? encryptData(formData.device_pin) : null
      };

      // ✅ GUARDAR PATRÓN COMO VECTOR Y METADATA COMPLETA
      if (formData.security_pattern?.path?.length) {
        const patternVector = formData.security_pattern.path.join('-');
        securityData.pattern_vector = `pattern:${patternVector}`;
        securityData.pattern_start = formData.security_pattern.path[0];
        securityData.pattern_end = formData.security_pattern.path[formData.security_pattern.path.length - 1];
        securityData.pattern_length = formData.security_pattern.path.length;
        console.log("[Wizard] ✅ Patrón guardado:", securityData.pattern_vector);
      }

      // --- E) CREAR ORDEN ---
      const orderNumber = `WO-${Date.now().toString().slice(-8)}`;
      let assignedToId = formData.assigned_to_id || null;
      let assignedToName = formData.assigned_to_name || "";
      if (!assignedToId && user?.id) {
        assignedToId = user.id;
        assignedToName = user.full_name || user.email || "";
      }

      // ✅ Calcular order_items desde selected_items
      const orderItems = (formData.selected_items || []).map(item => ({
        ...item,
        qty: Number(item.qty || item.quantity || 1),
        price: Number(item.price || 0),
        total: Number(item.price || 0) * Number(item.qty || item.quantity || 1)
      }));

      // ✅ Calcular totales
      const subtotal = orderItems.reduce((sum, item) => sum + (item.total || 0), 0);
      const taxRate = 0.115;
      const taxAmount = subtotal * taxRate;
      const totalAmount = subtotal + taxAmount;

      console.log("[Wizard:handleSubmit] Calculando totales:", { subtotal, taxAmount, totalAmount, items: orderItems.length });

      const orderData = {
        order_number: orderNumber,
        customer_id: customerId,
        customer_name: formData.customer.is_b2b 
          ? (formData.customer.company_name || "").trim() 
          : `${formData.customer.name} ${formData.customer.last_name}`.trim(),
        customer_phone: formData.customer.phone,
        customer_email: formData.customer.email || "",
        company_id: formData.customer.is_b2b ? customerId : null,
        company_name: formData.customer.is_b2b ? formData.customer.company_name : null,
        device_type: formData.device_type || "phone",
        device_brand: formData.device_brand || "",
        device_family: formData.device_family || "",
        device_model: formData.device_model || "",
        device_serial: formData.device_serial || "",
        initial_problem: formData.initial_problem || "",
        estimated_completion: null,
        photos_metadata,
        device_security: securityData,
        checklist_items: formData.checklist_items || [],
        status: "intake",
        created_by: user?.full_name || user?.email || "System",
        assigned_to: assignedToId,
        assigned_to_name: assignedToName,
        terms_accepted: true,
        selected_items: formData.selected_items || [],
        suggested_items: formData.suggested_items || [],
        auto_price_on_status: formData.auto_price_on_status,
        deposit_amount: formData.deposit_amount || 0,
        customer_signature: formData.customer_signature || null,
        customer_signature_date: formData.customer_signature_date || null,
        order_items: orderItems,
        cost_estimate: totalAmount,
        balance_due: totalAmount,
        total: totalAmount,
        comments: []
      };

      console.log("[Wizard] 📝 Creando orden con datos:", orderData);
      const newOrder = await base44.entities.Order.create(orderData);

      console.log("[Wizard] ✅ Orden creada:", newOrder.id);

      // ✅ NUEVO: Enviar notificación de nueva orden
      try {
        const adminsAndManagers = await base44.entities.User.filter({});
        const eligibleUsers = (adminsAndManagers || []).filter((u) =>
        u.role === "admin" || u.role === "manager"
        );

        for (const targetUser of eligibleUsers) {
          await NotificationService.createNotification({
            userId: targetUser.id,
            userEmail: targetUser.email,
            type: "new_order",
            title: `Nueva orden #${newOrder.order_number}`,
            body: `${newOrder.customer_name} - ${newOrder.device_brand} ${newOrder.device_model}`,
            relatedEntityType: "order",
            relatedEntityId: newOrder.id,
            relatedEntityNumber: newOrder.order_number,
            actionUrl: `/Orders?order=${newOrder.id}`,
            actionLabel: "Ver orden",
            priority: "normal", // Assuming default priority as no such field exists in formData or createdOrder
            metadata: {
              customer_name: newOrder.customer_name,
              device_type: newOrder.device_type,
              device_model: newOrder.device_model
            }
          });
        }
      } catch (notifError) {
        console.error("Error sending new order notification:", notifError);
        // No bloqueamos la creación de la orden si falla la notificación
      }

      // --- F) AUDITORÍA ---
      try {
        await base44.entities.WorkOrderEvent.create({
          order_id: newOrder.id,
          order_number: orderNumber,
          event_type: "create",
          description: `Orden creada por ${user?.full_name || user?.email || "System"}`,
          user_name: user?.full_name || user?.email || "System",
          user_id: user?.id,
          user_role: user?.role
        });
      } catch (ee) {
        console.warn("No se pudo crear evento:", ee);
      }

      // --- G) EMAIL con fotos ---
      if (formData.customer.email) {
        console.log("[Wizard] Cliente tiene email, enviando confirmación...");
        await sendCustomerEmail(newOrder, formData.customer.email, photoUrls);
      } else {
        console.log("[Wizard] Cliente no tiene email, omitiendo envío");
      }

      // --- H) NOTIFICAR A ORDERS ---
      console.log("[Wizard] Disparando eventos de sincronización...");

      // Evento personalizado para Orders
      window.dispatchEvent(new CustomEvent('workorder-created', {
        detail: { order: newOrder }
      }));

      // Evento de refresh global
      window.dispatchEvent(new Event('force-refresh'));

      // ✅ LLAMAR onSuccess con la orden creada para que Orders la abra
      if (onSuccess) {
        console.log("[Wizard] Llamando onSuccess con orden:", newOrder.id);
        onSuccess(newOrder);
      }

      handleClose();
    } catch (err) {
      console.error("[Wizard] ❌ Error creando orden:", err);
      alert("Error al crear la orden: " + (err.message || "Intenta nuevamente."));
    } finally {
      setLoading(false);
    }
  };

  // ====== UI ======
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        ref={containerRef}
        className={`max-w-6xl w-[98vw] h-[94vh] p-0 border-cyan-500/25 shadow-[0_0_45px_rgba(0,168,232,0.35)] ${BG} overflow-hidden flex flex-col`}>

        {/* Header con colores del logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gradient-to-r from-cyan-600/10 to-emerald-600/10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f767a3d5fce1486d4cf555/e9bc537e2_DynamicsmartfixosLogowithGearandDevice.png"
              alt="SmartFixOS"
              className="h-12 w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,168,232,0.6)]" />

            <div>
              <h2 className="text-xl font-bold text-white">Nueva orden de trabajo</h2>
              <p className="text-xs text-gray-400 mt-1">Paso {currentStep + 1} de {STEPS.length}</p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full bg-cyan-600/80 hover:bg-cyan-600 text-white flex items-center justify-center" onClick={handleClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper con colores del logo */}
        <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-white/5 bg-black/20">
          {STEPS.map((stp, idx) => {
            const Icon = stp.icon;
            const active = idx === currentStep;
            const done = idx < currentStep && isStepComplete(stp.key);
            const blocked = idx > maxReachable;
            return (
              <button
                key={stp.key}
                onClick={() => goToStep(idx)}
                disabled={blocked}
                className={`px-3 py-1.5 text-xs rounded-xl flex items-center gap-2 border transition-all ${
                active ?
                "bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 border-cyan-400/40 text-cyan-100" :
                done ?
                "bg-emerald-600/15 border-emerald-400/30 text-emerald-200" :
                "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"}`
                }>

                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${active ? "bg-cyan-600/40" : done ? "bg-emerald-600/30" : ""}`}>
                  {done ? <Check className="w-4 h-4" /> : idx + 1}
                </span>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{stp.label}</span>
              </button>);

          })}
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Columna izquierda */}
          <div className="w-full md:w-[58%] h-full overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {stepName === "customer" &&
            <CustomerStep
              formData={formData}
              updateCustomerField={updateCustomerField}
              qCustomer={qCustomer}
              setQCustomer={setQCustomer}
              searching={searchingCustomers}
              results={customerResults}
              onSearch={searchCustomers}
              onPick={(c) => {
                const parts = (c.name || "").split(" ");
                const first = parts.slice(0, -1).join(" ") || parts[0] || "";
                const last = parts.length > 1 ? parts[parts.length - 1] : "";
                setFormData((prev) => ({
                  ...prev,
                  existing_customer_id: c.id,
                  customer: {
                    name: first,
                    last_name: last,
                    phone: c.phone || "",
                    email: c.email || ""
                  }
                }));
              }} />

            }
            {stepName === "device" &&
            <DeviceStep
              formData={formData}
              updateFormData={updateFormData}
              types={types}
              brands={brands}
              models={models}
              addingType={addingType}
              setAddingType={setAddingType}
              newTypeName={newTypeName}
              setNewTypeName={setNewTypeName}
              onAddType={async () => {
                const name = (newTypeName || "").trim();
                if (!name) return;
                try {
                  await base44.entities.DeviceCategory.create({ name });
                  await loadTypes();
                  updateFormData("device_type", name);
                  setNewTypeName("");setAddingType(false);
                } catch {
                  alert("No se pudo crear el tipo");
                }
              }} />

            }
            {stepName === "problem" && <ProblemStep formData={formData} updateFormData={updateFormData} />}
            {stepName === "security" &&
            <SecurityStep
              formData={formData}
              updateFormData={updateFormData}
              patternOpen={patternOpen}
              setPatternOpen={setPatternOpen}
              patternPath={patternPath}
              setPatternPath={setPatternPath} />

            }
            {stepName === "checklist" && <ChecklistStep formData={formData} updateFormData={updateFormData} />}
            {stepName === "summary" &&
            <SummaryStep
              formData={formData}
              updateFormData={updateFormData}
              technicians={technicians}
              onBack={() => setCurrentStep(currentStep - 1)}
              onSubmit={handleSubmit}
              loading={loading}
              onAddAnotherDevice={handleAddAnotherDevice} />

            }
          </div>

          {/* Columna derecha */}
          <div className="hidden md:block w-[42%] h-full overflow-y-auto p-4 space-y-4 bg-black/20 border-l border-white/5">
            <PreviewCard formData={formData} />
            <MediaPreviewCard formData={formData} updateFormData={updateFormData} />
            <StatusCard formData={formData} updateFormData={updateFormData} />
          </div>
        </div>

        {/* Footer con botones actualizados */}
        <div className="flex items-center justify-between px-5 py-3 bg-black/40 border-t border-white/5">
          <p className="text-xs text-gray-400">
            {formData.customer.phone ?
            `Cliente: ${formData.customer.name} ${formData.customer.last_name} • ${formData.customer.phone}` :
            "Cliente no seleccionado aún"}
          </p>
          <div className="flex gap-3 items-center">
            {sendingEmail &&
            <span className="flex items-center gap-2 text-gray-200 text-xs">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando email...
              </span>
            }
            <Button onClick={handleClose} variant="outline" className="border-white/15 text-gray-100 bg-white/0 hover:bg-white/5" disabled={loading}>
              Cancelar
            </Button>
            
            {currentStep === STEPS.length - 1 && (
              <Button
                onClick={handleAddAnotherDevice}
                disabled={loading || sendingEmail}
                variant="outline"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/20">
                <Plus className="w-4 h-4 mr-2" />
                Añadir otro equipo
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={!canProceed || loading || sendingEmail}
              className="bg-gradient-to-r from-cyan-600 to-emerald-700 hover:from-cyan-700 hover:to-emerald-800 min-w-[140px]">

              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
              currentStep === STEPS.length - 1 ? <><Check className="w-4 h-4 mr-2" />Crear orden{formData.customer.email && <Mail className="w-4 h-4 ml-2" />}</> :
              "Continuar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}

/* ================== SUB-COMPONENTES ================== */

// === ProblemPresets - DINÁMICO DESDE SETTINGS ===
function ProblemPresets({ onApply }) {
  const [presets, setPresets] = React.useState([
    { label: "Pantalla", text: "Pantalla rota / touch no responde" },
    { label: "Batería", text: "Batería se descarga rápido / se apaga" },
    { label: "Puerto", text: "No carga / puerto dañado" },
    { label: "Desbloqueo", text: "Desbloqueo de cuenta / operadora" },
    { label: "Lista negra", text: "Remover de lista negra / blacklist" }
  ]);

  React.useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const configs = await base44.entities.WorkOrderWizardConfig.list();
      if (configs?.length && configs[0].problem_presets?.length) {
        setPresets(configs[0].problem_presets);
      }
    } catch (err) {
      console.log("Using default presets");
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {presets.map((preset, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onApply(preset.text)}
          className="text-xs bg-white/5 hover:bg-white/10 text-gray-100 px-3 py-1.5 rounded-lg border border-white/10">
          {preset.label}
        </button>
      ))}
    </div>
  );
}

// === CustomerStep
function CustomerStep({ formData, updateCustomerField, qCustomer, setQCustomer, searching, results, onSearch, onPick }) {
  // AI FIX: b2b in WorkOrderWizard - B2B toggle state
  const [isB2B, setIsB2B] = React.useState(formData.customer?.is_b2b || false);

  // AI FIX: b2b in WorkOrderWizard - Handle B2B toggle
  const handleB2BToggle = (value) => {
    setIsB2B(value);
    updateCustomerField("is_b2b", value);
    if (!value) {
      updateCustomerField("company_name", "");
      updateCustomerField("company_tax_id", "");
      updateCustomerField("billing_contact_person", "");
    }
  };

  return (
    <div className={`${PANEL} p-4 space-y-4`}>
      <h3 className="text-sm font-semibold text-white">📋 Datos del cliente</h3>

      {/* AI FIX: b2b in WorkOrderWizard - Pills/Pastillas selector */}
      <div className="flex gap-3 mb-4">
        <button
          type="button"
          onClick={() => handleB2BToggle(false)}
          className={`flex-1 px-5 py-4 rounded-xl border-2 transition-all ${
            !isB2B 
              ? "bg-gradient-to-r from-cyan-600 to-emerald-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30" 
              : "bg-black/20 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/5"
          }`}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">👤</div>
            <div className="font-bold text-sm">Cliente Individual</div>
            <div className="text-xs opacity-70 mt-1">Persona física</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleB2BToggle(true)}
          className={`flex-1 px-5 py-4 rounded-xl border-2 transition-all ${
            isB2B 
              ? "bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 text-white shadow-lg shadow-purple-500/30" 
              : "bg-black/20 border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/5"
          }`}
        >
          <div className="text-center">
            <div className="text-2xl mb-1">🏢</div>
            <div className="font-bold text-sm">Empresa (B2B)</div>
            <div className="text-xs opacity-70 mt-1">Facturación agrupada</div>
          </div>
        </button>
      </div>

      {/* AI FIX: b2b in WorkOrderWizard - Show ONLY corresponding fields */}
      {isB2B ? (
        <div className="space-y-4 bg-purple-600/5 border-2 border-purple-500/30 rounded-xl p-5">
          <h4 className="text-purple-300 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
            🏢 Información Empresarial
          </h4>
          
          <div>
            <label className="text-xs text-gray-300 mb-1.5 block">Nombre de la Empresa *</label>
            <input 
              value={formData.customer.company_name || ""} 
              onChange={(e) => updateCustomerField("company_name", e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2.5 text-white text-sm" 
              placeholder="Tech Solutions Corp" 
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 mb-1.5 block">Email Facturación *</label>
            <input 
              type="email"
              value={formData.customer.email || ""} 
              onChange={(e) => updateCustomerField("email", e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2.5 text-white text-sm" 
              placeholder="cuentas@empresa.com" 
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 mb-1.5 block">RUT / Tax ID / RNC (opcional)</label>
            <input 
              value={formData.customer.company_tax_id || ""} 
              onChange={(e) => updateCustomerField("company_tax_id", e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2.5 text-white text-sm" 
              placeholder="12-3456789-0" 
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 mb-1.5 block">Persona de Contacto *</label>
            <input 
              value={formData.customer.billing_contact_person || ""} 
              onChange={(e) => updateCustomerField("billing_contact_person", e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2.5 text-white text-sm" 
              placeholder="María López - CFO" 
            />
          </div>

          <div>
            <label className="text-xs text-gray-300 mb-1.5 block">Teléfono de Contacto *</label>
            <input 
              value={formData.customer.phone || ""} 
              onChange={(e) => updateCustomerField("phone", e.target.value)}
              className="w-full bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2.5 text-white text-sm" 
              placeholder="787-555-0123" 
            />
          </div>

          <div className="bg-purple-600/10 border border-purple-500/20 rounded-lg p-3">
            <p className="text-purple-300 text-xs font-semibold mb-2">
              💼 Workflow B2B:
            </p>
            <ul className="text-purple-400 text-xs space-y-1 ml-4">
              <li>• Crea órdenes individuales por equipo</li>
              <li>• Agrúpalas en factura única desde Órdenes → B2B</li>
              <li>• Facturación mensual consolidada</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-300 mb-1.5 block">Nombre *</label>
              <input value={formData.customer.name} onChange={(e) => updateCustomerField("name", e.target.value)}
              className="w-full bg-black/25 border border-white/5 rounded-lg px-3 py-2.5 text-white text-sm" placeholder="Juan" />
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1.5 block">Apellidos *</label>
              <input value={formData.customer.last_name} onChange={(e) => updateCustomerField("last_name", e.target.value)}
              className="w-full bg-black/25 border border-white/5 rounded-lg px-3 py-2.5 text-white text-sm" placeholder="Pérez" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-300 mb-1.5 block">Teléfono *</label>
              <input value={formData.customer.phone} onChange={(e) => updateCustomerField("phone", e.target.value)}
              className="w-full bg-black/25 border border-white/5 rounded-lg px-3 py-2.5 text-white text-sm" placeholder="787-555-0123" />
            </div>
            <div>
              <label className="text-xs text-gray-300 mb-1.5 block">Email (opcional)</label>
              <input 
                type="email"
                value={formData.customer.email} 
                onChange={(e) => updateCustomerField("email", e.target.value)}
                className="w-full bg-black/25 border border-white/5 rounded-lg px-3 py-2.5 text-white text-sm" 
                placeholder="cliente@email.com" 
              />
            </div>
          </div>
        </div>
      )}

      {/* AI FIX: b2b in WorkOrderWizard - Single search for both individual and B2B */}
      <div className="bg-gradient-to-br from-cyan-600/5 to-emerald-600/5 border border-cyan-500/20 rounded-xl p-4">
        <label className="text-sm text-white font-semibold mb-3 block flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" />
          {isB2B ? "🏢 Buscar empresa existente" : "👤 Buscar cliente existente"}
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={qCustomer}
              onChange={(e) => {setQCustomer(e.target.value);onSearch(e.target.value, isB2B);}}
              placeholder={isB2B ? "Buscar por empresa, RUT/RNC, contacto..." : "Buscar por nombre, teléfono, email..."}
              className="w-full pl-10 pr-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder:text-gray-500" />
          </div>
          <Button type="button" onClick={() => onSearch(qCustomer, isB2B)} className="bg-gradient-to-r from-cyan-600 to-emerald-700">
            Buscar
          </Button>
        </div>

        {qCustomer?.length >= 2 && results.length > 0 && (
          <div className="mt-3 bg-black/80 border border-white/10 rounded-xl max-h-56 overflow-y-auto">
            {searching ? (
              <div className="p-4 text-sm text-gray-300 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Buscando...
              </div>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    // AI FIX: b2b in search - Fill only B2B fields for companies
                    if (c.is_b2b) {
                      updateCustomerField("is_b2b", true);
                      updateCustomerField("company_name", c.company_name || "");
                      updateCustomerField("company_tax_id", c.company_tax_id || "");
                      updateCustomerField("billing_contact_person", c.billing_contact_person || "");
                      updateCustomerField("phone", c.phone || "");
                      updateCustomerField("email", c.email || "");
                      updateCustomerField("name", "");
                      updateCustomerField("last_name", "");
                      setIsB2B(true);
                    } else {
                      onPick(c);
                      setIsB2B(false);
                    }
                    setQCustomer("");
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-cyan-600/10 text-gray-100 border-b border-white/5 last:border-b-0 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {c.is_b2b ? "🏢" : "👤"} {c.name}
                      </div>
                      {c.is_b2b && c.company_name && (
                        <div className="text-xs text-purple-300 mt-1 font-medium truncate">
                          {c.company_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {c.phone} {c.email && `• ${c.email}`}
                      </div>
                      {c.is_b2b && c.company_tax_id && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          RUT/RNC: {c.company_tax_id}
                        </div>
                      )}
                    </div>
                    {c.is_b2b && (
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md border border-purple-500/30 flex-shrink-0">
                        B2B
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {qCustomer?.length >= 2 && results.length === 0 && !searching && (
          <div className="mt-3 bg-yellow-600/5 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-xs text-yellow-300">
              ⚠️ No se encontraron resultados para "{qCustomer}"
            </p>
          </div>
        )}
      </div>
    </div>);

}

// === DeviceStep: SOLO CATÁLOGO MANUAL - SIN FALLBACK
function DeviceStep({
  formData, updateFormData,
  types, brands, models,
  addingType, setAddingType, newTypeName, setNewTypeName, onAddType
}) {
  const familyKeyword = getFamilyKeywordForFilter(formData.device_type, formData.device_brand);
  const filteredModels = familyKeyword ?
  models.filter((m) => (m.name || "").toLowerCase().includes(familyKeyword)) :
  models;

  const handleSelectModel = (name) => {
    const fam = inferFamily(formData.device_type, formData.device_brand, name);
    updateFormData("device_model", name);
    if (fam) updateFormData("device_family", fam);
  };

  const handleModelText = (value) => {
    updateFormData("device_model", value);
    const fam = inferFamily(formData.device_type, formData.device_brand, value);
    if (fam) updateFormData("device_family", fam);
  };

  return (
    <div className="space-y-4">
      {/* Tipo - SOLO MANUAL */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-cyan-400" />
          📱 Tipo de dispositivo
        </h3>

        {types.length === 0 ?
        <div className="text-center py-8">
            <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <p className="text-yellow-300 text-sm mb-2">⚠️ No hay tipos configurados</p>
              <p className="text-gray-400 text-xs">Ve a Settings → Catálogo para añadir tipos de dispositivos</p>
            </div>
            <Button
            type="button"
            onClick={() => setAddingType(true)}
            className="bg-gradient-to-r from-cyan-600 to-emerald-700 hover:from-cyan-700 hover:to-emerald-800">

              <Plus className="w-4 h-4 mr-2" />
              Añadir tipo ahora
            </Button>
          </div> :

        <div className="flex flex-wrap gap-2">
            {types.map((t) => {
            const name = t.name;
            const active = formData.device_type === name;
            return (
              <button
                key={t.id || name}
                type="button"
                onClick={() => {
                  updateFormData("device_type", name);
                  updateFormData("device_brand", "");
                  updateFormData("device_model", "");
                  updateFormData("device_family", "");
                }}
                className={`px-4 py-2 rounded-xl text-sm border-2 transition-all ${
                active ? "bg-gradient-to-br from-cyan-600/80 to-emerald-800/80 border-cyan-300/50 text-white shadow-lg shadow-cyan-600/30" :
                "bg-black/30 backdrop-blur-sm border-white/10 text-gray-100 hover:border-cyan-400/40 hover:bg-white/10"}`
                }>

                  {name}
                </button>);

          })}
            <button type="button" onClick={() => setAddingType((v) => !v)}
          className="px-4 py-2 rounded-xl text-sm border-2 border-dashed border-white/20 text-gray-100 hover:bg-white/5">
              <Plus className="w-3 h-3 inline mr-1" />Añadir tipo
            </button>
          </div>
        }

        {addingType &&
        <div className="mt-3 flex items-center gap-2">
            <input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Ej. Drone"
          className="flex-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            <Button type="button" className="bg-gradient-to-r from-cyan-600 to-emerald-700 hover:from-cyan-700 hover:to-emerald-800" onClick={onAddType}>Guardar</Button>
          </div>
        }
        <p className="text-[11px] text-gray-400 mt-3">Los tipos se guardan automáticamente en el catálogo manual.</p>
      </div>

      {/* Marca - SOLO DEL CATÁLOGO MANUAL */}
      {formData.device_type &&
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-cyan-400">🏷</span>
            Marca
          </h3>

          {brands.length > 0 ?
        <>
              <div className="flex flex-wrap gap-2 mb-3">
                {brands.map((b) => {
              const name = b.name || "";
              const active = formData.device_brand === name;
              return (
                <button
                  key={b.id || name}
                  type="button"
                  onClick={() => {
                    updateFormData("device_brand", name);
                    updateFormData("device_model", "");
                    updateFormData("device_family", "");
                  }}
                  className={`px-4 py-2 rounded-xl text-sm border-2 transition-all ${
                  active ? "bg-gradient-to-br from-cyan-600/80 to-emerald-800/80 border-cyan-300/50 text-white shadow-lg shadow-cyan-600/30" :
                  "bg-black/30 backdrop-blur-sm border-white/10 text-gray-100 hover:border-cyan-400/40 hover:bg-white/10"}`
                  }>

                      {name}
                    </button>);

            })}
              </div>
              <p className="text-xs text-gray-400 mb-2">O escribe una marca nueva:</p>
            </> :

        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-3 mb-3">
              <p className="text-yellow-300 text-xs">⚠️ No hay marcas para "{formData.device_type}"</p>
              <p className="text-gray-400 text-xs mt-1">Escribe la marca abajo y se guardará automáticamente</p>
            </div>
        }

          <input
          value={formData.device_brand}
          onChange={(e) => {
            updateFormData("device_brand", e.target.value);
            updateFormData("device_model", "");
            updateFormData("device_family", "");
          }}
          className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500"
          placeholder="Ej. Apple, Samsung, Xiaomi..." />

          <p className="text-[11px] text-gray-400 mt-2">Las marcas nuevas se guardan automáticamente en el catálogo</p>
        </div>
      }

      {/* Modelo (familia implícita) - SOLO DEL CATÁLOGO MANUAL */}
      {formData.device_brand &&
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-cyan-400">📦</span>
            Modelo
          </h3>
          {filteredModels.length > 0 ?
        <>
              <div className="flex flex-wrap gap-2 mb-3">
                {filteredModels.map((m) => {
              const name = m.name || "";
              const active = formData.device_model === name;
              return (
                <button
                  key={m.id || name}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectModel(name);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm border-2 transition-all ${
                  active ? "bg-gradient-to-br from-cyan-600/80 to-emerald-800/80 border-cyan-300/50 text-white shadow-lg shadow-cyan-600/30" :
                  "bg-black/30 backdrop-blur-sm border-white/10 text-gray-100 hover:border-cyan-400/40 hover:bg-white/10"}`
                  }>

                      {name}
                    </button>);

            })}
              </div>
              <p className="text-xs text-gray-400 mb-2">O escribe un modelo nuevo:</p>
            </> :

        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-3 mb-3">
              <p className="text-yellow-300 text-xs">⚠️ No hay modelos para "{formData.device_brand}"</p>
              <p className="text-gray-400 text-xs mt-1">Escribe el modelo abajo y se guardará automáticamente</p>
            </div>
        }
          <input
          value={formData.device_model}
          onChange={(e) => handleModelText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleModelText(e.target.value);
            }
          }}
          className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500"
          placeholder="Ej. iPhone 12 Pro Max, Galaxy S23..." />

          {formData.device_family &&
        <div className="mt-3 bg-emerald-600/10 border border-emerald-500/30 rounded-lg p-3">
              <p className="text-xs text-emerald-300">
                ✓ Familia detectada: <span className="font-bold">{formData.device_family}</span>
              </p>
            </div>
        }
          <p className="text-[11px] text-gray-400 mt-2">Los modelos nuevos se guardan automáticamente en el catálogo</p>
        </div>
      }

      {/* Serie */}
      {formData.device_model &&
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-cyan-400">#</span>
            Serie / IMEI (opcional)
          </h3>
          <input
          value={formData.device_serial}
          onChange={(e) => updateFormData("device_serial", e.target.value)}
          className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500"
          placeholder="IMEI / Número de serie" />

        </div>
      }
    </div>);

}

// === ProblemStep - MEJORADO PARA ANDROID ===
function ProblemStep({ formData, updateFormData }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null); // Separate ref for camera input
  const media = Array.isArray(formData.media_urls) ? formData.media_urls : [];

  const addFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    updateFormData("media_urls", [...media, ...list]);
  };
  const removeAt = (idx) => updateFormData("media_urls", media.filter((_, i) => i !== idx));
  const applyPreset = (text) => updateFormData("initial_problem", text);

  // Detectar si requiere IMEI
  const requiresIMEI = false;

  return (
    <div className="space-y-4">
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-cyan-400" />
          🔧 Descripción del problema
        </h3>
        <ProblemPresets onApply={applyPreset} />
        <textarea
          value={formData.initial_problem || ""}
          onChange={(e) => updateFormData("initial_problem", e.target.value)}
          className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm min-h-[100px] placeholder:text-gray-500"
          placeholder="Ej. No carga / líneas en pantalla / se apaga…" />

        <p className="text-[11px] text-gray-400 mt-2">*Si es pantalla, anota si sube imagen/brillo o solo vidrio roto.</p>

        {requiresIMEI && (
          <div className="mt-3 bg-amber-600/10 border-2 border-amber-500/40 rounded-xl p-4 animate-pulse">
            <p className="text-amber-300 font-bold text-sm mb-2 flex items-center gap-2">
              ⚠️ IMEI / Serial Requerido
            </p>
            <p className="text-amber-200 text-xs mb-3">
              Para desbloqueos o remover de lista negra es OBLIGATORIO registrar el IMEI/Serial del equipo.
            </p>
            <Input
              value={formData.device_serial || ""}
              onChange={(e) => updateFormData("device_serial", e.target.value)}
              placeholder="Ingresa IMEI o Serial aquí"
              className="bg-black/60 border-amber-500/40 text-white text-sm font-mono"
            />
          </div>
        )}
      </div>

      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Camera className="w-5 h-5 text-cyan-400" />
          📸 Fotos / evidencia
        </h3>

        {/* Input para CÁMARA (Android/iOS) */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)} />


        {/* Input para GALERÍA */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)} />


        <div className="flex items-center gap-3 mb-3">
          <Button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="bg-gradient-to-r from-cyan-600 to-emerald-700 hover:from-cyan-700 hover:to-emerald-800">

            <Camera className="w-4 h-4 mr-2" />Tomar foto
          </Button>
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            variant="outline" className="bg-background text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 border-white/15 hover:bg-white/10">


            📁 Subir archivo
          </Button>
        </div>
        <p className="text-xs text-gray-400">Sube fotos del estado en que llegó el equipo.</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
          {media.map((f, idx) => {
            const isFile = f instanceof File || f instanceof Blob;
            const url = isFile ? URL.createObjectURL(f) : f.url || f.publicUrl;
            const mime = isFile ? f.type : f.mime;
            const isVideo = (mime || "").startsWith("video");
            return (
              <div key={idx} className="relative rounded-lg overflow-hidden border border-white/10 bg-black/30">
                {isVideo ? <video src={url} className="w-full h-28 object-cover" controls /> :
                <img src={url} alt={`evidence-${idx}`} className="w-full h-28 object-cover" />}
                <button type="button" onClick={() => removeAt(idx)} className="absolute top-1 right-1 bg-black/75 hover:bg-black/90 rounded-full p-1">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>);

          })}
        </div>
      </div>
    </div>);

}

// === SecurityStep - PIN Y PASSWORD SEPARADOS ===
function SecurityStep({ formData, updateFormData, patternOpen, setPatternOpen, patternPath, setPatternPath }) {
  const [pin, setPin] = useState(formData.device_pin || "");
  const [password, setPassword] = useState(formData.device_password || "");
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Validación PIN: solo números, máximo 6 dígitos
  const isPinValid = pin === "" || /^\d{1,6}$/.test(pin);

  useEffect(() => {
    if (isPinValid) {
      updateFormData("device_pin", pin);
    }
  }, [pin, isPinValid, updateFormData]); // Added dependencies

  useEffect(() => {
    updateFormData("device_password", password);
  }, [password, updateFormData]); // Added dependencies

  return (
    <div className="space-y-4">
      {/* PIN */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">🔢</span>
          PIN (Máx. 6 dígitos)
        </h3>
        <div className="relative">
          <input
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(val);
            }}
            className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm pr-10 placeholder:text-gray-500"
            placeholder="123456"
            type={showPin ? "text" : "password"}
            maxLength={6}
            inputMode="numeric" />

          <button
            type="button"
            onClick={() => setShowPin((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
            title={showPin ? "Ocultar" : "Ver"}>

            <Eye className="w-4 h-4" />
          </button>
        </div>
        <p className={`text-[11px] mt-2 ${isPinValid ? "text-gray-400" : "text-red-400"}`}>
          {isPinValid ? "Solo números, máximo 6 dígitos" : "⚠️ Solo números permitidos (máx. 6)"}
        </p>
      </div>

      {/* Password */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">🔐</span>
          Password (Alfanumérico)
        </h3>
        <div className="relative">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2 text-white text-sm pr-10 placeholder:text-gray-500"
            placeholder="MiPassword123"
            type={showPassword ? "text" : "password"} />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white"
            title={showPassword ? "Ocultar" : "Ver"}>

            <Eye className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Letras, números y símbolos permitidos
        </p>
      </div>

      {/* Patrón */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">⚫</span>
          Patrón (Android)
        </h3>
        <div className="flex items-center gap-3">
          <Button type="button" className="bg-white/10 hover:bg-white/20 text-white" onClick={() => setPatternOpen(true)}>
            <Grid3X3 className="w-4 h-4 mr-2" />Capturar patrón
          </Button>
          {formData.security_pattern?.path?.length ?
          <span className="text-sm text-emerald-300">
              ✓ {formData.security_pattern.path.length} nodos guardados
            </span> :

          <span className="text-sm text-gray-500">No definido</span>
          }
        </div>
      </div>

      {patternOpen &&
      <PatternModal
        onClose={() => setPatternOpen(false)}
        onSave={(path) => {
          setPatternPath(path);
          updateFormData("security_pattern", { path, start: path[0] ?? null, end: path[path.length - 1] ?? null });
          setPatternOpen(false);
        }} />

      }

      <p className="text-[11px] text-gray-500 text-center">
        *Los datos de seguridad se cifran antes de guardarse
      </p>
    </div>);

}

// 🔹 PatternModal MEJORADO - Guardado correcto
function PatternModal({ onClose, onSave }) {
  const [path, setPath] = useState([]);

  const handleClick = (idx) => {
    if (path.includes(idx)) {
      setPath((p) => p.filter((x) => x !== idx));
    } else {
      setPath((p) => [...p, idx]);
    }
  };

  const dotClass = (idx) => {
    const isSelected = path.includes(idx);
    return `
      w-16 h-16 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer
      ${isSelected ?
    "bg-cyan-600 border-cyan-300 scale-110" :
    "bg-black/40 border-white/20 hover:border-white/40"}
    `;
  };

  const handleSave = () => {
    if (path.length === 0) {
      alert("Selecciona al menos un punto");
      return;
    }
    console.log("[PatternModal] Guardando patrón:", path);
    onSave(path);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h4 className="text-white font-semibold mb-2">Captura el patrón</h4>
        <p className="text-xs text-gray-400 mb-4">Toca los puntos en orden (puedes tocar de nuevo para deseleccionar).</p>

        <div className="grid grid-cols-3 gap-4 justify-items-center select-none mb-4">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) =>
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(idx)}
            className={dotClass(idx)}>

              {path.includes(idx) &&
            <span className="text-white text-xs font-bold">{path.indexOf(idx) + 1}</span>
            }
            </button>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onClose} className="border-white/15 text-white">Cancelar</Button>
          <div className="flex gap-2">
            <Button onClick={() => setPath([])} className="bg-white/10 hover:bg-white/20 text-white">Limpiar</Button>
            <Button onClick={handleSave} disabled={path.length === 0} className="bg-cyan-600 hover:bg-cyan-700">Guardar patrón</Button>
          </div>
        </div>

        {path.length > 0 &&
        <p className="text-xs text-gray-300 mt-3">
            Secuencia: {path.map((n, i) => `${i > 0 ? ' → ' : ''}${n}`).join('')}
          </p>
        }
      </div>
    </div>);

}

// 🔹 ChecklistStep MEJORADO Y EXTENSO - Cubre TODO lo que se verifica en recepción
function ChecklistStep({ formData, updateFormData }) {
  const items = [
  // === PANTALLA ===
  { key: "screen_broken", label: "Pantalla rota / rajada / astillada", icon: "💔", category: "Pantalla" },
  { key: "screen_no_image", label: "Pantalla sin imagen / negra", icon: "📺", category: "Pantalla" },
  { key: "screen_lines", label: "Líneas en pantalla / rayas verticales", icon: "📉", category: "Pantalla" },
  { key: "screen_spots", label: "Manchas / píxeles muertos", icon: "⚫", category: "Pantalla" },
  { key: "screen_discoloration", label: "Cambio de color / tono amarillo", icon: "🟡", category: "Pantalla" },

  // === TOUCH ===
  { key: "touch_not_working", label: "Touch no responde / no funciona", icon: "👆", category: "Touch" },
  { key: "touch_intermittent", label: "Touch intermitente / a veces funciona", icon: "⚡", category: "Touch" },
  { key: "touch_ghost", label: "Touch fantasma / presiona solo", icon: "👻", category: "Touch" },
  { key: "touch_zones_dead", label: "Zonas del touch sin respuesta", icon: "🚫", category: "Touch" },

  // === BATERÍA ===
  { key: "battery_drains", label: "Batería se descarga rápido", icon: "🔋", category: "Batería" },
  { key: "battery_no_charge", label: "No carga / no reconoce cargador", icon: "⚠️", category: "Batería" },
  { key: "battery_swollen", label: "Batería inflada / abultada", icon: "🎈", category: "Batería" },
  { key: "battery_percentage_stuck", label: "Porcentaje de batería congelado", icon: "❄️", category: "Batería" },

  // === CARGA ===
  { key: "port_damaged", label: "Puerto de carga dañado / suelto", icon: "🔌", category: "Carga" },
  { key: "port_dirty", label: "Puerto sucio / con pelusa", icon: "🧹", category: "Carga" },
  { key: "charging_slow", label: "Carga muy lenta", icon: "🐌", category: "Carga" },
  { key: "wireless_charging_issue", label: "Carga inalámbrica no funciona", icon: "📡", category: "Carga" },

  // === ENCENDIDO/APAGADO ===
  { key: "no_power", label: "No enciende / no da señales de vida", icon: "⚫", category: "Encendido" },
  { key: "random_shutdown", label: "Se apaga solo / reinicios random", icon: "🔄", category: "Encendido" },
  { key: "boot_loop", label: "Bootloop / bucle de reinicio", icon: "🔁", category: "Encendido" },
  { key: "power_button_stuck", label: "Botón de encendido atascado", icon: "🔘", category: "Encendido" },

  // === BOTONES ===
  { key: "volume_button_issue", label: "Botones de volumen no responden", icon: "🔊", category: "Botones" },
  { key: "home_button_issue", label: "Botón home / inicio no funciona", icon: "🏠", category: "Botones" },
  { key: "back_button_issue", label: "Botones de navegación no funcionan", icon: "⬅️", category: "Botones" },

  // === AUDIO ===
  { key: "no_sound", label: "Sin sonido / no suena", icon: "🔇", category: "Audio" },
  { key: "speaker_distorted", label: "Bocina distorsionada / crackling", icon: "📢", category: "Audio" },
  { key: "mic_not_working", label: "Micrófono no funciona / no se escucha", icon: "🎤", category: "Audio" },
  { key: "earpiece_issue", label: "Auricular / earpiece bajo o sin sonido", icon: "👂", category: "Audio" },
  { key: "headphone_jack", label: "Jack de audífonos no reconoce", icon: "🎧", category: "Audio" },

  // === CÁMARAS ===
  { key: "rear_camera_issue", label: "Cámara trasera no funciona / borrosa", icon: "📷", category: "Cámaras" },
  { key: "front_camera_issue", label: "Cámara frontal / selfie no funciona", icon: "🤳", category: "Cámaras" },
  { key: "camera_black_screen", label: "Cámara pantalla negra", icon: "⚫", category: "Cámaras" },
  { key: "flash_not_working", label: "Flash no funciona", icon: "💡", category: "Cámaras" },

  // === CONECTIVIDAD ===
  { key: "wifi_not_working", label: "WiFi no conecta / grisado", icon: "📶", category: "Conectividad" },
  { key: "bluetooth_issue", label: "Bluetooth no funciona / no detecta", icon: "🔵", category: "Conectividad" },
  { key: "signal_issue", label: "Sin señal / No reconoce SIM", icon: "📵", category: "Conectividad" },
  { key: "imei_null", label: "IMEI nulo / no registrado", icon: "🚫", category: "Conectividad" },
  { key: "gps_not_working", label: "GPS no funciona / ubicación incorrecta", icon: "🗺️", category: "Conectividad" },

  // === SEGURIDAD ===
  { key: "faceid_not_tested", label: "FaceID / TouchID no probado", icon: "👤", category: "Seguridad" },
  { key: "faceid_not_working", label: "FaceID / TouchID no funciona", icon: "❌", category: "Seguridad" },
  { key: "pattern_not_tested", label: "Patrón de desbloqueo no probado", icon: "🔢", category: "Seguridad" },

  // === SOFTWARE ===
  { key: "system_slow", label: "Sistema lento / lag / freezes", icon: "🐢", category: "Software" },
  { key: "apps_crash", label: "Apps se cierran solas / crashean", icon: "💥", category: "Software" },
  { key: "icloud_locked", label: "iCloud locked / bloqueado por Apple", icon: "🔒", category: "Software" },
  { key: "google_locked", label: "Google FRP / bloqueado", icon: "🔐", category: "Software" },
  { key: "system_corrupted", label: "Sistema corrupto / no bootea", icon: "⚠️", category: "Software" },

  // === DAÑOS FÍSICOS ===
  { key: "housing_damage", label: "Carcasa / housing con daño / abollado", icon: "🔨", category: "Físico" },
  { key: "back_glass_broken", label: "Vidrio trasero roto", icon: "🪟", category: "Físico" },
  { key: "water_damage", label: "Posible humedad / contacto con líquido", icon: "💧", category: "Físico" },
  { key: "corrosion", label: "Corrosión visible / oxidación", icon: "🦠", category: "Físico" },
  { key: "bent_frame", label: "Marco doblado / torcido", icon: "↪️", category: "Físico" },

  // === EXTRAS ===
  { key: "missing_screws", label: "Faltan tornillos / previamente abierto", icon: "🔩", category: "Extras" },
  { key: "third_party_parts", label: "Piezas genéricas / no originales", icon: "🔧", category: "Extras" },
  { key: "accessories_included", label: "Accesorios incluidos (cargador, funda)", icon: "📦", category: "Extras" }];


  const list = Array.isArray(formData.checklist_items) ? formData.checklist_items : [];

  const toggleItem = (key, label) => {
    const existingIndex = list.findIndex((item) =>
    typeof item === 'string' ? item === key : item.id === key
    );

    if (existingIndex >= 0) {
      updateFormData(
        "checklist_items",
        list.filter((_, idx) => idx !== existingIndex)
      );
    } else {
      updateFormData("checklist_items", [
      ...list,
      {
        id: key,
        label: label,
        status: "not_tested",
        notes: ""
      }]
      );
    }
  };

  const isSelected = (key) => {
    return list.some((item) =>
    typeof item === 'string' ? item === key : item.id === key
    );
  };

  // Agrupar por categoría
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header con efecto glass */}
      <div className="bg-gradient-to-r from-cyan-600/10 to-emerald-600/10 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-4">
        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-cyan-400" />
          Checklist de Recepción Completo
        </h3>
        <p className="text-xs text-gray-400">Marca TODAS las condiciones encontradas en el equipo</p>
      </div>

      {/* Checklist por categorías */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, categoryItems]) =>
        <div key={category} className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-cyan-400">▸</span> {category}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoryItems.map((it) => {
              const on = isSelected(it.key);
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => toggleItem(it.key, it.label)}
                  className={`
                      group relative overflow-hidden
                      px-3 py-3 rounded-lg text-xs border transition-all text-left
                      ${on ?
                  "bg-gradient-to-br from-cyan-600/80 to-emerald-800/80 border-cyan-300/50 text-white shadow-lg shadow-cyan-600/20" :
                  "bg-black/20 backdrop-blur-sm border-white/10 text-gray-100 hover:border-white/30 hover:bg-white/5"}
                    `
                  }>

                    {/* Efecto glass animado */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${on ? 'opacity-100' : ''}`} />

                    {/* Contenido */}
                    <div className="relative flex items-center gap-2">
                      <span className="text-base">{it.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium leading-tight">{it.label}</p>
                        {on &&
                      <p className="text-[10px] text-white/70 mt-0.5">✓ Marcado</p>
                      }
                      </div>
                    </div>
                  </button>);

            })}
            </div>
          </div>
        )}
      </div>

      {/* Contador */}
      {list.length > 0 &&
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-300">
            <span className="font-bold text-cyan-400 text-lg">{list.length}</span> {list.length === 1 ? 'condición marcada' : 'condiciones marcadas'}
          </p>
        </div>
      }
    </div>);

}

// === SummaryStep CON SELECTOR DE TÉCNICO
function SummaryStep({ formData, updateFormData, technicians }) {
  const checklistItems = Array.isArray(formData.checklist_items) ?
  formData.checklist_items.map((item) => item.label || item) :
  [];

  return (
    <div className="space-y-4">
      <div className={`bg-black/35 border border-white/5 rounded-2xl p-4 space-y-3`}>
        <h3 className="text-sm font-semibold text-white mb-2">📦 Resumen</h3>
        <div className="text-xs text-gray-200 space-y-1">
          <p><strong>Cliente:</strong> {formData.customer.name} {formData.customer.last_name} • {formData.customer.phone}</p>
          <p><strong>Email:</strong> {formData.customer.email || "—"}</p>
          <p><strong>Dispositivo:</strong> {formData.device_type || "—"} • {formData.device_brand || "—"} • {formData.device_family || "—"} • {formData.device_model || "—"}</p>
          <p><strong>Problema:</strong> {formData.initial_problem || "—"}</p>
          <p><strong>Checklist:</strong> {checklistItems.length ? checklistItems.join(", ") : "—"}</p>
          {formData.device_pin && <p><strong>PIN:</strong> ••••</p>}
          {formData.device_password && <p><strong>Password:</strong> ••••</p>}
          {formData.security_pattern?.path?.length ?
          <p><strong>Patrón:</strong> inicio {formData.security_pattern.start + 1}, fin {formData.security_pattern.end + 1}, nodos {formData.security_pattern.path.length}</p> :
          null}
        </div>
      </div>

      {/* ✅ TÉCNICO ASIGNADO - SOLO NOMBRE */}
      <div className="bg-gradient-to-br from-cyan-600/10 to-emerald-600/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,168,232,0.2)]">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          👤 Técnico Asignado
        </h3>

        {technicians.length === 0 ?
        <div className="text-sm text-gray-400 bg-black/20 border border-white/10 rounded-lg p-3">
            No hay técnicos disponibles
          </div> :

        <>
            <p className="text-xs text-gray-400 mb-3">Selecciona el técnico que trabajará en esta orden (opcional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
              type="button"
              onClick={() => {
                updateFormData("assigned_to_id", null);
                updateFormData("assigned_to_name", "");
              }}
              className={`px-4 py-3 rounded-xl text-sm border-2 transition-all text-left ${
              !formData.assigned_to_id ?
              "bg-gradient-to-br from-cyan-600/80 to-emerald-800/80 border-cyan-300/50 text-white shadow-lg shadow-cyan-600/30" :
              "bg-black/30 backdrop-blur-sm border-white/10 text-gray-100 hover:border-cyan-400/40 hover:bg-white/10"}`
              }>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Sin asignar</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Se asignará después</p>
              </button>

              {technicians.map((tech) => {
              const isSelected = formData.assigned_to_id === tech.id;
              return (
                <button
                  key={tech.id}
                  type="button"
                  onClick={() => {
                    updateFormData("assigned_to_id", tech.id);
                    updateFormData("assigned_to_name", tech.full_name || tech.email);
                  }}
                  className={`px-4 py-3 rounded-xl text-sm border-2 transition-all text-left ${
                  isSelected ?
                  "bg-gradient-to-br from-cyan-600/80 to-emerald-800/80 border-cyan-300/50 text-white shadow-lg shadow-cyan-600/30" :
                  "bg-black/30 backdrop-blur-sm border-white/10 text-gray-100 hover:border-cyan-400/40 hover:bg-white/10"}`
                  }>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {(tech.full_name || tech.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{tech.full_name || tech.email}</p>
                      </div>
                    </div>
                  </button>);

            })}
            </div>

            {formData.assigned_to_name &&
          <div className="mt-3 bg-emerald-600/10 border border-emerald-500/30 rounded-lg p-3">
                <p className="text-xs text-emerald-300">
                  ✓ Asignado a: <span className="font-bold">{formData.assigned_to_name}</span>
                </p>
              </div>
          }
          </>
        }
      </div>

      <p className="text-[10px] text-gray-500 mt-3">*Verifica la información antes de crear la orden.</p>
    </div>);

}

// === Preview lateral
function PreviewCard({ formData }) {
  const checklistItems = Array.isArray(formData.checklist_items) ?
  formData.checklist_items.map((item) => item.label || item) :
  [];
  return (
    <div className={`${PANEL} p-4 space-y-3`}>
      <h3 className="text-sm font-semibold text-white mb-2">👤 Cliente</h3>
      <p className="text-xs text-gray-200">
        {formData.customer.name ? `${formData.customer.name} ${formData.customer.last_name}` : "Sin nombre"}
      </p>
      <p className="text-xs text-gray-400">{formData.customer.phone || "Sin teléfono"}</p>
      <p className="text-xs text-gray-400">{formData.customer.email || "Sin email"}</p>
      <hr className="border-white/5 my-2" />
      <h3 className="text-sm font-semibold text-white mb-2">📱 Equipo</h3>
      <p className="text-xs text-gray-200">
        {formData.device_type || "—"} • {formData.device_brand || "—"} • {formData.device_family || "—"} • {formData.device_model || "—"}
      </p>
      <p className="text-xs text-gray-400">Serie: {formData.device_serial || "—"}</p>
      <p className="text-xs text-gray-400">Problema: {formData.initial_problem || "—"}</p>
      <p className="text-xs text-gray-400">Checklist: {checklistItems.length ? checklistItems.join(", ") : "—"}</p>
    </div>);

}

function MediaPreviewCard({ formData, updateFormData }) {
  const media = Array.isArray(formData.media_urls) ? formData.media_urls : [];
  const removeAt = (idx) => updateFormData("media_urls", media.filter((_, i) => i !== idx));
  return (
    <div className={`${PANEL} p-4 space-y-3`}>
      <h3 className="text-sm font-semibold text-white mb-2">📸 Evidencia</h3>
      {media.length === 0 ?
      <p className="text-xs text-gray-400">Aún no hay fotos.</p> :

      <div className="grid grid-cols-3 gap-2">
          {media.map((f, idx) => {
          const isFile = f instanceof File || f instanceof Blob;
          const url = isFile ? URL.createObjectURL(f) : f.url || f.publicUrl;
          return (
            <div key={idx} className="relative">
                <img src={url} alt="evidence" className="w-full h-20 object-cover rounded-lg" />
                <button onClick={() => removeAt(idx)} className="absolute top-1 right-1 bg-black/70 rounded-full p-1">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>);

        })}
        </div>
      }
    </div>);

}

function StatusCard({ formData, updateFormData }) {
  return (
    <div className={`${PANEL} p-4 space-y-3`}>
      <h3 className="text-sm font-semibold text-white mb-2">📍 Estado inicial</h3>
      <select value={formData.status} onChange={(e) => updateFormData("status", e.target.value)}
      className="w-full bg-black/25 border border-white/5 rounded-lg px-3 py-2 text-white text-sm">
        <option value="pending_diagnostic">Pendiente diagnóstico</option>
        <option value="in_progress">En proceso</option>
        <option value="waiting_parts">En espera de piezas</option>
        <option value="ready_for_pickup">Listo para recoger</option>
      </select>
      <p className="text-[10px] text-gray-500">*Puedes cambiar el estado luego en el panel.</p>
    </div>);

}