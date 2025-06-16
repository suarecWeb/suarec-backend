-- Limpiar tablas existentes (en orden inverso a las relaciones)
DELETE FROM attendance;
DELETE FROM messages;
DELETE FROM comments;
DELETE FROM applications;
DELETE FROM publications;
DELETE FROM roles_users_users;
DELETE FROM users;
DELETE FROM companies;
DELETE FROM roles;
DELETE FROM permissions;

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
    (3, 'EMPLOYEE', 'Empleado');

-- Asignar permisos a roles
INSERT INTO role_permissions (role_id, permission_id)
VALUES 
    -- Admin tiene todos los permisos
    (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), (1, 11), (1, 12), (1, 13), (1, 14),
    -- Business tiene permisos de gestión de su empresa
    (2, 2), (2, 6), (2, 9), (2, 10), (2, 11), (2, 12),
    -- Employee tiene permisos básicos
    (3, 2), (3, 6), (3, 10), (3, 12);

-- Insertar empresas
INSERT INTO companies (id, nit, name, born_at, created_at, email, cellphone, address, city, country, latitude, longitude)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '900123456-7', 'Tech Solutions S.A.', '2020-01-01', CURRENT_TIMESTAMP, 'contact@techsolutions.com', '6012345678', 'Calle 123 #45-67', 'Bogotá', 'Colombia', 4.6097, -74.0817),
    ('550e8400-e29b-41d4-a716-446655440001', '900987654-3', 'Digital Innovations', '2019-06-15', CURRENT_TIMESTAMP, 'info@digitalinnovations.com', '6023456789', 'Carrera 78 #90-12', 'Medellín', 'Colombia', 6.2442, -75.5812),
    ('550e8400-e29b-41d4-a716-446655440002', '900456789-0', 'Innovate Corp', '2021-03-01', CURRENT_TIMESTAMP, 'contact@innovatecorp.com', '6034567890', 'Avenida 5 #23-45', 'Cali', 'Colombia', 3.4516, -76.5320);

-- Insertar usuarios (administradores, empresas y empleados)
INSERT INTO users (id, name, password, email, genre, cellphone, born_at, created_at, profession, skills, employmentStartDate)
VALUES 
    -- Administradores
    (1, 'Admin Tech', '$2b$10$YourHashedPasswordHere', 'admin@techsolutions.com', 'M', '6012345678', '1985-01-15', CURRENT_TIMESTAMP, 'CEO', ARRAY['Leadership', 'Management'], '2020-01-01'),
    (2, 'Admin Digital', '$2b$10$YourHashedPasswordHere', 'admin@digitalinnovations.com', 'F', '6023456789', '1988-05-20', CURRENT_TIMESTAMP, 'CEO', ARRAY['Leadership', 'Management'], '2019-06-15'),
    (3, 'Admin Innovate', '$2b$10$YourHashedPasswordHere', 'admin@innovatecorp.com', 'M', '6034567890', '1987-11-30', CURRENT_TIMESTAMP, 'CEO', ARRAY['Leadership', 'Management'], '2021-03-01'),
    
    -- Empleados Tech Solutions
    (4, 'Juan Pérez', '$2b$10$YourHashedPasswordHere', 'juan@techsolutions.com', 'M', '6045678901', '1990-03-10', CURRENT_TIMESTAMP, 'Developer', ARRAY['JavaScript', 'Node.js'], '2021-02-01'),
    (5, 'María López', '$2b$10$YourHashedPasswordHere', 'maria@techsolutions.com', 'F', '6056789012', '1992-07-25', CURRENT_TIMESTAMP, 'Designer', ARRAY['UI/UX', 'Figma'], '2021-03-15'),
    
    -- Empleados Digital Innovations
    (6, 'Carlos Ruiz', '$2b$10$YourHashedPasswordHere', 'carlos@digitalinnovations.com', 'M', '6067890123', '1991-11-30', CURRENT_TIMESTAMP, 'Developer', ARRAY['Python', 'Django'], '2020-01-01'),
    (7, 'Ana Martínez', '$2b$10$YourHashedPasswordHere', 'ana@digitalinnovations.com', 'F', '6078901234', '1993-09-05', CURRENT_TIMESTAMP, 'Marketing', ARRAY['Digital Marketing', 'SEO'], '2020-02-15'),
    
    -- Empleados Innovate Corp
    (8, 'Pedro Gómez', '$2b$10$YourHashedPasswordHere', 'pedro@innovatecorp.com', 'M', '6089012345', '1994-04-20', CURRENT_TIMESTAMP, 'Developer', ARRAY['Java', 'Spring'], '2021-04-01'),
    (9, 'Laura Torres', '$2b$10$YourHashedPasswordHere', 'laura@innovatecorp.com', 'F', '6090123456', '1995-12-15', CURRENT_TIMESTAMP, 'Designer', ARRAY['UI/UX', 'Adobe XD'], '2021-05-01');

