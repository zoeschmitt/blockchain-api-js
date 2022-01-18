import Web3 from "web3";
import crypto from "crypto";
import { Buffer } from "buffer";

const generateWallet = async (alchemyKey, encodedPubKey, id) => {
  const cryptoPubKey = Buffer.from(encodedPubKey["pubkey"], "base64").toString(
    "ascii"
  );
  const web3 = new Web3(alchemyKey["key"]);
  const newWallet = web3.eth.accounts.create([id]);

  const encryptedWalletPrivKey = crypto.publicEncrypt(
    cryptoPubKey,
    Buffer.from(newWallet["privateKey"])
  );

  const walletData = {
    address: newWallet["address"],
    privateKey: encryptedWalletPrivKey.toString("base64"),
  };
  return walletData;
};

export default generateWallet;
