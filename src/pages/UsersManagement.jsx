
import React, { useState, useEffect } from "react";
import { dataClient } from "@/components/api/dataClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Plus, Edit, Trash2, Shield, Eye, EyeOff, 
  Loader2, Check, X, Lock, UserPlus, Search
} from "lucide-react";
import { toast } from "sonner";
import AdminPinPrompt from "../components/auth/AdminPinPrompt";

const ROLES = [
  { value: "admin", label: "Administrador", color: "text-red-400" },
  { value: "manager", label: "Manager", color: "text-purple-400" },
  { value: "technician", label: "Técnico", color: "text-blue-400" },
  { value: "cashier", label: "Cajero", color: "text-green-400" },
];

export default function UsersManagement() {
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPin, setShowPin] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "technician",
    position: "",
    employee_code: "",
    pin: "",
    hourly_rate: "",
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

  useEffect(() => {
    if (authorized) {
      loadUsers();
    }
  }, [authorized]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await dataClient.entities.User.list("-created_date");
      setUsers(allUsers || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    // Validaciones
    if (!formData.full_name?.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!formData.employee_code?.trim()) {
      toast.error("El código de empleado es requerido");
      return;
    }
    // PIN is required for new users, or if it's being changed for existing users
    if (!editingUser && (!formData.pin?.trim() || formData.pin.length < 4 || formData.pin.length > 6)) {
      toast.error("El PIN debe tener entre 4 y 6 dígitos para nuevos usuarios");
      return;
    }
    if (formData.pin?.trim() && !/^\d+$/.test(formData.pin)) {
      toast.error("El PIN solo puede contener números");
      return;
    }
    
    setLoading(true);
    try {
      const userData = {
        full_name: formData.full_name,
        email: formData.email || "",
        phone: formData.phone || "",
        role: formData.role,
        position: formData.position || formData.role,
        employee_code: formData.employee_code,
        ...(formData.pin?.trim() && { pin: formData.pin }), 
        hourly_rate: parseFloat(formData.hourly_rate) || 0,
        active: formData.active,
        permissions: formData.permissions
      };

      if (editingUser) {
        await dataClient.entities.User.update(editingUser.id, userData);
        toast.success("✅ Usuario actualizado");
      } else {
        const existing = await dataClient.entities.User.filter({ 
          employee_code: formData.employee_code 
        });
        if (existing?.length) {
          toast.error("Ya existe un usuario con ese código de empleado");
          setLoading(false);
          return;
        }

        await dataClient.entities.User.create(userData);
        toast.success("✅ Usuario creado exitosamente");
      }

      setShowForm(false);
      setEditingUser(null);
      resetForm();
      await loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Error al guardar usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "technician",
      position: user.position || "",
      employee_code: user.employee_code || "",
      pin: "", // No mostrar PIN existente por seguridad
      hourly_rate: user.hourly_rate || "",
      active: user.active !== false,
      permissions: user.permissions || {
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
    setShowForm(true);
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`⚠️ ¿ELIMINAR PERMANENTEMENTE al usuario ${user.full_name}?\n\nEsta acción NO se puede deshacer.`)) return;

    setLoading(true);
    try {
      await dataClient.entities.User.delete(user.id);
      
      // Registrar en audit log
      await dataClient.entities.AuditLog.create({
        action: "delete_user",
        entity_type: "user",
        entity_id: user.id,
        user_id: user?.id, // ID del usuario eliminado
        user_name: user?.full_name || user?.email, // Nombre del usuario eliminado
        user_role: user?.role, // Rol del usuario eliminado
        changes: {
          before: {
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            employee_code: user.employee_code
          }
        },
        severity: "warning"
      });

      toast.success("✅ Usuario eliminado permanentemente");
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error al eliminar usuario: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    setLoading(true);
    try {
      await dataClient.entities.User.update(user.id, { active: !user.active });
      toast.success(user.active ? "Usuario desactivado" : "Usuario activado");
      await loadUsers();
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error("Error al cambiar estado");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      role: "technician",
      position: "",
      employee_code: "",
      pin: "",
      hourly_rate: "",
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
  };

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.employee_code?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  if (!authorized) {
    return (
      <AdminPinPrompt
        onSuccess={() => setAuthorized(true)}
        onCancel={() => window.history.back()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              Gestión de Usuarios
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Administrar empleados y permisos del sistema
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setEditingUser(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email, código..."
              className="pl-10 bg-black/40 border-white/10 text-white"
            />
          </div>
        </div>

        {/* User Form */}
        {showForm && (
          <Card className="mb-6 bg-black/40 border-white/10">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white flex items-center gap-2">
                {editingUser ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre completo */}
                <div>
                  <Label className="text-gray-300">Nombre Completo *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="bg-black/40 border-white/10 text-white"
                    placeholder="Juan Pérez"
                  />
                </div>

                {/* Código de empleado */}
                <div>
                  <Label className="text-gray-300">Código de Empleado *</Label>
                  <Input
                    value={formData.employee_code}
                    onChange={(e) => setFormData({...formData, employee_code: e.target.value})}
                    className="bg-black/40 border-white/10 text-white"
                    placeholder="EMP001"
                    disabled={!!editingUser}
                  />
                </div>

                {/* Email */}
                <div>
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-black/40 border-white/10 text-white"
                    placeholder="usuario@smartfix.com"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <Label className="text-gray-300">Teléfono</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-black/40 border-white/10 text-white"
                    placeholder="(787) 123-4567"
                  />
                </div>

                {/* Rol */}
                <div>
                  <Label className="text-gray-300">Rol *</Label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Posición */}
                <div>
                  <Label className="text-gray-300">Posición</Label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="bg-black/40 border-white/10 text-white"
                    placeholder="Técnico Senior"
                  />
                </div>

                {/* PIN */}
                <div>
                  <Label className="text-gray-300">PIN de Acceso * (4-6 dígitos)</Label>
                  <div className="relative">
                    <Input
                      type={showPin ? "text" : "password"}
                      value={formData.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setFormData({...formData, pin: val});
                      }}
                      className="bg-black/40 border-white/10 text-white pr-10"
                      placeholder={editingUser ? "Dejar vacío para no cambiar" : "1234"}
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Tarifa por hora */}
                <div>
                  <Label className="text-gray-300">Tarifa por Hora ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                    className="bg-black/40 border-white/10 text-white"
                    placeholder="15.00"
                  />
                </div>
              </div>

              {/* Permisos */}
              <div className="mt-6">
                <Label className="text-gray-300 mb-3 block">Permisos</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(formData.permissions).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [key]: e.target.checked
                          }
                        })}
                        className="w-4 h-4 rounded border-gray-600 bg-black/40"
                      />
                      <span className="text-sm">{key.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Estado activo */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-600 bg-black/40"
                  />
                  <span>Usuario activo</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  variant="outline"
                  className="border-white/15 text-gray-300 hover:bg-white/5"
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveUser}
                  disabled={loading}
                  className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editingUser ? "Actualizar" : "Crear Usuario"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        <div className="grid gap-4">
          {loading && !showForm ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card className="bg-black/40 border-white/10">
              <CardContent className="py-12 text-center">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchTerm ? "No se encontraron usuarios" : "No hay usuarios creados"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user) => {
              const role = ROLES.find(r => r.value === user.role);
              return (
                <Card key={user.id} className="bg-black/40 border-white/10 hover:border-red-600/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0 ${!user.active && 'opacity-50'}`}>
                          <span className="text-white font-bold text-lg">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-white font-semibold truncate">
                              {user.full_name}
                            </h3>
                            {!user.active && (
                              <span className="px-2 py-0.5 bg-gray-600/20 text-gray-400 border border-gray-600/30 rounded text-xs">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                            <span className={role?.color}>{role?.label || user.role}</span>
                            <span>•</span>
                            <span>{user.employee_code}</span>
                            {user.email && (
                              <>
                                <span>•</span>
                                <span className="truncate">{user.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - MEJORADOS PARA MÓVIL */}
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => handleToggleActive(user)}
                          variant="outline"
                          size="sm"
                          className="border-white/15 flex-1 sm:flex-none"
                          disabled={loading}
                          title={user.active ? "Desactivar usuario" : "Activar usuario"}
                        >
                          {user.active ? <Lock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          <span className="ml-2 sm:hidden">{user.active ? "Desactivar" : "Activar"}</span>
                        </Button>
                        <Button
                          onClick={() => handleEditUser(user)}
                          variant="outline"
                          size="sm"
                          className="border-white/15 flex-1 sm:flex-none"
                          disabled={loading}
                          title="Editar usuario"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="ml-2 sm:hidden">Editar</span>
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user)}
                          variant="outline"
                          size="sm"
                          className="border-red-600/50 text-red-400 hover:bg-red-600/20 flex-1 sm:flex-none"
                          disabled={loading}
                          title="Eliminar usuario permanentemente"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="ml-2 sm:hidden">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
