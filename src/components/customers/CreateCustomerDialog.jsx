import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // por si luego quieres notas
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { dataClient } from "@/components/api/dataClient"; // 👈 mismo client que usas en Customers
import { User, Building2 } from "lucide-react";

export default function CreateCustomerDialog({
  open,
  onClose,
  customer,       // opcional: si viene, es edición
  defaultType = "regular", // "regular" | "b2b"
  onSuccess,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerType, setCustomerType] = useState(defaultType);
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // 👇 Cargar datos si es edición
  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
      setCustomerType(customer.customer_type || "regular");
      setBusinessName(customer.business_name || "");
      setTaxId(customer.tax_id || "");
      setNotes(customer.notes || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setCustomerType(defaultType || "regular");
      setBusinessName("");
      setTaxId("");
      setNotes("");
    }
  }, [customer, open, defaultType]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!phone.trim()) {
      toast.error("El teléfono es obligatorio");
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      customer_type: customerType === "b2b" ? "b2b" : "regular",
      business_name:
        customerType === "b2b" ? businessName.trim() || null : null,
      tax_id: customerType === "b2b" ? taxId.trim() || null : null,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      if (customer?.id) {
        await dataClient.entities.Customer.update(customer.id, payload);
        toast.success("Cliente actualizado");
      } else {
        await dataClient.entities.Customer.create(payload);
        toast.success("Cliente creado");
      }
      onSuccess?.();
    } catch (err) {
      console.error("Error guardando cliente:", err);
      toast.error("No se pudo guardar el cliente");
    } finally {
      setSaving(false);
    }
  };

  const isB2B = customerType === "b2b";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="bg-[#020617] border border-cyan-500/30 max-w-lg w-[95vw] text-white theme-light:bg-white theme-light:border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {isB2B ? (
              <Building2 className="w-5 h-5 text-amber-400" />
            ) : (
              <User className="w-5 h-5 text-cyan-400" />
            )}
            {customer
              ? isB2B
                ? "Editar Cliente B2B"
                : "Editar Cliente"
              : isB2B
              ? "Nuevo Cliente B2B"
              : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Tipo de cliente */}
          <div>
            <p className="text-xs text-slate-400 mb-1">Tipo de cliente</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCustomerType("regular")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 transition-all ${
                  customerType === "regular"
                    ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white border-transparent"
                    : "bg-black/40 border-white/10 text-white/70 hover:bg-white/5 theme-light:bg-gray-100 theme-light:border-gray-300 theme-light:text-gray-800"
                }`}
              >
                <User className="w-4 h-4" />
                Personal
              </button>
              <button
                type="button"
                onClick={() => setCustomerType("b2b")}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm flex items-center justify-center gap-2 transition-all ${
                  customerType === "b2b"
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent"
                    : "bg-black/40 border-white/10 text-white/70 hover:bg-white/5 theme-light:bg-gray-100 theme-light:border-gray-300 theme-light:text-gray-800"
                }`}
              >
                <Building2 className="w-4 h-4" />
                B2B / Empresa
              </button>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <p className="text-xs text-slate-400 mb-1">
              Nombre del cliente *
            </p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isB2B ? "Contacto principal" : "Nombre completo"}
              className="bg-black/40 border-slate-700 text-sm theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
            />
          </div>

          {/* Teléfono / Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Teléfono *</p>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: 787-000-0000"
                className="bg-black/40 border-slate-700 text-sm theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
              />
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Email</p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Opcional"
                className="bg-black/40 border-slate-700 text-sm theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
              />
            </div>
          </div>

          {/* Datos B2B */}
          {isB2B && (
            <div className="space-y-3 border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-amber-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Datos de empresa (B2B)
                </p>
                <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40 text-[10px]">
                  B2B
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-300 mb-1">
                  Nombre de la empresa
                </p>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ej: 911 SmartFix Corp."
                  className="bg-black/40 border-amber-500/40 text-sm theme-light:bg-white theme-light:border-amber-300 theme-light:text-gray-900"
                />
              </div>
              <div>
                <p className="text-xs text-slate-300 mb-1">
                  Tax ID / número de contribuyente
                </p>
                <Input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Ej: 66-1234567"
                  className="bg-black/40 border-amber-500/40 text-sm theme-light:bg-white theme-light:border-amber-300 theme-light:text-gray-900"
                />
              </div>
            </div>
          )}

          {/* Notas (opcional) */}
          <div>
            <p className="text-xs text-slate-400 mb-1">
              Notas internas (opcional)
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ej: horarios preferidos, condiciones especiales, contactos alternos..."
              className="bg-black/40 border-slate-700 text-sm theme-light:bg-white theme-light:border-gray-300 theme-light:text-gray-900"
            />
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-slate-600 text-slate-200 w-full sm:w-auto theme-light:border-gray-300 theme-light:text-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-cyan-600 to-emerald-600 w-full sm:w-auto"
          >
            {saving
              ? "Guardando..."
              : customer
              ? "Guardar cambios"
              : "Crear cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
