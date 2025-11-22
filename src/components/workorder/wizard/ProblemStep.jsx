// === ProblemStep.jsx — versión alineada con WorkOrderWizard (usa media_urls) ===
import React, { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Trash2 } from "lucide-react";

export default function ProblemStep({ formData, updateFormData }) {
  const fileRef = useRef(null);

  // 👇 helper para asegurarnos que siempre tengamos array
  const safeMedia = Array.isArray(formData.media_urls)
    ? formData.media_urls
    : [];

  const handleProblemChange = (e) => {
    updateFormData("initial_problem", e.target.value);
  };

  const addFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const next = [...safeMedia, ...list]; // 👈 guardamos File(s) directamente, igual que en el wizard
    updateFormData("media_urls", next);   // 👈 IMPORTANT: media_urls
  };

  const removeAt = (idx) => {
    const next = safeMedia.filter((_, i) => i !== idx);
    updateFormData("media_urls", next); // 👈 misma key
  };

  // 👇 presets de descripción
  const applyPreset = (text) => {
    updateFormData("initial_problem", text);
  };

  return (
    <div className="space-y-6">
      {/* Presets rápidos */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => applyPreset("Pantalla rota / no responde")}
          className="border-white/10 text-gray-100 hover:bg-white/5"
        >
          Pantalla rota
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => applyPreset("Batería durando poco / se apaga")}
          className="border-white/10 text-gray-100 hover:bg-white/5"
        >
          Batería
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => applyPreset("Aplicación de Líquido Glass")}
          className="border-red-500/40 text-red-100 bg-red-500/10 hover:bg-red-500/20"
        >
          Líquido Glass
        </Button>
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label className="text-gray-300">Descripción del problema</Label>
        <Textarea
          value={formData.initial_problem || ""}
          onChange={handleProblemChange}
          placeholder="Ej. No enciende / pantalla quebrada / batería dura poco…"
          className="bg-black/40 border-red-900/30 text-white min-h-[110px]"
        />
      </div>

      {/* Evidencias */}
      <div className="space-y-3">
        <Label className="text-gray-300">Fotos / Evidencias</Label>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="bg-red-600 hover:bg-red-700"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Añadir archivos
          </Button>
          <span className="text-xs text-gray-400">
            Puedes subir imágenes o videos (estado del equipo).
          </span>
        </div>

        {/* Previews */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {safeMedia.map((f, idx) => {
            const isFile = f instanceof File || f instanceof Blob;
            const url = isFile
              ? URL.createObjectURL(f)
              : f.url || f.publicUrl;
            const mime = isFile ? f.type : f.mime;
            const isVideo =
              (mime || "").startsWith("video");

            return (
              <div
                key={idx}
                className="relative rounded-lg overflow-hidden border border-white/10 bg-black/30"
              >
                {isVideo ? (
                  <video
                    src={url}
                    className="w-full h-28 object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={url}
                    alt={`evidence-${idx}`}
                    className="w-full h-28 object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 rounded-full p-1"
                  title="Quitar"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}