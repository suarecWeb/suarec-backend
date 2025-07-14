# Variables de Entorno

## Configuración de Base de Datos
```
DATABASE_URL=postgresql://username:password@localhost:5432/suarec_db
```

## Configuración JWT
```
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h
```

## Configuración de Email
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## URLs de la Aplicación
```
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

## Configuración de Wompi
```
WOMPI_PUBLIC_KEY=your-wompi-public-key
WOMPI_PRIVATE_KEY=your-wompi-private-key
WOMPI_ENVIRONMENT=test
```

## Configuración de Desarrollo/Testing
```
# Para mockear pagos exitosos (solo para desarrollo)
MOCK_PAYMENT_SUCCESS=false
```

## Configuración de Supabase (si se usa)
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Uso de MOCK_PAYMENT_SUCCESS

Para habilitar el modo mock de pagos exitosos:

1. Establece `MOCK_PAYMENT_SUCCESS=true` en tu archivo `.env`
2. Esto hará que todos los pagos Wompi se marquen automáticamente como exitosos
3. El sistema de rating se habilitará inmediatamente después de crear un pago
4. **IMPORTANTE**: Solo usar en desarrollo/testing, nunca en producción 