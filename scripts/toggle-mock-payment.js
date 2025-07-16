#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

function toggleMockPayment() {
  try {
    // Leer el archivo .env si existe
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Buscar si MOCK_PAYMENT_SUCCESS ya existe
    const mockLineRegex = /^MOCK_PAYMENT_SUCCESS=(true|false)$/m;
    const hasMockLine = mockLineRegex.test(envContent);

    if (hasMockLine) {
      // Cambiar el valor actual
      const newContent = envContent.replace(
        /^MOCK_PAYMENT_SUCCESS=(true|false)$/m,
        (match, currentValue) => {
          const newValue = currentValue === 'true' ? 'false' : 'true';
          console.log(`🔄 Cambiando MOCK_PAYMENT_SUCCESS de ${currentValue} a ${newValue}`);
          return `MOCK_PAYMENT_SUCCESS=${newValue}`;
        }
      );
      fs.writeFileSync(envPath, newContent);
    } else {
      // Agregar la línea al final del archivo
      const newContent = envContent + '\nMOCK_PAYMENT_SUCCESS=true';
      fs.writeFileSync(envPath, newContent);
      console.log('✅ Agregado MOCK_PAYMENT_SUCCESS=true');
    }

    console.log('✅ Archivo .env actualizado');
    console.log('💡 Reinicia el servidor para aplicar los cambios');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar el script
toggleMockPayment(); 