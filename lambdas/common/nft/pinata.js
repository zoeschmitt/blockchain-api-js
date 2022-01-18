import axios from "axios";

const pinFileToIPFS = async (data, pinataApiKey, pinataSecretApiKey) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

  return axios
    .post(url, data, {
      maxBodyLength: "Infinity", //this is needed to prevent axios from erroring out with large files
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey,
      },
    })
    .then(function (response) {
      return response.data["IpfsHash"];
    })
    .catch(function (error) {
      console.log(error);
      return null;
    });
};

const pinJSONToIPFS = async (JSONBody, pinataApiKey, pinataSecretApiKey) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  return axios
    .post(url, JSONBody, {
      headers: {
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey,
      },
    })
    .then(function (response) {
      return response.data["IpfsHash"];
    })
    .catch(function (error) {
      console.log(error);
      return null;
    });
};

export default { pinFileToIPFS, pinJSONToIPFS };
