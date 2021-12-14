const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');

const nftTableName = process.env.nftTableName;

exports.handler = async event => {
    console.log('event', event);

    if (!event.pathParameters || !event.pathParameters.id) 
        return Responses._400({ message: 'missing the id from the path' });

    let id = event.pathParameters.id;

    const nft = await Dynamo.get(id, nftTableName).catch(err => {
        console.log('error in Dynamo Get', err);
        return null;
    });

    if (!nft) {
        return Responses._404({ message: `Failed to get nft with id ${id}` });
    }

    return Responses._200({ nft });
};