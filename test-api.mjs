import axios from 'axios';

async function test() {
  try {
    const res = await axios.get('http://localhost:4000/api/availability?professionalId=852558da-3271-48b2-9066-adc2c4961338');
    console.log('Status:', res.status);
    console.log('Data type:', typeof res.data);
    console.log('Is Array?', Array.isArray(res.data));
    if (Array.isArray(res.data) && res.data.length > 0) {
      console.log('First item:', res.data[0]);
    } else {
      console.log('Data:', res.data);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}
test();
