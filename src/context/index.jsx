import React, { useContext, createContext } from "react";
import { ThirdwebStorage } from "@thirdweb-dev/storage";
import { useStorageUpload } from "@thirdweb-dev/react";

import {
  useAddress,
  useContract,
  useMetamask,
  useContractWrite,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";

const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  const { contract } = useContract(
    "0xe5106B4759f203a6B3A18e2F531F2fFf7533f822"
  );
  const { mutateAsync: createCampaign } = useContractWrite(
    contract,
    "createCampaign"
  );
  const storage = new ThirdwebStorage();
  const { mutateAsync: upload } = useStorageUpload();

  const address = useAddress();
  const connect = useMetamask();

  const publishCampaign = async (form) => {
    try {
      const metadata = {
        owner: form.name,
        title: form.title,
        description: form.description,
        category: form.category,
        campaignImage: form.image,
        nftImage: form.nft,
      };
      const uri = await upload({ data: [metadata] });
      const data = await createCampaign([
        address,
        form.target,
        new Date(form.deadline).getTime(),
        uri[0],
      ]);

      console.log("contract call success", data);
    } catch (error) {
      console.log("contract call failure", error);
    }
  };

  const generateNftUri = async (amount, pId) => {
    const campaign = await getCampaign(pId);
    const metadata = {
      name: campaign.title,
      description: campaign.description,
      image: campaign.nft,
      attributes: [
        {
          trait_type: "Donation",
          value: amount,
        },
      ],
    };
    const uri = await upload({ data: [metadata] });
    console.log(uri[0]);
    return uri[0];
  };

  const getCampaigns = async () => {
    const campaigns = await contract.call("getCampaigns");
    const parsedCampaing = [];
    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      const _metadata = await storage.downloadJSON(campaign.metadata);
      parsedCampaing.push({
        owner: _metadata.owner,
        title: _metadata.title,
        description: _metadata.description,
        category: _metadata.category,
        target: ethers.utils.formatEther(campaign.target.toString()),
        deadline: campaign.endAt.toNumber(),
        amountCollected: ethers.utils.formatEther(
          campaign.amountCollected.toString()
        ),
        image: _metadata.campaignImage,
        nft: _metadata.nftImage,
        pId: i,
      });
    }
    return parsedCampaing;
  };

  const getUserCampaigns = async () => {
    const allCampaigns = await getCampaigns();

    const filteredCampaigns = allCampaigns.filter(
      (campaign) => campaign.owner === address
    );

    return filteredCampaigns;
  };

  const donate = async (pId, amount) => {
    console.log(pId, amount);
    const _uri = await generateNftUri(amount, pId);
    const data = await contract.call("donateToCampaign", pId, _uri, {
      value: ethers.utils.parseEther(amount),
    });
    return data;
  };

  const getCampaign = async (pId) => {
    const campaign = await contract.call("campaigns", pId);
    console.log(campaign);
    const _metadata = await storage.downloadJSON(campaign.metadata);
    console.log(_metadata);
    const parsedCampaign = {
      owner: _metadata.owner,
      title: _metadata.title,
      description: _metadata.description,
      category: _metadata.category,
      target: ethers.utils.formatEther(campaign.target.toString()),
      deadline: campaign.endAt.toNumber(),
      amountCollected: ethers.utils.formatEther(
        campaign.amountCollected.toString()
      ),
      image: _metadata.campaignImage,
      nft: _metadata.nftImage,
    };
    return parsedCampaign;
  };

  const getDonations = async (pId) => {
    const donations = await contract.call("getDonators", pId);
    const numberOfDonations = donations[0].length;

    const parsedDonations = [];

    for (let i = 0; i < numberOfDonations; i++) {
      parsedDonations.push({
        donator: donations[0][i],
        donation: ethers.utils.formatEther(donations[1][i].toString()),
      });
    }

    return parsedDonations;
  };

  return (
    <StateContext.Provider
      value={{
        address,
        contract,
        connect,
        createCampaign: publishCampaign,
        getCampaigns,
        getUserCampaigns,
        donate,
        getDonations,
        getCampaign,
        generateNftUri,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useStateContext = () => useContext(StateContext);
