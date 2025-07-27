-- Script para verificar y crear el usuario Suarec si no existe

-- Verificar si el usuario Suarec existe
SELECT id, name, email, is_active FROM users WHERE id = 0;

-- Si no existe, crearlo
INSERT INTO users (id, name, email, password, genre, cellphone, born_at, created_at, email_verified, is_active)
VALUES (
  0, 
  'Suarec - Soporte', 
  'soporte@suarec.com', 
  '$2b$10$dummyhashforSuarecuser', -- Hash dummy ya que no se usará para login
  'Otro',
  '0000000000',
  '2000-01-01',
  CURRENT_TIMESTAMP,
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- Verificar que se creó correctamente
SELECT id, name, email, is_active FROM users WHERE id = 0;

-- Insertar el rol de ADMIN para este usuario si no existe
INSERT INTO roles_users_users (user_id, role_id)
SELECT 0, id FROM roles WHERE name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Verificar que tiene el rol ADMIN
SELECT u.id, u.name, r.name as role_name 
FROM users u 
JOIN roles_users_users ruu ON u.id = ruu.user_id 
JOIN roles r ON ruu.role_id = r.id 
WHERE u.id = 0; 