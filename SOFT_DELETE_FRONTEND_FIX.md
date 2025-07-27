# Fix Frontend para Soft Delete - SUAREC

## Problema Identificado
El frontend no estaba manejando correctamente el soft delete porque las interfaces de TypeScript no incluían el campo `deleted_at`.

## Cambios Realizados

### 1. Interfaces Actualizadas

#### Publication Interface
```typescript
// suarec-frontend/interfaces/publication.interface.ts
export interface Publication {
  // ... campos existentes
  deleted_at?: Date; // ✅ Agregado
}
```

#### Comment Interface
```typescript
// suarec-frontend/interfaces/comment.interface.ts
export interface Comment {
  // ... campos existentes
  deleted_at?: Date; // ✅ Agregado
}
```

#### Contract Interface
```typescript
// suarec-frontend/interfaces/contract.interface.ts
export interface Contract {
  // ... campos existentes
  deleted_at?: Date; // ✅ Agregado
}
```

#### Attendance Interface
```typescript
// suarec-frontend/interfaces/attendance.interface.ts
export interface AttendanceRecord {
  // ... campos existentes
  deleted_at?: Date; // ✅ Agregado
}
```

### 2. Componentes Actualizados

#### PublicationFeedCard
- ✅ Agregados logs de debug para eliminación
- ✅ Manejo mejorado de errores
- ✅ Verificación de autorización mejorada

### 3. Servicios Actualizados

#### PublicationsService
- ✅ Métodos para soft delete implementados
- ✅ Métodos para restaurar publicaciones (admin)
- ✅ Métodos para ver publicaciones eliminadas (admin)

## Instrucciones para Probar

### 1. Verificar que el Backend Funciona

```bash
# Ejecutar en pgAdmin
# Archivo: check-soft-delete-status.sql
```

### 2. Reiniciar el Frontend

```bash
cd suarec-frontend
npm run dev
```

### 3. Probar Eliminación

1. **Crear una publicación**
2. **Intentar eliminarla** (botón de papelera)
3. **Verificar en consola** los logs de debug
4. **Verificar que desaparece** de la lista

### 4. Verificar Logs

En la consola del navegador deberías ver:
```
🔍 Debug eliminación: {
  publicationId: "...",
  currentUserId: 9,
  userRoles: ["ADMIN"],
  canEdit: true
}
🔍 Enviando solicitud de eliminación...
🔍 Publicación eliminada exitosamente
```

### 5. Verificar Base de Datos

```sql
-- Verificar que la publicación tiene deleted_at
SELECT id, title, deleted_at 
FROM publication 
WHERE id = 'TU_PUBLICATION_ID';
```

## Posibles Problemas y Soluciones

### Problema 1: "No se puede eliminar"
**Causa**: Problemas de autorización
**Solución**: Verificar que el usuario es propietario o admin

### Problema 2: "La publicación sigue apareciendo"
**Causa**: El backend no está filtrando por `deleted_at`
**Solución**: Verificar que la migración se aplicó correctamente

### Problema 3: "Error 400/500"
**Causa**: Problemas en el backend
**Solución**: Revisar logs del servidor backend

## Verificación Completa

### Backend
- ✅ Entidades con `deleted_at`
- ✅ Servicios con soft delete
- ✅ Controladores con endpoints
- ✅ Migración aplicada

### Frontend
- ✅ Interfaces actualizadas
- ✅ Servicios actualizados
- ✅ Componentes con debug logs
- ✅ Manejo de errores mejorado

## Próximos Pasos

1. **Probar eliminación** de publicaciones
2. **Probar eliminación** de comentarios
3. **Probar eliminación** de contratos
4. **Implementar UI** para admins ver eliminados
5. **Implementar UI** para restaurar elementos

## Comandos Útiles

```bash
# Verificar estado de la base de datos
psql -d tu_base_de_datos -f check-soft-delete-status.sql

# Probar endpoints
curl -X DELETE http://localhost:3001/suarec/publications/TU_ID \
  -H "Authorization: Bearer TU_TOKEN"

# Ver publicaciones eliminadas (solo admin)
curl -X GET http://localhost:3001/suarec/publications/deleted \
  -H "Authorization: Bearer TU_TOKEN"
``` 