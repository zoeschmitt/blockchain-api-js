import Responses from "../common/apiResponses";
import Dynamo from "../common/dynamo";
import getOrg from "../common/getOrg";

export async function handler(event) {
  const tableName = process.env.TABLE_NAME;

  try {
    if (!event.pathParameters || !event.pathParameters.id)
      return Responses._400({ message: "missing the nft id from the path" });

    const id = event.pathParameters.id;

    const org = await getOrg(event["headers"]);
    const orgId = org["orgId"];

    const params = {
      TableName: tableName,
      Key: {
        PK: `ORG#${orgId}#NFT#${id}`,
        SK: `ORG#${orgId}`,
      },
    };

    const nft = await Dynamo.get(params).catch((err) => {
      console.log("error in Dynamo Get", err);
      return null;
    });

    if (!nft) {
      return Responses._404({ message: `Failed to get nft with id ${id}` });
    }
    const nftData = nft["nftData"];

    // Remove unneeded royalty info from metadata response.
    if (nftData.metadata.seller_fee_basis_points !== undefined)
      delete nftData.metadata.seller_fee_basis_points;
    if (nftData.metadata.fee_recipient !== undefined)
      delete nftData.metadata.fee_recipient;

    console.log(`getNFT Finished successfully`);

    return Responses._200({
      nft: {
        nftId: nftData["nftId"],
        mintedBy: nftData["mintedBy"],
        walletAddress: nftData["walletAddress"],
        openseaUrl: nftData["openseaUrl"],
        metadata: nftData["metadata"],
        createdAt: nftData["createdAt"],
      },
    });
  } catch (e) {
    console.log(`getNFT error: ${e.toString()}`);
    return Responses._400({ message: "Failed to get nft" });
  }
}
