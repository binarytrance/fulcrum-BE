import autocannon, { Options } from 'autocannon';

const options: Options = {
  url: 'http://localhost:6969/health',
  method: 'GET',
  connections: 10,
  duration: 10,
};

autocannon(options, console.log);
