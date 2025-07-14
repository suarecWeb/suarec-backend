# Sistema de Rating - Testing con Pagos Mockeados

## Configuración del Modo Mock

Para probar el sistema de rating sin realizar pagos reales, hemos implementado un modo mock que simula pagos exitosos.

### 1. Habilitar Modo Mock

```bash
# Opción 1: Usar el script npm
npm run mock-payment

# Opción 2: Editar manualmente el archivo .env
# Agregar o cambiar: MOCK_PAYMENT_SUCCESS=true
```

### 2. Verificar Configuración

Asegúrate de que tu archivo `.env` contenga:
```
MOCK_PAYMENT_SUCCESS=true
```

### 3. Reiniciar el Servidor

```bash
npm run start:dev
```

## Flujo de Testing

### Paso 1: Crear un Contrato
1. Ve a la página de publicaciones
2. Crea una nueva publicación
3. Aplica a la publicación desde otra cuenta
4. Acepta la aplicación para crear el contrato

### Paso 2: Realizar Pago (Mockeado)
1. Ve a la página de pagos
2. Crea un nuevo pago con método Wompi
3. **Con el modo mock activado, el pago se marcará automáticamente como exitoso**
4. Verás en los logs del servidor: `🎭 MODO MOCK ACTIVADO - Marcando pago como completado automáticamente`

### Paso 3: Probar el Sistema de Rating
1. Ve a la página "Calificaciones" en el navbar
2. Deberías ver el contrato listado como disponible para calificar
3. Haz clic en "Calificar"
4. Completa el formulario de rating (1-5 estrellas + comentario)
5. Envía la calificación

### Paso 4: Verificar Rating
1. Ve al perfil del usuario calificado
2. Deberías ver la calificación en su perfil
3. Verifica que el promedio de calificaciones se actualice

## Logs del Servidor

Cuando el modo mock está activado, verás estos logs:

```
🎭 MODO MOCK ACTIVADO - Marcando pago como completado automáticamente
✅ Pago mockeado como exitoso - Rating habilitado
⭐ Habilitando calificación después del pago exitoso
Payer ID: 1
Payee ID: 2
Contract ID: abc-123
✅ Calificación habilitada para ambos usuarios
```

## Deshabilitar Modo Mock

Para volver al comportamiento normal:

```bash
npm run mock-payment
```

O editar manualmente:
```
MOCK_PAYMENT_SUCCESS=false
```

## Endpoints de Rating

### Obtener Contratos para Calificar
```
GET /api/rating/contracts-ready
```

### Crear Rating
```
POST /api/rating
{
  "contractId": "contract-id",
  "ratedUserId": 2,
  "rating": 5,
  "comment": "Excelente trabajo"
}
```

### Obtener Ratings de Usuario
```
GET /api/rating/user/{userId}
```

## Notas Importantes

- **Solo usar en desarrollo/testing**
- El modo mock afecta solo a pagos Wompi
- Los pagos se marcan como `COMPLETED` automáticamente
- El sistema de rating se habilita inmediatamente después del pago mockeado
- Para producción, siempre usar `MOCK_PAYMENT_SUCCESS=false` 