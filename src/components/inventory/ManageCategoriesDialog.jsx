import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Edit2, Save, X, Smartphone, Monitor } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ICON_OPTIONS = [
"Smartphone", "Tablet", "Laptop", "Monitor", "Watch",
"Headphones", "Speaker", "Camera", "Gamepad", "Box"];


const PART_ICON_OPTIONS = [
"Monitor", "Battery", "Wrench", "Box", "Cpu",
"HardDrive", "Wifi", "Cable", "Speaker", "Camera"];


export default function ManageCategoriesDialog({ open, onClose, onUpdate }) {
  const [deviceCategories, setDeviceCategories] = useState([]);
  const [partTypes, setPartTypes] = useState([]);
  const [editingDevice, setEditingDevice] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [newDeviceForm, setNewDeviceForm] = useState({ name: "", slug: "", icon_name: "Smartphone" });
  const [newPartForm, setNewPartForm] = useState({ name: "", slug: "", icon_name: "Monitor" });

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const loadData = async () => {
    try {
      const [cats, parts] = await Promise.all([
      base44.entities.DeviceCategory.list(),
      base44.entities.PartType.list()]
      );
      setDeviceCategories(cats || []);
      setPartTypes(parts || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleAddDeviceCategory = async () => {
    if (!newDeviceForm.name || !newDeviceForm.slug) {
      toast.error("Completa nombre y slug");
      return;
    }
    try {
      await base44.entities.DeviceCategory.create({
        name: newDeviceForm.name,
        icon: newDeviceForm.slug,
        icon_name: newDeviceForm.icon_name,
        active: true,
        order: deviceCategories.length
      });
      setNewDeviceForm({ name: "", slug: "", icon_name: "Smartphone" });
      await loadData();
      onUpdate?.();
      toast.success("Categoría creada");
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Error al crear");
    }
  };

  const handleAddPartType = async () => {
    if (!newPartForm.name || !newPartForm.slug) {
      toast.error("Completa nombre y slug");
      return;
    }
    try {
      await base44.entities.PartType.create({
        name: newPartForm.name,
        slug: newPartForm.slug,
        icon_name: newPartForm.icon_name,
        active: true,
        order: partTypes.length
      });
      setNewPartForm({ name: "", slug: "", icon_name: "Monitor" });
      await loadData();
      onUpdate?.();
      toast.success("Tipo de pieza creado");
    } catch (error) {
      console.error("Error creating part type:", error);
      toast.error("Error al crear");
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await base44.entities.DeviceCategory.delete(id);
      await loadData();
      onUpdate?.();
      toast.success("Eliminado");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleDeletePart = async (id) => {
    if (!confirm("¿Eliminar este tipo de pieza?")) return;
    try {
      await base44.entities.PartType.delete(id);
      await loadData();
      onUpdate?.();
      toast.success("Eliminado");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleUpdateDevice = async (item) => {
    try {
      await base44.entities.DeviceCategory.update(item.id, item);
      setEditingDevice(null);
      await loadData();
      onUpdate?.();
      toast.success("Actualizado");
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Error al actualizar");
    }
  };

  const handleUpdatePart = async (item) => {
    try {
      await base44.entities.PartType.update(item.id, item);
      setEditingPart(null);
      await loadData();
      onUpdate?.();
      toast.success("Actualizado");
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Error al actualizar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0f0f10] border border-cyan-500/20 max-w-4xl text-white max-h-[85vh] overflow-y-auto theme-light:bg-white theme-light:border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2 theme-light:text-gray-900">
            <Smartphone className="w-6 h-6 text-cyan-400" />
            Gestionar Categorías y Tipos
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList className="bg-black/40 border border-cyan-500/20 w-full theme-light:bg-gray-100 theme-light:border-gray-300">
            <TabsTrigger value="devices" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600">
              <Smartphone className="w-4 h-4 mr-2" />
              Categorías de Dispositivos
            </TabsTrigger>
            <TabsTrigger value="parts" className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-emerald-600">
              <Monitor className="w-4 h-4 mr-2" />
              Tipos de Piezas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            {/* Crear nueva categoría */}
            <div className="bg-cyan-600/10 border border-cyan-500/30 rounded-xl p-4 space-y-3 theme-light:bg-cyan-50 theme-light:border-cyan-300">
              <p className="text-cyan-300 font-bold text-sm theme-light:text-cyan-700">➕ Nueva Categoría</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={newDeviceForm.name}
                  onChange={(e) => setNewDeviceForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre (ej: iPhone)"
                  className="bg-black/40 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300" />

                <Input
                  value={newDeviceForm.slug}
                  onChange={(e) => setNewDeviceForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="ID único (ej: iphone)"
                  className="bg-black/40 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300" />

              </div>
              <Button onClick={handleAddDeviceCategory} className="bg-gradient-to-r from-cyan-600 to-emerald-600 w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Categoría
              </Button>
            </div>

            {/* Lista de categorías */}
            <div className="space-y-2">
              {deviceCategories.map((cat) =>
              <div key={cat.id} className="bg-black/40 border border-white/10 rounded-xl p-4 theme-light:bg-white theme-light:border-gray-200">
                  {editingDevice?.id === cat.id ?
                <div className="space-y-3">
                      <Input
                    value={editingDevice.name}
                    onChange={(e) => setEditingDevice((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Nombre de la categoría"
                    className="bg-black/40 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300" />

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateDevice(editingDevice)} className="bg-emerald-600">
                          <Save className="w-4 h-4 mr-1" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingDevice(null)} className="bg-background text-slate-900 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-8 border-white/15">
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div> :

                <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold theme-light:text-gray-900">{cat.name}</p>
                        <p className="text-xs text-white/40 theme-light:text-gray-600">ID: {cat.icon || cat.slug}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingDevice(cat)} className="hover:bg-cyan-600/10">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteDevice(cat.id)} className="text-red-400 hover:bg-red-600/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                }
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="parts" className="space-y-4">
            {/* Crear nuevo tipo */}
            <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 space-y-3 theme-light:bg-emerald-50 theme-light:border-emerald-300">
              <p className="text-emerald-300 font-bold text-sm theme-light:text-emerald-700">➕ Nuevo Tipo de Pieza</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  value={newPartForm.name}
                  onChange={(e) => setNewPartForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre (ej: Pantallas)"
                  className="bg-black/40 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300" />

                <Input
                  value={newPartForm.slug}
                  onChange={(e) => setNewPartForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="ID único (ej: pantalla)"
                  className="bg-black/40 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300" />

              </div>
              <Button onClick={handleAddPartType} className="bg-gradient-to-r from-emerald-600 to-green-600 w-full">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Tipo
              </Button>
            </div>

            {/* Lista de tipos */}
            <div className="space-y-2">
              {partTypes.map((pt) =>
              <div key={pt.id} className="bg-black/40 border border-white/10 rounded-xl p-4 theme-light:bg-white theme-light:border-gray-200">
                  {editingPart?.id === pt.id ?
                <div className="space-y-3">
                      <Input
                    value={editingPart.name}
                    onChange={(e) => setEditingPart((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nombre del tipo de pieza"
                    className="bg-black/40 border-cyan-500/20 theme-light:bg-white theme-light:border-gray-300" />

                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdatePart(editingPart)} className="bg-emerald-600">
                          <Save className="w-4 h-4 mr-1" />
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingPart(null)} className="bg-background text-slate-900 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:bg-accent hover:text-accent-foreground h-8 border-white/15">
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div> :

                <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold theme-light:text-gray-900">{pt.name}</p>
                        <p className="text-xs text-white/40 theme-light:text-gray-600">ID: {pt.slug}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setEditingPart(pt)} className="hover:bg-emerald-600/10">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeletePart(pt.id)} className="text-red-400 hover:bg-red-600/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                }
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>);

}