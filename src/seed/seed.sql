-- Limpiar tablas existentes (en orden inverso a las relaciones)
DELETE FROM attendance;
DELETE FROM messages;
DELETE FROM comment;
DELETE FROM applications;
DELETE FROM publication;
DELETE FROM roles_users_users;
DELETE FROM users;
DELETE FROM company;
DELETE FROM roles;
DELETE FROM permissions;

-- Crear tablas si no existen
CREATE TABLE IF NOT EXISTS education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    fieldOfStudy TEXT,
    startDate DATE NOT NULL,
    endDate DATE,
    description TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reference (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    contact TEXT NOT NULL,
    comment TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS social_link (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Insertar permisos
INSERT INTO permissions (id, name, description)
VALUES 
    (1, 'CREATE_USER', 'Crear usuarios'),
    (2, 'READ_USER', 'Ver usuarios'),
    (3, 'UPDATE_USER', 'Actualizar usuarios'),
    (4, 'DELETE_USER', 'Eliminar usuarios'),
    (5, 'CREATE_COMPANY', 'Crear empresas'),
    (6, 'READ_COMPANY', 'Ver empresas'),
    (7, 'UPDATE_COMPANY', 'Actualizar empresas'),
    (8, 'DELETE_COMPANY', 'Eliminar empresas'),
    (9, 'MANAGE_ATTENDANCE', 'Gestionar asistencia'),
    (10, 'VIEW_ATTENDANCE', 'Ver asistencia'),
    (11, 'CREATE_PUBLICATION', 'Crear publicaciones'),
    (12, 'READ_PUBLICATION', 'Ver publicaciones'),
    (13, 'UPDATE_PUBLICATION', 'Actualizar publicaciones'),
    (14, 'DELETE_PUBLICATION', 'Eliminar publicaciones');

-- Insertar roles
INSERT INTO roles (id, name, description)
VALUES 
    (1, 'ADMIN', 'Administrador del sistema'),
    (2, 'BUSINESS', 'Usuario de negocio'),
    (3, 'PERSON', 'Persona natural');

-- Asignar permisos a roles (usando los nombres correctos de columnas)
INSERT INTO role_permission ("rolesId", "permissionsId")
VALUES 
    -- Admin tiene todos los permisos
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12), (1, 13), (1, 14),
    -- Business tiene permisos de gestión de su empresa
    (2, 2), (2, 6), (2, 9), (2, 10), (2, 11), (2, 12),
    -- Person tiene permisos básicos
    (3, 2), (3, 6), (3, 10), (3, 12);

-- Insertar empresas
INSERT INTO company (id, nit, name, born_at, created_at, email, cellphone, address, city, country, latitude, longitude)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '900123456-7', 'Tech Solutions S.A.', '2020-01-01', CURRENT_TIMESTAMP, 'contact@techsolutions.com', '6012345678', 'Calle 123 #45-67', 'Bogotá', 'Colombia', 4.6097, -74.0817),
    ('550e8400-e29b-41d4-a716-446655440001', '900987654-3', 'Digital Innovations', '2019-06-15', CURRENT_TIMESTAMP, 'info@digitalinnovations.com', '6023456789', 'Carrera 78 #90-12', 'Medellín', 'Colombia', 6.2442, -75.5812),
    ('550e8400-e29b-41d4-a716-446655440002', '900456789-0', 'Innovate Corp', '2021-03-01', CURRENT_TIMESTAMP, 'contact@innovatecorp.com', '6034567890', 'Avenida 5 #23-45', 'Cali', 'Colombia', 3.4516, -76.5320);

