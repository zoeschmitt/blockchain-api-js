import { _404, _200 } from "../common/apiResponses";
import { get } from "../common/dynamo";

const nftTableName = process.env.nftTableName;

export async function handler(event) {
    // console.log('event', event);

    const nfts = await get(nftTableName).catch(err => {
        console.log('error in Dynamo Get', err);
        return null;
    });

    if (!nfts) {
        return _404({ message: 'Failed to nfts' });
    }

    return _200({ nfts });
}