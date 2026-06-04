import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:4000/api/availability', {
      professionalId: '852558da-3271-48b2-9066-adc2c4961338',
      dates: ['2026-06-03'],
      startTime: '09:00',
      endTime: '18:00',
      isAllDay: false
    }, {
      headers: {
        'Authorization': 'Bearer ' // wait, I don't have the token.
      }
    });
    console.log('Success:', res.data);
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}
test();
