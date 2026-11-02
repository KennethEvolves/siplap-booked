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
  MapPin, 
  FileText, 
  Award, 
  Building2,
  ExternalLink
} from 'lucide-react';
import { ExternalLocationInput } from '@/lib/api';

interface RecursoFinancieroItem {
  id: string;
  tipo: string;
  monto: number;
}

interface EspacioSeleccionado {
  id: string;
  spaceId: string;
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

  // Subflujo 1: Espacios universitarios
  const [espaciosSeleccionados, setEspaciosSeleccionados] = useState<EspacioSeleccionado[]>([
    { id: '1', spaceId: '' }
  ]);

  const catalogoEspacios = [
    { id: 'esp-1', nombre: 'Auditorio Principal' },
    { id: 'esp-2', nombre: 'Sala de Usos Múltiples (SUM)' },
    { id: 'esp-3', nombre: 'Laboratorio de Cómputo 1' },
    { id: 'esp-4', nombre: 'Laboratorio de Cómputo 2' },
    { id: 'esp-5', nombre: 'Laboratorio de Gastronomía' },
    { id: 'esp-6', nombre: 'Cancha de Usos Múltiples' },
    { id: 'esp-7', nombre: 'Aula Magna' },
  ];

  const handleAddEspacio = () => {
    setEspaciosSeleccionados([
      ...espaciosSeleccionados,
      { id: Date.now().toString(), spaceId: '' }
    ]);
  };

  const handleRemoveEspacio = (id: string) => {
    if (espaciosSeleccionados.length === 1) {
      setEspaciosSeleccionados([{ id: Date.now().toString(), spaceId: '' }]);
      return;
    }
    setEspaciosSeleccionados(espaciosSeleccionados.filter((item) => item.id !== id));
  };

