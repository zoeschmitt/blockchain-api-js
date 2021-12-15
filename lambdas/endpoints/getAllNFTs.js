const Responses = require("../common/apiResponses");
const Dynamo = require('../common/Dynamo');

const nftTableName = process.env.nftTableName;

exports.handler = async event => {
    console.log('event', event);

    const nfts = await Dynamo.get(nftTableName).catch(err => {
        console.log('error in Dynamo Get', err);
        return null;
    });

    if (!nfts) {
        return Responses._404({ message: 'Failed to nfts' });
    }

    return Responses._200({ nfts });
};