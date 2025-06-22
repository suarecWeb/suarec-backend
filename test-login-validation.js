const axios = require('axios');

async function testLoginValidation() {
  try {
    console.log('Testing login validation with unverified email...');
    
    // Primero, vamos a verificar el estado de verificación del email
    console.log('\n1. Checking email verification status...');
    const statusResponse = await axios.get('http://localhost:3000/email-verification/status/mariana2005ardila@gmail.com');
    console.log('Email verification status:', statusResponse.data);
    
    // Ahora intentamos hacer login
    console.log('\n2. Attempting to login...');
    const loginPayload = {
      email: "mariana2005ardila@gmail.com",
      password: "tu_password_aqui" // Reemplaza con la contraseña real
    };
    
    const loginResponse = await axios.post('http://localhost:3000/auth/login', loginPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login successful:', loginResponse.data);
    
  } catch (error) {
    console.log('\nExpected error occurred:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error message:', error.response.data.message);
      
      if (error.response.status === 401) {
        console.log('✅ SUCCESS: Login correctly blocked for unverified email');
      }
    } else {
      console.log('Error:', error.message);
    }
  }
}

testLoginValidation(); 