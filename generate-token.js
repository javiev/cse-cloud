const { SignJWT } = require('jose');

async function generateTestToken() {
  const secret = 'a9f37679120b142fd2efbbecff749432';
  const token = await new SignJWT({
    id: '4b9410f3-69e6-4e2b-81b5-858d11dd98b8',
    username: 'Minera Uno',
    email: 'minera_1@minera.com',
    client_id: '0303456',
    rol: 'minera_1',
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hora de expiración
  })
  .setProtectedHeader({ alg: 'HS256' })
  .sign(new TextEncoder().encode(secret));

  console.log('Nuevo token generado:');
  console.log(token);
  
  console.log('\nPara usarlo:');
  console.log(`curl -X GET "http://localhost:8787/cse/0303456" \
  -H "Authorization: Bearer ${token}"`);
}

generateTestToken().catch(console.error);
