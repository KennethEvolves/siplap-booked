"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Department,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/lib/api";
import {
  Building2,
  Plus,
  Loader2,
  Check,
  AlertTriangle,
  X,
  Edit,
  Trash2,
} from "lucide-react";

export function DepartmentsManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados del Formulario (Crear / Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Estados del Modal de Eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<Department | null>(null);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      setDepartments(res.departments || []);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  // Abrir modal para CREAR
  const openCreateModal = () => {
    setModalMode("create");
    setSelectedId(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  };

  // Abrir modal para EDITAR
  const openEditModal = (dept: Department) => {
    setModalMode("edit");
    setSelectedId(dept.department_id);
    setName(dept.name);
    setDescription(dept.description || "");
    setIsModalOpen(true);
  };

  // Guardar (Crear o Actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("error", "El nombre es requerido.");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        const res = await createDepartment({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        setDepartments((prev) => [...prev, res.department]);
        showToast("success", "Departamento registrado con éxito.");
      } else if (modalMode === "edit" && selectedId) {
        const res = await updateDepartment(selectedId, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        setDepartments((prev) =>
          prev.map((d) => (d.department_id === selectedId ? res.department : d))
        );
        showToast("success", "Departamento actualizado.");
      }
      setIsModalOpen(false);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar Eliminación
  const handleDeleteConfirm = async () => {
    if (!deptToDelete) return;
    try {
      setSubmitting(true);
      await deleteDepartment(deptToDelete.department_id);
      setDepartments((prev) =>
        prev.filter((d) => d.department_id !== deptToDelete.department_id)
      );
      showToast("success", "Departamento eliminado.");
      setIsDeleteModalOpen(false);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-3 right-3 left-16 sm:left-auto sm:top-6 sm:right-6 z-[70] animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium text-white ${
              toast.type === "success"
                ? "bg-emerald-600 border-emerald-700"
                : "bg-red-600 border-red-700"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            {toast.text}
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Departamentos y Direcciones Institucionales
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Administra las áreas y direcciones de la institución.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="cursor-pointer bg-[#5b141b] hover:bg-[#481015] text-white font-medium shadow-sm active:scale-95 transition-all rounded-xl px-4 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Crear Departamento
        </Button>
      </div>

      {/* Tabla */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Cargando departamentos...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-secondary/70">
              <TableRow>
                <TableHead className="font-bold text-foreground">Nombre</TableHead>
                <TableHead className="font-bold text-foreground">Descripción</TableHead>
                <TableHead className="font-bold text-foreground hidden md:table-cell">ID Institucional</TableHead>
                <TableHead className="font-bold text-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    No hay departamentos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.department_id} className="hover:bg-secondary/50">
                    <TableCell className="font-semibold text-foreground">
                      {dept.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {dept.description || "Sin descripción"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground hidden md:table-cell">
                      {dept.department_id}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(dept)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeptToDelete(dept);
                          setIsDeleteModalOpen(true);
                        }}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {modalMode === "create" ? "Nuevo Departamento" : "Editar Departamento"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Nombre del Área / Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Dirección de Planeación"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Responsabilidades o alcance..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="bg-[#5b141b] hover:bg-[#481015] text-white rounded-xl text-xs font-semibold px-4"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground">¿Eliminar departamento?</h3>
            <p className="text-sm text-muted-foreground">
              Estás a punto de eliminar <strong>{deptToDelete?.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
                className="rounded-xl text-sm font-semibold w-full"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold w-full"
              >
                {submitting ? "Eliminando..." : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}