import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { openCashRegister } from "./CashRegisterService";
import { base44 } from "@/api/base44Client";

const DENOMINATIONS = [
{ key: 'bills_100', label: '$100', value: 100, color: 'from-purple-600 to-purple-800' },
{ key: 'bills_50', label: '$50', value: 50, color: 'from-blue-600 to-blue-800' },
{ key: 'bills_20', label: '$20', value: 20, color: 'from-green-600 to-green-800' },
{ key: 'bills_10', label: '$10', value: 10, color: 'from-yellow-600 to-yellow-800' },
{ key: 'bills_5', label: '$5', value: 5, color: 'from-orange-600 to-orange-800' },
{ key: 'bills_1', label: '$1', value: 1, color: 'from-gray-600 to-gray-800' },
{ key: 'coins_1', label: '$1', value: 1, color: 'from-gray-500 to-gray-700' },
{ key: 'coins_050', label: '$0.50', value: 0.50, color: 'from-gray-400 to-gray-600' },
{ key: 'coins_025', label: '$0.25', value: 0.25, color: 'from-gray-400 to-gray-600' }];


export default function OpenDrawerDialog({ open, onClose, onSuccess }) {
  const [denominations, setDenominations] = useState(
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d.key]: 0 }), {})
  );
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const total = DENOMINATIONS.reduce((sum, d) =>
  sum + (denominations[d.key] || 0) * d.value, 0
  );

  const handleIncrement = (key) => {
    setDenominations((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  };

  const handleEdit = (key, value) => {
    setDenominations((prev) => ({ ...prev, [key]: Math.max(0, parseInt(value) || 0) }));
  };

  const handleOpen = async () => {
    if (total <= 0) {
      toast.error("El monto inicial debe ser mayor a $0");
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      await openCashRegister(denominations, user);
      toast.success("✅ Caja abierta exitosamente");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error opening drawer:", error);
      toast.error(error.message || "Error al abrir caja");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-black to-[#0D0D0D] border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-7 h-7 text-emerald-500" />
            Abrir Caja Registradora
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {DENOMINATIONS.map((denom) =>
            <div key={denom.key}>
                {editing === denom.key ?
              <div className="space-y-2">
                    <Input
                  type="number"
                  value={denominations[denom.key]}
                  onChange={(e) => handleEdit(denom.key, e.target.value)}
                  onBlur={() => setEditing(null)}
                  autoFocus
                  className="bg-black/60 border-cyan-500/30 text-white text-center" />

                  </div> :

              <button
                onClick={() => handleIncrement(denom.key)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditing(denom.key);
                }}
                className={`w-full bg-gradient-to-br ${denom.color} p-4 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all`}>

                    <div className="text-white font-bold text-lg">{denom.label}</div>
                    <div className="text-white/80 text-2xl font-black mt-1">
                      {denominations[denom.key] || 0}
                    </div>
                  </button>
              }
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-2 border-emerald-500/40 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-400" />
                <span className="text-white font-bold text-lg">TOTAL</span>
              </div>
              <span className="text-5xl font-black text-emerald-400">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose} className="bg-background text-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-9 flex-1 border-gray-700 hover:bg-gray-800">


              Cancelar
            </Button>
            <Button
              onClick={handleOpen}
              disabled={loading || total <= 0}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800">

              {loading ? "Abriendo..." : "Abrir Caja"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}