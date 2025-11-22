import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, CreditCard, Smartphone } from "lucide-react";

export default function DepositDialog({ open, onClose, order, onSuccess, isCreating = false, onDepositData }) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    if (open) {
      loadUser();
    }
  }, [open]);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const handleSubmit = async () => {
    const depositAmount = parseFloat(amount);
    
    if (!depositAmount || depositAmount <= 0) {
      alert("Por favor ingresa un monto válido");
      return;
    }

    // If creating (in wizard), just pass data back
    if (isCreating) {
      const depositData = {
        amount: depositAmount,
        payment_method: paymentMethod,
        notes,
        timestamp: new Date().toISOString(),
        recorded_by: user?.full_name || user?.email
      };
      
      if (onDepositData) {
        onDepositData(depositData);
      }
      
      setAmount("");
      setPaymentMethod("cash");
      setNotes("");
      onClose();
      return;
    }

    // If editing existing order
    if (!order || !order.id) {
      alert("Error: No se puede procesar el depósito sin una orden válida");
      return;
    }

    setLoading(true);

    try {
      const currentPaid = order.amount_paid || 0;
      const newTotalPaid = currentPaid + depositAmount;
      const totalWithTax = (order.cost_estimate || 0) * 1.115;
      const balanceDue = Math.max(0, totalWithTax - newTotalPaid);

      // Update order
      await base44.entities.Order.update(order.id, {
        amount_paid: newTotalPaid,
        deposit_amount: (order.deposit_amount || 0) + depositAmount,
        balance_due: balanceDue
      });

      // Create transaction
      await base44.entities.Transaction.create({
        order_id: order.id,
        order_number: order.order_number,
        type: "revenue",
        amount: depositAmount,
        description: `Depósito - Orden ${order.order_number}${notes ? ` - ${notes}` : ''}`,
        category: "repair_payment",
        payment_method: paymentMethod,
        recorded_by: user?.full_name || user?.email
      });

      // Create Sale record for KPI (partial payment)
      const saleNumber = `WO-DEP-${Date.now().toString().slice(-8)}`;
      await base44.entities.Sale.create({
        sale_number: saleNumber,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        items: [{
          type: "service",
          name: `Depósito - Orden ${order.order_number}`,
          quantity: 1,
          price: depositAmount / 1.115, // Reverse tax
          total: depositAmount / 1.115
        }],
        subtotal: depositAmount / 1.115,
        tax_rate: 0.115,
        tax_amount: depositAmount - (depositAmount / 1.115),
        discount_amount: 0,
        deposit_credit: depositAmount, // Mark as deposit
        total: depositAmount,
        amount_paid: depositAmount,
        amount_due: 0,
        payment_method: paymentMethod,
        employee: user?.full_name || user?.email,
        order_id: order.id,
        order_number: order.order_number,
        voided: false,
        notes: `Depósito de Work Order ${order.order_number}`
      });

      // Create work order event
      await base44.entities.WorkOrderEvent.create({
        order_id: order.id,
        order_number: order.order_number,
        event_type: "payment",
        description: `Depósito de $${depositAmount.toFixed(2)} recibido${notes ? `: ${notes}` : ''}`,
        user_id: user?.id,
        user_name: user?.full_name || user?.email,
        user_role: user?.role,
        metadata: {
          amount: depositAmount,
          payment_method: paymentMethod,
          payment_type: "deposit",
          new_balance: balanceDue,
          sale_number: saleNumber
        }
      });

      // Send email if customer has email
      if (order.customer_email) {
        try {
          const emailBody = `
            <h2>Hola ${order.customer_name},</h2>
            <p>Hemos recibido tu depósito de <strong>$${depositAmount.toFixed(2)}</strong> para la orden ${order.order_number}.</p>
            
            <div style="margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 5px;">
              <p style="margin: 5px 0;"><strong>Recibo:</strong> ${saleNumber}</p>
              <p style="margin: 5px 0;"><strong>Depósito:</strong> $${depositAmount.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Método de pago:</strong> ${paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</p>
              <p style="margin: 5px 0;"><strong>Total pagado:</strong> $${newTotalPaid.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Balance pendiente:</strong> $${balanceDue.toFixed(2)}</p>
            </div>
            
            ${notes ? `<p><strong>Notas:</strong> ${notes}</p>` : ''}
            
            <p>Te notificaremos cuando tu equipo esté listo.</p>
            <p>Gracias por confiar en 911 SmartFix Puerto Rico</p>
          `;

          await base44.integrations.Core.SendEmail({
            to: order.customer_email,
            subject: `Recibo de Depósito ${saleNumber} - Orden ${order.order_number}`,
            body: emailBody
          });

          await base44.entities.EmailLog.create({
            order_id: order.id,
            customer_id: order.customer_id,
            to_email: order.customer_email,
            subject: `Recibo de Depósito ${saleNumber}`,
            body: emailBody,
            event_type: "payment_received",
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_by: user?.full_name || user?.email
          });

          await base44.entities.WorkOrderEvent.create({
            order_id: order.id,
            order_number: order.order_number,
            event_type: "email_sent",
            description: `Recibo de depósito enviado a ${order.customer_email}`,
            user_id: user?.id,
            user_name: user?.full_name || user?.email,
            user_role: user?.role,
            metadata: {
              email_type: "deposit_receipt",
              sale_number: saleNumber
            }
          });
        } catch (emailError) {
          console.error("Error sending email:", emailError);
        }
      }

      // Audit log
      try {
        await base44.entities.AuditLog.create({
          action: `deposit_work_order_${order.order_number}`,
          entity_type: "order",
          entity_id: order.id,
          entity_number: order.order_number,
          user_id: user?.id,
          user_name: user?.full_name || user?.email,
          user_role: user?.role,
          changes: {
            amount: depositAmount,
            payment_method: paymentMethod,
            payment_type: "deposit",
            new_balance: balanceDue,
            sale_number: saleNumber
          }
        });
      } catch (auditError) {
        console.error("Error creating audit log:", auditError);
      }

      setAmount("");
      setPaymentMethod("cash");
      setNotes("");
      
      alert(`✓ Depósito procesado\nRecibo: ${saleNumber}\nBalance: $${balanceDue.toFixed(2)}`);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error processing deposit:", error);
      alert("Error al procesar el depósito: " + error.message);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-[#2B2B2B] to-black border-[#FF0000]/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#FF0000]" />
            Registrar Depósito
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Monto del Depósito</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-black border-gray-700 text-white text-lg"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Método de Pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-black border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Efectivo
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Tarjeta
                  </div>
                </SelectItem>
                <SelectItem value="transfer">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    ATH Móvil
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales del depósito..."
              className="bg-black border-gray-700 text-white"
              rows={3}
            />
          </div>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-400">
              💡 El depósito se aplicará al balance total de la orden. Se generará un recibo que se enviará al cliente por email.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !amount}
              className="flex-1 bg-gradient-to-r from-[#FF0000] to-red-800 hover:from-red-700 hover:to-red-900"
            >
              {loading ? "Procesando..." : "Confirmar Depósito"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}