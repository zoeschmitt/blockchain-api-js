const createWallet = require("../../lambdas/endpoints/createWallet");
const eventGenerator = require("../utils/eventGenerator");
const validators = require("../utils/validators");

describe("Create wallet integration tests", () => {
  test("It should return a valid walletId", async () => {
    const res = await createWallet.handler();
    expect(res.statusCode).toBe(200);
    expect(typeof JSON.parse(res.body)['walletId']).toBe("string");
  });
});
