import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Smartphone, Package, Wrench, Globe } from "lucide-react";
import { toast } from "sonner";

export default function ExternalLinksPanel() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setError(false);
      const allLinks = await base44.entities.ExternalLink.filter({ active: true }, "order");
      setLinks(allLinks || []);
      setLoading(false);
    } catch (err) {
      console.error("Error loading links:", err);
      setError(true);
      setLoading(false);
      setLinks([]);
    }
  };

  const openLink = (link) => {
    const target = link.opens_in === "same_tab" ? "_self" : "_blank";
    window.open(link.url, target, "noopener,noreferrer");
    toast.success(`Abriendo ${link.name}`);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "imei_check": return Smartphone;
      case "unlock_service": return Wrench;
      case "parts_supplier": return Package;
      default: return Globe;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "imei_check": return "from-blue-600/20 to-blue-800/20 border-blue-500/30 text-blue-300";
      case "unlock_service": return "from-purple-600/20 to-purple-800/20 border-purple-500/30 text-purple-300";
      case "parts_supplier": return "from-green-600/20 to-green-800/20 border-green-500/30 text-green-300";
      default: return "from-gray-600/20 to-gray-800/20 border-gray-500/30 text-gray-300";
    }
  };

  if (loading) {
    return (
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <CardContent className="py-8">
          <div className="text-center text-gray-400">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || links.length === 0) {
    return (
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-red-500" />
            Enlaces Útiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-600 opacity-50" />
            <p className="text-gray-400 text-sm">
              {error ? "No se pudieron cargar los enlaces" : "No hay enlaces configurados"}
            </p>
            {!error && (
              <p className="text-gray-500 text-xs mt-1">Añádelos en Settings → Enlaces</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // AI FIX: b2b customer support - Improved responsive layout for links
  return (
    <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] theme-light:bg-white theme-light:border-gray-200">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 theme-light:text-gray-900">
          <ExternalLink className="w-5 h-5 text-red-500 theme-light:text-red-600" />
          Enlaces Útiles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid grid-cols-1 gap-3 ${links.length > 5 ? 'max-h-[400px] overflow-y-auto scrollbar-thin' : ''}`}>
          {links.map(link => {
            const Icon = getCategoryIcon(link.category);
            const colorClass = getCategoryColor(link.category);
            
            return (
              <button
                key={link.id}
                onClick={() => openLink(link)}
                className={`group relative p-4 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg bg-gradient-to-br ${colorClass} backdrop-blur-sm theme-light:shadow-md`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center flex-shrink-0 theme-light:bg-white/80">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-white flex items-center gap-2 truncate theme-light:text-gray-900">
                      {link.icon && <span>{link.icon}</span>}
                      {link.name}
                    </p>
                    {link.description && (
                      <p className="text-xs text-gray-300 mt-0.5 line-clamp-1 theme-light:text-gray-600">{link.description}</p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}