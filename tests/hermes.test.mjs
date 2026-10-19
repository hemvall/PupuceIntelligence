import test from "node:test";
import assert from "node:assert/strict";
import { checkAccess, hermesConfig } from "../lib/hermes.mjs";
const req = (key) =>
  new Request("http://localhost", {
    headers: key ? { "x-app-access-key": key } : {},
  });
test("production refuses an unprotected bridge", () =>
  assert.equal(checkAccess(req(), { NODE_ENV: "production" }).status, 503));
test("configured access key is required even in development", () => {
  const env = { APP_ACCESS_KEY: "private", NODE_ENV: "development" };
  assert.equal(checkAccess(req("bad"), env).status, 401);
  assert.equal(checkAccess(req("private"), env), null);
});
test("an unconfigured Hermes is represented explicitly", () =>
  assert.equal(hermesConfig({}), null));
test("private Hermes configuration validates transport", () => {
  assert.throws(() =>
    hermesConfig({
      HERMES_URL: "file:///etc/passwd",
      HERMES_API_KEY: "secret",
    }),
  );
  assert.equal(
    hermesConfig({
      HERMES_URL: "http://hermes:8642/",
      HERMES_API_KEY: "secret",
    }).url,
    "http://hermes:8642",
  );
});
