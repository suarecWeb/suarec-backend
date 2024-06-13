## **Informe del Proyecto StayNest**

### **Integrantes del Equipo**
- Sara Cardona
- Dylan Bermudez
- Juan José López

### **Introducción**
StayNest es una plataforma de gestión de alojamientos diseñada para permitir a los usuarios registrarse, publicar y reservar propiedades para estancias temporales. El BackEnd, desarrollado con NestJS y TypeScript, integra autenticación, autorización y persistencia de datos con PostgreSQL, asegurando una experiencia de usuario segura y eficiente.

### **App deployed**

https://staynest.icybeach-62331649.eastus.azurecontainerapps.io

### Installation

```bash
$ npm install
```

### **Running the app**

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### **Módulos y Funcionalidades**
El sistema se compone de varios módulos clave:

#### **Autenticación (Auth)**
- Implementación de autenticación con JWT.
- Rutas protegidas que requieren autenticación.

#### **Autorización (User)**
- Roles de usuario definidos como OWNER y USER.
- Permiso basado en roles para acceder a rutas específicas.

Posee los siguientes endpoints. Path base /user:

| GET | GET (:id) | POST /register | PATCH (:id) | DELETE (:id) |
|---|-------------|------|-------------|--------|
| Todos los usuarios registrados  | Usuario con ID :id | Registra usuario | Modifica usuario con ID :id | Elimina usuario con ID :id |    


#### **Propiedades (Property)**
- Manejo de CRUD para propiedades disponibles para alojamiento.
- Rutas protegidas que requieren roles específicos para operaciones CRUD.

Posee los siguientes endpoints. Path base /property:

| GET | GET (:id) | POST | PATCH (:id) | DELETE (:id) |
|---|-------------|------|-------------|--------|
| Todas las propiedades  | Propiedad con ID :id | Registra propiedad | Modifica propiedad con ID :id | Elimina propiedad con ID :id |   

#### **Reservas (Booking)**
- Creación, actualización y eliminación de reservas bajo autenticación y autorización.

Posee los siguientes endpoints. Path base /booking:

| GET | GET (:id) | POST | PATCH (:id) | DELETE (:id) |
|---|-------------|------|-------------|--------|
| Todas las reservas  | Reserva con ID :id | Registra reserva | Modifica reserva con ID :id | Elimina reserva con ID :id |  

#### **Reportes (Report)**
- Generación y manejo de reportes para resumir información importante.

Posee los siguientes endpoints. Path base /report:

| GET /occupancy | GET /financial | GET /revenue-by-city | GET /user-activity |
|---|------------|-------------|--------|
| Ocupación de todas las propiedades  | Financiación de propiedades y sus reservas | Dinero obtenido por ciudad | Reservas por usuario |


  
## **Test**

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```


### **Pruebas**
Se emplearon pruebas end-to-end con las siguientes consideraciones:
- Pruebas escritas en TypeScript con Jest y Supertest.
- Validación de flujos de usuario para registro, autenticación y operaciones CRUD.
- Generación de UUIDs para simular datos reales en las pruebas.
- Las pruebas cubren al menos el 80% del código fuente.

### **Persistencia de Datos**
Se utiliza TypeORM para la interacción con PostgreSQL, proporcionando un manejo eficiente de la persistencia de datos.

### **Despliegue**
La aplicación se despliega en un servicio en la nube con pipelines configurados para pruebas y despliegue automatizado.

### **Datos de Prueba Iniciales (Seed)**
Se han preparado datos iniciales de usuarios y reservas para poblar la base de datos y facilitar las pruebas. Los usuarios incluyen roles como OWNER, ADMIN y USER con credenciales específicas. Las reservas contienen información como fechas de check-in/check-out, tipo de propiedad, método de pago y confirmación de pago.