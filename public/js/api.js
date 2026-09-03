let log = [];
const listeners = [];
let reqId = 0;

function emitLog(e) {
  const i = log.findIndex((x) => x.id === e.id);
  if (i >= 0) log[i] = { ...log[i], ...e };
  else log.unshift(e);
  if (log.length > 60) log.pop();
  listeners.forEach((f) => f(log));
}

export function onApiLog(callback) {
  listeners.push(callback);
  callback(log);
}

export function clearApiLog() {
  log = [];
  listeners.forEach((f) => f(log));
}

async function request(method, path, body = null) {
  const id = 'r' + ++reqId;
  const t0 = performance.now();
  emitLog({ id, method, path, status: 'pending', ms: null, at: Date.now() });

  try {
    const opts = { method, headers: {} };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    const ms = Math.round(performance.now() - t0);

    if (!res.ok) {
      emitLog({ id, method, path, status: res.status, ms, at: Date.now() });
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    emitLog({ id, method, path, status: res.status, ms, at: Date.now() });
    return data;
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    emitLog({ id, method, path, status: 500, ms, at: Date.now(), err: err.message });
    throw err;
  }
}

export const ApiService = {
  getProject(id) {
    return request('GET', `/v1/projects/${id}`);
  },
  saveProject(id, data) {
    return request('PUT', `/v1/projects/${id}`, data);
  },
  getPresets() {
    return request('GET', '/v1/presets');
  },
  createRender(payload) {
    return request('POST', '/v1/renders', payload);
  },
  getRender(id) {
    return request('GET', `/v1/renders/${id}`);
  },
  cancelRender(id) {
    return request('DELETE', `/v1/renders/${id}`);
  }
};
