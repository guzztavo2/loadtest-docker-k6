# loadtest-docker-k6

A minimal, **Dockerized k6 load** test template that runs a configurable k6 script inside a container. Set the **TARGET_URL**, **VUS**, and **DURATION** and run the test locally or in CI using Docker Compose.

---
## Quickstart
1. Edit `docker-compose.yml` and set the environment variables `TARGET_URL`, `VUS`, and `DURATION`.

2. **Build and run** the container:

```
docker compose up --build -d
```

3. **Follow logs** to watch the test run:

```
docker compose logs -f
```

4. Stop and remove containers when finished:

```
docker compose down
```
---
## Configuration
**Environment variables**

- **TARGET_URL** — The URL k6 will hit. Default in the script is `http://127.0.0.1/`.
- **VUS** — Number of virtual users to simulate. Default in `docker-compose.yml` is **20**.
- **DURATION** — Test duration in k6 format such as 30s, 2m, 5m. Default in `docker-compose.yml` is **5m**.

Example `docker-compose.yml` service

```yaml
services:
  k6:
    image: grafana/k6:latest
    container_name: k6_load_tester
    volumes:
      - ./scripts:/scripts
    environment:
      - TARGET_URL=
      - VUS=20
      - DURATION=5m
    command: run /scripts/load_test.js
    restart: "no"
```

To run with inline variables without editing the file:
```
TARGET_URL=https://example.com VUS=50 DURATION=2m docker compose up --build -d
```
---
## What the test does
Script file `scripts/load_test.js` contains a simple k6 scenario:

```js
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
```

**Key points**

- The script reads configuration from environment variables.
- It records a custom trend metric `req_duration` and a counter `errors`.
- Thresholds are defined to fail the test if the 95th percentile of request duration exceeds 5000 milliseconds or if error rate is above 10 percent.
---
## Dockerfile
The repository includes a small Dockerfile used to create a script-friendly image when needed.

`dockerfile`

```
FROM grafana/k6:latest

WORKDIR /scripts
COPY ./scripts /scripts

ENTRYPOINT ["k6"]
```
This `Dockerfile` copies the `scripts` folder into the image and sets the k6 binary as the entrypoint so the container runs k6 commands by default.

---

## Running in CI
Use the same Docker Compose approach in CI pipelines. Example GitHub Actions step snippet:

```yaml
- name: Run k6 load test
  run: |
    docker compose up --build --abort-on-container-exit
    docker compose logs k6
```

Persist results by mounting a results volume and exporting k6 outputs to JSON or Influx if you want post-processing.

---

## Troubleshooting and tips

- **No traffic observed** — Confirm `TARGET_URL` is set and reachable from the environment where Docker runs.
- **Authentication required** — Add headers or authentication logic to load_test.js and mount secrets securely in CI.
- **Collect results** — Modify the `command` to include `--out json=/results/result.json` and mount a `./results` folder to persist - output.
- **Increase concurrency** — Raise `VUS` gradually and monitor the target system and network.
- **Use scenarios** — For more complex patterns, replace simple `vus`/`duration` with k6 scenarios in the script.

---

## Files in this repository

- **docker-compose.yml** - Compose service to run k6.
- **Dockerfile** - Optional image that copies scripts and expose k6 entrypoint.
- **scripts/load_test.js** - Example k6 script that performs GET requests and records metrics.

