const Responses = require("../common/apiResponses");
const Dynamo = require("../common/Dynamo");

const walletTableName = process.env.walletTableName;

exports.handler = async (event) => {
  console.log("event", event);

  // create wallet id
  // create keys
  // store keys associated with wallet id
  // return walletId

  const newWallet = await Dynamo.write(nft, walletTableName).catch((err) => {
    console.log("error in dynamo write", err);
    return null;
  });

  if (!newWallet) {
    return Responses._400({ message: "Failed to create wallet" });
  }

  return Responses._200({ newNFT });
};