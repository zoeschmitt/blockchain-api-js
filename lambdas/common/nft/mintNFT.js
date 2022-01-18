import Web3 from "web3";

const mintNFT = async (
  nftContract,
  alchemyKey,
  ourWallet,
  clientWalletAddress,
  contractAddress,
  tokenURI
) => {
  try {
    const ourAddress = ourWallet["address"];
    const ourPrivateKey = ourWallet["privkey"];
    const web3 = new Web3(alchemyKey["key"]);

    console.log(`contractAddress: ${contractAddress}`);
    console.log(`clientWalletAddress: ${clientWalletAddress}`);

    const contract = new web3.eth.Contract(nftContract.abi, contractAddress);
    const txn = contract.methods.mintNFT(clientWalletAddress, tokenURI);
    const gas = await txn.estimateGas({ from: ourAddress });
    const gasPrice = await web3.eth.getGasPrice();

    console.log(`gas: ${gas}`);
    console.log(`gasPrice: ${gasPrice}`);

    const data = txn.encodeABI();
    const nonce = await web3.eth.getTransactionCount(ourAddress, "latest");
    const signedTxn = await web3.eth.accounts.signTransaction(
      {
        from: ourAddress,
        to: contractAddress,
        nonce: nonce,
        data,
        gas,
        gasPrice,
      },
      ourPrivateKey
    );
    console.log(`Sending raw transaction at: ${new Date().toISOString()}`);
    const txnReceipt = await web3.eth.sendSignedTransaction(
      signedTxn.rawTransaction
    );
    const tokenId = web3.utils.hexToNumber(txnReceipt.logs[0].topics[3]);
    return { tokenId: tokenId, txnReceipt: txnReceipt };
  } catch (e) {
    console.log(e);
    throw "Blockchain error, please try again in a few minutes or contact support.";
  }
};

export default mintNFT;
