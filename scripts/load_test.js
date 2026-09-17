import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const TARGET = __ENV.TARGET_URL || 'http://127.0.0.1/';
const VUS = Number(__ENV.VUS) || 50;
const DURATION = __ENV.DURATION || '2m';

export let options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    'errors': ['rate<0.1'],
  },
};

let reqTrend = new Trend('req_duration');
let errors = new Counter('errors');

export default function () {
    let res = http.get(TARGET, { tags: { name: 'browse' } });

    reqTrend.add(res.timings.duration);

     let ok = check(res, {
        'status 200': (r) => r.status === 200,
    }); 

    if (!ok) {
        errors.add(1);
    }
   
    sleep(1);
}