-- Insertar usuarios (administradores, empresas y personas)
INSERT INTO users (id, name, password, email, genre, cellphone, born_at, created_at, profession, skills, "employmentStartDate")
VALUES 
    -- Administradores
    (1, 'Admin Tech', '$2b$10$YourHashedPasswordHere', 'admin@techsolutions.com', 'M', '6012345678', '1985-01-15', CURRENT_TIMESTAMP, 'CEO', ARRAY['Leadership', 'Management'], '2020-01-01'),
    (2, 'Admin Digital', '$2b$10$YourHashedPasswordHere', 'admin@digitalinnovations.com', 'F', '6023456789', '1988-05-20', CURRENT_TIMESTAMP, 'CEO', ARRAY['Leadership', 'Management'], '2019-06-15'),
    (3, 'Admin Innovate', '$2b$10$YourHashedPasswordHere', 'admin@innovatecorp.com', 'M', '6034567890', '1987-11-30', CURRENT_TIMESTAMP, 'CEO', ARRAY['Leadership', 'Management'], '2021-03-01'),
    
    -- Personas naturales (trabajadores informales)
    (4, 'Juan Pérez', '$2b$10$YourHashedPasswordHere', 'juan.perez@email.com', 'M', '6045678901', '1990-03-10', CURRENT_TIMESTAMP, 'Plomero', ARRAY['Plomería', 'Reparaciones'], NULL),
    (5, 'María López', '$2b$10$YourHashedPasswordHere', 'maria.lopez@email.com', 'F', '6056789012', '1992-07-25', CURRENT_TIMESTAMP, 'Diseñadora', ARRAY['UI/UX', 'Figma', 'Photoshop'], NULL),
    (6, 'Carlos Ruiz', '$2b$10$YourHashedPasswordHere', 'carlos.ruiz@email.com', 'M', '6067890123', '1991-11-30', CURRENT_TIMESTAMP, 'Desarrollador', ARRAY['JavaScript', 'React', 'Node.js'], NULL),
    (7, 'Ana Martínez', '$2b$10$YourHashedPasswordHere', 'ana.martinez@email.com', 'F', '6078901234', '1993-09-05', CURRENT_TIMESTAMP, 'Cocinera', ARRAY['Cocina', 'Repostería'], NULL),
    (8, 'Pedro Gómez', '$2b$10$YourHashedPasswordHere', 'pedro.gomez@email.com', 'M', '6089012345', '1994-04-20', CURRENT_TIMESTAMP, 'Electricista', ARRAY['Electricidad', 'Instalaciones'], NULL),
    (9, 'Laura Torres', '$2b$10$YourHashedPasswordHere', 'laura.torres@email.com', 'F', '6090123456', '1995-12-15', CURRENT_TIMESTAMP, 'Limpiadora', ARRAY['Limpieza', 'Organización'], NULL);

-- Asignar roles a usuarios
INSERT INTO roles_users_users (user_id, role_id)
VALUES 
    -- Administradores
    (1, 1), (1, 2), -- Admin Tech es ADMIN y BUSINESS
    (2, 1), (2, 2), -- Admin Digital es ADMIN y BUSINESS
    (3, 1), (3, 2), -- Admin Innovate es ADMIN y BUSINESS
    
    -- Personas naturales
    (4, 3), -- Juan es PERSON
    (5, 3), -- María es PERSON
    (6, 3), -- Carlos es PERSON
    (7, 3), -- Ana es PERSON
    (8, 3), -- Pedro es PERSON
    (9, 3); -- Laura es PERSON

-- Asignar administradores a empresas (User tiene companyId, no Company tiene userId)
UPDATE users SET "companyId" = '550e8400-e29b-41d4-a716-446655440000' WHERE id = 1; -- Tech Solutions
UPDATE users SET "companyId" = '550e8400-e29b-41d4-a716-446655440001' WHERE id = 2; -- Digital Innovations
UPDATE users SET "companyId" = '550e8400-e29b-41d4-a716-446655440002' WHERE id = 3; -- Innovate Corp

