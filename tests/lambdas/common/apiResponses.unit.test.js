const Responses = require('../../../lambdas/common/apiResponses');

test("Responses is an object", () => {
  expect(typeof Responses).toBe("object");
});

test("_200 working properly", () => {
  const res = _200({ name: "Jen" });
  expect(res.statusCode).toBe(200);
  expect(typeof res.body).toBe("string");
  expect(res.headers["Content-Type"]).toBe("application/json");
});

test("_400 working properly", () => {
  const res = _400({ name: "Jen" });
  expect(res.statusCode).toBe(400);
  expect(typeof res.body).toBe("string");
  expect(res.headers["Content-Type"]).toBe("application/json");
});

test("_404 working properly", () => {
  const res = _404({ name: "Jen" });
  expect(res.statusCode).toBe(404);
  expect(typeof res.body).toBe("string");
  expect(res.headers["Content-Type"]).toBe("application/json");
});

test("Define response", () => {
  const res = _DefineResponse(382, { any: "thing" });
  expect(res.statusCode).toBe(382);
  expect(res.body).toBe(JSON.stringify({ any: "thing" }));
});
