import autocannon, { Options } from 'autocannon';

const options: Options = {
  url: 'http://localhost:6969/api/v1/goals/607df3ba-60dd-4468-9e2d-edb6d956109b',
  method: 'GET',
  connections: 100,
  duration: 100,
};

autocannon(options, console.log);
