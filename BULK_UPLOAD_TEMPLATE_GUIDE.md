# Guía de Carga Masiva de Empleados

## Descripción
Esta funcionalidad permite a las empresas asociar múltiples empleados de una vez usando un archivo Excel. Los usuarios deben estar previamente registrados en la plataforma.

## Campos de la Plantilla

### Campos Obligatorios (Deben estar llenos)
- **email**: Correo electrónico del usuario registrado en la plataforma

### Campos Opcionales
- **position**: Cargo en la empresa
- **department**: Departamento de la empresa
- **startDate**: Fecha de inicio de empleo (YYYY-MM-DD)

## Ejemplo de Datos

| email | position | department | startDate |
|-------|----------|------------|-----------|
| juan.perez@ejemplo.com | Desarrollador Senior | Tecnología | 2024-01-01 |
| maria.garcia@ejemplo.com | Diseñadora UI/UX | Diseño | 2024-02-01 |

## Proceso de Carga

1. **Descargar Plantilla**: Usar el botón "Descargar Plantilla" en la página de "Mis Empleados"
2. **Llenar Datos**: Completar la plantilla con los emails de usuarios registrados
3. **Validar**: Asegurarse de que todos los emails estén registrados en la plataforma
4. **Subir Archivo**: Arrastrar y soltar el archivo Excel en la zona de carga
5. **Revisar Resultados**: El sistema mostrará un resumen de empleados asociados y errores

## Validaciones del Sistema

### Validaciones de Existencia
- **Email**: Debe corresponder a un usuario registrado en la plataforma
- **Usuario no asociado**: El usuario no debe estar ya asociado a otra empresa

### Validaciones de Formato
- **Email**: Debe tener formato de email válido
- **Fecha de inicio**: Debe estar en formato YYYY-MM-DD (opcional)

### Validaciones de Contenido
- **Email obligatorio**: No puede estar vacío
- **Usuario único**: No puede estar asociado a otra empresa

## Flujo de Asociación

1. **Buscar Usuario**: Se busca el usuario por email en la plataforma
2. **Verificar Disponibilidad**: Se verifica que no esté asociado a otra empresa
3. **Asociar Empresa**: Se asocia el usuario a la empresa
4. **Crear Historial**: Se registra en el historial de la empresa
5. **Confirmar**: Se confirma la asociación exitosa

## Manejo de Errores

El sistema maneja los siguientes tipos de errores:

- **Usuarios No Encontrados**: Muestra qué emails no están registrados en la plataforma
- **Usuarios Ya Asociados**: Identifica usuarios que ya están asociados a otra empresa
- **Formato Inválido**: Indica problemas con formato de email o fechas
- **Errores de Sistema**: Problemas de conexión o base de datos

## Resultados de la Carga

Después de procesar el archivo, el sistema devuelve:

- **Total Procesados**: Número total de filas en el archivo
- **Exitosos**: Número de empleados asociados correctamente
- **Fallidos**: Número de empleados que no se pudieron asociar
- **Errores**: Lista detallada de errores por fila
- **Empleados Asociados**: Lista de empleados asociados exitosamente

## Notas Importantes

1. **Usuarios Registrados**: Los usuarios deben estar previamente registrados en la plataforma
2. **Verificación de Email**: Los usuarios deben tener su email verificado
3. **Asociación Única**: Un usuario solo puede estar asociado a una empresa
4. **Empresa**: Se asocian automáticamente a la empresa que sube el archivo
5. **Historial**: Se crea un registro en el historial de empleados de la empresa

## Limitaciones

- **Tamaño de Archivo**: Máximo 10MB
- **Formato**: Solo archivos Excel (.xlsx)
- **Filas**: Máximo 1000 empleados por carga
- **Campos**: No se pueden agregar campos personalizados

## Soporte

Para problemas con la carga masiva:
1. Verificar que el archivo tenga el formato correcto
2. Revisar que todos los campos obligatorios estén completos
3. Asegurarse de que emails y cédulas sean únicos
4. Contactar soporte técnico si persisten los problemas 