const url = 'http://localhost:4000/api/lmstudio/chat/stream';

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    Authorization: `Bearer ${process.env.AUTH_TOKEN ?? ''}`,
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Sag Hallo und zähle langsam bis 15.' }],
  }),
});

console.log('status:', res.status);
console.log('content-type:', res.headers.get('content-type'));

if (!res.ok) {
  console.log(await res.text());
  process.exit(1);
}

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  process.stdout.write(decoder.decode(value));
}
