const Responses = require("../common/API_Responses");
const Dynamo = require("../common/Dynamo");

const nftTableName = process.env.nftTableName;

exports.handler = async (event) => {
  console.log("event", event);

  if (!event.pathParameters || !event.pathParameters.walletId)
    return Responses._400({ message: "Missing the walletId from the path" });

  let walletId = event.pathParameters.walletId;
  const nft = JSON.parse(event.body);

  // check nft has all needed data
  // upload to ipfs with pinata
  // mint nft with walletid
  // save opensea link, nft address, ipfs location link

  const newNFT = await Dynamo.write(nft, nftTableName).catch((err) => {
    console.log("error in dynamo write", err);
    return null;
  });

  if (!newNFT) {
    return Responses._400({ message: "Failed to create nft" });
  }

  return Responses._200({ newNFT });
};
