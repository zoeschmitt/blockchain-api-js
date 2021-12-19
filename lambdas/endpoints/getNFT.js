import { _400, _404, _200 } from "../common/apiResponses";
import { get } from "../common/dynamo";

const nftTableName = process.env.nftTableName;

export async function handler(event) {
    // console.log('event', event);

    if (!event.pathParameters || !event.pathParameters.id) 
        return _400({ message: 'missing the id from the path' });

    let id = event.pathParameters.id;

    const nft = await get(id, nftTableName).catch(err => {
        console.log('error in Dynamo Get', err);
        return null;
    });

    if (!nft) {
        return _404({ message: `Failed to get nft with id ${id}` });
    }

    return _200({ nft });
}