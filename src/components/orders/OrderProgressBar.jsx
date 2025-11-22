import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusFlow = [
  { key: "intake", label: "Recepción", color: "bg-blue-500" },
  { key: "diagnosing", label: "Diagnóstico", color: "bg-purple-500" },
  { key: "awaiting_approval", label: "Aprobación", color: "bg-yellow-500" },
  { key: "waiting_parts", label: "Esperando Piezas", color: "bg-orange-500" },
  { key: "in_progress", label: "En Progreso", color: "bg-cyan-500" },
  { key: "ready_for_pickup", label: "Lista", color: "bg-green-500" },
  { key: "picked_up", label: "Entregada", color: "bg-emerald-500" }
];

export default function OrderProgressBar({ order }) {
  const currentStatusIndex = statusFlow.findIndex(s => s.key === order.status);
  
  const getStatusTimestamp = (statusKey) => {
    if (!order.status_history) return null;
    const entry = order.status_history.find(h => h.status === statusKey);
    return entry?.timestamp;
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-800">
          <div 
            className="h-full bg-gradient-to-r from-red-600 to-red-800 transition-all duration-500"
            style={{ width: `${(currentStatusIndex / (statusFlow.length - 1)) * 100}%` }}
          />
        </div>

        {/* Status Points */}
        <div className="relative flex justify-between">
          {statusFlow.map((status, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const timestamp = getStatusTimestamp(status.key);

            return (
              <div 
                key={status.key} 
                className="flex flex-col items-center group"
                style={{ flex: 1 }}
              >
                {/* Circle */}
                <div className={`
                  w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all
                  ${isCompleted 
                    ? `${status.color} border-black shadow-lg` 
                    : 'bg-gray-800 border-gray-700'}
                  ${isCurrent ? 'ring-4 ring-red-500/30 scale-110' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p className={`
                    text-xs font-medium
                    ${isCompleted ? 'text-white' : 'text-gray-500'}
                    ${isCurrent ? 'font-bold' : ''}
                  `}>
                    {status.label}
                  </p>
                  
                  {/* Timestamp Tooltip */}
                  {timestamp && (
                    <div className="hidden group-hover:block absolute z-10 mt-1 px-2 py-1 bg-black border border-gray-700 rounded text-xs text-gray-300 whitespace-nowrap">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {format(new Date(timestamp), "MMM d, h:mm a", { locale: es })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status Badge */}
      <div className="flex items-center justify-center gap-2">
        <Badge className={`${statusFlow[currentStatusIndex]?.color} text-white border-0`}>
          Estado Actual: {statusFlow[currentStatusIndex]?.label}
        </Badge>
      </div>
    </div>
  );
}