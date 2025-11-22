import React, { useState, useEffect, useMemo, useRef } from "react";
import { dataClient } from "@/components/api/dataClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";
import {
  ShoppingCart, Search, Plus, Minus, Trash2, User, AlertCircle,
  DollarSign, Package, X, Sparkles, CreditCard, Smartphone, Banknote,
  ArrowLeft, Gift, Star, Calendar, Percent, Tag, TrendingUp, Zap,
  Landmark, FileText, History
} from "lucide-react";
import { toast } from "sonner";
import CustomerSelector from "../components/pos/CustomerSelector";
import ReceiptModal from "../components/pos/ReceiptModal";
import SalesHistoryDialog from "../components/pos/SalesHistoryDialog";
import { useKeyboardScrollIntoView } from "@/components/utils/KeyboardAwareLayout";
import { useNavigate } from "react-router-dom";
import MobilePOS from "../components/pos/MobilePOS";
import POSChatbot from "../components/pos/POSChatbot";
import { calculateDiscountedPrice } from "../components/inventory/DiscountBadge";
import OpenDrawerDialog from "../components/cash/OpenDrawerDialog";

export default function POSPage() {
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [discountType, setDiscountType] = useState(null);
  const [discountValue, setDiscountValue] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [applyingCode, setApplyingCode] = useState(false);
  const [manualDiscountAmount, setManualDiscountAmount] = useState("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState({
    cash: true,
    card: true,
    ath_movil: true,
    bank_transfer: false,
    check: false
  });
  const [athMovilPhone, setAthMovilPhone] = useState("");
  const [athMovilName, setAthMovilName] = useState("");
  const [taxRate, setTaxRate] = useState(0.115);
  const [showDrawerClosedAlert, setShowDrawerClosedAlert] = useState(false);
  const [showOpenDrawerModal, setShowOpenDrawerModal] = useState(false);

  const containerRef = useRef(null);
  useKeyboardScrollIntoView(containerRef);

  const urlParams = new URLSearchParams(window.location.search);
  const workOrderId = urlParams.get("workOrderId");
  const paymentMode = urlParams.get("mode") || "full";
  const balanceFromUrl = parseFloat(urlParams.get("balance")) || 0;

  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    loadInventory();
    loadPaymentMethods();
    loadTaxRate();
    checkCashDrawerStatus();
    if (workOrderId) loadWorkOrder();
  }, [workOrderId]);

  const checkCashDrawerStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const registers = await dataClient.entities.CashRegister.filter({ 
        date: today, 
        status: "open" 
      });
      
      if (!registers || registers.length === 0) {
        // ✅ Caja cerrada - mostrar alerta automáticamente
        setTimeout(() => {
          setShowDrawerClosedAlert(true);
        }, 500);
      }
    } catch (error) {
      console.error("Error verificando caja:", error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const configs = await dataClient.entities.AppSettings.filter({ slug: "payment-methods" });
      if (configs?.length) {
        setEnabledPaymentMethods(prev => ({
          ...prev,
          ...configs[0].payload
        }));
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
      toast.error("Error cargando configuración de métodos de pago.");
    }
  };

  const loadTaxRate = async () => {
    try {
      const configs = await dataClient.entities.AppSettings.filter({ slug: "app-main-settings" });
      if (configs?.length && configs[0].payload?.tax_rate) {
        setTaxRate(configs[0].payload.tax_rate / 100);
      }
    } catch (error) {
      console.error("Error loading tax rate:", error);
    }
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [productsResponse, servicesResponse] = await Promise.all([
        dataClient.entities.Product.filter({ active: true }, undefined, 200),
        dataClient.entities.Service.filter({ active: true }, undefined, 100)
      ]);
      setProducts(productsResponse || []);
      setServices(servicesResponse || []);
    } catch (error) {
      console.error("Error loading inventory:", error);
      toast.error("Error cargando inventario");
    } finally {
      setLoading(false);
    }
  };

  // AI FIX: deposit payment calculation - Load work order with proper total calculation
  const loadWorkOrder = async () => {
    try {
      const order = await dataClient.entities.Order.get(workOrderId);
      if (order) {
        const orderItems = order.order_items || [];
        
        // AI FIX: deposit payment calculation - Calculate total from items if not set
        let orderTotal = Number(order.total || 0);
        
        // If total is 0 or not set, calculate from items
        if (orderTotal === 0 && orderItems.length > 0) {
          const itemsSubtotal = orderItems.reduce((sum, item) => {
            const price = Number(item.price || 0);
            const qty = Number(item.qty || item.quantity || 1);
            return sum + (price * qty);
          }, 0);
          const itemsTax = itemsSubtotal * 0.115;
          orderTotal = itemsSubtotal + itemsTax;
        }
        
        // AI FIX: deposit payment calculation - Get total paid including all deposits
        const totalPaid = Number(order.total_paid || order.amount_paid || 0);
        const actualBalance = Math.max(0, orderTotal - totalPaid);
        
        // AI FIX: deposit payment calculation - Show correct message with real totals
        if (actualBalance <= 0.01) {
          toast.error("Esta orden ya está completamente pagada", {
            duration: 5000,
            description: `Total: $${orderTotal.toFixed(2)} | Pagado: $${totalPaid.toFixed(2)} | Pendiente: $0.00`
          });
          // Clear cart and redirect
          setTimeout(() => {
            window.history.back();
          }, 2000);
          return;
        }
        
        // AI FIX: deposit payment calculation - Show deposit info with correct totals
        if (totalPaid > 0) {
          toast.info(`Depósito previo: $${totalPaid.toFixed(2)}`, {
            duration: 4000,
            description: `Total: $${orderTotal.toFixed(2)} | Balance pendiente: $${actualBalance.toFixed(2)}`
          });
        }
        
        setCart(orderItems.map((item) => ({
          id: item.__source_id || item.id || `temp-${Date.now()}-${Math.random()}`,
          name: item.name,
          price: item.price,
          quantity: item.qty || item.quantity || 1,
          type: item.__kind || item.type || "product",
          stock: item.stock,
          sku: item.sku,
          code: item.code,
          originalPrice: item.originalPrice,
          discountApplied: item.discountApplied,
          discountLabel: item.discountLabel
        })));

        if (order.customer_id) {
          try {
            const customer = await dataClient.entities.Customer.get(order.customer_id);
            setSelectedCustomer(customer);
          } catch (e) {
            console.error("Error loading customer:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error loading work order:", error);
      toast.error("Error cargando orden de trabajo");
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let currentProductsList = products;

    // 🏷️ FILTRAR POR TAB
    if (activeTab === "offers") {
      // Solo productos con oferta activa
      currentProductsList = products.filter(p => {
        const hasDiscount = p.discount_active && p.discount_percentage > 0;
        const notExpired = !p.discount_end_date || new Date(p.discount_end_date) >= new Date();
        return hasDiscount && notExpired;
      });
    } else if (activeTab === "products") {
      // Solo productos SIN oferta activa (excluir los que tienen oferta)
      currentProductsList = products.filter(p => {
        const hasActiveDiscount = p.discount_active && p.discount_percentage > 0 && 
          (!p.discount_end_date || new Date(p.discount_end_date) >= new Date());
        return !hasActiveDiscount;
      });
    }

    // Apply search query to the current list
    const searchedProducts = q
      ? currentProductsList.filter((item) =>
          (item.name || "").toLowerCase().includes(q) ||
          (item.sku || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q)
        )
      : currentProductsList;

    return searchedProducts.slice(0, 50); // Limit to 50 items
  }, [products, searchQuery, activeTab]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return services.slice(0, 50);
    return services.filter((item) =>
      (item.name || "").toLowerCase().includes(q) ||
      (item.code || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q)
    );
  }, [services, searchQuery]);

  const addToCart = (item, type) => {
    const existingIndex = cart.findIndex((i) => i.id === item.id && i.type === type);

    // 🎯 APLICAR DESCUENTO AUTOMÁTICAMENTE
    const finalPrice = type === "product" ? calculateDiscountedPrice(item) : item.price;
    const hasDiscount = type === "product" && finalPrice < item.price;

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      const currentItem = updatedCart[existingIndex];
      const newQuantity = currentItem.quantity + 1;

      if (type === "product" && item.stock !== undefined && item.stock !== null && newQuantity > item.stock) {
        toast.warning(`Stock insuficiente. Solo quedan ${item.stock} unidades`);
        return;
      }

      currentItem.quantity = newQuantity;
      setCart(updatedCart);
      toast.success(`${item.name} añadido${hasDiscount ? ' 🏷️ CON OFERTA' : ''}`);
    } else {
      if (type === "product" && item.stock !== undefined && item.stock !== null && item.stock <= 0) {
        toast.error("Producto agotado");
        return;
      }

      setCart([...cart, {
        id: item.id,
        name: item.name,
        price: finalPrice,
        originalPrice: hasDiscount ? item.price : null,
        discountApplied: hasDiscount ? item.discount_percentage : null,
        discountLabel: hasDiscount ? item.discount_label : null,
        quantity: 1,
        type,
        stock: item.stock,
        sku: item.sku,
        code: item.code
      }]);
      toast.success(`${item.name} añadido${hasDiscount ? ' 🏷️ CON OFERTA' : ''}`);
    }
  };

  const updateCartQuantity = (index, delta) => {
    const updatedCart = [...cart];
    const currentItem = updatedCart[index];
    const newQuantity = currentItem.quantity + delta;

    if (newQuantity < 1) {
      removeItem(index);
      return;
    }

    if (currentItem.type === "product" && currentItem.stock !== undefined && currentItem.stock !== null && newQuantity > currentItem.stock) {
      toast.warning("Stock insuficiente");
      return;
    }

    currentItem.quantity = newQuantity;
    setCart(updatedCart);
  };

  const removeItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (!confirm("¿Vaciar el carrito?")) return;
    setCart([]);
    setPaymentMethod(null);
    setCashReceived("");
    setDepositAmount("");
    setAppliedDiscount(null);
    setDiscountType(null);
    setDiscountValue("");
    setDiscountCode("");
    setManualDiscountAmount("");
    setAthMovilPhone("");
    setAthMovilName("");
    toast.info("Carrito vaciado");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  let discountAmount = 0;
  if (appliedDiscount) {
    if (appliedDiscount.type === 'percentage') {
      discountAmount = subtotal * (appliedDiscount.value / 100);
    } else if (appliedDiscount.type === 'fixed') {
      discountAmount = Math.min(appliedDiscount.value, subtotal);
    }
  }

  const subtotalAfterDiscount = subtotal - discountAmount;
  const tax = subtotalAfterDiscount * taxRate;
  const total = subtotalAfterDiscount + tax;

  // AI FIX: deposit logic - Use balanceFromUrl if available (from work order)
  const effectiveTotal = balanceFromUrl > 0 ? balanceFromUrl : total;

  const amountToPay = paymentMode === "deposit" && depositAmount ?
    Math.min(parseFloat(depositAmount) || 0, effectiveTotal) :
    effectiveTotal;

  const pointsToEarn = Math.floor(total);

  const change = paymentMethod === "cash" && cashReceived ?
    Math.max(0, parseFloat(cashReceived) - amountToPay) :
    0;

  // AI FIX: deposit logic - Validate payment against effective total
  const isPaymentValid = paymentMode === "deposit" ?
    depositAmount &&
    parseFloat(depositAmount) > 0 &&
    parseFloat(depositAmount) <= effectiveTotal &&
    paymentMethod &&
    (paymentMethod === "cash" ? parseFloat(cashReceived) >= amountToPay :
     paymentMethod === "ath_movil" ? athMovilPhone && athMovilName : true) :
    paymentMethod === "cash" ? parseFloat(cashReceived) >= effectiveTotal :
    paymentMethod === "ath_movil" ? athMovilPhone && athMovilName :
    paymentMethod ? true : false;

  const applyQuickDiscount = (percentage) => {
    setAppliedDiscount({
      type: 'percentage',
      value: percentage,
      description: `${percentage}% descuento`
    });
    setDiscountType(null);
    toast.success(`✅ Descuento del ${percentage}% aplicado`);
  };

  const applyManualDiscount = () => {
    const amount = parseFloat(manualDiscountAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    if (amount > subtotal) {
      toast.error("El descuento no puede ser mayor al subtotal");
      return;
    }

    setAppliedDiscount({
      type: 'fixed',
      value: amount,
      description: `Descuento de $${amount.toFixed(2)}`
    });
    setDiscountType(null);
    setManualDiscountAmount("");
    toast.success(`✅ Descuento de $${amount.toFixed(2)} aplicado`);
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountType(null);
    setDiscountValue("");
    setDiscountCode("");
    setManualDiscountAmount("");
    toast.info("Descuento removido");
  };

  const handleProcessPayment = async () => {
    if (!isPaymentValid) {
      toast.error("Monto de pago inválido");
      return;
    }

    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }

    // ✅ VALIDAR QUE LA CAJA ESTÉ ABIERTA
    try {
      const today = new Date().toISOString().split('T')[0];
      const registers = await dataClient.entities.CashRegister.filter({ date: today, status: "open" });
      
      if (!registers || registers.length === 0) {
        toast.error("⚠️ La caja está cerrada. Debes abrir la caja para procesar pagos.", {
          duration: 5000
        });
        setShowPaymentModal(false);
        return;
      }
    } catch (error) {
      console.error("Error validando caja:", error);
      toast.error("Error verificando estado de la caja");
      return;
    }

    setProcessing(true);

    try {
      let me = null;
      try { me = await dataClient.auth.me(); } catch { }

      const amountPaid = paymentMethod === "cash" ?
        parseFloat(cashReceived) :
        amountToPay;

      console.log("💰 [POS] Creando venta:", {
        subtotal,
        tax,
        total,
        amountPaid,
        paymentMethod,
        cartItems: cart.length
      });

      const paymentDetails = {
        methods: [{ method: paymentMethod, amount: amountPaid }],
        change_given: change
      };

      if (paymentMethod === "ath_movil") {
        paymentDetails.ath_movil_info = {
          phone: athMovilPhone,
          name: athMovilName
        };
      }

      const saleData = {
        sale_number: `S-${Date.now()}`,
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || null,
        items: cart.map((item) => ({
          type: item.type,
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          originalPrice: item.originalPrice,
          discountApplied: item.discountApplied,
          discountLabel: item.discountLabel,
          total: item.price * item.quantity
        })),
        subtotal,
        discount_amount: discountAmount,
        discount_code: appliedDiscount?.code || null,
        discount_type: appliedDiscount?.type || null,
        discount_value: appliedDiscount?.value || 0,
        tax_rate: taxRate,
        tax_amount: tax,
        total,
        amount_paid: amountPaid,
        amount_due: 0,
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        points_earned: paymentMode === "deposit" ? 0 : pointsToEarn,
        employee: me?.full_name || "Sistema",
        order_id: workOrderId || null,
        notes: paymentMode === "deposit" ? `Depósito parcial: $${amountPaid.toFixed(2)}` : ""
      };

      const sale = await dataClient.entities.Sale.create(saleData);

      console.log("✅ [POS] Venta creada exitosamente:", sale.id, sale.sale_number);

      await dataClient.entities.Transaction.create({
        type: "revenue",
        amount: total,
        description: `Venta ${saleData.sale_number}${selectedCustomer ? ` - ${selectedCustomer.name}` : ''}${paymentMethod === "ath_movil" && athMovilName ? ` - ATH de ${athMovilName} (${athMovilPhone})` : ''}`,
        category: "repair_payment",
        payment_method: paymentMethod,
        recorded_by: me?.full_name || "Sistema",
        order_id: workOrderId || null,
        order_number: null,
        ...(paymentMethod === "ath_movil" && {
          payment_details: {
            ath_movil_phone: athMovilPhone,
            ath_movil_name: athMovilName
          }
        })
      });

      console.log("✅ [POS] Transacción de ingreso creada");

      for (const item of cart) {
        if (item.type === "product") {
          const product = products.find((p) => p.id === item.id);
          if (product) {
            const newStock = Math.max(0, Number(product.stock || 0) - item.quantity);
            await dataClient.entities.Product.update(item.id, { stock: newStock });

            await dataClient.entities.InventoryMovement.create({
              product_id: item.id,
              product_name: item.name,
              movement_type: "sale",
              quantity: -item.quantity,
              previous_stock: product.stock || 0,
              new_stock: newStock,
              reference_type: "sale",
              reference_id: sale.id,
              reference_number: saleData.sale_number,
              notes: `Venta POS ${saleData.sale_number}`,
              performed_by: me?.full_name || "Sistema"
            });
          }
        }
      }

      if (selectedCustomer && paymentMode !== "deposit") {
        const currentPoints = Number(selectedCustomer.loyalty_points || 0);
        const newPoints = currentPoints + pointsToEarn;
        const newTotalSpent = Number(selectedCustomer.total_spent || 0) + total;

        let tier = 'bronze';
        if (newTotalSpent >= 5000) tier = 'platinum';
        else if (newTotalSpent >= 2000) tier = 'gold';
        else if (newTotalSpent >= 500) tier = 'silver';

        await dataClient.entities.Customer.update(selectedCustomer.id, {
          loyalty_points: newPoints,
          loyalty_tier: tier,
          total_spent: newTotalSpent,
          total_orders: (selectedCustomer.total_orders || 0) + 1
        });
      }

      if (appliedDiscount?.codeId) {
        try {
          const code = await dataClient.entities.DiscountCode.get(appliedDiscount.codeId);
          await dataClient.entities.DiscountCode.update(appliedDiscount.codeId, {
            times_used: (code.times_used || 0) + 1
          });
        } catch (e) {
          console.error("Error updating discount code usage:", e);
        }
      }

      let finalOrderDetails = null;
      if (workOrderId) {
        const order = await dataClient.entities.Order.get(workOrderId);
        const orderTotal = Number(order.total || 0);
        const currentPaid = Number(order.total_paid || order.amount_paid || 0);
        const newTotalPaid = currentPaid + amountPaid;
        const newBalance = Math.max(0, orderTotal - newTotalPaid);

        const updateData = {
          total_paid: newTotalPaid,
          amount_paid: newTotalPaid,
          balance_due: newBalance,
          paid: newBalance <= 0.01
        };

        if (paymentMode === "full" && newBalance <= 0.01) {
          const currentStatus = String(order.status || "").toLowerCase();
          const terminalStatuses = ["picked_up", "cancelled", "completed"];

          if (!terminalStatuses.includes(currentStatus)) {
            updateData.status = "ready_for_pickup";
          }
        }

        await dataClient.entities.Order.update(workOrderId, updateData);

        await dataClient.entities.WorkOrderEvent.create({
          order_id: workOrderId,
          order_number: order.order_number,
          event_type: "payment",
          description: `${paymentMode === "deposit" ? "Depósito recibido" : "Pago completo recibido"}: $${amountPaid.toFixed(2)} (${paymentMethod})${change > 0 ? ` - Cambio: $${change.toFixed(2)}` : ""}${paymentMethod === "ath_movil" && athMovilName ? ` - ATH de ${athMovilName} (${athMovilPhone})` : ""} | Balance pendiente: $${newBalance.toFixed(2)}`,
          user_name: me?.full_name || me?.email || "Sistema",
          user_id: me?.id || null,
          metadata: {
            amount: amountPaid,
            method: paymentMethod,
            change_given: change,
            total_paid: newTotalPaid,
            balance: newBalance,
            sale_number: saleData.sale_number,
            is_full_payment: newBalance <= 0.01,
            payment_mode: paymentMode,
            discount_amount: discountAmount,
            discount_code: appliedDiscount?.code,
            ...(paymentMethod === "ath_movil" && {
              ath_movil_phone: athMovilPhone,
              ath_movil_name: athMovilName
            })
          }
        });

        window.dispatchEvent(new CustomEvent('order-payment-processed', {
          detail: { orderId: workOrderId, amountPaid, newBalance, totalPaid: newTotalPaid }
        }));

        if (newBalance <= 0.01) {
          toast.success(`✅ ORDEN SALDADA - Balance: $0.00`, { duration: 3000 });
        } else {
          toast.success(`✅ ${paymentMode === "deposit" ? "Depósito" : "Pago"} procesado - Balance restante: $${newBalance.toFixed(2)}`, { duration: 3000 });
        }

        finalOrderDetails = {
          order_id: order.id,
          order_number: order.order_number,
          order_total: orderTotal,
          initial_paid: currentPaid,
          total_paid_after_this_payment: newTotalPaid,
          balance_after_this_payment: newBalance,
          payment_mode: paymentMode,
          device_brand: order.device_brand,
          device_model: order.device_model,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone
        };
      } else {
        toast.success(`✅ Venta procesada exitosamente`, { duration: 3000 });
      }

      const receiptData = {
        ...saleData,
        customer: selectedCustomer,
        workOrder: finalOrderDetails
      };

      setCompletedSale(receiptData);
      setShowPaymentModal(false);
      setShowReceiptModal(true);

      console.log("🔔 [POS] Disparando eventos de sincronización...");
      window.dispatchEvent(new Event("force-refresh"));
      window.dispatchEvent(new CustomEvent("sale-completed", {
        detail: {
          saleId: sale.id,
          amount: total,
          method: paymentMethod
        }
      }));

      setCart([]);
      setPaymentMethod(null);
      setCashReceived("");
      setDepositAmount("");
      setAppliedDiscount(null);
      setDiscountType(null);
      setDiscountValue("");
      setDiscountCode("");
      setManualDiscountAmount("");
      setAthMovilPhone("");
      setAthMovilName("");

    } catch (error) {
      console.error("❌ [POS] Error processing payment:", error);
      toast.error("Error al procesar el pago: " + (error.message || "Error desconocido"));
    } finally {
      setProcessing(false);
    }
  };

  const quickCashAmounts = [20, 50, 100];
  const quickDepositAmounts = [50, 100, 150];

  if (isMobile) {
    return (
      <div>
        <MobilePOS
          products={products}
          services={services}
          cart={cart}
          addToCart={addToCart}
          updateCartQuantity={updateCartQuantity}
          removeItem={removeItem}
          clearCart={clearCart}
          selectedCustomer={selectedCustomer}
          onOpenCustomerSelector={() => setShowCustomerSelector(true)}
          onProceedToPayment={() => setShowPaymentModal(true)}
          subtotal={subtotal}
          tax={tax}
          total={total}
          discountAmount={discountAmount}
          appliedDiscount={appliedDiscount}
          removeDiscount={removeDiscount}
          applyQuickDiscount={applyQuickDiscount}
          setDiscountType={setDiscountType}
          discountType={discountType}
          manualDiscountAmount={manualDiscountAmount}
          setManualDiscountAmount={setManualDiscountAmount}
          applyManualDiscount={applyManualDiscount}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredProducts={filteredProducts}
          filteredServices={filteredServices}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          workOrderId={workOrderId}
          paymentMode={paymentMode}
          balanceFromUrl={balanceFromUrl}
          pointsToEarn={pointsToEarn}
          enabledPaymentMethods={enabledPaymentMethods}
        />

        <CustomerSelector
          open={showCustomerSelector}
          onClose={() => setShowCustomerSelector(false)}
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerSelector(false);
            if (customer) toast.success(`Cliente "${customer.name}" seleccionado`);
          }}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerSelector(false);
            if (customer) toast.success(`Cliente "${customer.name}" seleccionado`);
          }}
        />

        {showReceiptModal && completedSale && (
          <ReceiptModal
            open={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false);
              setCompletedSale(null);
              setSelectedCustomer(null);
              if (workOrderId) window.history.back();
            }}
            saleData={completedSale}
            customer={selectedCustomer}
          />
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-[100]">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowPaymentModal(false)} />
            <div className="absolute inset-0 grid place-items-center p-4 overflow-y-auto">
              <div className="w-full max-w-md bg-white rounded-2xl p-6 theme-dark:bg-[#0F0F12] theme-dark:border theme-dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 theme-dark:text-white">
                    {paymentMode === "deposit" ? "Depósito Parcial" : "Método de Pago"}
                  </h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentMethod(null);
                      setCashReceived("");
                      setDepositAmount("");
                      setAthMovilPhone("");
                      setAthMovilName("");
                    }}
                    className="text-gray-400 hover:text-gray-900 theme-dark:text-gray-600 theme-dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {!paymentMethod ? (
                  <div className="space-y-4">
                    {paymentMode === "deposit" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-gray-700 text-sm mb-2 block theme-dark:text-gray-300">Monto del depósito</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.00"
                            className="h-14 text-2xl text-center theme-dark:bg-black/40 theme-dark:border-white/15 theme-dark:text-white"
                            autoFocus
                            min="0.01"
                            max={total}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {quickDepositAmounts.map((amt) => (
                            <Button
                              key={amt}
                              variant="outline"
                              onClick={() => setDepositAmount(String(Math.min(amt, total)))}
                              className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/20 theme-dark:border-emerald-300 theme-dark:text-emerald-400 theme-dark:hover:bg-emerald-600/20"
                            >
                              ${amt}
                            </Button>
                          ))}
                        </div>
                        {depositAmount && parseFloat(depositAmount) > 0 && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl theme-dark:bg-blue-600/10 theme-dark:border-blue-500/30">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-blue-700 theme-dark:text-blue-300">Balance restante</span>
                              <span className="text-blue-800 font-bold text-lg theme-dark:text-blue-400">
                                ${(total - parseFloat(depositAmount)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(paymentMode !== "deposit" || (depositAmount && parseFloat(depositAmount) > 0)) && (
                      <div className="grid grid-cols-1 gap-3">
                        {enabledPaymentMethods.cash && (
                          <button
                            onClick={() => setPaymentMethod("cash")}
                            className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-all theme-dark:from-green-600/20 theme-dark:to-green-800/20 theme-dark:border-green-500/30 theme-dark:bg-transparent theme-dark:hover:border-green-500/50"
                          >
                            <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center theme-dark:bg-green-600/30">
                              <Banknote className="w-6 h-6 text-green-700 theme-dark:text-green-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-bold text-gray-900 theme-dark:text-white">Efectivo</p>
                              <p className="text-xs text-gray-600 theme-dark:text-gray-400">Ingresa monto recibido</p>
                            </div>
                          </button>
                        )}

                        {enabledPaymentMethods.card && (
                          <button
                            onClick={() => setPaymentMethod("card")}
                            className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-all theme-dark:from-blue-600/20 theme-dark:to-blue-800/20 theme-dark:border-blue-500/30 theme-dark:bg-transparent theme-dark:hover:border-blue-500/50"
                          >
                            <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center theme-dark:bg-blue-600/30">
                              <CreditCard className="w-6 h-6 text-blue-700 theme-dark:text-blue-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-bold text-gray-900 theme-dark:text-white">Tarjeta / Visa</p>
                              <p className="text-xs text-gray-600 theme-dark:text-gray-400">
                                {paymentMode === "deposit" ? `Depositar $${parseFloat(depositAmount).toFixed(2)}` : "Cobra el total exacto"}
                              </p>
                            </div>
                          </button>
                        )}

                        {enabledPaymentMethods.ath_movil && (
                          <button
                            onClick={() => setPaymentMethod("ath_movil")}
                            className="flex items-center gap-3 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl hover:bg-orange-100 transition-all theme-dark:from-orange-600/20 theme-dark:to-orange-800/20 theme-dark:border-orange-500/30 theme-dark:bg-transparent theme-dark:hover:border-orange-500/50"
                          >
                            <div className="w-12 h-12 rounded-full bg-orange-200 flex items-center justify-center theme-dark:bg-orange-600/30">
                              <Smartphone className="w-6 h-6 text-orange-700 theme-dark:text-orange-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-bold text-gray-900 theme-dark:text-white">ATH Móvil</p>
                              <p className="text-xs text-gray-600 theme-dark:text-gray-400">
                                {paymentMode === "deposit" ? `Depositar $${parseFloat(depositAmount).toFixed(2)}` : "Pago digital exacto"}
                              </p>
                            </div>
                          </button>
                        )}

                        {enabledPaymentMethods.bank_transfer && (
                          <button
                            onClick={() => setPaymentMethod("bank_transfer")}
                            className="flex items-center gap-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 transition-all theme-dark:from-purple-600/20 theme-dark:to-purple-800/20 theme-dark:border-purple-500/30 theme-dark:bg-transparent theme-dark:hover:border-purple-500/50"
                          >
                            <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center theme-dark:bg-purple-600/30">
                              <Landmark className="w-6 h-6 text-purple-700 theme-dark:text-purple-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-bold text-gray-900 theme-dark:text-white">Transferencia</p>
                              <p className="text-xs text-gray-600 theme-dark:text-gray-400">
                                {paymentMode === "deposit" ? `Depositar $${parseFloat(depositAmount).toFixed(2)}` : "Transferencia bancaria"}
                              </p>
                            </div>
                          </button>
                        )}

                        {enabledPaymentMethods.check && (
                          <button
                            onClick={() => setPaymentMethod("check")}
                            className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-all theme-dark:from-gray-600/20 theme-dark:to-gray-800/20 theme-dark:border-gray-500/30 theme-dark:bg-transparent theme-dark:hover:border-gray-500/50"
                          >
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center theme-dark:bg-gray-600/30">
                              <FileText className="w-6 h-6 text-gray-700 theme-dark:text-gray-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-bold text-gray-900 theme-dark:text-white">Cheque</p>
                              <p className="text-xs text-gray-600 theme-dark:text-gray-400">
                                {paymentMode === "deposit" ? `Depositar $${parseFloat(depositAmount).toFixed(2)}` : "Pago con cheque"}
                              </p>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg theme-dark:bg-white/5">
                      {paymentMethod === "cash" && <Banknote className="w-5 h-5 text-green-700 theme-dark:text-green-400" />}
                      {paymentMethod === "card" && <CreditCard className="w-5 h-5 text-blue-700 theme-dark:text-blue-400" />}
                      {paymentMethod === "ath_movil" && <Smartphone className="w-5 h-5 text-orange-700 theme-dark:text-orange-400" />}
                      {paymentMethod === "bank_transfer" && <Landmark className="w-5 h-5 text-purple-700 theme-dark:text-purple-400" />}
                      {paymentMethod === "check" && <FileText className="w-5 h-5 text-gray-700 theme-dark:text-gray-400" />}
                      <span className="text-gray-900 font-semibold theme-dark:text-white">
                        {paymentMethod === "cash" ? "Efectivo" :
                          paymentMethod === "card" ? "Tarjeta/Visa" :
                            paymentMethod === "ath_movil" ? "ATH Móvil" :
                              paymentMethod === "bank_transfer" ? "Transferencia Bancaria" :
                                paymentMethod === "check" ? "Cheque" : ""}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowPaymentModal(false);
                          setPaymentMethod(null);
                          setCashReceived("");
                          setAthMovilPhone("");
                          setAthMovilName("");
                        }}
                        className="ml-auto text-gray-600 hover:text-gray-900 theme-dark:text-gray-400 theme-dark:hover:text-white"
                      >
                        Cambiar
                      </Button>
                    </div>

                    {paymentMethod === "cash" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-gray-700 text-sm mb-2 block theme-dark:text-gray-300">
                            {paymentMode === "deposit" ? "Efectivo recibido para depósito" : "Efectivo recibido"}
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            placeholder="0.00"
                            className="h-14 text-2xl text-center theme-dark:bg-black/40 theme-dark:border-white/15 theme-dark:text-white"
                            autoFocus
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {(paymentMode === "deposit" ? quickDepositAmounts : quickCashAmounts).map((amt) => (
                            <Button
                              key={amt}
                              variant="outline"
                              onClick={() => setCashReceived(String(paymentMode === "deposit" ? Math.min(amt, amountToPay) : amt))}
                              className="border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/20 theme-dark:border-emerald-300 theme-dark:text-emerald-400 theme-dark:hover:bg-emerald-600/20"
                            >
                              ${amt}
                            </Button>
                          ))}
                        </div>

                        {change > 0 && (
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl theme-dark:bg-emerald-600/10 theme-dark:border-emerald-500/30">
                            <div className="flex justify-between items-center">
                              <span className="text-emerald-700 font-semibold theme-dark:text-emerald-300">Cambio a devolver</span>
                              <span className="text-emerald-800 font-bold text-2xl theme-dark:text-emerald-400">${change.toFixed(2)}</span>
                            </div>
                          </div>
                        )}

                        {cashReceived && paymentMode === "deposit" && parseFloat(cashReceived) < amountToPay && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl theme-dark:bg-red-600/10 theme-dark:border-red-500/30">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-700 theme-dark:text-red-400" />
                              <span className="text-red-700 text-sm theme-dark:text-red-300">
                                Falta: ${(amountToPay - parseFloat(cashReceived)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {cashReceived && paymentMode === "full" && parseFloat(cashReceived) < total && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl theme-dark:bg-red-600/10 theme-dark:border-red-500/30">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-700 theme-dark:text-red-400" />
                              <span className="text-red-700 text-sm theme-dark:text-red-300">
                                Falta: ${(total - parseFloat(cashReceived)).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentMethod === "ath_movil" && (
                      <div className="space-y-3">
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl theme-dark:bg-orange-600/10 theme-dark:border-orange-500/30">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-orange-700 theme-dark:text-orange-300">Se cobrará</span>
                            <span className="text-orange-800 font-bold text-3xl theme-dark:text-orange-400">
                              ${amountToPay.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-gray-700 text-sm mb-2 block theme-dark:text-gray-300">
                            Teléfono del pagador *
                          </label>
                          <Input
                            type="tel"
                            value={athMovilPhone}
                            onChange={(e) => setAthMovilPhone(e.target.value)}
                            placeholder="787-123-4567"
                            className="theme-dark:bg-black/40 theme-dark:border-white/15 theme-dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-gray-700 text-sm mb-2 block theme-dark:text-gray-300">
                            Nombre del pagador *
                          </label>
                          <Input
                            type="text"
                            value={athMovilName}
                            onChange={(e) => setAthMovilName(e.target.value)}
                            placeholder="Nombre completo"
                            className="theme-dark:bg-black/40 theme-dark:border-white/15 theme-dark:text-white"
                          />
                        </div>

                        {(!athMovilPhone || !athMovilName) && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl theme-dark:bg-amber-600/10 theme-dark:border-amber-500/30">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-700 theme-dark:text-amber-400" />
                              <span className="text-amber-700 text-sm theme-dark:text-amber-300">
                                Completa los datos del pagador
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(paymentMethod === "card" || paymentMethod === "bank_transfer" || paymentMethod === "check") && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl theme-dark:bg-blue-600/10 theme-dark:border-blue-500/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-blue-700 theme-dark:text-blue-300">
                            {paymentMode === "deposit" ? "Monto del depósito" : "Se cobrará"}
                          </span>
                          <span className="text-blue-800 font-bold text-3xl theme-dark:text-blue-400">
                            ${amountToPay.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 text-center theme-dark:text-gray-400">
                          {paymentMethod === "card" ? "Procesamiento por terminal de tarjeta" :
                            paymentMethod === "ath_movil" ? "Pago por ATH Móvil" :
                              paymentMethod === "bank_transfer" ? "Procesar transferencia bancaria" :
                                paymentMethod === "check" ? "Confirmar pago con cheque" : ""}
                        </p>
                        {paymentMode === "deposit" && (
                          <p className="text-xs text-amber-700 text-center mt-2 theme-dark:text-amber-300">
                            Balance restante: ${(total - amountToPay).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPaymentMethod(null);
                          setCashReceived("");
                          setAthMovilPhone("");
                          setAthMovilName("");
                          if (paymentMode === "deposit") setDepositAmount("");
                        }}
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 theme-dark:border-white/15 theme-dark:text-gray-300 theme-dark:hover:bg-white/10"
                      >
                        Atrás
                      </Button>
                      <Button
                        onClick={handleProcessPayment}
                        disabled={processing || !isPaymentValid}
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 h-12 text-lg font-bold shadow-lg disabled:opacity-50"
                      >
                        {processing ? (
                          "Procesando..."
                        ) : (
                          <>
                            <DollarSign className="w-5 h-5 mr-2" />
                            {paymentMode === "deposit" ? `Depositar $${amountToPay.toFixed(2)}` : "Confirmar Pago"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <SalesHistoryDialog
          open={showSalesHistory}
          onClose={() => setShowSalesHistory(false)}
        />

        {/* ✅ ALERTA DE CAJA CERRADA */}
        {showDrawerClosedAlert && !showOpenDrawerModal && (
          <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-amber-600/20 to-red-600/20 border-2 border-amber-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_24px_80px_rgba(245,158,11,0.5)]">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white mb-4">
                  🔒 Caja Cerrada
                </h2>
                <p className="text-amber-200 text-base mb-6 leading-relaxed">
                  La caja registradora está cerrada. Debes abrirla para procesar pagos.
                </p>
                <p className="text-white font-semibold mb-8">
                  ¿Deseas abrir la caja ahora?
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowDrawerClosedAlert(false);
                      navigate(-1);
                    }}
                    variant="outline"
                    className="flex-1 border-gray-400 text-gray-300 hover:bg-gray-700 h-12 text-base font-semibold"
                  >
                    No, volver
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDrawerClosedAlert(false);
                      setShowOpenDrawerModal(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 h-12 text-base font-bold shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
                  >
                    ✅ Sí, abrir caja
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ MODAL DE ABRIR CAJA (EL MISMO DEL DASHBOARD) */}
        {showOpenDrawerModal && (
          <OpenDrawerDialog
            open={showOpenDrawerModal}
            onClose={() => setShowOpenDrawerModal(false)}
            onSuccess={() => {
              setShowOpenDrawerModal(false);
              toast.success("✅ Caja abierta, puedes procesar pagos");
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen flex bg-[#0A0A0A] theme-light:bg-gradient-to-br theme-light:from-gray-50 theme-light:to-gray-100 overflow-hidden"
      data-keyboard-aware
    >
      <div className="flex-1 flex flex-col">
        <div className="relative bg-gradient-to-r from-cyan-600/10 via-emerald-600/10 to-lime-600/10 backdrop-blur-xl border-b border-cyan-500/20 p-6 theme-light:bg-white theme-light:border-gray-200">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-emerald-500/5 blur-3xl"></div>

          <div className="relative flex items-center justify-between mb-4">
            {workOrderId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(createPageUrl(`Orders?order=${workOrderId}`))}
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-600/10 theme-light:text-cyan-600 theme-light:hover:bg-cyan-50"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver a Orden
              </Button>
            )}

            <div className="flex-1">
              <h1 className="text-3xl font-black text-white flex items-center gap-3 theme-light:text-gray-900">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-50"></div>
                  <ShoppingCart className="relative w-8 h-8 text-cyan-500" />
                </div>
                Punto de Venta
              </h1>
              {workOrderId && (
                <Badge className="mt-2 bg-gradient-to-r from-cyan-600/30 to-emerald-600/30 text-cyan-200 border border-cyan-500/40 shadow-lg theme-light:from-cyan-100 theme-light:to-emerald-100 theme-light:text-cyan-700 theme-light:border-cyan-300">
                  🎯 Cobrando Orden {paymentMode === "deposit" ? "(Depósito)" : "(Total)"}
                  {balanceFromUrl > 0 && ` • $${balanceFromUrl.toFixed(2)}`}
                </Badge>
              )}
            </div>

            <Button
              onClick={() => setShowSalesHistory(true)}
              variant="outline"
              className="border-2 border-purple-500/30 text-purple-400 hover:bg-purple-600/20 hover:border-purple-500/50 theme-light:border-purple-300 theme-light:text-purple-700 theme-light:hover:bg-purple-50"
            >
              <History className="w-5 h-5 mr-2" />
              Historial
            </Button>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-cyan-400 theme-light:text-cyan-600" />
              <Input
                placeholder="🔍 Busca por nombre, SKU o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-14 bg-black/40 border-2 border-cyan-500/30 text-white text-lg placeholder:text-gray-500 focus:border-cyan-500/60 focus:ring-4 focus:ring-cyan-500/20 theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900 theme-light:focus:border-cyan-500"
                autoFocus
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="bg-black/60 border-2 border-cyan-500/20 p-1 w-full theme-light:bg-gray-100 theme-light:border-gray-300">
              <TabsTrigger
                value="products"
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg flex items-center gap-2 rounded-lg py-3"
              >
                <Package className="w-5 h-5" />
                <span className="font-bold">Productos</span>
                <Badge className="bg-white/20 text-white">{products.length}</Badge>
              </TabsTrigger>
              <TabsTrigger
                value="offers"
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg flex items-center gap-2 rounded-lg py-3"
              >
                <Tag className="w-5 h-5" />
                <span className="font-bold">Ofertas</span>
                <Badge className="bg-white/20 text-white animate-pulse">
                  {products.filter(p => p.discount_active && p.discount_percentage > 0 && (!p.discount_end_date || new Date(p.discount_end_date) >= new Date())).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg flex items-center gap-2 rounded-lg py-3"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-bold">Servicios</span>
                <Badge className="bg-white/20 text-white">{filteredServices.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products" className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-black to-[#0A0A0A] theme-light:bg-gray-50 m-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400 theme-light:text-gray-600">Cargando productos...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Package className="w-24 h-24 text-gray-700 mb-4 opacity-30 theme-light:text-gray-400" />
                <p className="text-xl text-gray-400 mb-2 theme-light:text-gray-600">No se encontraron productos</p>
                <p className="text-gray-600 theme-light:text-gray-500">{searchQuery ? `"${searchQuery}"` : "Sin productos disponibles"}</p>
              </div>
            ) : (
              <div>
                {searchQuery && (
                  <div className="mb-4 flex items-center gap-3">
                    <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 px-3 py-1.5 theme-light:bg-cyan-100 theme-light:text-cyan-700 theme-light:border-cyan-300">
                      {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSearchQuery("")}
                      className="text-gray-400 hover:text-white theme-light:text-gray-600 theme-light:hover:text-gray-900"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpiar búsqueda
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((i) => i.id === product.id && i.type === "product");
                    const qtyInCart = inCart ? inCart.quantity : 0;
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock > 0 && product.stock <= (product.min_stock || 5);
                    
                    // 🎯 CALCULAR PRECIO CON DESCUENTO
                    const finalPrice = calculateDiscountedPrice(product);
                    const hasDiscount = finalPrice < product.price;

                    return (
                      <div
                        key={product.id}
                        className="relative"
                      >
                        {qtyInCart > 0 && (
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-[0_4px_16px_rgba(220,38,38,0.8)] border-2 border-slate-950/50 animate-bounce z-20 theme-light:border-white">
                            {qtyInCart}
                          </div>
                        )}

                        {hasDiscount && (
                          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-[0_6px_20px_rgba(249,115,22,0.8)] z-20 animate-pulse border-2 border-white">
                            🏷️ -{product.discount_percentage}%
                          </div>
                        )}

                        <button
                          onClick={() => !isOutOfStock && addToCart(product, "product")}
                          disabled={isOutOfStock}
                          className={`
                            group relative overflow-hidden rounded-xl transition-all duration-300 w-full
                            ${isOutOfStock ? "opacity-40 cursor-not-allowed" : "hover:scale-105 cursor-pointer"}
                            ${hasDiscount ? "ring-2 ring-orange-500/60 ring-offset-2 ring-offset-black theme-light:ring-offset-gray-50" : ""}
                          `}
                        >
                          <div className={`
                            h-full p-3
                            ${isOutOfStock
                              ? "bg-gradient-to-br from-red-900/20 to-red-950/20 border-2 border-red-600/30"
                              : hasDiscount
                                ? "bg-gradient-to-br from-orange-800/80 to-red-900/80 border-2 border-orange-500/40 hover:border-orange-400/70"
                                : "bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-cyan-500/20 hover:border-cyan-400/50"}
                            backdrop-blur-xl theme-light:from-white theme-light:to-gray-50 theme-light:border-gray-200
                            ${!isOutOfStock && "hover:shadow-[0_12px_32px_rgba(0,168,232,0.25)] theme-light:hover:shadow-xl"}
                          `}>
                            {!isOutOfStock && (
                              <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 ${
                                hasDiscount
                                  ? "from-orange-500/0 via-red-500/0 to-red-500/0 group-hover:from-orange-500/20 group-hover:via-red-500/20 group-hover:to-red-500/20"
                                  : "from-cyan-500/0 via-emerald-500/0 to-lime-500/0 group-hover:from-cyan-500/10 group-hover:via-emerald-500/10 group-hover:to-lime-500/10"
                              }`}></div>
                            )}

                            {!isOutOfStock && (
                              <div className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110 group-hover:rotate-90 z-10 ${
                                hasDiscount
                                  ? "bg-gradient-to-r from-orange-500 to-red-500"
                                  : "bg-gradient-to-r from-cyan-500 to-emerald-500"
                              }`}>
                                <Plus className="w-4 h-4 text-white" />
                              </div>
                            )}

                            <div className="relative">
                              <h3 className="font-bold text-white text-sm mb-1.5 line-clamp-2 min-h-[2.5rem] pr-8 theme-light:text-gray-900">
                                {product.name}
                              </h3>

                              {product.sku && (
                                <p className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded inline-block mb-2 theme-light:bg-gray-100 theme-light:text-gray-600">
                                  {product.sku}
                                </p>
                              )}

                              <div className="flex items-end justify-between mt-3 pt-3 border-t border-white/10 theme-light:border-gray-200">
                                <div>
                                  <div className={`text-xl font-black ${hasDiscount ? 'text-orange-400 theme-light:text-orange-600' : 'bg-gradient-to-r from-emerald-400 to-lime-400 bg-clip-text text-transparent theme-light:from-emerald-600 theme-light:to-lime-600'}`}>
                                    ${finalPrice.toFixed(2)}
                                  </div>
                                  {hasDiscount && (
                                    <div className="text-xs text-gray-500 line-through">
                                      ${product.price.toFixed(2)}
                                    </div>
                                  )}
                                </div>

                                {isOutOfStock ? (
                                  <Badge className="bg-red-600/30 text-red-200 border-red-500/50 font-bold text-[9px] px-1.5 py-0 theme-light:bg-red-100 theme-light:text-red-700 theme-light:border-red-300">
                                    AGOTADO
                                  </Badge>
                                ) : isLowStock ? (
                                  <Badge className="bg-yellow-600/30 text-yellow-200 border-yellow-500/50 animate-pulse text-[9px] px-1.5 py-0 theme-light:bg-yellow-100 theme-light:text-yellow-700 theme-light:border-yellow-300">
                                    {product.stock} ⚠️
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/50 text-[9px] px-1.5 py-0 theme-light:bg-emerald-100 theme-light:text-emerald-700 theme-light:border-emerald-300">
                                    {product.stock} ✓
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="offers" className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-orange-900/20 to-[#0A0A0A] theme-light:bg-gradient-to-b theme-light:from-orange-50 theme-light:to-gray-50 m-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400 theme-light:text-gray-600">Cargando ofertas...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Tag className="w-24 h-24 text-gray-700 mb-4 opacity-30 theme-light:text-gray-400" />
                <p className="text-xl text-gray-400 mb-2 theme-light:text-gray-600">No hay ofertas activas</p>
                <p className="text-gray-600 theme-light:text-gray-500">Configura descuentos desde Inventario</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/40 rounded-2xl theme-light:from-orange-50 theme-light:to-red-50 theme-light:border-orange-300">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg animate-pulse">
                      <Tag className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-orange-200 font-black text-lg theme-light:text-orange-700">
                        🔥 {filteredProducts.length} {filteredProducts.length === 1 ? 'Oferta Activa' : 'Ofertas Activas'}
                      </p>
                      <p className="text-orange-300 text-sm theme-light:text-orange-600">
                        Los descuentos se aplican automáticamente
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((i) => i.id === product.id && i.type === "product");
                    const qtyInCart = inCart ? inCart.quantity : 0;
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock > 0 && product.stock <= (product.min_stock || 5);
                    const finalPrice = calculateDiscountedPrice(product);
                    const savings = product.price - finalPrice;

                    return (
                      <div key={product.id} className="relative">
                        {qtyInCart > 0 && (
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-[0_4px_16px_rgba(220,38,38,0.8)] border-2 border-slate-950/50 animate-bounce z-20 theme-light:border-white">
                            {qtyInCart}
                          </div>
                        )}

                        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 via-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-[0_6px_20px_rgba(249,115,22,0.8)] z-20 animate-pulse border-2 border-white">
                          🏷️ -{product.discount_percentage}%
                        </div>

                        <button
                          onClick={() => !isOutOfStock && addToCart(product, "product")}
                          disabled={isOutOfStock}
                          className={`
                            group relative overflow-hidden rounded-xl transition-all duration-300 w-full hover:scale-105 cursor-pointer
                            ring-2 ring-orange-500/60 ring-offset-2 ring-offset-black theme-light:ring-offset-gray-50
                            ${isOutOfStock && "opacity-40 cursor-not-allowed"}
                          `}
                        >
                          <div className="h-full p-3 bg-gradient-to-br from-orange-800/80 to-red-900/80 border-2 border-orange-500/40 hover:border-orange-400/70 backdrop-blur-xl hover:shadow-[0_12px_32px_rgba(249,115,22,0.5)] theme-light:from-orange-50 theme-light:to-red-50 theme-light:border-orange-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-red-500/0 to-red-500/0 group-hover:from-orange-500/20 group-hover:via-red-500/20 group-hover:to-red-500/20 transition-all duration-500"></div>

                            {!isOutOfStock && (
                              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-md transition-transform group-hover:scale-110 group-hover:rotate-90 z-10">
                                <Plus className="w-4 h-4 text-white" />
                              </div>
                            )}

                            <div className="relative">
                              <h3 className="font-bold text-white text-sm mb-1.5 line-clamp-2 min-h-[2.5rem] pr-8 theme-light:text-gray-900">
                                {product.name}
                              </h3>

                              {product.discount_label && (
                                <Badge className="bg-red-600/40 text-white border-red-500/50 text-[9px] px-1.5 py-0.5 mb-2 theme-light:bg-red-100 theme-light:text-red-700 theme-light:border-red-300">
                                  {product.discount_label}
                                </Badge>
                              )}

                              {product.sku && (
                                <p className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded inline-block mb-2 theme-light:bg-gray-100 theme-light:text-gray-600">
                                  {product.sku}
                                </p>
                              )}

                              <div className="space-y-2 mt-3 pt-3 border-t border-white/10 theme-light:border-gray-200">
                                <div className="flex items-end justify-between">
                                  <div>
                                    <div className="text-xl font-black text-orange-400 theme-light:text-orange-600">
                                      ${finalPrice.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-500 line-through">
                                      ${product.price.toFixed(2)}
                                    </div>
                                  </div>

                                  {isOutOfStock ? (
                                    <Badge className="bg-red-600/30 text-red-200 border-red-500/50 font-bold text-[9px] px-1.5 py-0 theme-light:bg-red-100 theme-light:text-red-700 theme-light:border-red-300">
                                      AGOTADO
                                    </Badge>
                                  ) : isLowStock ? (
                                    <Badge className="bg-yellow-600/30 text-yellow-200 border-yellow-500/50 animate-pulse text-[9px] px-1.5 py-0 theme-light:bg-yellow-100 theme-light:text-yellow-700 theme-light:border-yellow-300">
                                      {product.stock} ⚠️
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-600/30 text-emerald-200 border-emerald-500/50 text-[9px] px-1.5 py-0 theme-light:bg-emerald-100 theme-light:text-emerald-700 theme-light:border-emerald-300">
                                      {product.stock} ✓
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="text-[10px] text-orange-300 font-bold theme-light:text-orange-600">
                                  💰 Ahorras ${savings.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="services" className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-black to-[#0A0A0A] theme-light:bg-gray-50 m-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400 theme-light:text-gray-600">Cargando servicios...</p>
                </div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Sparkles className="w-24 h-24 text-gray-700 mb-4 opacity-30 theme-light:text-gray-400" />
                <p className="text-xl text-gray-400 mb-2 theme-light:text-gray-600">No se encontraron servicios</p>
                <p className="text-gray-600 theme-light:text-gray-500">{searchQuery ? `"${searchQuery}"` : "Sin servicios disponibles"}</p>
              </div>
            ) : (
              <div>
                {searchQuery && (
                  <div className="mb-4 flex items-center gap-3">
                    <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 px-3 py-1.5 theme-light:bg-blue-100 theme-light:text-blue-700 theme-light:border-blue-300">
                      {filteredServices.length} resultado{filteredServices.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSearchQuery("")}
                      className="text-gray-400 hover:text-white theme-light:text-gray-600 theme-light:hover:text-gray-900"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpiar búsqueda
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {filteredServices.map((service) => {
                    const inCart = cart.find((i) => i.id === service.id && i.type === "service");
                    const qtyInCart = inCart ? inCart.quantity : 0;

                    return (
                      <div
                        key={service.id}
                        className="relative"
                      >
                        {qtyInCart > 0 && (
                          <div className="absolute -top-2 -left-2 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-[0_4px_16px_rgba(220,38,38,0.8)] border-2 border-slate-950/50 animate-bounce z-20 theme-light:border-white">
                            {qtyInCart}
                          </div>
                        )}

                        <button
                          onClick={() => addToCart(service, "service")}
                          className="group relative overflow-hidden rounded-xl hover:scale-105 transition-all duration-300 cursor-pointer w-full"
                        >
                          <div className="h-full p-3 bg-gradient-to-br from-blue-800/80 to-blue-900/80 border-2 border-blue-500/20 hover:border-blue-400/50 backdrop-blur-xl hover:shadow-[0_12px_32px_rgba(59,130,246,0.25)] theme-light:from-white theme-light:to-blue-50 theme-light:border-gray-200 theme-light:hover:shadow-xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-cyan-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:via-cyan-500/10 group-hover:to-blue-500/10 transition-all duration-500"></div>

                            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md transition-transform group-hover:scale-110 group-hover:rotate-90 z-10">
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>

                            <div className="relative">
                              <h3 className="font-bold text-white text-sm mb-1.5 line-clamp-2 min-h-[2.5rem] pr-8 theme-light:text-gray-900">
                                {service.name}
                              </h3>

                              {service.code && (
                                <p className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded inline-block mb-2 theme-light:bg-blue-100 theme-light:text-blue-700">
                                  {service.code}
                                </p>
                              )}

                              <div className="flex items-end justify-between mt-3 pt-3 border-t border-white/10 theme-light:border-gray-200">
                                <div className="text-xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent theme-light:from-blue-600 theme-light:to-cyan-600">
                                  ${(service.price || 0).toFixed(2)}
                                </div>

                                <Badge className="bg-blue-600/30 text-blue-200 border-blue-500/50 font-bold text-[9px] px-1.5 py-0 theme-light:bg-blue-100 theme-light:text-blue-700 theme-light:border-blue-300">
                                  Servicio
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col bg-gradient-to-b from-[#0D0D0D] to-black border-l-2 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-200">

        <div className="p-5 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900/50 to-black/50 theme-light:bg-gray-50 theme-light:border-gray-200">
          {!selectedCustomer ? (
            <button
              onClick={() => setShowCustomerSelector(true)}
              className="w-full group relative overflow-hidden rounded-2xl p-5 border-2 border-dashed border-gray-600/50 hover:border-cyan-500/50 transition-all bg-slate-800/30 hover:bg-slate-800/50 theme-light:bg-gray-100 theme-light:border-gray-300 theme-light:hover:border-cyan-500/50 theme-light:hover:bg-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-gray-600/50 flex items-center justify-center group-hover:scale-110 transition-transform theme-light:from-gray-200 theme-light:to-gray-300 theme-light:border-gray-400">
                  <User className="w-7 h-7 text-gray-400 theme-light:text-gray-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-white font-bold text-lg theme-light:text-gray-900">Añadir Cliente</p>
                  <p className="text-sm text-gray-400 theme-light:text-gray-600">Opcional pero recomendado</p>
                </div>
                <Plus className="w-6 h-6 text-gray-500 group-hover:text-cyan-400 transition-colors theme-light:text-gray-600 theme-light:group-hover:text-cyan-500" />
              </div>
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600/20 via-emerald-600/20 to-lime-600/20 border-2 border-cyan-500/40 p-5 theme-light:from-cyan-50 theme-light:via-emerald-50 theme-light:to-lime-50 theme-light:border-cyan-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-transparent blur-2xl"></div>

              <div className="relative flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg theme-light:text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-cyan-200 text-sm theme-light:text-gray-700">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-white/70 hover:text-white hover:bg-white/10 theme-light:text-gray-600 theme-light:hover:text-gray-900 theme-light:hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="relative grid grid-cols-2 gap-2">
                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 theme-light:bg-white/80 theme-light:border theme-light:border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-gray-400 font-semibold theme-light:text-gray-600">Puntos</span>
                  </div>
                  <p className="text-white font-black text-xl theme-light:text-gray-900">{selectedCustomer.loyalty_points || 0}</p>
                </div>
                <div className="bg-black/30 backdrop-blur-sm rounded-xl p-3 theme-light:bg-white/80 theme-light:border theme-light:border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-400 font-semibold theme-light:text-gray-600">Nivel</span>
                  </div>
                  <p className="text-white font-black text-xl capitalize theme-light:text-gray-900">{selectedCustomer.loyalty_tier || 'Bronze'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#0A0A0A] theme-light:bg-gray-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-10"></div>
                <ShoppingCart className="relative w-28 h-28 text-gray-700 opacity-20 theme-light:text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-600 mb-2 theme-light:text-gray-700">Carrito vacío</p>
              <p className="text-gray-500 theme-light:text-gray-600">Añade productos o servicios</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={`${item.id}-${index}-${item.type}`}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl border-2 border-white/10 hover:border-cyan-500/50 rounded-2xl p-4 transition-all hover:shadow-[0_12px_40px_rgba(0,168,232,0.2)] theme-light:from-white theme-light:to-gray-50 theme-light:border-gray-200 theme-light:hover:border-cyan-500/50 theme-light:hover:shadow-lg"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/5 to-transparent blur-2xl"></div>

                <div className="relative flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className="font-bold text-white text-base truncate mb-2 theme-light:text-gray-900">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={item.type === "service"
                          ? "bg-blue-600/30 text-blue-200 border-blue-500/50 theme-light:bg-blue-100 theme-light:text-blue-700 theme-light:border-blue-300"
                          : "bg-emerald-600/30 text-emerald-200 border-emerald-500/50 theme-light:bg-emerald-100 theme-light:text-emerald-700 theme-light:border-emerald-300"
                        }>
                          {item.type === "service" ? "🔧 Servicio" : "📦 Producto"}
                        </Badge>
                        {item.discountApplied && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white animate-pulse">
                            🏷️ -{item.discountApplied}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-600/20 flex-shrink-0 theme-light:text-red-600 theme-light:hover:text-red-700 theme-light:hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 theme-light:border-gray-200">
                    <div className="text-gray-400 text-sm theme-light:text-gray-600">
                      ${item.price.toFixed(2)} c/u
                      {item.originalPrice && (
                        <span className="ml-2 line-through text-xs text-gray-600">
                          ${item.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-1.5 border-2 border-cyan-500/30 theme-light:from-gray-100 theme-light:to-gray-200 theme-light:border-gray-300">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:bg-cyan-600/40 rounded-lg theme-light:text-gray-800 theme-light:hover:bg-gray-300"
                          onClick={() => updateCartQuantity(index, -1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-10 text-center font-black text-white text-lg theme-light:text-gray-900">
                          {item.quantity}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-white hover:bg-cyan-600/40 rounded-lg theme-light:text-gray-800 theme-light:hover:bg-gray-300"
                          onClick={() => updateCartQuantity(index, 1)}
                          disabled={item.type === "product" && item.stock !== null && item.quantity >= item.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent min-w-[100px] text-right theme-light:from-cyan-600 theme-light:to-emerald-600">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-cyan-500/20 bg-slate-900/50 theme-light:bg-gray-100 theme-light:border-gray-200">
            {!appliedDiscount ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cyan-400 theme-light:text-cyan-600" />
                  <span className="text-sm font-bold text-cyan-300 theme-light:text-cyan-700">Descuentos Rápidos</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 30].map((pct) => (
                    <Button
                      key={pct}
                      size="sm"
                      onClick={() => applyQuickDiscount(pct)}
                      className="bg-gradient-to-r from-emerald-600/30 to-lime-600/30 hover:from-emerald-600/50 hover:to-lime-600/50 border border-emerald-500/30 text-emerald-200 font-bold theme-light:from-emerald-100 theme-light:to-lime-100 theme-light:border-emerald-300 theme-light:text-emerald-700"
                    >
                      {pct}%
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    onClick={() => setDiscountType(discountType === 'manual' ? null : 'manual')}
                    className="bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/50 hover:to-cyan-600/50 border border-blue-500/30 text-blue-200 font-bold theme-light:from-blue-100 theme-light:to-cyan-100 theme-light:border-blue-300 theme-light:text-blue-700"
                  >
                    $
                  </Button>
                </div>

                {discountType === 'manual' && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={manualDiscountAmount}
                      onChange={(e) => setManualDiscountAmount(e.target.value)}
                      placeholder="Monto en $"
                      className="flex-1 bg-black/40 border-cyan-500/20 text-white theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
                      min="0"
                      max={subtotal}
                    />
                    <Button
                      onClick={applyManualDiscount}
                      disabled={!manualDiscountAmount || parseFloat(manualDiscountAmount) <= 0}
                      className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-700 hover:to-emerald-700"
                    >
                      <Zap className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600/20 to-lime-600/20 border-2 border-emerald-500/40 p-4 theme-light:from-emerald-50 theme-light:to-lime-50 theme-light:border-emerald-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-lime-500 flex items-center justify-center shadow-lg">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-emerald-200 font-bold text-sm theme-light:text-emerald-700">
                        {appliedDiscount.description}
                      </p>
                      <p className="text-emerald-300 font-black text-xl theme-light:text-emerald-800">
                        -${discountAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={removeDiscount}
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/20 theme-light:text-red-600 theme-light:hover:bg-red-50"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-6 border-t-2 border-cyan-500/20 bg-gradient-to-b from-slate-900 to-black space-y-5 theme-light:bg-white theme-light:border-gray-200">
          {cart.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-gray-400 theme-light:text-gray-700">
                  <span className="text-sm">Subtotal</span>
                  <span className="text-white font-bold text-lg theme-light:text-gray-900">${subtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-400 theme-light:text-emerald-700">Descuento</span>
                    <span className="text-emerald-400 font-bold text-lg theme-light:text-emerald-700">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-gray-400 theme-light:text-gray-700">
                  <span className="text-sm">IVU ({(taxRate * 100).toFixed(1)}%)</span>
                  <span className="text-white font-bold text-lg theme-light:text-gray-900">${tax.toFixed(2)}</span>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent my-3 theme-light:via-gray-300"></div>

                {/* AI FIX: deposit logic - Show deposit info if work order has one */}
                {workOrderId && balanceFromUrl > 0 && balanceFromUrl < total && (
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-2 border-amber-500/40 p-4 theme-light:from-amber-50 theme-light:to-orange-50 theme-light:border-amber-300">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-300 theme-light:text-amber-700">Total de la orden</span>
                        <span className="text-white font-semibold theme-light:text-gray-900">${total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-300 theme-light:text-amber-700">Depósitos previos</span>
                        <span className="text-emerald-400 font-semibold theme-light:text-emerald-700">-${(total - balanceFromUrl).toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2 theme-light:bg-gray-300"></div>
                    </div>
                  </div>
                )}

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600/20 to-emerald-600/20 border-2 border-cyan-500/40 p-5 theme-light:from-cyan-50 theme-light:to-emerald-50 theme-light:border-cyan-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent blur-3xl"></div>

                  <div className="relative flex items-center justify-between">
                    <span className="text-2xl font-black text-white theme-light:text-gray-900">
                      {workOrderId && balanceFromUrl > 0 ? "A PAGAR" : "TOTAL"}
                    </span>
                    <div className="text-right">
                      <div className="text-5xl font-black bg-gradient-to-r from-cyan-400 via-emerald-400 to-lime-400 bg-clip-text text-transparent theme-light:from-cyan-600 theme-light:via-emerald-600 theme-light:to-lime-600">
                        ${effectiveTotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 theme-light:text-gray-600">
                        {cart.length} {cart.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedCustomer && paymentMode !== "deposit" && (
                  <div className="bg-gradient-to-r from-yellow-600/10 to-amber-600/10 border border-yellow-500/30 rounded-xl p-3 theme-light:from-yellow-50 theme-light:to-amber-50 theme-light:border-yellow-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" />
                        <span className="text-yellow-300 font-bold theme-light:text-yellow-700">Puntos a ganar</span>
                      </div>
                      <span className="text-yellow-400 font-black text-2xl theme-light:text-yellow-800">+{pointsToEarn}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full h-16 bg-gradient-to-r from-cyan-600 via-emerald-600 to-lime-600 hover:from-cyan-700 hover:via-emerald-700 hover:to-lime-700 shadow-[0_12px_40px_rgba(0,168,232,0.5)] font-black text-xl"
                >
                  <DollarSign className="w-7 h-7 mr-3" />
                  {paymentMode === "deposit" ? "REGISTRAR DEPÓSITO" : "COMPLETAR VENTA"}
                </Button>

                <Button
                  onClick={clearCart}
                  variant="outline"
                  className="w-full h-12 border-2 border-red-500/30 text-red-400 hover:bg-red-600/20 hover:border-red-500/50 font-bold theme-light:border-red-300 theme-light:text-red-600 theme-light:hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Vaciar Carrito
                </Button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* 🤖 POS Chatbot Integration */}
      <POSChatbot 
        currentCustomer={selectedCustomer}
        onAddToCart={addToCart}
      />

      <CustomerSelector
        open={showCustomerSelector}
        onClose={() => setShowCustomerSelector(false)}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setShowCustomerSelector(false);
          if (customer) toast.success(`Cliente "${customer.name}" seleccionado`);
        }}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={(customer) => {
          setSelectedCustomer(customer);
          setShowCustomerSelector(false);
          if (customer) toast.success(`Cliente "${customer.name}" seleccionado`);
        }}
      />

      {showReceiptModal && completedSale && (
        <ReceiptModal
          open={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setCompletedSale(null);
            setSelectedCustomer(null);
            if (workOrderId) window.history.back();
          }}
          saleData={completedSale}
          customer={selectedCustomer}
        />
      )}

      <SalesHistoryDialog
        open={showSalesHistory}
        onClose={() => setShowSalesHistory(false)}
      />

      {/* ✅ ALERTA DE CAJA CERRADA */}
      {showDrawerClosedAlert && !showOpenDrawerModal && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-amber-600/20 to-red-600/20 border-2 border-amber-500/50 rounded-2xl p-8 max-w-md w-full shadow-[0_24px_80px_rgba(245,158,11,0.5)]">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <AlertCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-4">
                🔒 Caja Cerrada
              </h2>
              <p className="text-amber-200 text-base mb-6 leading-relaxed">
                La caja registradora está cerrada. Debes abrirla para procesar pagos.
              </p>
              <p className="text-white font-semibold mb-8">
                ¿Deseas abrir la caja ahora?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDrawerClosedAlert(false);
                    navigate(createPageUrl("Dashboard"));
                  }}
                  variant="outline"
                  className="flex-1 border-gray-400 text-gray-300 hover:bg-gray-700 h-12 text-base font-semibold"
                >
                  No, volver
                </Button>
                <Button
                  onClick={() => {
                    setShowDrawerClosedAlert(false);
                    setShowOpenDrawerModal(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 h-12 text-base font-bold shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
                >
                  ✅ Sí, abrir caja
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL DE ABRIR CAJA (EL MISMO DEL DASHBOARD) */}
      {showOpenDrawerModal && (
        <OpenDrawerDialog
          open={showOpenDrawerModal}
          onClose={() => setShowOpenDrawerModal(false)}
          onSuccess={() => {
            setShowOpenDrawerModal(false);
            toast.success("✅ Caja abierta, puedes procesar pagos");
          }}
        />
      )}

      {/* 💳 MODAL DE PAGO */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setShowPaymentModal(false);
            setPaymentMethod(null);
            setCashReceived("");
            setDepositAmount("");
            setAthMovilPhone("");
            setAthMovilName("");
          }} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0F0F12] border-2 border-cyan-500/30 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,168,232,0.3)] max-h-[90vh] overflow-y-auto theme-light:bg-white theme-light:border-gray-300">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-white flex items-center gap-2 theme-light:text-gray-900">
                  {paymentMode === "deposit" ? "💰 Depósito" : "💳 Pago"}
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentMethod(null);
                    setCashReceived("");
                    setDepositAmount("");
                    setAthMovilPhone("");
                    setAthMovilName("");
                  }}
                  className="text-gray-400 hover:text-white theme-light:text-gray-600 theme-light:hover:text-gray-900"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {paymentMode === "deposit" && !paymentMethod && (
                <div className="space-y-4 mb-6">
                  <label className="text-gray-300 text-sm font-bold theme-light:text-gray-700">Monto del depósito</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-black/60 border-2 border-cyan-500/30 text-white h-16 text-3xl text-center font-black focus:border-cyan-500/60 theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
                    autoFocus
                    min="0.01"
                    max={total}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    {quickDepositAmounts.map((amt) => (
                      <Button
                        key={amt}
                        variant="outline"
                        onClick={() => setDepositAmount(String(Math.min(amt, total)))}
                        className="h-12 border-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/20 hover:border-emerald-500/50 font-bold theme-light:border-emerald-300 theme-light:text-emerald-700 theme-light:hover:bg-emerald-100"
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>

                  {depositAmount && parseFloat(depositAmount) > 0 && (
                    <div className="bg-blue-600/10 border-2 border-blue-500/30 rounded-xl p-4 theme-light:bg-blue-50 theme-light:border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-300 text-sm theme-light:text-blue-700">Balance restante</span>
                        <span className="text-blue-400 font-black text-xl theme-light:text-blue-800">
                          ${(total - parseFloat(depositAmount)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(paymentMode !== "deposit" || (depositAmount && parseFloat(depositAmount) > 0)) && !paymentMethod && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm font-bold theme-light:text-gray-700">Selecciona método de pago</p>

                  {enabledPaymentMethods.cash && (
                    <button
                      onClick={() => setPaymentMethod("cash")}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/40 rounded-2xl hover:border-green-400/60 transition-all group theme-light:from-green-50 theme-light:to-emerald-50 theme-light:border-green-300 theme-light:hover:border-green-400"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Banknote className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-black text-lg theme-light:text-gray-900">Efectivo</p>
                        <p className="text-sm text-gray-400 theme-light:text-gray-600">Ingresa monto recibido</p>
                      </div>
                    </button>
                  )}

                  {enabledPaymentMethods.card && (
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/40 rounded-2xl hover:border-blue-400/60 transition-all group theme-light:from-blue-50 theme-light:to-cyan-50 theme-light:border-blue-300 theme-light:hover:border-blue-400"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <CreditCard className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-black text-lg theme-light:text-gray-900">Tarjeta</p>
                        <p className="text-sm text-gray-400 theme-light:text-gray-600">Exacto: ${amountToPay.toFixed(2)}</p>
                      </div>
                    </button>
                  )}

                  {enabledPaymentMethods.ath_movil && (
                    <button
                      onClick={() => setPaymentMethod("ath_movil")}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border-2 border-orange-500/40 rounded-2xl hover:border-orange-400/60 transition-all group theme-light:from-orange-50 theme-light:to-amber-50 theme-light:border-orange-300 theme-light:hover:border-orange-400"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Smartphone className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-black text-lg theme-light:text-gray-900">ATH Móvil</p>
                        <p className="text-sm text-gray-400 theme-light:text-gray-600">Exacto: ${amountToPay.toFixed(2)}</p>
                      </div>
                    </button>
                  )}

                  {enabledPaymentMethods.bank_transfer && (
                    <button
                      onClick={() => setPaymentMethod("bank_transfer")}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-600/20 to-purple-800/20 border-2 border-purple-500/40 rounded-2xl hover:border-purple-400/60 transition-all group theme-light:from-purple-50 theme-light:to-purple-100 theme-light:border-purple-300 theme-light:hover:border-purple-400"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <Landmark className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-black text-lg theme-light:text-gray-900">Transferencia</p>
                        <p className="text-sm text-gray-400 theme-light:text-gray-600">Exacto: ${amountToPay.toFixed(2)}</p>
                      </div>
                    </button>
                  )}

                  {enabledPaymentMethods.check && (
                    <button
                      onClick={() => setPaymentMethod("check")}
                      className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-gray-600/20 to-gray-800/20 border-2 border-gray-500/40 rounded-2xl hover:border-gray-400/60 transition-all group theme-light:from-gray-50 theme-light:to-gray-100 theme-light:border-gray-300 theme-light:hover:border-gray-400"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                        <FileText className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-black text-lg theme-light:text-gray-900">Cheque</p>
                        <p className="text-sm text-gray-400 theme-light:text-gray-600">Exacto: ${amountToPay.toFixed(2)}</p>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {paymentMethod && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl theme-light:bg-gray-100">
                    {paymentMethod === "cash" && <Banknote className="w-6 h-6 text-green-400 theme-light:text-green-700" />}
                    {paymentMethod === "card" && <CreditCard className="w-6 h-6 text-blue-400 theme-light:text-blue-700" />}
                    {paymentMethod === "ath_movil" && <Smartphone className="w-6 h-6 text-orange-400 theme-light:text-orange-700" />}
                    {paymentMethod === "bank_transfer" && <Landmark className="w-6 h-6 text-purple-400 theme-light:text-purple-700" />}
                    {paymentMethod === "check" && <FileText className="w-6 h-6 text-gray-400 theme-light:text-gray-700" />}
                    <span className="text-white font-bold flex-1 theme-light:text-gray-900">
                      {paymentMethod === "cash" ? "Efectivo" :
                        paymentMethod === "card" ? "Tarjeta" :
                          paymentMethod === "ath_movil" ? "ATH Móvil" :
                            paymentMethod === "bank_transfer" ? "Transferencia" :
                              paymentMethod === "check" ? "Cheque" : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPaymentMethod(null);
                        setCashReceived("");
                        setAthMovilPhone("");
                        setAthMovilName("");
                      }}
                      className="text-gray-400 hover:text-white theme-light:text-gray-600 theme-light:hover:text-gray-900"
                    >
                      Cambiar
                    </Button>
                  </div>

                  {paymentMethod === "cash" && (
                    <>
                      <div>
                        <label className="text-gray-300 text-sm font-bold mb-2 block theme-light:text-gray-700">
                          Efectivo recibido
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0.00"
                          className="bg-black/60 border-2 border-cyan-500/30 text-white h-16 text-3xl text-center font-black theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {quickCashAmounts.map((amt) => (
                          <Button
                            key={amt}
                            variant="outline"
                            onClick={() => setCashReceived(String(amt))}
                            className="h-12 border-2 border-green-500/30 text-green-400 hover:bg-green-600/20 hover:border-green-500/50 font-bold theme-light:border-green-300 theme-light:text-green-700 theme-light:hover:bg-green-100"
                          >
                            ${amt}
                          </Button>
                        ))}
                      </div>

                      {change > 0 && (
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600/20 to-lime-600/20 border-2 border-emerald-500/40 p-5 theme-light:from-emerald-50 theme-light:to-lime-50 theme-light:border-emerald-300">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-300 font-bold text-lg theme-light:text-emerald-700">Cambio</span>
                            <span className="text-emerald-400 font-black text-4xl theme-light:text-emerald-800">${change.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {paymentMethod === "ath_movil" && (
                    <div className="space-y-3">
                      <div className="bg-orange-600/10 border-2 border-orange-500/30 rounded-2xl p-5 theme-light:bg-orange-50 theme-light:border-orange-300">
                        <div className="flex justify-between items-center">
                          <span className="text-orange-300 font-bold theme-light:text-orange-700">Se cobrará</span>
                          <span className="text-orange-400 font-black text-4xl theme-light:text-orange-800">${amountToPay.toFixed(2)}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-gray-300 text-sm font-bold mb-2 block theme-light:text-gray-700">
                          📱 Teléfono del pagador *
                        </label>
                        <Input
                          type="tel"
                          value={athMovilPhone}
                          onChange={(e) => setAthMovilPhone(e.target.value)}
                          placeholder="787-123-4567"
                          className="bg-black/60 border-2 border-orange-500/30 text-white h-12 theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
                        />
                      </div>

                      <div>
                        <label className="text-gray-300 text-sm font-bold mb-2 block theme-light:text-gray-700">
                          👤 Nombre del pagador *
                        </label>
                        <Input
                          type="text"
                          value={athMovilName}
                          onChange={(e) => setAthMovilName(e.target.value)}
                          placeholder="Nombre completo"
                          className="bg-black/60 border-2 border-orange-500/30 text-white h-12 theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
                        />
                      </div>

                      {(!athMovilPhone || !athMovilName) && (
                        <div className="p-3 bg-amber-600/10 border border-amber-500/30 rounded-xl theme-light:bg-amber-50 theme-light:border-amber-300">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-400 theme-light:text-amber-700" />
                            <span className="text-amber-300 text-sm theme-light:text-amber-700">
                              Completa los datos del pagador para continuar
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(paymentMethod === "card" || paymentMethod === "bank_transfer" || paymentMethod === "check") && (
                    <div className="bg-blue-600/10 border-2 border-blue-500/30 rounded-2xl p-5 theme-light:bg-blue-50 theme-light:border-blue-300">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-300 font-bold theme-light:text-blue-700">Se cobrará</span>
                        <span className="text-blue-400 font-black text-4xl theme-light:text-blue-800">${amountToPay.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleProcessPayment}
                    disabled={processing || !isPaymentValid}
                    className="w-full h-16 bg-gradient-to-r from-emerald-600 via-green-600 to-lime-600 hover:from-emerald-700 hover:via-green-700 hover:to-lime-700 shadow-[0_12px_40px_rgba(5,150,105,0.5)] disabled:opacity-50 font-black text-xl"
                  >
                    {processing ? (
                      "PROCESANDO..."
                    ) : (
                      <>
                        <Zap className="w-7 h-7 mr-3" />
                        CONFIRMAR ${amountToPay.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}