const http = require('http');
const assert = require('assert');
const app = require('../server');

let server;
const PORT = 3002;

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT, async () => {
    try {
      console.log('Running API tests...');

      // Test Health
      const resHealth = await request('GET', '/health');
      assert.strictEqual(resHealth.status, 200);
      assert.strictEqual(resHealth.body.status, 'ok');
      console.log('✔ GET /health passed');

      // Test Auth Register & Login
      const testEmail = `test_${Date.now()}@example.com`;
      const resReg = await request('POST', '/v1/auth/register', { email: testEmail, password: 'password123', name: 'Tester' });
      assert.strictEqual(resReg.status, 201);
      assert.strictEqual(resReg.body.email, testEmail);
      console.log('✔ POST /v1/auth/register passed');

      const resLogin = await request('POST', '/v1/auth/login', { email: testEmail, password: 'password123' });
      assert.strictEqual(resLogin.status, 200);
      assert.ok(resLogin.body.token);
      console.log('✔ POST /v1/auth/login passed');

      // Test 1: GET /v1/projects/cf_8241
      const resProj = await request('GET', '/v1/projects/cf_8241');
      assert.strictEqual(resProj.status, 200);
      assert.strictEqual(resProj.body.id, 'cf_8241');
      assert.strictEqual(Array.isArray(resProj.body.clips), true);
      console.log('✔ GET /v1/projects/cf_8241 passed');

      // Test 2: PUT /v1/projects/cf_8241
      const resSave = await request('PUT', '/v1/projects/cf_8241', { title: 'Updated Title' });
      assert.strictEqual(resSave.status, 200);
      assert.strictEqual(typeof resSave.body.rev, 'number');
      console.log('✔ PUT /v1/projects/cf_8241 passed');

      // Test Project Versions
      const resVers = await request('GET', '/v1/projects/cf_8241/versions');
      assert.strictEqual(resVers.status, 200);
      assert.strictEqual(Array.isArray(resVers.body), true);
      console.log('✔ GET /v1/projects/cf_8241/versions passed');

      // Test Media Assets Upload and List
      const resMediaUp = await request('POST', '/v1/media', { filename: 'test_video.mp4', mimetype: 'video/mp4', size: 2048 });
      assert.strictEqual(resMediaUp.status, 201);
      assert.ok(resMediaUp.body.id);
      console.log('✔ POST /v1/media passed');

      const resMediaList = await request('GET', '/v1/media');
      assert.strictEqual(resMediaList.status, 200);
      assert.strictEqual(Array.isArray(resMediaList.body), true);
      console.log('✔ GET /v1/media passed');

      // Test 3: GET 404 for invalid project
      const res404 = await request('GET', '/v1/projects/non_existent');
      assert.strictEqual(res404.status, 404);
      console.log('✔ GET /v1/projects/non_existent (404) passed');

      // Test 4: GET /v1/presets
      const resPresets = await request('GET', '/v1/presets');
      assert.strictEqual(resPresets.status, 200);
      assert.strictEqual(Array.isArray(resPresets.body.filters), true);
      console.log('✔ GET /v1/presets passed');

      // Test 5: POST /v1/renders
      const resRender = await request('POST', '/v1/renders', { res: '1080p', fps: 30 });
      assert.strictEqual(resRender.status, 201);
      assert.strictEqual(typeof resRender.body.id, 'string');
      const jobId = resRender.body.id;
      console.log('✔ POST /v1/renders passed');

      // Test 6: GET /v1/renders/:id
      const resJob = await request('GET', `/v1/renders/${jobId}`);
      assert.strictEqual(resJob.status, 200);
      assert.strictEqual(resJob.body.id, jobId);
      console.log('✔ GET /v1/renders/:id passed');

      // Wait for job completion
      console.log('Waiting for render job to complete...');
      while (true) {
        await new Promise(r => setTimeout(r, 200));
        const check = await request('GET', `/v1/renders/${jobId}`);
        if (check.body.status === 'done') {
          assert.strictEqual(check.body.progress, 100);
          assert.ok(check.body.url);
          console.log('✔ Render job completed successfully:', check.body.url);
          break;
        }
      }

      // Test 7: DELETE /v1/renders/:id
      const resCancel = await request('DELETE', `/v1/renders/${jobId}`);
      assert.strictEqual(resCancel.status, 200);
      console.log('✔ DELETE /v1/renders/:id passed');

      console.log('\nAll API integration tests passed successfully!');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Test failed:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
