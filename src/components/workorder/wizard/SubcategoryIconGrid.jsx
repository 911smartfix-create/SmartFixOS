import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Laptop, Smartphone, Tablet, Watch, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ScrollPanel from "@/components/shared/ScrollPanel";

/** Reglas por marca+tipo para requerir (o no) familia */
function requiresFamily(brandName, subcatName) {
  const brand = (brandName || "").toLowerCase();
  const sub = (subcatName || "").toLowerCase();

  // Apple: iPhone/iPad/Watch SIN familia; Mac sí puede tener (MacBook Air/Pro, iMac) => en laptops/desktop sí.
  if (brand === "apple") {
    if (sub.includes("smartphone") || sub.includes("phone")) return false; // iPhone
    if (sub.includes("tablet")) return false; // iPad
    if (sub.includes("watch") || sub.includes("smartwatch")) return false; // Apple Watch
    // laptops/desktop sí (MacBook / iMac) -> true
    return true;
  }

  // Samsung: sí usa familias en smartphone/tablet/watch (Galaxy S, A, Z, Tab…)
  if (brand === "samsung") {
    return true;
  }

  // Por defecto: la mayoría SÍ usan familia (puedes ajustar a tu gusto)
  return true;
}

const iconMap = {
  laptop: Laptop,
  desktop: Monitor,
  smartphone: Smartphone,
  tablet: Tablet,
  smartwatch: Watch
};

export default function SubcategoryIconGrid({ formData, updateFormData, onAutoAdvance }) {
  const [subcategories, setSubcategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (formData.device_brand) loadSubcategories();
  }, [formData.device_brand]);

  const loadSubcategories = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DeviceSubcategory.filter({
        brand_id: formData.device_brand.id,
        active: true
      });

      // Si no hay, sembramos algunos por defecto según la marca
      const defaults = getDefaultSubcategoriesForBrand(formData.device_brand.name);
      if (!data?.length && defaults?.length) {
        const created = [];
        for (let i = 0; i < defaults.length; i++) {
          const sub = defaults[i];
          const row = await base44.entities.DeviceSubcategory.create({
            name: sub.name,
            brand_id: formData.device_brand.id,
            icon: sub.icon,
            active: true,
            order: i
          });
          created.push(row);
        }
        setSubcategories(created);
      } else {
        setSubcategories((data || []).sort((a, b) => (a.order || 0) - (b.order || 0)));
      }
    } catch (error) {
      console.error("Error loading subcategories:", error);
      setSubcategories([]);
    }
    setLoading(false);
  };

  const getDefaultSubcategoriesForBrand = (brandName) => {
    const normalized = (brandName || "").toLowerCase();
    if (normalized === "apple") {
      return [
        { name: "Smartphone", icon: "📱" }, // iPhone
        { name: "Tablet", icon: "📱" },     // iPad
        { name: "Laptop", icon: "💻" },     // MacBook
        { name: "Desktop", icon: "🖥️" },   // iMac
        { name: "SmartWatch", icon: "⌚" }  // Apple Watch
      ];
    } else if (["samsung", "google", "xiaomi", "motorola"].includes(normalized)) {
      return [
        { name: "Smartphone", icon: "📱" },
        { name: "Tablet", icon: "📱" },
        { name: "SmartWatch", icon: "⌚" }
      ];
    } else if (["dell", "hp", "lenovo", "asus", "acer"].includes(normalized)) {
      return [
        { name: "Laptop", icon: "💻" },
        { name: "Desktop", icon: "🖥️" }
      ];
    }
    return [{ name: "Smartphone", icon: "📱" }];
  };

  const filteredSubcategories = subcategories.filter((s) =>
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (subcategory) => {
    const name = (subcategory.name || "").toLowerCase();
    let deviceType = "other";
    if (name.includes("smartphone") || name.includes("celular") || name.includes("phone")) deviceType = "phone";
    else if (name.includes("laptop") || name.includes("desktop") || name.includes("computadora")) deviceType = "computer";
    else if (name.includes("tablet") || name.includes("tableta")) deviceType = "tablet";
    else if (name.includes("watch") || name.includes("reloj")) deviceType = "watch";

    updateFormData("device_type", deviceType);
    updateFormData("device_subcategory", subcategory);
    // limpiamos selección de familia/modelo al cambiar subcategoría
    updateFormData("device_family", null);
    updateFormData("device_model", null);

    const needsFamily = requiresFamily(formData.device_brand?.name, subcategory.name);
    updateFormData("device_requires_family", needsFamily);

    // si NO requiere familia → saltar directo a “Modelo”
    if (onAutoAdvance) {
      setTimeout(() => onAutoAdvance(), 300);
    }
  };

  const header = (
    <div className="px-4 sm:px-6 py-4">
      <div>
        <h3 className="text-2xl font-bold text-white mb-2">Selecciona el tipo</h3>
        <p className="text-gray-400 text-sm">
          Marca: <span className="text-white font-semibold">{formData.device_brand?.name}</span>
        </p>
      </div>

      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        <Input
          placeholder="Buscar tipo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-black border-gray-700 text-white"
        />
      </div>
    </div>
  );

  const gridContent = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {filteredSubcategories.map((subcategory) => {
        const isSelected = formData.device_subcategory?.id === subcategory.id;
        const IconComponent =
          iconMap[(subcategory.name || "").toLowerCase()] || Monitor;

        return (
          <Card
            key={subcategory.id}
            onPointerUp={() => handleSelect(subcategory)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(subcategory);
              }
            }}
            tabIndex={0}
            role="button"
            aria-pressed={isSelected}
            aria-label={`Seleccionar tipo ${subcategory.name}`}
            className={`p-6 cursor-pointer transition-all 
              hover:scale-105 active:scale-95
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black
              min-h-[44px] touch-manipulation
              ${
                isSelected
                  ? "bg-gradient-to-br from-red-600 to-red-800 border-red-500 shadow-lg shadow-red-600/50 ring-2 ring-500"
                  : "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-red-500/50"
              }`}
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isSelected ? "bg-white/20" : "bg-gray-800"}`}>
                {subcategory.icon_url ? (
                  <img src={subcategory.icon_url} alt={subcategory.name} className="w-12 h-12 object-contain" />
                ) : subcategory.icon ? (
                  <span className="text-4xl">{subcategory.icon}</span>
                ) : (
                  <IconComponent className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div>
                <p className="font-bold text-white text-lg">{subcategory.name}</p>
                {isSelected && (
                  <Badge className="mt-2 bg-white/20 text-white border-white/30 text-xs">✓ Seleccionado</Badge>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  return (
    <ScrollPanel header={header}>
      {filteredSubcategories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron tipos para esta marca</p>
        </div>
      ) : (
        gridContent
      )}
    </ScrollPanel>
  );
}