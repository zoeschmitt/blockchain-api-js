import { _400, _200 } from "../common/apiResponses";
import { write } from "../common/dynamo";
import getSecrets from "../common/getSecrets";
import { Buffer } from "buffer";
import crypto from "crypto";

const nftTableName = process.env.nftTableName;

export async function handler(event) {
//   console.log("event", event);

const encodedCryptoPrivKey = await getSecrets(process.env.WALLETS_PRIV_KEY);
  const cryptoPrivKey = Buffer.from(encodedCryptoPrivKey["privkey"], "base64").toString(
    "ascii"
  );
  console.log(cryptoPrivKey);


  const decryptedWalletPrivKey = crypto.privateDecrypt(
    cryptoPrivKey,
    Buffer.from(encryptedWalletPrivKey, 'base64')
  ).toString();

  if (!event.pathParameters || !event.pathParameters.walletId)
    return _400({ message: "Missing the walletId from the path" });

  let walletId = event.pathParameters.walletId;
  const nft = JSON.parse(event.body);

  // check nft has all needed data
  // upload to ipfs with pinata
  // mint nft with walletid
  // save opensea link, nft address, ipfs location link

  const newNFT = await write(nft, nftTableName).catch((err) => {
    console.log("error in dynamo write", err);
    return null;
  });

  if (!newNFT) {
    return _400({ message: "Failed to create nft" });
  }

  return _200({ newNFT });
}
