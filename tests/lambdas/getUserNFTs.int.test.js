const getUserNFTs = require('../../lambdas/endpoints/getUserNFTs');
const eventGenerator = require('../utils/eventGenerator');
const validators = require('../utils/validators');
const Dynamo = require('../../lambdas/common/dynamo').default;

describe('Get all NFTs for a user integration tests', () => {
    test('it should take an id and return an API Gateway response', async () => {
        const event = eventGenerator({
            pathParametersObject: {
                id: '0',
            },
        });

        const res = await getUserNFTs.handler(event);

        expect(res).toBeDefined();
        expect(validators.isApiGatewayResponse(res)).toBe(true);
    });

    test('It should return 400 if we dont pass an id', async () => {
        const event = eventGenerator({});
        const res = await getUserNFTs.handler(event);
        expect(res.statusCode).toBe(400);
    });

    test('It should return 204 if it is an incorrect id', async () => {
        const event = eventGenerator({
            pathParametersObject: {
                id: '0',
            },
        });

        const res = await getUserNFTs.handler(event);

        expect(res.statusCode).toBe(204);
    });

    // test('Returns a 200 and nft data with a valid id', async () => {
    //     const id = '0';

    //     // const user = {
    //     //     id,
    //     // };
    //     await Dynamo.write(user, process.env.nftTableName);

    //     const event = eventGenerator({
    //         pathParametersObject: {
    //             id,
    //         },
    //     });

    //     const res = await getUserNFTs.handler(event);

    //     expect(res.statusCode).toBe(200);
    //     const body = JSON.parse(res.body);
    //     expect(body).toEqual({ user });
    // });
});