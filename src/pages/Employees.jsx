import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Search, Plus, Edit, Trash2, Eye, EyeOff, Shield, Clock, DollarSign, AlertCircle } from "lucide-react";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showInviteInfo, setShowInviteInfo] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const users = await base44.entities.User.list();
      setEmployees(users || []);
    } catch (e) {
      console.error("Error loading employees:", e);
      setEmployees([]);
    }
    setLoading(false);
  };

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;
    return employees.filter(e => 
      (e.full_name || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.employee_code || "").toLowerCase().includes(q) ||
      (e.position || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowDialog(true);
  };

  const handleDelete = (employee) => {
    setEmployeeToDelete(employee);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await base44.entities.User.update(employeeToDelete.id, { active: false });
      
      let me = null;
      try { me = await base44.auth.me(); } catch {}
      
      await base44.entities.AuditLog.create({
        action: "employee_deactivate",
        entity_type: "user",
        entity_id: employeeToDelete.id,
        user_id: me?.id || null,
        user_name: me?.full_name || me?.email || "Sistema",
        user_role: me?.role || "system",
        changes: { active: false }
      });

      loadEmployees();
      setShowDeleteDialog(false);
      setEmployeeToDelete(null);
    } catch (e) {
      console.error("Error deactivating employee:", e);
      alert("Error al desactivar empleado");
    }
  };

  const handleSave = async (employeeData) => {
    try {
      let me = null;
      try { me = await base44.auth.me(); } catch {}

      if (editingEmployee) {
        // Actualizar empleado existente
        await base44.entities.User.update(editingEmployee.id, employeeData);
        
        await base44.entities.AuditLog.create({
          action: "employee_update",
          entity_type: "user",
          entity_id: editingEmployee.id,
          user_id: me?.id || null,
          user_name: me?.full_name || me?.email || "Sistema",
          user_role: me?.role || "system",
          changes: employeeData
        });

        loadEmployees();
        setShowDialog(false);
        setEditingEmployee(null);
      }
    } catch (e) {
      console.error("Error saving employee:", e);
      alert("Error al guardar empleado: " + (e.message || "Error desconocido"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0D] to-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-red-500" />
              Empleados
            </h1>
            <p className="text-gray-400 mt-1">Gestión de personal y configuración</p>
          </div>
          <Button
            onClick={() => setShowInviteInfo(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invitar Empleado
          </Button>
        </div>

        {/* Info banner */}
        <Card className="bg-blue-900/20 border-blue-500/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-300 text-sm font-medium">¿Cómo agregar empleados?</p>
              <p className="text-blue-200/80 text-xs mt-1">
                Para agregar un nuevo empleado, primero debes invitarlo desde el <strong>Dashboard de base44</strong> (icono de engranaje en la sidebar → Users). 
                Una vez acepte la invitación, podrás completar su información aquí (código, posición, PIN, permisos, etc.).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email, código o posición..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-black border-white/15 text-white"
          />
        </div>

        {/* Employee List */}
        <Card className="bg-[#121212] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Personal ({filteredEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">Cargando...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {search ? "No se encontraron empleados" : "No hay empleados registrados"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map(employee => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Dialog */}
      <EmployeeDialog
        open={showDialog}
        employee={editingEmployee}
        onClose={() => {
          setShowDialog(false);
          setEditingEmployee(null);
        }}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Desactivar Empleado</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300">
              ¿Estás seguro de que deseas desactivar a <strong>{employeeToDelete?.full_name || employeeToDelete?.email}</strong>?
            </p>
            <p className="text-gray-400 text-sm mt-2">
              El empleado no podrá acceder al sistema pero su historial se mantendrá.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-gray-700">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Info Dialog */}
      <Dialog open={showInviteInfo} onOpenChange={setShowInviteInfo}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              Cómo invitar un nuevo empleado
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-gray-300">
              Para agregar un nuevo empleado al sistema, sigue estos pasos:
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-semibold text-white">Abre el Dashboard de base44</p>
                  <p className="text-sm text-gray-400">Click en el icono de engranaje (⚙️) en la sidebar izquierda</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-semibold text-white">Ve a la sección "Users"</p>
                  <p className="text-sm text-gray-400">En el menú lateral, selecciona "Users"</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-semibold text-white">Invita al nuevo usuario</p>
                  <p className="text-sm text-gray-400">Click en "Invite User", ingresa su email y envía la invitación</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold">4</div>
                <div>
                  <p className="font-semibold text-white">El usuario acepta la invitación</p>
                  <p className="text-sm text-gray-400">Recibirá un email para crear su cuenta</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold">5</div>
                <div>
                  <p className="font-semibold text-emerald-400">Completa su información aquí</p>
                  <p className="text-sm text-gray-400">Una vez registrado, podrás editarlo aquí para agregar: código de empleado, PIN, posición, permisos, etc.</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 mt-4">
              <p className="text-yellow-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Nota:</strong> Los usuarios invitados aparecerán automáticamente en esta lista. 
                  Luego podrás configurar su información de empleado (PIN, código, permisos, etc.)
                </span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteInfo(false)} className="bg-red-600 hover:bg-red-700">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeCard({ employee, onEdit, onDelete }) {
  const roleColors = {
    admin: "bg-red-600/20 text-red-300 border-red-600/30",
    manager: "bg-purple-600/20 text-purple-300 border-purple-600/30",
    technician: "bg-blue-600/20 text-blue-300 border-blue-600/30",
    service: "bg-green-600/20 text-green-300 border-green-600/30",
    cashier: "bg-yellow-600/20 text-yellow-300 border-yellow-600/30",
  };

  const needsSetup = !employee.employee_code || !employee.pin || !employee.position;

  return (
    <div className="p-4 bg-black/30 rounded-lg border border-white/10 hover:border-red-600/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {employee.full_name || employee.email}
            {!employee.active && (
              <Badge className="bg-gray-600/20 text-gray-300">Inactivo</Badge>
            )}
            {needsSetup && employee.active && (
              <Badge className="bg-orange-600/20 text-orange-300">Pendiente configurar</Badge>
            )}
          </h3>
          <p className="text-sm text-gray-400 mt-1">{employee.email}</p>
          {employee.position && (
            <p className="text-xs text-gray-500 mt-1">{employee.position}</p>
          )}
        </div>
        {employee.active && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(employee)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-white"
              title={needsSetup ? "Completar configuración" : "Editar"}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(employee)}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge className={roleColors[employee.role] || "bg-gray-600/20 text-gray-300 border-gray-600/30"}>
            {employee.role || "user"}
          </Badge>
          {employee.employee_code && (
            <Badge variant="outline" className="border-white/15 text-gray-300">
              #{employee.employee_code}
            </Badge>
          )}
        </div>

        {employee.phone && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>📞</span>
            <span>{employee.phone}</span>
          </div>
        )}

        {employee.hourly_rate && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <DollarSign className="w-3 h-3" />
            <span>${employee.hourly_rate}/hora</span>
          </div>
        )}

        {employee.pin && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <Shield className="w-3 h-3" />
            <span>PIN configurado</span>
          </div>
        )}

        {needsSetup && (
          <div className="flex items-center gap-2 text-xs text-orange-400 mt-2">
            <AlertCircle className="w-3 h-3" />
            <span>Click editar para completar información</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmployeeDialog({ open, employee, onClose, onSave }) {
  const [formData, setFormData] = useState({
    employee_code: "",
    position: "",
    phone: "",
    role: "service",
    hourly_rate: 0,
    pin: "",
    active: true,
    permissions: {
      view_reports: false,
      view_financials: false,
      manage_inventory: false,
      manage_employees: false,
      manage_cash_drawer: false,
      create_orders: true,
      process_sales: true,
      apply_discounts: false,
      process_refunds: false,
      edit_time_entries: false
    }
  });

  const [showPin, setShowPin] = useState(false);
  const [generateNewPin, setGenerateNewPin] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        employee_code: employee.employee_code || generateEmployeeCode(),
        position: employee.position || "",
        phone: employee.phone || "",
        role: employee.role || "service",
        hourly_rate: employee.hourly_rate || 0,
        pin: "", // No mostramos el PIN por seguridad
        active: employee.active !== false,
        permissions: employee.permissions || {
          view_reports: false,
          view_financials: false,
          manage_inventory: false,
          manage_employees: false,
          manage_cash_drawer: false,
          create_orders: true,
          process_sales: true,
          apply_discounts: false,
          process_refunds: false,
          edit_time_entries: false
        }
      });
      
      // Si no tiene PIN, generamos uno nuevo
      if (!employee.pin) {
        const newPin = generateRandomPin();
        setFormData(prev => ({ ...prev, pin: newPin }));
        setGenerateNewPin(true);
        setShowPin(true);
      } else {
        setGenerateNewPin(false);
        setShowPin(false);
      }
    }
  }, [employee, open]);

  const generateEmployeeCode = () => {
    return `EMP-${Date.now().toString().slice(-6)}`;
  };

  const generateRandomPin = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleGeneratePin = () => {
    setFormData({ ...formData, pin: generateRandomPin() });
    setGenerateNewPin(true);
    setShowPin(true);
  };

  const handleSubmit = () => {
    // Validaciones
    if (!formData.employee_code) {
      alert("El código de empleado es requerido");
      return;
    }

    if (!formData.position) {
      alert("La posición es requerida");
      return;
    }

    if (!formData.phone) {
      alert("El teléfono es requerido");
      return;
    }

    if (!formData.pin || formData.pin.length !== 4) {
      alert("El PIN debe tener 4 dígitos");
      return;
    }

    const dataToSave = { ...formData };
    
    // Solo incluir PIN si se generó uno nuevo
    if (!generateNewPin) {
      delete dataToSave.pin;
    }

    onSave(dataToSave);
  };

  const togglePermission = (key) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key]
      }
    });
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Empleado: {employee.full_name || employee.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info del usuario (read-only) */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-300 text-sm">
              <strong>Usuario:</strong> {employee.full_name || employee.email}
            </p>
            <p className="text-blue-200/80 text-xs mt-1">
              <strong>Email:</strong> {employee.email}
            </p>
          </div>

          {/* Código de empleado */}
          <div className="space-y-2">
            <Label>Código de Empleado *</Label>
            <Input
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              className="bg-black border-gray-700 text-white"
              placeholder="EMP-001"
            />
          </div>

          {/* Posición y teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Posición *</Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="bg-black border-gray-700 text-white"
                placeholder="Ej: Técnico, Cajero, Gerente"
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-black border-gray-700 text-white"
                placeholder="787-123-4567"
              />
            </div>
          </div>

          {/* Rol y tarifa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rol *</Label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-black border border-gray-700 text-white"
              >
                <option value="service">Servicio</option>
                <option value="technician">Técnico</option>
                <option value="cashier">Cajero</option>
                <option value="manager">Gerente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Tarifa por Hora ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                className="bg-black border-gray-700 text-white"
                placeholder="15.00"
              />
            </div>
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <Label>PIN de Acceso (4 dígitos) *</Label>
            <div className="flex gap-2">
              {(generateNewPin || !employee.pin) ? (
                <div className="relative flex-1">
                  <Input
                    type={showPin ? "text" : "password"}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="bg-black border-gray-700 text-white pr-10"
                    maxLength={4}
                    placeholder="4 dígitos"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="flex-1 px-3 py-2 bg-black/50 border border-gray-700 rounded-md text-gray-500">
                  ••••
                </div>
              )}
              <Button
                type="button"
                onClick={handleGeneratePin}
                variant="outline"
                className="border-gray-700"
              >
                {(generateNewPin || !employee.pin) ? "Regenerar" : "Cambiar PIN"}
              </Button>
            </div>
            {(generateNewPin || !employee.pin) && (
              <p className="text-xs text-yellow-400">⚠️ Guarda este PIN - el empleado lo necesitará para ponchar</p>
            )}
          </div>

          {/* Permisos */}
          <div className="space-y-2">
            <Label>Permisos</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries({
                view_reports: "Ver reportes",
                view_financials: "Ver finanzas",
                manage_inventory: "Gestionar inventario",
                manage_employees: "Gestionar empleados",
                manage_cash_drawer: "Gestionar caja",
                create_orders: "Crear órdenes",
                process_sales: "Procesar ventas",
                apply_discounts: "Aplicar descuentos",
                process_refunds: "Procesar devoluciones",
                edit_time_entries: "Editar ponches"
              }).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 p-2 bg-black/20 rounded">
                  <input
                    type="checkbox"
                    checked={formData.permissions[key]}
                    onChange={() => togglePermission(key)}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span className="text-sm text-gray-300">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 accent-red-600"
            />
            <Label>Empleado activo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-gray-700">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
            Guardar Configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}