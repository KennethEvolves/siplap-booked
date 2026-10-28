'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function NewActivityPage() {
  const router = useRouter();

  // Estados visuales del formulario
  const [eje, setEje] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [noActividad, setNoActividad] = useState('');

  const [nombreActividad, setNombreActividad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [tipoUbicacion, setTipoUbicacion] = useState('');
  const [colaboradores, setColaboradores] = useState('');

  const [recursosFinancieros, setRecursosFinancieros] = useState('');
  const [monto, setMonto] = useState('0.00');
  const [observaciones, setObservaciones] = useState('');
  const [constancias, setConstancias] = useState('');
  const [requiereAutoridades, setRequiereAutoridades] = useState<'si' | 'no'>('no');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Guardado de interfaz antes de conectar los endpoints finales
    router.push('/activities');
  };

  const fieldStyle =
    'w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all';
  const labelStyle = 'block text-xs font-bold text-slate-900 mb-1.5';
  const sectionTitleStyle = 'text-xs font-bold tracking-wider text-slate-500 uppercase mb-4';

  return (
    <div className="flex min-h-screen bg-slate-100/70 text-slate-800">
      {/* 1. Reutilizamos tu Sidebar existente */}
      <Sidebar />

      {/* 2. Contenido principal a pantalla completa */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Reutilizamos tu Card existente para englobar el formulario */}
          <Card className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 sm:p-12">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-8">
              Agregar Actividad Extraordinaria
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* 1. ALCANCE DE LA ACTIVIDAD */}
              <div>
                <h2 className={sectionTitleStyle}>1. Alcance de la actividad</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelStyle}>Eje:</label>
                    <select
                      value={eje}
                      onChange={(e) => setEje(e.target.value)}
                      className={`${fieldStyle} text-slate-600 cursor-pointer`}
                    >
                      <option value="">- Seleccione el eje -</option>
                      <option value="eje1">Eje 1: Formación Integral y Calidad Académica</option>
                      <option value="eje2">Eje 2: Vinculación e Impacto Comunitario</option>
                      <option value="eje3">Eje 3: Gestión y Gobierno Institucional</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelStyle}>Objetivo:</label>
                    <select
                      value={objetivo}
                      onChange={(e) => setObjetivo(e.target.value)}
                      className={`${fieldStyle} text-slate-600 cursor-pointer`}
                    >
                      <option value="">- Seleccione el objetivo -</option>
                      <option value="obj1">Objetivo 1: Fortalecimiento curricular</option>
                      <option value="obj2">Objetivo 2: Actualización docente</option>
                    </select>
                  </div>

                  <div className="max-w-xs">
                    <label className={labelStyle}>No. de Actividad:</label>
                    <input
                      type="text"
                      value={noActividad}
                      onChange={(e) => setNoActividad(e.target.value)}
                      className={fieldStyle}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* 2. DATOS GENERALES */}
              <div>
                <h2 className={sectionTitleStyle}>2. Datos generales</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelStyle}>Nombre de la actividad:</label>
                    <input
                      type="text"
                      value={nombreActividad}
                      onChange={(e) => setNombreActividad(e.target.value)}
                      className={fieldStyle}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>Descripción detallada:</label>
                    <textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      rows={3}
                      className={`${fieldStyle} resize-y`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelStyle}>Fecha de inicio:</label>
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className={fieldStyle}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>Fecha de finalización:</label>
                      <input
                        type="date"
                        value={fechaFin}
                        min={fechaInicio}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className={fieldStyle}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelStyle}>Hora de inicio:</label>
                      <input
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        className={fieldStyle}
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>Hora de finalización:</label>
                      <input
                        type="time"
                        value={horaFin}
                        onChange={(e) => setHoraFin(e.target.value)}
                        className={fieldStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelStyle}>Tipo de ubicación:</label>
                    <select
                      value={tipoUbicacion}
                      onChange={(e) => setTipoUbicacion(e.target.value)}
                      className={`${fieldStyle} text-slate-600 cursor-pointer`}
                    >
                      <option value="">- Seleccione el tipo de lugar -</option>
                      <option value="interno">Espacio de la Universidad</option>
                      <option value="externo">Lugar externo</option>
                      <option value="mixto">Mixto</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelStyle}>Colaboradores involucrados:</label>
                    <textarea
                      value={colaboradores}
                      onChange={(e) => setColaboradores(e.target.value)}
                      rows={3}
                      className={`${fieldStyle} resize-y`}
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* 3. REQUERIMIENTOS */}
              <div>
                <h2 className={sectionTitleStyle}>3. Requerimientos</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelStyle}>Recursos financieros:</label>
                    <textarea
                      value={recursosFinancieros}
                      onChange={(e) => setRecursosFinancieros(e.target.value)}
                      placeholder="Especificar cantidad: gasolina, viáticos, vehículos"
                      rows={3}
                      className={`${fieldStyle} resize-y`}
                    />
                  </div>

                  <div className="max-w-xs">
                    <label className={labelStyle}>Monto:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      className={fieldStyle}
                    />
                    <p className="text-xs font-bold text-blue-600 mt-1">
                      $ {parseFloat(monto || '0').toFixed(2)} MXN
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* 4. OBSERVACIONES */}
              <div>
                <h2 className={sectionTitleStyle}>4. Observaciones</h2>
                <div>
                  <label className={labelStyle}>Observaciones generales:</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                    className={`${fieldStyle} resize-y`}
                  />
                </div>
              </div>

              <hr className="border-slate-200" />

              {/* 5. DATOS ADICIONALES */}
              <div>
                <h2 className={sectionTitleStyle}>5. Datos adicionales</h2>
                <div className="space-y-4">
                  <div>
                    <label className={labelStyle}>¿Requiere constancias?:</label>
                    <textarea
                      value={constancias}
                      onChange={(e) => setConstancias(e.target.value)}
                      placeholder="Describa datos específicos de las constancias"
                      rows={2}
                      className={`${fieldStyle} resize-y`}
                    />
                  </div>

                  <div>
                    <label className={labelStyle}>¿Requiere presencia de autoridades?:</label>
                    <div className="flex flex-col gap-2 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input
                          type="radio"
                          name="autoridades"
                          value="si"
                          checked={requiereAutoridades === 'si'}
                          onChange={() => setRequiereAutoridades('si')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        Sí
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                        <input
                          type="radio"
                          name="autoridades"
                          value="no"
                          checked={requiereAutoridades === 'no'}
                          onChange={() => setRequiereAutoridades('no')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        No
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. BOTONES REUTILIZANDO <Button> DE SHADCN */}
              <div className="flex justify-end items-center gap-3 pt-4">
                <Button
                  type="submit"
                  className="bg-[#5b141b] hover:bg-[#481015] text-white px-6 py-2.5 rounded-lg shadow-sm"
                >
                  Guardar Actividad
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/activities')}
                  className="bg-[#5b6470] hover:bg-[#4a525d] text-white border-none px-6 py-2.5 rounded-lg shadow-sm"
                >
                  Cancelar
                </Button>
              </div>

            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}