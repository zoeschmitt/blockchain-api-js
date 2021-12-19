import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import Web3 from "web3";
import { v4 as uuidv4 } from "uuid";
import getSecrets from "../common/getSecrets";
import { Buffer } from "buffer";
import crypto from "crypto";

export async function handler(event) {
  const walletTableName = process.env.WALLET_TABLE_NAME;
  const alchemyKey = await getSecrets(process.env.ALCHEMY_KEY);
  const encodedCryptoPubKey = await getSecrets(process.env.WALLETS_PUB_KEY);
  const cryptoPubKey = Buffer.from(
    encodedCryptoPubKey["pubkey"],
    "base64"
  ).toString("ascii");
  const walletId = uuidv4();
  const web3 = new Web3(alchemyKey["key"]);
  const newWallet = web3.eth.accounts.create([walletId]);

  const encryptedWalletPrivKey = crypto.publicEncrypt(
    cryptoPubKey,
    Buffer.from(newWallet["privateKey"])
  );

  const walletData = {
    id: walletId,
    address: newWallet["address"],
    privateKey: encryptedWalletPrivKey.toString("base64"),
  };

  const res = await Dynamo.write(walletData, walletTableName).catch(
    (err) => {
      console.log("error in dynamo write", err);
      return null;
    }
  );

  if (!res) {
    return Responses._400({ message: "Failed to create wallet" });
  }

  return Responses._200({ walletId: walletId });
}
