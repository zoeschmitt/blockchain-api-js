// const Dynamo = require("../common/dynamo");

// test("Dynamo is an object", () => {
//   expect(typeof Dynamo).toBe("object");
// });

// test("Dynamo has get and write", () => {
//   expect(typeof Dynamo.get).toBe("function");
//   expect(typeof Dynamo.write).toBe("function");
// });

// const nftsTableName = "nftsTable";
// const walletsTableName = "walletsTable";

// const nftData = {
//   id: "1",
//   address: "0x23423",
//   opensea: "https://",
//   metadata: {
//     ipfs: "https://",
//     name: "NFT",
//     description: "A super rare NFT",
//   },
// };
// const walletData = {
//   id: "1",
//   pubKey: "000",
//   privKey: "002",
// };

// test("Dynamo write to nfts table working", async () => {
//   expect.assertions(1);
//   try {
//     const res = await Dynamo.write(nftData, nftsTableName);
//     expect(res).toBe(nftData);
//   } catch (error) {
//     console.log("error in dynamo nfts write test", error);
//   }
// });

// test("Dynamo write to wallets table working", async () => {
//   expect.assertions(1);
//   try {
//     const res = await Dynamo.write(walletData, walletsTableName);
//     expect(res).toBe(walletData);
//   } catch (error) {
//     console.log("error in dynamo wallets write test", error);
//   }
// });

// test("Dynamo wallets table get works", async () => {
//   expect.assertions(1);
//   try {
//     const res = await Dynamo.get(walletData.id, walletsTableName);
//     expect(res).toEqual(walletData);
//   } catch (error) {
//     console.log("error in dynamo get", error);
//   }
// });

// test("Dynamo nfts table get works", async () => {
//   expect.assertions(1);
//   try {
//     const res = await Dynamo.get(nftData.id, nftsTableName);
//     expect(res).toEqual(nftData);
//   } catch (error) {
//     console.log("error in dynamo get", error);
//   }
// });
