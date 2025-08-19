-- Script para crear el usuario especial de Suarec para soporte técnico
-- Este usuario tendrá ID 0 y será usado para tickets de soporte

-- Insertar el usuario básico
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

-- Insertar el rol de ADMIN para este usuario
INSERT INTO roles_users_users (user_id, role_id)
SELECT 0, id FROM roles WHERE name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Comentario: Este usuario especial se usa para tickets de soporte
-- Los mensajes enviados a este usuario (ID 0) se consideran tickets de soporte 