-- Insertar publicaciones con precio (servicios de trabajadores informales)
INSERT INTO publication (id, title, description, category, created_at, modified_at, "userId", price, "priceUnit", image_url, visitors)
VALUES 
    -- Servicios de plomería
    ('550e8400-e29b-41d4-a716-446655440010', 'Servicio de Plomería Profesional', 'Ofrezco servicios de plomería para hogares y oficinas. Reparaciones, instalaciones y mantenimiento. Trabajo con garantía y materiales de calidad.', 'Servicios', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 4, 50000, 'hour', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400', 15),
    
    -- Servicios de diseño
    ('550e8400-e29b-41d4-a716-446655440011', 'Diseño Web y UI/UX', 'Diseñadora creativa especializada en interfaces web y móviles. Creo diseños modernos, funcionales y atractivos para tu negocio.', 'Tecnología', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 5, 80000, 'project', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400', 23),
    
    -- Servicios de desarrollo
    ('550e8400-e29b-41d4-a716-446655440012', 'Desarrollo Web Full Stack', 'Desarrollador con 5 años de experiencia en React, Node.js y bases de datos. Creo aplicaciones web completas y escalables.', 'Tecnología', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 6, 120000, 'project', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400', 31),
    
    -- Servicios de cocina
    ('550e8400-e29b-41d4-a716-446655440013', 'Catering y Eventos Especiales', 'Cocinera profesional para eventos, fiestas y celebraciones. Menús personalizados, pastelería artesanal y servicio de calidad.', 'Gastronomía', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 7, 150000, 'event', 'https://images.unsplash.com/photo-1556909114-fcd25c85cd64?w=400', 18),
    
    -- Servicios de electricidad
    ('550e8400-e29b-41d4-a716-446655440014', 'Instalaciones Eléctricas', 'Electricista certificado para instalaciones residenciales y comerciales. Reparaciones, mantenimiento y nuevas instalaciones con garantía.', 'Servicios', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 8, 60000, 'hour', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400', 12),
    
    -- Servicios de limpieza
    ('550e8400-e29b-41d4-a716-446655440015', 'Limpieza Profesional', 'Servicio de limpieza para hogares, oficinas y locales comerciales. Limpieza profunda, mantenimiento y organización.', 'Servicios', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 9, 35000, 'hour', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 8),
    
    -- Publicación sin precio (para negociación)
    ('550e8400-e29b-41d4-a716-446655440016', 'Tutoría de Matemáticas', 'Profesor particular de matemáticas para estudiantes de primaria y secundaria. Métodos didácticos y resultados garantizados.', 'Educación', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 4, NULL, NULL, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400', 5);

-- Insertar comentarios (la tabla comment no tiene user_id, solo publicationId)
INSERT INTO comment (id, description, created_at, "publicationId")
VALUES 
    ('550e8400-e29b-41d4-a716-446655440020', 'Excelente trabajo, muy profesional', CURRENT_TIMESTAMP, '550e8400-e29b-41d4-a716-446655440010'),
    ('550e8400-e29b-41d4-a716-446655440021', 'Los diseños quedaron perfectos', CURRENT_TIMESTAMP, '550e8400-e29b-41d4-a716-446655440011'),
    ('550e8400-e29b-41d4-a716-446655440022', 'Muy buena comunicación y resultados', CURRENT_TIMESTAMP, '550e8400-e29b-41d4-a716-446655440012'),
    ('550e8400-e29b-41d4-a716-446655440023', 'La comida estaba deliciosa', CURRENT_TIMESTAMP, '550e8400-e29b-41d4-a716-446655440013'),
    ('550e8400-e29b-41d4-a716-446655440024', 'Trabajo rápido y eficiente', CURRENT_TIMESTAMP, '550e8400-e29b-41d4-a716-446655440014');

-- Insertar mensajes (usando los nombres correctos de columnas)
INSERT INTO messages (id, content, sent_at, "senderId", "recipientId")
VALUES 
    ('550e8400-e29b-41d4-a716-446655440030', 'Hola, me interesa tu servicio de plomería', CURRENT_TIMESTAMP, 5, 4),
    ('550e8400-e29b-41d4-a716-446655440031', 'Gracias por tu interés, ¿cuándo necesitas el servicio?', CURRENT_TIMESTAMP, 4, 5),
    ('550e8400-e29b-41d4-a716-446655440032', '¿Podemos agendar para el próximo lunes?', CURRENT_TIMESTAMP, 5, 4);

-- Insertar registros de asistencia (últimos 30 días)
INSERT INTO attendance (id, date, "checkInTime", "isLate", "isAbsent", notes, "createdAt", "updatedAt", "employeeId")
VALUES
    ('550e8400-e29b-41d4-a716-446655440100', CURRENT_DATE - INTERVAL '1 day', '08:00', false, false, 'Asistencia normal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 4),
    ('550e8400-e29b-41d4-a716-446655440101', CURRENT_DATE - INTERVAL '2 day', '08:05', true, false, 'Llegó tarde', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 5),
    ('550e8400-e29b-41d4-a716-446655440102', CURRENT_DATE - INTERVAL '3 day', '08:00', false, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 6),
    ('550e8400-e29b-41d4-a716-446655440103', CURRENT_DATE - INTERVAL '4 day', '08:00', false, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 7),
    ('550e8400-e29b-41d4-a716-446655440104', CURRENT_DATE - INTERVAL '5 day', '08:00', false, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 8),
    ('550e8400-e29b-41d4-a716-446655440105', CURRENT_DATE - INTERVAL '6 day', '08:00', false, false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 9); 