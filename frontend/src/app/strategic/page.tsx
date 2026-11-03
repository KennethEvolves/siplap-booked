'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { apiFetch } from '@/lib/api';
import {
  Building2,
  Target,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface AxisItem {
  axisId: string;
  name: string;
  description?: string | null;
}

interface ObjectiveItem {
  objectiveId: string;
  name: string;
  description?: string | null;
  axisId: string;
  axisName?: string | null;
}

export default function StrategicPlanningPage() {
  const [openForm, setOpenForm] = useState<'axis' | 'objective' | null>(null);
  const [activeTab, setActiveTab] = useState<'axis' | 'objectives'>('axis');

  const [axes, setAxes] = useState<AxisItem[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [axisName, setAxisName] = useState('');
  const [axisDescription, setAxisDescription] = useState('');

  const [objName, setObjName] = useState('');
  const [objDescription, setObjDescription] = useState('');
  const [selectedAxisId, setSelectedAxisId] = useState('');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resAxes, resObjectives] = await Promise.allSettled([
        apiFetch<any>('/api/axes'),
        apiFetch<any>('/api/objectives'),
      ]);

      if (resAxes.status === 'fulfilled' && resAxes.value) {
        const rawAxes = resAxes.value.axes || (Array.isArray(resAxes.value) ? resAxes.value : []);
        setAxes(
          rawAxes.map((a: any) => ({
            axisId: a.axisId || a.axis_id || a.id,
            name: a.name || 'Sin nombre',
            description: a.description || '',
          }))
        );
      }

      if (resObjectives.status === 'fulfilled' && resObjectives.value) {
        const rawObj = resObjectives.value.objectives || (Array.isArray(resObjectives.value) ? resObjectives.value : []);
        setObjectives(
          rawObj.map((o: any) => ({
            objectiveId: o.objectiveId || o.objective_id || o.id,
            name: o.name || 'Sin nombre',
            description: o.description || '',
            axisId: o.axisId || o.axis_id || '',
            axisName: o.axisName || o.axis?.name || '',
          }))
        );
      }
    } catch {
      showNotification('error', 'No se pudieron sincronizar los datos del servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAxis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!axisName.trim()) return;

    try {
      setSubmitting(true);
      await apiFetch('/api/axes', {
        method: 'POST',
        body: JSON.stringify({
          name: axisName.trim(),
          description: axisDescription.trim() || undefined,
        }),
      });

      showNotification('success', 'Eje institucional guardado con éxito.');
      setAxisName('');
      setAxisDescription('');
      setOpenForm(null);
      setActiveTab('axis');
      await fetchData();
    } catch (err: unknown) {
      showNotification(
        'error',
        err instanceof Error ? err.message : 'Error al guardar el eje en la base de datos.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objName.trim() || !selectedAxisId) return;

    try {
      setSubmitting(true);
      await apiFetch('/api/objectives', {
        method: 'POST',
        body: JSON.stringify({
          name: objName.trim(),
          description: objDescription.trim() || undefined,
          axisId: selectedAxisId,
        }),
      });

      showNotification('success', 'Objetivo estratégico guardado con éxito.');
      setObjName('');
      setObjDescription('');
      setSelectedAxisId('');
      setOpenForm(null);
      setActiveTab('objectives');
      await fetchData();
    } catch (err: unknown) {
      showNotification(
        'error',
        err instanceof Error ? err.message : 'Error al guardar el objetivo en la base de datos.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all';
  const labelClass = 'block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />

      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {statusMessage && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold shadow-sm transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              {statusMessage.text}
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Planeación Estratégica
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              Ejes y Objetivos Institucionales
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Selecciona qué elemento deseas registrar para desplegar su formulario.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setOpenForm(openForm === 'axis' ? null : 'axis')}
              className={`p-6 rounded-2xl border transition-all cursor-pointer bg-white flex items-center justify-between group shadow-sm ${
                openForm === 'axis'
                  ? 'border-blue-600 ring-2 ring-blue-500/10'
                  : 'border-slate-200 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Registrar Eje</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Define los ejes rectores de desarrollo</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Plus className="h-4 w-4" />
              </div>
            </div>

            <div
              onClick={() => setOpenForm(openForm === 'objective' ? null : 'objective')}
              className={`p-6 rounded-2xl border transition-all cursor-pointer bg-white flex items-center justify-between group shadow-sm ${
                openForm === 'objective'
                  ? 'border-blue-600 ring-2 ring-blue-500/10'
                  : 'border-slate-200 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Registrar Objetivo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Asocia metas estratégicas a un eje</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <Plus className="h-4 w-4" />
              </div>
            </div>
          </div>

          {openForm === 'axis' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Formulario: Nuevo Eje</h2>
                    <p className="text-xs text-slate-500">Se guardará en la base de datos vía NestJS</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenForm(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddAxis} className="space-y-4">
                <div>
                  <label className={labelClass}>Nombre del Eje *</label>
                  <input
                    type="text"
                    value={axisName}
                    onChange={(e) => setAxisName(e.target.value)}
                    placeholder="Ej. Eje 1: Formación Integral y Calidad Académica"
                    className={inputClass}
                    required
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className={labelClass}>Descripción</label>
                  <textarea
                    value={axisDescription}
                    onChange={(e) => setAxisDescription(e.target.value)}
                    placeholder="Describe el alcance y lineamiento general de este eje..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                    disabled={submitting}
                  />
                </div>

                <div className="flex justify-end items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setOpenForm(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#5b141b] hover:bg-[#481015] text-white rounded-xl shadow-sm px-6 py-2.5 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar Eje
                  </button>
                </div>
              </form>
            </div>
          )}

          {openForm === 'objective' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <Target className="h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">Formulario: Nuevo Objetivo Estratégico</h2>
                    <p className="text-xs text-slate-500">Se vinculará al eje rector seleccionado</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenForm(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddObjective} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Eje Institucional *</label>
                    <select
                      value={selectedAxisId}
                      onChange={(e) => setSelectedAxisId(e.target.value)}
                      className={`${inputClass} cursor-pointer`}
                      required
                      disabled={submitting}
                    >
                      <option value="">- Seleccione el eje rector -</option>
                      {axes.map((ax) => (
                        <option key={ax.axisId} value={ax.axisId}>
                          {ax.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Nombre del Objetivo *</label>
                    <input
                      type="text"
                      value={objName}
                      onChange={(e) => setObjName(e.target.value)}
                      placeholder="Ej. Objetivo 1.1: Innovación Docente"
                      className={inputClass}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Descripción Detallada</label>
                  <textarea
                    value={objDescription}
                    onChange={(e) => setObjDescription(e.target.value)}
                    placeholder="Describe las metas asociadas a este objetivo..."
                    rows={3}
                    className={`${inputClass} resize-none`}
                    disabled={submitting}
                  />
                </div>

                <div className="flex justify-end items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setOpenForm(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#5b141b] hover:bg-[#481015] text-white rounded-xl shadow-sm px-6 py-2.5 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar Objetivo
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Catálogo Institucional en Base de Datos
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('axis')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'axis'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ejes ({axes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('objectives')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'objectives'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Objetivos ({objectives.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-xs font-medium">Consultando registros en base de datos...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeTab === 'axis' && (
                  axes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">
                      No hay ejes registrados en la base de datos.
                    </div>
                  ) : (
                    axes.map((ax) => (
                      <div key={ax.axisId} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900">{ax.name}</h4>
                          <p className="text-xs text-slate-500">{ax.description || 'Sin descripción adicional.'}</p>
                        </div>
                      </div>
                    ))
                  )
                )}

                {activeTab === 'objectives' && (
                  objectives.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">
                      No hay objetivos registrados en la base de datos.
                    </div>
                  ) : (
                    objectives.map((obj) => (
                      <div key={obj.objectiveId} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1">
                          {obj.axisName && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200/60 inline-block mb-1">
                              {obj.axisName}
                            </span>
                          )}
                          <h4 className="text-sm font-bold text-slate-900">{obj.name}</h4>
                          <p className="text-xs text-slate-500">{obj.description || 'Sin descripción adicional.'}</p>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}