import { _400, _404, _200 } from "../common/apiResponses";
import { get } from "../common/dynamo";

const tableName = process.env.tableName;

export async function handler(event) {
    // console.log('event', event);

    if (!event.pathParameters || !event.pathParameters.ID) {
        // failed without an ID
        return _400({ message: 'missing the ID from the path' });
    }

    let ID = event.pathParameters.ID;

    const user = await get(ID, tableName).catch(err => {
        console.log('error in Dynamo Get', err);
        return null;
    });

    if (!user) {
        return _404({ message: 'Failed to get user by ID' });
    }

    return _200({ user });
}