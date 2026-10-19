import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/hermes/runs/route";
import { GET, POST as stop } from "../app/api/hermes/runs/[id]/route";
import { workspaceSchema, sourceLink } from "../lib/workspace";
import { initialWorkspace } from "../lib/seed";
const body = {
  message: "Comparer mes sources",
  sessionId: "pupuce-123",
  requestId: "a1c9d901-abcd-4123-8123-a1c9d901abcd",
  context: "Corpus de test",
};
function request(payload = body, key = "test-access") {
  return new NextRequest("http://localhost/api/hermes/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-app-access-key": key },
    body: JSON.stringify(payload),
  });
}
test("Hermes bridge validates access, forwards runs and preserves private credentials", async () => {
  const originalFetch = globalThis.fetch;
  const previous = {
    APP_ACCESS_KEY: process.env.APP_ACCESS_KEY,
    HERMES_URL: process.env.HERMES_URL,
    HERMES_API_KEY: process.env.HERMES_API_KEY,
  };
  process.env.APP_ACCESS_KEY = "test-access";
  process.env.HERMES_URL = "http://private-hermes:8642";
  process.env.HERMES_API_KEY = "test-hermes-secret";
  try {
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      calls++;
      assert.equal(String(input), "http://private-hermes:8642/v1/runs");
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer test-hermes-secret",
      );
      assert.equal(
        new Headers(init?.headers).get("idempotency-key"),
        body.requestId,
      );
      const sent = JSON.parse(String(init?.body));
      assert.equal(sent.session_id, body.sessionId);
      assert.match(sent.instructions, /Corpus de test/);
      return Response.json(
        { run_id: "run_test", status: "started" },
        { status: 202 },
      );
    };
    assert.equal((await POST(request(body, "wrong"))).status, 401);
    assert.equal(calls, 0);
    assert.equal((await POST(request({ ...body, message: "" }))).status, 400);
    assert.equal(calls, 0);
    const start = await POST(request());
    assert.equal(start.status, 202);
    assert.deepEqual(await start.json(), { run_id: "run_test" });
    assert.equal(calls, 1);
    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "http://private-hermes:8642/v1/runs/run_test",
      );
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer test-hermes-secret",
      );
      return Response.json({
        status: "completed",
        output: "Synthèse sourcée",
        run_id: "run_test",
        internal_secret: "must-not-leak",
      });
    };
    const status = await GET(
      new NextRequest("http://localhost", {
        headers: { "x-app-access-key": "test-access" },
      }),
      { params: Promise.resolve({ id: "run_test" }) },
    );
    assert.deepEqual(await status.json(), {
      status: "completed",
      output: "Synthèse sourcée",
      run_id: "run_test",
    });
    globalThis.fetch = async (input, init) => {
      assert.equal(
        String(input),
        "http://private-hermes:8642/v1/runs/run_test/stop",
      );
      assert.equal(init?.method, "POST");
      return Response.json({ status: "cancelled", run_id: "run_test" });
    };
    assert.equal(
      (await stop(request(), { params: Promise.resolve({ id: "run_test" }) }))
        .status,
      200,
    );
    const badPath = await GET(request(), {
      params: Promise.resolve({ id: "../../secrets" }),
    });
    assert.equal(badPath.status, 400);
    globalThis.fetch = async () => {
      throw new Error("private upstream debug containing credentials");
    };
    const failure = await POST(request());
    assert.equal(failure.status, 502);
    assert.doesNotMatch(await failure.text(), /credentials|test-hermes-secret/);
    delete process.env.HERMES_API_KEY;
    assert.equal((await POST(request())).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
test("workspace restore accepts a real export and rejects broken active dossiers", () => {
  const state = initialWorkspace();
  assert.equal(
    workspaceSchema.safeParse(JSON.parse(JSON.stringify(state))).success,
    true,
  );
  assert.equal(
    workspaceSchema.safeParse({ ...state, activeProject: "missing" }).success,
    false,
  );
  assert.equal(
    workspaceSchema.safeParse({ ...state, projects: [] }).success,
    false,
  );
});
test("source links cannot introduce executable URL schemes", () => {
  assert.equal(sourceLink("javascript:alert(1)"), undefined);
  assert.equal(sourceLink("file:///etc/passwd"), undefined);
  assert.equal(
    sourceLink("https://www.metmuseum.org/art/collection/search/436105"),
    "https://www.metmuseum.org/art/collection/search/436105",
  );
});