  const handleUpdateEspacio = (id: string, spaceId: string) => {
    setEspaciosSeleccionados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, spaceId } : item))
    );
  };

  // Subflujo 2: Ubicaciones externas (conservando la lógica de tu compañero)
  const [externalLocations, setExternalLocations] = useState<ExternalLocationInput[]>([]);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationLat, setLocationLat] = useState('20.6896');
  const [locationLng, setLocationLng] = useState('-88.2011');

  const handleAddExternalLocation = () => {
    if (!locationName.trim() || !locationAddress.trim()) return;

    const lat = parseFloat(locationLat) || 20.6896;
    const lng = parseFloat(locationLng) || -88.2011;

    const newLoc: ExternalLocationInput = {
      name: locationName.trim(),
      formattedAddress: locationAddress.trim(),
      googlePlaceId: `custom-${Date.now()}`,
      latitude: lat,
      longitude: lng,
    };

    setExternalLocations([...externalLocations, newLoc]);
    setLocationName('');
    setLocationAddress('');
  };

  const handleRemoveExternalLocation = (index: number) => {
    setExternalLocations(externalLocations.filter((_, i) => i !== index));
  };

  // 3. Recursos Financieros
  const [recursosList, setRecursosList] = useState<RecursoFinancieroItem[]>([
    { id: '1', tipo: 'Gasolina y transportación', monto: 0 },
  ]);

  const handleAddRecurso = () => {
    setRecursosList([...recursosList, { id: Date.now().toString(), tipo: '', monto: 0 }]);
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

  const totalFinanciamiento = recursosList.reduce((acc, curr) => acc + (curr.monto || 0), 0);

  // 4. Observaciones y 5. Datos adicionales
  const [observaciones, setObservaciones] = useState('');
  const [constancias, setConstancias] = useState('');
  const [requiereAutoridades, setRequiereAutoridades] = useState<'si' | 'no'>('no');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const espaciosParaEnviar = (tipoUbicacion === 'interno' || tipoUbicacion === 'mixto')
      ? espaciosSeleccionados.filter((e) => e.spaceId.trim() !== '')
      : [];

    const ubicacionesParaEnviar = (tipoUbicacion === 'externo' || tipoUbicacion === 'mixto')
      ? externalLocations
      : [];

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
      espaciosReservados: espaciosParaEnviar,
      ubicacionesExternas: ubicacionesParaEnviar,
      colaboradores,
      recursosFinancieros: recursosList,
      totalFinanciamiento,
      observaciones,
      constancias,
      requiereAutoridades,
    });

    router.push('/activities');
  };

  const cardSectionClass = 'bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6';
  const labelClass = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2';
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          
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

                {/* SUBFLUJO 1: PANEL DE ESPACIOS DE LA UNIVERSIDAD */}
                {(tipoUbicacion === 'interno' || tipoUbicacion === 'mixto') && (
                  <div className="mt-2 p-5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          Espacios Universitarios a Reservar *
                        </h3>
                        <p className="text-xs text-blue-600/90 mt-0.5">
                          Selecciona uno o varios espacios. Cada uno generará una reservación asociada con estatus pendiente.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEspacio}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                        Agregar otro espacio
                      </button>
                    </div>

                    <div className="space-y-3">
                      {espaciosSeleccionados.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-blue-600 w-6">#{index + 1}</span>
                          <div className="flex-1">
                            <select
                              value={item.spaceId}
                              onChange={(e) => handleUpdateEspacio(item.id, e.target.value)}
                              className={`${inputClass} bg-white cursor-pointer`}
                              required
                            >
                              <option value="">- Seleccione un espacio / aula -</option>
                              {catalogoEspacios.map((esp) => (
                                <option key={esp.id} value={esp.id}>
                                  {esp.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          {espaciosSeleccionados.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEspacio(item.id)}
                              className="p-2.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Quitar espacio"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUBFLUJO 2: PANEL DE UBICACIONES EXTERNAS (ESTILO CONSERVADO) */}
                {(tipoUbicacion === 'externo' || tipoUbicacion === 'mixto') && (
                  <div className="mt-2 p-5 rounded-xl border border-emerald-100 bg-emerald-50/30 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-700" />
                      <div>
                        <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Ubicaciones Externas
                        </h3>
                        <p className="text-xs text-emerald-800/80 mt-0.5">
                          Busca y agrega uno o varios lugares. Se guardarán junto con la actividad.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/80 rounded-xl border border-emerald-100 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs text-slate-600">
                          Puedes buscar el lugar en Google Maps y capturar sus coordenadas aquí:
                        </p>
                        <a
                          href="https://www.google.com/maps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors w-fit"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Buscar lugar en Google Maps
                        </a>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Nombre del lugar</label>
                          <input
                            type="text"
                            placeholder="Auditorio, edificio o plaza"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Dirección o referencia</label>
                          <input
                            type="text"
                            placeholder="Calle, número, colonia o ciudad"
                            value={locationAddress}
                            onChange={(e) => setLocationAddress(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Latitud</label>
                          <input
                            type="text"
                            placeholder="20.6896"
                            value={locationLat}
                            onChange={(e) => setLocationLat(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Longitud</label>
                          <input
                            type="text"
                            placeholder="-88.2011"
                            value={locationLng}
                            onChange={(e) => setLocationLng(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <p className="text-[11px] text-slate-500">
                          En Google Maps, haz clic derecho sobre el punto y copia las coordenadas (latitud, longitud).
                        </p>
                        <button
                          type="button"
                          onClick={handleAddExternalLocation}
                          className="px-4 py-2 bg-[#5b141b] hover:bg-[#481015] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                        >
                          Agregar ubicación
                        </button>
                      </div>
                    </div>

                    {/* Lista de ubicaciones externas agregadas */}
                    {externalLocations.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Lugares agregados ({externalLocations.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {externalLocations.map((loc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-emerald-600" />
                                <div>
                                  <p className="font-bold text-slate-800">{loc.name}</p>
                                  <p className="text-slate-500">{loc.formattedAddress}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveExternalLocation(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Eliminar lugar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </section>

            {/* 3. RECURSOS FINANCIEROS */}
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

                <button
                  type="button"
                  onClick={handleAddRecurso}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  Agregar Concepto
                </button>
              </div>

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
                      {recursosList.map((item) => (
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

            {/* 4. OBSERVACIONES Y 5. DATOS ADICIONALES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            {/* BOTONES DE ACCIÓN */}
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