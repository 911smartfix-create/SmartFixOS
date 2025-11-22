
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Search, Smartphone } from "lucide-react";

/**
 * PROMPT 4: Nuevo paso - Selección de FAMILIA dentro de una marca
 * Ejemplo: Apple → iPhone, iPad, Mac, Apple Watch, AirPods
 */
export default function FamilyIconGrid({ formData, updateFormData, onAutoAdvance, config }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const useNewSelector = config?.feature_flags?.brand_family_flow !== false;
  const selectedBrand = formData.device_brand;

  useEffect(() => {
    if (!selectedBrand) return;
    loadFamilies();
  }, [selectedBrand]);

  const loadFamilies = async () => {
    try {
      setLoading(true);
      
      if (useNewSelector) {
        // Cargar desde DEVICE_CATALOG
        const { DEVICE_CATALOG } = await import("@/components/utils/deviceCatalog");
        const brand = DEVICE_CATALOG.brands.find(b => b.id === selectedBrand.id || b.label === selectedBrand.name);
        
        if (brand?.families) {
          const catalogFamilies = brand.families.map(f => ({
            id: f.id,
            name: f.label,
            type: f.type,
            icon_url: f.icon,
            active: true
          }))
          // 👈 B) Orden alfabético estable
          .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));
          
          setFamilies(catalogFamilies);
        }
      } else {
        // Comportamiento original (si existe DeviceSubcategory)
        try {
          const data = await base44.entities.DeviceSubcategory.filter({ 
            brand_id: selectedBrand.id,
            active: true 
          });
          const sorted = (Array.isArray(data) ? data : [])
            .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));
          setFamilies(sorted);
        } catch {
          setFamilies([]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading families:", error);
      setLoading(false);
    }
  };

  const filteredFamilies = useMemo(() => {
    if (!searchTerm.trim()) return families;
    const q = searchTerm.toLowerCase();
    return families.filter(f => (f.name || "").toLowerCase().includes(q));
  }, [families, searchTerm]);

  const handleSelect = (family) => {
    // PROMPT 7: Guardar completo
    updateFormData("device_family", family);
    updateFormData("device_subcategory", family); // Compatibilidad
    updateFormData("device_type", family.type || "phone");
    
    // Clear model selection
    updateFormData("device_model", null);
    
    if (onAutoAdvance) {
      setTimeout(() => onAutoAdvance(), 200);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>Marca seleccionada:</span>
        <span className="text-white font-semibold">{selectedBrand?.name}</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscar familia/tipo…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-12 px-4 pl-10 rounded-lg bg-black/40 border border-white/15 text-slate-100"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filteredFamilies.map((family) => {
          const isSelected = formData?.device_family?.id === family.id;
          return (
            <button
              key={family.id}
              onClick={() => handleSelect(family)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all min-h-[120px] ${
                isSelected
                  ? "bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-500"
                  : "bg-black/40 border-2 border-white/10 hover:border-red-600/50"
              }`}
            >
              {family.icon_url ? (
                <img
                  src={family.icon_url}
                  alt={family.name}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 grid place-items-center">
                  <Smartphone className="w-6 h-6 text-white/60" />
                </div>
              )}
              <span className="text-sm text-white text-center line-clamp-2">{family.name}</span>
            </button>
          );
        })}
      </div>

      {filteredFamilies.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No se encontraron familias para esta marca
        </div>
      )}
    </div>
  );
}