-- Asignar roles a usuarios
INSERT INTO roles_users_users (user_id, role_id)
VALUES 
    -- Administradores
    (1, 1), (1, 2), -- Admin Tech es ADMIN y BUSINESS
    (2, 1), (2, 2), -- Admin Digital es ADMIN y BUSINESS
    (3, 1), (3, 2), -- Admin Innovate es ADMIN y BUSINESS
    
    -- Empleados
    (4, 3), -- Juan es EMPLOYEE
    (5, 3), -- María es EMPLOYEE
    (6, 3), -- Carlos es EMPLOYEE
    (7, 3), -- Ana es EMPLOYEE
    (8, 3), -- Pedro es EMPLOYEE
    (9, 3); -- Laura es EMPLOYEE

-- Asignar empleados a empresas
UPDATE users SET employer_id = '550e8400-e29b-41d4-a716-446655440000' WHERE id IN (4, 5); -- Empleados de Tech Solutions
UPDATE users SET employer_id = '550e8400-e29b-41d4-a716-446655440001' WHERE id IN (6, 7); -- Empleados de Digital Innovations
UPDATE users SET employer_id = '550e8400-e29b-41d4-a716-446655440002' WHERE id IN (8, 9); -- Empleados de Innovate Corp

-- Asignar administradores a empresas
UPDATE companies SET user_id = 1 WHERE id = '550e8400-e29b-41d4-a716-446655440000'; -- Tech Solutions
UPDATE companies SET user_id = 2 WHERE id = '550e8400-e29b-41d4-a716-446655440001'; -- Digital Innovations
UPDATE companies SET user_id = 3 WHERE id = '550e8400-e29b-41d4-a716-446655440002'; -- Innovate Corp

-- Insertar publicaciones
INSERT INTO publications (id, title, description, requirements, salary, location, type, status, created_at, updated_at, user_id)
VALUES 
    ('pub1', 'Desarrollador Frontend', 'Buscamos desarrollador frontend con experiencia en React', ARRAY['React', 'JavaScript', 'HTML', 'CSS'], 3000000, 'Bogotá', 'FULL_TIME', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1),
    ('pub2', 'Diseñador UI/UX', 'Buscamos diseñador con experiencia en Figma', ARRAY['Figma', 'UI/UX', 'Adobe XD'], 2500000, 'Medellín', 'FULL_TIME', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 2),
    ('pub3', 'Desarrollador Backend', 'Buscamos desarrollador backend con experiencia en Python', ARRAY['Python', 'Django', 'PostgreSQL'], 3500000, 'Cali', 'FULL_TIME', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 3);

-- Insertar aplicaciones
INSERT INTO applications (id, status, created_at, updated_at, user_id, publication_id)
VALUES 
    ('app1', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 4, 'pub1'),
    ('app2', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 5, 'pub2'),
    ('app3', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 6, 'pub3');

-- Insertar comentarios
INSERT INTO comments (id, content, created_at, updated_at, user_id, publication_id)
VALUES 
    ('com1', 'Excelente oportunidad', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 4, 'pub1'),
    ('com2', 'Me interesa el puesto', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 5, 'pub2'),
    ('com3', '¿Hay posibilidad de trabajo remoto?', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 6, 'pub3');

-- Insertar mensajes
INSERT INTO messages (id, content, created_at, updated_at, sender_id, recipient_id)
VALUES 
    ('msg1', 'Hola, me interesa tu perfil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 4),
    ('msg2', 'Gracias por tu interés', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 4, 1),
    ('msg3', '¿Podemos agendar una entrevista?', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 4);

-- Insertar registros de asistencia (últimos 30 días)
INSERT INTO attendance (id, employee_id, date, checkInTime, isLate, isAbsent, notes, createdAt, updatedAt)
SELECT 
    gen_random_uuid(),
    employee_id,
    CURRENT_DATE - (i || ' days')::interval,
    CASE 
        WHEN random() < 0.2 THEN '08:30' -- 20% de probabilidad de llegar temprano
        WHEN random() < 0.8 THEN '09:15' -- 60% de probabilidad de llegar a tiempo
        ELSE '09:45' -- 20% de probabilidad de llegar tarde
    END,
    CASE 
        WHEN random() < 0.2 THEN true -- 20% de probabilidad de llegar tarde
        ELSE false
    END,
    CASE 
        WHEN random() < 0.1 THEN true -- 10% de probabilidad de ausencia
        ELSE false
    END,
    CASE 
        WHEN random() < 0.3 THEN 'Nota de ejemplo'
        ELSE NULL
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM 
    (SELECT id as employee_id FROM users WHERE employer_id IS NOT NULL) employees
CROSS JOIN 
    generate_series(0, 29) i
WHERE 
    random() < 0.9; -- 90% de probabilidad de tener registro cada día 