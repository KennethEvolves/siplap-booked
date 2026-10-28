'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/Sidebar';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  DollarSign, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  FileText, 
  Award, 
  Building2 
} from 'lucide-react';

interface RecursoFinancieroItem {
  id: string;
  tipo: string;
  monto: number;
}

export default function NewActivityPage() {
  const router = useRouter();

  // 1. Alcance de la actividad
  const [eje, setEje] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [noActividad, setNoActividad] = useState('');

  // 2. Datos generales
  const [nombreActividad, setNombreActividad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [tipoUbicacion, setTipoUbicacion] = useState('');
  const [colaboradores, setColaboradores] = useState('');

  // 3. Requerimientos / Recursos Financieros en Tabla
  const [recursosList, setRecursosList] = useState<RecursoFinancieroItem[]>([
    { id: '1', tipo: 'Gasolina y transportación', monto: 0 },
  ]);

  // 4. Observaciones
  const [observaciones, setObservaciones] = useState('');

  // 5. Datos adicionales
  const [constancias, setConstancias] = useState('');
  const [requiereAutoridades, setRequiereAutoridades] = useState<'si' | 'no'>('no');

  // Funciones para gestionar la tabla de recursos
  const handleAddRecurso = () => {
    const nuevoItem: RecursoFinancieroItem = {
      id: Date.now().toString(),
      tipo: '',
      monto: 0,
    };
    setRecursosList([...recursosList, nuevoItem]);
  };

  const handleRemoveRecurso = (id: string) => {
    if (recursosList.length === 1) {
      setRecursosList([{ id: Date.now().toString(), tipo: '', monto: 0 }]);
      return;
    }
    setRecursosList(recursosList.filter((item) => item.id !== id));
  };

  const handleUpdateRecurso = (id: string, field: 'tipo' | 'monto', value: string) => {
    setRecursosList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'monto' ? parseFloat(value) || 0 : value,
          };
        }
        return item;
      })
    );
  };

  // Cálculo de monto total acumulado
  const totalFinanciamiento = recursosList.reduce((acc, curr) => acc + (curr.monto || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({
      eje,
      objetivo,
      noActividad,
      nombreActividad,
      descripcion,
      fechaInicio,
      fechaFin,
      horaInicio,
      horaFin,
      tipoUbicacion,
      colaboradores,
      recursosFinancieros: recursosList,
      totalFinanciamiento,
      observaciones,
      constancias,
      requiereAutoridades,
    });
    router.push('/activities');
  };

  // Clases compartidas para consistencia visual
  const cardSectionClass = 'bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6';
  const labelClass = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2';
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* 1. Menú Lateral existente */}
      <Sidebar />

      {/* 2. Contenedor de Pantalla Completa */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Encabezado Principal */}
          <div className="flex items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-4">
              <Link
                href="/activities"
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Volver a Actividades"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                  Gestión Operativa e Institucional
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                  Agregar Actividad Extraordinaria
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Ingresa y programa los alcances, tiempos y recursos requeridos para el evento.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. ALCANCE DE LA ACTIVIDAD */}
            <section className={cardSectionClass}>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Building2 className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  1. Alcance de la Actividad
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-6">
                  <label className={labelClass}>Eje Institucional *</label>
                  <select
                    value={eje}
                    onChange={(e) => setEje(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                    required
                  >
                    <option value="">- Seleccione el eje -</option>
                    <option value="eje1">Eje 1: Formación Integral y Calidad Académica</option>
                    <option value="eje2">Eje 2: Vinculación e Impacto Comunitario</option>
                    <option value="eje3">Eje 3: Gestión y Gobernanza</option>
                  </select>
                </div>

                <div className="md:col-span-6">
                  <label className={labelClass}>Objetivo Estratégico *</label>
                  <select
                    value={objetivo}
                    onChange={(e) => setObjetivo(e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                    required
                  >
                    <option value="">- Seleccione el objetivo -</option>
                    <option value="obj1">Objetivo 1: Fortalecimiento y Desarrollo de Proyectos</option>
                    <option value="obj2">Objetivo 2: Actualización y Vinculación</option>
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className={labelClass}>No. de Actividad</label>
                  <input
                    type="text"
                    value={noActividad}
                    onChange={(e) => setNoActividad(e.target.value)}
                    placeholder="Ej. ACT-2026-08"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* 2. DATOS GENERALES */}
            <section className={cardSectionClass}>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Datos Generales
                </h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Nombre de la Actividad *</label>
                  <input
                    type="text"
                    value={nombreActividad}
                    onChange={(e) => setNombreActividad(e.target.value)}
                    placeholder="Ej. Congreso Internacional de Innovación y Tecnología"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Descripción Detallada</label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Especifica los objetivos, programa general y requerimientos del evento..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Fechas y Horas agrupadas en cuadrícula de 4 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className={labelClass}>Fecha Inicio *</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fecha Fin *</label>
                    <input
                      type="date"
                      value={fechaFin}
                      min={fechaInicio}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hora Inicio</label>
                    <input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hora Fin</label>
                    <input
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className={labelClass}>Tipo de Ubicación *</label>
                    <select
                      value={tipoUbicacion}
                      onChange={(e) => setTipoUbicacion(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      required
                    >
                      <option value="">- Seleccione el tipo de lugar -</option>
                      <option value="interno">Espacio de la Universidad (Interno)</option>
                      <option value="externo">Lugar externo (API Google Maps)</option>
                      <option value="mixto">Mixto (Espacio institucional y externo)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Colaboradores Involucrados</label>
                    <input
                      type="text"
                      value={colaboradores}
                      onChange={(e) => setColaboradores(e.target.value)}
                      placeholder="Ej. Docentes, laboratoristas, comité técnico"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 3. RECURSOS FINANCIEROS (CON TABLA INTERACTIVA Y BOTÓN +) */}
            <section className={cardSectionClass}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      3. Recursos Financieros y Presupuesto
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Desglosa cada tipo de recurso necesario y especifica su importe presupuestal.
                    </p>
                  </div>
                </div>

                {/* BOTÓN + PARA AÑADIR MÁS CONCEPTOS */}
                <button
                  type="button"
                  onClick={handleAddRecurso}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  Agregar Concepto
                </button>
              </div>

              {/* TABLA DE RECURSOS */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        <th className="py-3 px-5">Tipo de Recurso / Concepto</th>
                        <th className="py-3 px-5 w-48 text-right">Monto (MXN)</th>
                        <th className="py-3 px-4 w-16 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {recursosList.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-5">
                            <input
                              type="text"
                              value={item.tipo}
                              onChange={(e) => handleUpdateRecurso(item.id, 'tipo', e.target.value)}
                              placeholder="Ej. Gasolina, viáticos, hospedaje, consumibles..."
                              className="w-full bg-transparent border-0 border-b border-dashed border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 placeholder:text-slate-400"
                            />
                          </td>
                          <td className="py-3 px-5 text-right">
                            <div className="relative inline-flex items-center w-full max-w-[180px]">
                              <span className="absolute left-3 text-slate-400 font-medium text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.monto === 0 ? '' : item.monto}
                                onChange={(e) => handleUpdateRecurso(item.id, 'monto', e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-7 pr-3 py-1.5 text-right font-medium text-slate-900 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:border-blue-600 transition-all text-sm"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRecurso(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Eliminar fila"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 border-t border-slate-200 font-bold">
                        <td className="py-3.5 px-5 text-xs text-slate-600 uppercase tracking-wider">
                          Monto Total Presupuestado:
                        </td>
                        <td className="py-3.5 px-5 text-right text-base text-blue-600 font-extrabold">
                          $ {totalFinanciamiento.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>

            {/* 4. OBSERVACIONES Y 5. DATOS ADICIONALES (EN 2 COLUMNAS) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* 4. OBSERVACIONES */}
              <section className={cardSectionClass}>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    4. Observaciones
                  </h2>
                </div>
                <div>
                  <label className={labelClass}>Observaciones Generales</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Comentarios adicionales, requerimientos de apoyo o especificaciones..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </section>

              {/* 5. DATOS ADICIONALES */}
              <section className={cardSectionClass}>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Award className="h-4 w-4 text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    5. Datos Adicionales
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>¿Requiere Constancias?</label>
                    <input
                      type="text"
                      value={constancias}
                      onChange={(e) => setConstancias(e.target.value)}
                      placeholder="Describa datos específicos de las constancias o constancia no requerida"
                      className={inputClass}
                    />
                  </div>

                  <div className="pt-1">
                    <label className={labelClass}>¿Requiere Presencia de Autoridades?</label>
                    <div className="flex items-center gap-6 mt-2">
                      <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="autoridades"
                          value="si"
                          checked={requiereAutoridades === 'si'}
                          onChange={() => setRequiereAutoridades('si')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        Sí
                      </label>
                      <label className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="autoridades"
                          value="no"
                          checked={requiereAutoridades === 'no'}
                          onChange={() => setRequiereAutoridades('no')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* BOTONES DE ACCIÓN (ESTILO INSTITUCIONAL GUINDA/GRIS) */}
            <div className="flex justify-end items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.push('/activities')}
                className="px-6 py-2.5 bg-[#5b6470] hover:bg-[#4a525d] text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#5b141b] hover:bg-[#481015] text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
              >
                Guardar Actividad
              </button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
}