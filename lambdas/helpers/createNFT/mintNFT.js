import Web3 from "web3";
import Responses from "../../common/apiResponses";

const mintNFT = async (
  nftContract,
  alchemyKey,
  ourWallet,
  clientWalletAddress,
  contractAddress,
  metadata,
  tokenURI
) => {
  try {
    const ourAddress = ourWallet['address'];
    const web3 = new Web3(alchemyKey["key"]);

    console.log(`contractAddress: ${contractAddress}`);
    console.log(`walletAddress: ${clientWalletAddress}`);

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
    const txnReceipt = await web3.eth.sendSignedTransaction(
      signedTxn.rawTransaction
    );

    const tokenId = web3.utils.hexToNumber(txnReceipt.logs[0].topics[3]);
    return { tokenId: tokenId, txnReceipt: txnReceipt };
  } catch (e) {
    console.log(e);
    return Responses._400({
      message: "Blockchain network error.",
    });
  }
};

export default mintNFT;
