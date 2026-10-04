# Cambios de rol y sesiones

La tabla de usuarios incluye todos los roles persistidos. El formulario Cambiar rol de usuario usa PUT /users/:userId/roles/:roleId: reemplaza los roles anteriores por el seleccionado dentro de una transacción. Repetir el mismo cambio no duplica asignaciones. POST conserva su significado de agregar un rol para clientes existentes.

El reemplazo solo está permitido a superusuarios y no permite modificar los propios roles, para evitar perder acceso administrativo por error. El usuario que realiza el cambio puede pedir a otro superusuario que ajuste su cuenta.

El backend verifica la firma del JWT y consulta por ID la cuenta activa y sus roles actuales en cada petición protegida. Los privilegios revocados dejan de funcionar con tokens anteriores. Auth.js actualiza los roles mediante /auth/me y las pantallas se sincronizan al recuperar foco y cada 30 segundos.

Los datos anteriores no se deduplican automáticamente: tener varios roles es válido y no permite inferir cuál debe conservarse. Para corregir asignaciones acumuladas, seleccionar cada usuario y guardar el rol final acordado.

Pruebas: intercambio entre SUPERUSUARIO y JEFE DE DEPARTAMENTO con tokens anteriores, roles en el listado, reemplazo idempotente, rollback ante fallo, rol inexistente, protección de la propia cuenta y revocación tras eliminar una cuenta.

La sección Roles asignados permite quitar individualmente una asociación con DELETE /users/:userId/roles/:roleId. Conserva los demás roles y el catálogo. La operación es idempotente (204), requiere SUPERUSUARIO y bloquea quitarse el propio rol SUPERUSUARIO; sí permite quitar otros roles propios. Una cuenta sin roles sigue pudiendo iniciar sesión.
